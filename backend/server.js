// Code documentation: Backend API for payments, webhooks, notifications, and TURN credentials.
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const Stripe = require('stripe');

admin.initializeApp();
const db = admin.firestore();
const app = express();
app.use(cors());

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_missing');
const PUBLIC_URL = process.env.PUBLIC_URL;

const markPaid = (tripId, paymentId, provider) =>
  db.doc(`trips/${tripId}`).update({
    status: 'paid', paymentStatus: 'approved', paymentId: String(paymentId), paymentProvider: provider,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
  });

// --- Webhook de Stripe: necesita el cuerpo crudo, por eso va antes de express.json() ---
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed' && obj.payment_status === 'paid') {
      await markPaid(obj.client_reference_id, obj.payment_intent, 'stripe');
    }
    if (event.type === 'checkout.session.expired') {
      await db.doc(`trips/${obj.client_reference_id}`).update({ paymentStatus: 'rejected' });
    }
    res.sendStatus(200);
  } catch (e) { res.status(400).send(`Webhook error: ${e.message}`); }
});

app.use(express.json());

// --- Webhook de Mercado Pago ---
app.post('/webhooks/mercadopago', async (req, res) => {
  try {
    const paymentId = req.body?.data?.id || req.query['data.id'];
    if (!paymentId) return res.sendStatus(200);
    const p = await new Payment(mp).get({ id: paymentId });
    const tripId = p.external_reference;
    if (p.status === 'approved') await markPaid(tripId, p.id, 'mercadopago');
    else if (['rejected', 'cancelled'].includes(p.status)) await db.doc(`trips/${tripId}`).update({ paymentStatus: 'rejected', paymentId: String(p.id) });
    res.sendStatus(200);
  } catch (e) { console.error(e); res.sendStatus(500); }
});

app.get('/payments/return', (_req, res) => res.send('Pago procesado. Puedes cerrar esta ventana y volver a la app.'));

// --- Autenticación: solo conductores con sesión de Firebase ---
async function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    req.uid = (await admin.auth().verifyIdToken(token)).uid;
    next();
  } catch { res.status(401).json({ error: 'No autorizado' }); }
}

app.post('/voice/ice-servers', auth, async (req, res) => {
  try {
    const { tripId } = req.body || {};
    if (typeof tripId !== 'string' || !tripId.trim()) {
      return res.status(400).json({ error: 'Falta el identificador del viaje' });
    }

    const tripSnapshot = await db.doc(`trips/${tripId}`).get();
    if (!tripSnapshot.exists) return res.status(404).json({ error: 'Viaje no encontrado' });
    const trip = tripSnapshot.data();
    if (![trip.driverId, trip.passengerId].includes(req.uid)) {
      return res.status(403).json({ error: 'No perteneces a este viaje' });
    }
    if (!['accepted', 'driver_arriving', 'in_progress'].includes(trip.status)) {
      return res.status(409).json({ error: 'El viaje no tiene una llamada activa habilitada' });
    }

    const urls = (process.env.TURN_URL || '').split(',').map((url) => url.trim()).filter(Boolean);
    const sharedSecret = process.env.TURN_SHARED_SECRET;
    if (!urls.length || !sharedSecret) {
      return res.status(503).json({ error: 'El servicio TURN no está configurado' });
    }
    if (urls.some((url) => !/^turns?:/.test(url))) {
      return res.status(500).json({ error: 'TURN_URL contiene una URL no válida' });
    }

    const ttl = Number(process.env.TURN_CREDENTIAL_TTL_SECONDS || 3600);
    if (!Number.isInteger(ttl) || ttl < 60 || ttl > 86400) {
      return res.status(500).json({ error: 'TURN_CREDENTIAL_TTL_SECONDS debe estar entre 60 y 86400' });
    }
    const username = `${Math.floor(Date.now() / 1000) + ttl}:${req.uid}`;
    const credential = crypto.createHmac('sha1', sharedSecret).update(username).digest('base64');
    res.json({ iceServers: [{ urls, username, credential }] });
  } catch (error) {
    console.error('No se pudieron generar las credenciales temporales de TURN:', error);
    res.status(500).json({ error: 'No se pudo preparar la conexión de voz' });
  }
});

// Crea la preferencia (Mercado Pago) o la sesión de Checkout (Stripe) según el método del viaje.
app.post('/payments/checkout', auth, async (req, res) => {
  try {
    const { tripId, amount } = req.body;
    const snap = await db.doc(`trips/${tripId}`).get();
    if (!snap.exists) return res.status(404).json({ error: 'Viaje no encontrado' });
    const trip = snap.data();
    if (trip.driverId !== req.uid) return res.status(403).json({ error: 'Este viaje no es tuyo' });
    if (trip.status !== 'completed') return res.status(409).json({ error: 'El viaje no está listo para cobro' });
    // El monto confiable es el guardado en Firestore; el enviado por la app solo se contrasta.
    if (Number(amount) !== trip.fare) return res.status(400).json({ error: 'El monto no coincide con la tarifa del viaje' });
    const total = trip.fare + (trip.tip || 0);

    let url;
    if (trip.paymentMethod === 'stripe') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', client_reference_id: tripId,
        line_items: [{ quantity: 1, price_data: { currency: 'cop', product_data: { name: `Viaje ${tripId}` }, unit_amount: total * 100 } }], // Stripe usa 2 decimales para COP
        success_url: `${PUBLIC_URL}/payments/return`, cancel_url: `${PUBLIC_URL}/payments/return`,
      });
      url = session.url;
    } else {
      const pref = await new Preference(mp).create({ body: {
        items: [{ id: tripId, title: 'Viaje Rumbora', quantity: 1, unit_price: total, currency_id: 'COP' }],
        external_reference: tripId,
        notification_url: `${PUBLIC_URL}/webhooks/mercadopago`,
        back_urls: { success: `${PUBLIC_URL}/payments/return`, failure: `${PUBLIC_URL}/payments/return`, pending: `${PUBLIC_URL}/payments/return` },
        auto_return: 'approved',
      } });
      url = pref.sandbox_init_point || pref.init_point; // sandbox para cuentas de prueba
    }
    await db.doc(`trips/${tripId}`).update({ paymentStatus: 'pending' });
    res.json({ url });
  } catch (e) { console.error(e); res.status(500).json({ error: 'No se pudo crear el cobro' }); }
});

// Aviso push (Expo → FCM) a conductores disponibles de la categoría del viaje nuevo.
app.post('/notify/new-trip', auth, async (req, res) => {
  const trip = (await db.doc(`trips/${req.body.tripId}`).get()).data();
  if (!trip) return res.sendStatus(404);
  const drivers = await db.collection('drivers').where('available', '==', true).where('category', '==', trip.category).get();
  const messages = drivers.docs.map((d) => d.data().pushToken).filter(Boolean)
    .map((to) => ({ to, title: 'Nueva solicitud de viaje', body: `${trip.origin.address} → ${trip.destination.address}` }));
  if (messages.length) await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages) });
  res.json({ sent: messages.length });
});

app.listen(process.env.PORT || 3000, () => console.log('Backend listo'));


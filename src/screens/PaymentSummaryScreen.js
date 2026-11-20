// Code documentation: Application screen and its user interactions.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { doc, onSnapshot, serverTimestamp, updateDoc } from '../config/firestore';
import { db, isDemoMode } from '../config/firebase';
import { COP, colors } from '../config/theme';
import { PRICING } from '../config/pricing';
import { useApp } from '../context/AppContext';
import { createCheckout } from '../services/payments';
import { METHOD_LABEL, PAYMENT_LABEL } from '../utils/tripStatus';
import { Button, Card, Row, s } from '../components/ui';

export default function PaymentSummaryScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { setActiveTripId, t } = useApp();
  const [trip, setTrip] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // El backend actualiza paymentStatus/status; la app lo recibe en tiempo real.
  useEffect(() => onSnapshot(doc(db, 'trips', tripId), (snap) => setTrip({ id: snap.id, ...snap.data() })), [tripId]);

  const cash = async () => {
    await updateDoc(doc(db, 'trips', tripId), { status: 'paid', paymentStatus: 'cash', paidAt: serverTimestamp() });
  };
  const charge = async () => {
    setBusy(true); setError('');
    try {
      if (isDemoMode) {
        await updateDoc(doc(db, 'trips', tripId), {
          status: 'paid',
          paymentStatus: 'approved',
          paidAt: serverTimestamp(),
        });
        return;
      }
      const url = await createCheckout(tripId, trip.fare);
      await WebBrowser.openBrowserAsync(url); // el pasajero paga con tarjeta de prueba
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const home = () => { setActiveTripId(null); navigation.popToTop(); };

  if (!trip) return <View style={s.screen}><ActivityIndicator style={{ marginTop: 40 }} /></View>;
  const paid = trip.status === 'paid';
  const isCash = trip.paymentMethod === 'cash';
  const status = PAYMENT_LABEL[trip.paymentStatus] || 'Pendiente';

  return (
    <View style={[s.screen, s.pad]}>
      <Text style={s.h1}>Resumen del viaje</Text>
      <Card>
        {trip.rating && <Row label="Calificación del pasajero" value={`${'★'.repeat(trip.rating)} (${trip.rating}/5)`} />}
        <Row label="Tarifa final" value={COP(trip.fare)} />
        <Row label={`Comisión (${Math.round((trip.commissionRate ?? PRICING.commissionRate) * 100)} %)`} value={`- ${COP(Math.max(0, trip.commission || 0))}`} />
        {(trip.tip || 0) > 0 && <Row label="Propina" value={COP(Math.max(0, trip.tip))} />}
        <Row label="Ganancia neta" value={COP(Math.max(0, trip.driverEarnings || 0))} bold />
        <Row label="Método de pago" value={METHOD_LABEL[trip.paymentMethod]} />
        <Row label="Estado del pago" value={status} />
      </Card>
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {!paid && isCash && <Button title={t('cashReceived')} onPress={cash} />}
      {!paid && !isCash && (busy ? <ActivityIndicator /> : <Button title={isDemoMode ? 'Simular pago · demo' : t('charge')} onPress={charge} />)}
      {!paid && !isCash && <Text style={s.muted}>{isDemoMode ? 'El pago se simula localmente; no se realiza ningún cobro.' : 'Esta pantalla se actualiza sola cuando la pasarela confirme el pago.'}</Text>}
      {isCash && !paid && <Text style={s.muted}>La comisión se descontará de tu saldo.</Text>}
      {paid && <Button title={t('backHome')} onPress={home} />}
    </View>
  );
}


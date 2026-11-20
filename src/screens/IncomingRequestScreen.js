// Code documentation: Application screen and its user interactions.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { arrayUnion, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from '../config/firestore';
import { db, isDemoMode } from '../config/firebase';
import { PRICING } from '../config/pricing';
import { COP, colors } from '../config/theme';
import { useApp } from '../context/AppContext';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { getPickupEta } from '../services/directions';
import { calculateFare } from '../utils/calculateFare';
import { CATEGORY_LABEL, METHOD_LABEL, toCoords } from '../utils/tripStatus';
import { Button, Card, Row, s } from '../components/ui';

export default function IncomingRequestScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { driver, setActiveTripId, t } = useApp();
  const { location } = useDriverLocation(false, null);
  const [trip, setTrip] = useState(null);
  const [seconds, setSeconds] = useState(isDemoMode ? 90 : PRICING.requestTimeoutSec);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const done = useRef(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'trips', tripId), (snap) => {
      if (!snap.exists()) return;
      const data = { id: snap.id, ...snap.data() };
      setTrip(data);
      if (data.status !== 'requested' && !done.current) { done.current = true; navigation.goBack(); }
    });
    return unsub;
  }, [tripId, navigation]);

  const reject = useCallback(async () => {
    if (done.current) return;
    done.current = true;
    // La solicitud pasa al siguiente conductor (rejectedBy); si no quedan, el backend la marca rejected.
    await updateDoc(doc(db, 'trips', tripId), { rejectedBy: arrayUnion(driver.id) }).catch(() => {});
    navigation.goBack();
  }, [tripId, driver.id, navigation]);

  const accept = useCallback(async () => {
    if (done.current || busy) return;
    setBusy(true); setError('');
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'trips', tripId);
        const snap = await tx.get(ref);
        if (snap.data().status !== 'requested') throw new Error('Otro conductor ya tomó este viaje');
        tx.update(ref, { status: 'accepted', driverId: driver.id, acceptedAt: serverTimestamp() });
      });
      done.current = true;
      const eta = location && trip ? await getPickupEta(location, toCoords(trip.origin)).catch(() => null) : null;
      await updateDoc(doc(db, 'trips', tripId), {
        status: 'driver_arriving',
        ...(eta ? { pickupEtaMin: eta } : {}),
        commissionRate: PRICING.commissionRate, // se guarda para no alterar el historial si cambia el %
      });
      setActiveTripId(tripId);
      navigation.replace('Trip', { tripId });
    } catch (e) {
      setError(e.message); setBusy(false);
    }
  }, [busy, tripId, driver.id, location, trip, navigation, setActiveTripId]);

  // Temporizador de 15 s con limpieza; al llegar a cero se rechaza automáticamente.
  useEffect(() => {
    if (seconds <= 0) { reject(); return undefined; }
    const id = setTimeout(() => setSeconds((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, reject]);

  if (!trip) return <View style={s.screen}><ActivityIndicator style={{ marginTop: 40 }} /></View>;
  const est = calculateFare({ distanceKm: trip.distanceKm, durationMin: trip.durationMin, category: trip.category, tip: 0 });

  return (
    <View style={[s.screen, s.pad]}>
      <Text style={{ fontSize: 40, fontWeight: '800', color: seconds <= 5 ? colors.danger : colors.ink, textAlign: 'center' }}>{seconds}s</Text>
      <Card>
        <Row label="Pasajero" value={`${trip.passengerName || 'Pasajero demo'} · ★ ${trip.passengerRating || '5.0'}`} />
        <Row label="Origen" value={trip.origin.address} />
        <Row label="Destino" value={trip.destination.address} />
        <Row label="Distancia" value={`${trip.distanceKm.toFixed(1)} km`} />
        <Row label="Duración" value={`${trip.durationMin} min`} />
        <Row label="Categoría" value={CATEGORY_LABEL[trip.category]} />
        <Row label="Método de pago" value={METHOD_LABEL[trip.paymentMethod]} />
        <Row label="Tarifa estimada" value={COP(est.fare)} />
        <Row label="Ganancia neta estimada" value={COP(est.driverEarnings)} bold />
      </Card>
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
      <Button title={t('accept')} onPress={accept} disabled={busy} />
      <Button title={t('reject')} variant="danger" onPress={reject} disabled={busy} />
    </View>
  );
}


// Code documentation: Application screen and its user interactions.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from '../components/MapView';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from '../config/firestore';
import { db, isDemoMode } from '../config/firebase';
import { colors } from '../config/theme';
import { useApp } from '../context/AppContext';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { getRoute } from '../services/directions';
import { calculateFare } from '../utils/calculateFare';
import { toCoords } from '../utils/tripStatus';
import { Button, s } from '../components/ui';

function makeCallId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecentCall(timestamp) {
  const date = timestamp && typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  return !Number.isNaN(date.getTime()) && Date.now() - date.getTime() < 60000;
}

function navigateToTripStack(navigation, screen, params) {
  const stackNavigation = navigation.getParent();
  (stackNavigation || navigation).navigate(screen, params);
}

export default function TripScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { driver, setActiveTripId, t } = useApp();
  const { location, refreshLocation } = useDriverLocation(true, driver.id);
  const [trip, setTrip] = useState(null);
  const [path, setPath] = useState([]);
  const [routeEstimate, setRouteEstimate] = useState(null);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [startingCall, setStartingCall] = useState(false);
  const encoded = useRef('');
  const locRef = useRef(null);
  locRef.current = location;
  const ready = !!location;

  useEffect(() => onSnapshot(
    doc(db, 'trips', tripId),
    (snap) => {
      setTrip(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setError('');
    },
    (snapshotError) => {
      console.error('No se pudo cargar el viaje:', snapshotError);
      setError('No se pudo cargar el viaje. Revisa la conexión y las reglas de Firestore.');
    },
  ), [tripId]);

  useEffect(() => {
    if (isDemoMode) return undefined;
    const callsQuery = query(
      collection(db, 'tripCalls'),
      where('tripId', '==', tripId),
      where('calleeId', '==', driver.id),
    );
    return onSnapshot(callsQuery, (snapshot) => {
      const call = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .find((item) => item.calleeId === driver.id
          && item.callerId !== driver.id
          && item.status === 'ringing'
          && isRecentCall(item.createdAt));
      setIncomingCall(call || null);
    }, (snapshotError) => {
      console.error('No se pudieron observar llamadas entrantes:', snapshotError);
      setError('No se pudieron recibir llamadas. Revisa las reglas de Firestore.');
    });
  }, [driver.id, tripId]);

  const status = trip?.status;
  useEffect(() => {
    if (!trip || !ready || !['driver_arriving', 'in_progress'].includes(status)) return;
    // Directions solo se llama al entrar en cada fase, no en cada movimiento.
    const target = status === 'driver_arriving' ? trip.origin : trip.destination;
    const from = status === 'driver_arriving' ? locRef.current : toCoords(trip.origin);
    getRoute(from, toCoords(target))
      .then((r) => {
        setPath(r.coords);
        setRouteEstimate({ status, durationMin: r.durationMin, distanceKm: r.distanceKm });
        encoded.current = r.encoded;
        setError('');
      })
      .catch((routeError) => setError(routeError.message || 'No se pudo trazar la ruta'));
  }, [status, ready, trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status === 'cancelled') { setActiveTripId(null); navigation.popToTop(); }
  }, [status, navigation, setActiveTripId]);

  const update = useCallback((data) => updateDoc(doc(db, 'trips', tripId), data), [tripId]);
  const onBoard = useCallback(() => update({ status: 'in_progress', startedAt: serverTimestamp() }), [update]);
  const cancel = useCallback(() => update({ status: 'cancelled', cancelledBy: 'driver' }), [update]);
  const callPassenger = useCallback(async () => {
    if (startingCall || isDemoMode) return;
    if (!trip.passengerId) {
      setError('Este viaje no tiene un pasajero asociado para iniciar una llamada.');
      return;
    }
    setStartingCall(true);
    setError('');
    try {
      const callId = makeCallId();
      await setDoc(doc(db, 'tripCalls', callId), {
        tripId,
        callerId: driver.id,
        callerName: driver.fullName,
        calleeId: trip.passengerId,
        status: 'preparing',
        createdAt: serverTimestamp(),
      });
      navigateToTripStack(navigation, 'TripCall', {
        tripId,
        callId,
        direction: 'outgoing',
        remoteName: trip.passengerName || 'Pasajero',
      });
    } catch (callError) {
      console.error('No se pudo crear la llamada del viaje:', callError);
      setError('No se pudo iniciar la llamada. Revisa Firebase e inténtalo de nuevo.');
    } finally {
      setStartingCall(false);
    }
  }, [driver.fullName, driver.id, navigation, startingCall, trip, tripId]);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    setError('');
    try {
      const { fare, commission, driverEarnings } = calculateFare({
        distanceKm: trip.distanceKm, durationMin: trip.durationMin, category: trip.category, tip: trip.tip || 0,
      });
      await update({
        status: 'completed', fare, commission, driverEarnings,
        commissionRate: trip.commissionRate,
        routePolyline: encoded.current,
        paymentStatus: trip.paymentMethod === 'cash' ? 'cash' : 'pending',
        completedAt: serverTimestamp(),
      });
      navigation.replace('TripRating', { tripId });
    } catch (finishError) {
      console.error('No se pudo finalizar el viaje:', finishError);
      setError(finishError.message || 'No se pudo finalizar el viaje. Inténtalo otra vez.');
      setFinishing(false);
    }
  }, [finishing, trip, update, navigation, tripId]);

  if (!trip) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        {error ? <Text style={{ color: colors.danger, textAlign: 'center' }}>{error}</Text> : <ActivityIndicator />}
      </View>
    );
  }
  const arriving = status === 'driver_arriving';
  const target = toCoords(arriving ? trip.origin : trip.destination);
  const mapOrigin = arriving ? location : toCoords(trip.origin);
  const mapRegion = mapOrigin
    ? {
      latitude: (mapOrigin.latitude + target.latitude) / 2,
      longitude: (mapOrigin.longitude + target.longitude) / 2,
      latitudeDelta: Math.max(Math.abs(mapOrigin.latitude - target.latitude) * 1.8, 0.03),
      longitudeDelta: Math.max(Math.abs(mapOrigin.longitude - target.longitude) * 1.8, 0.03),
    }
    : { ...target, latitudeDelta: 0.03, longitudeDelta: 0.03 };
  const liveEstimate = routeEstimate?.status === status ? routeEstimate : null;
  const etaMin = arriving
    ? trip.pickupEtaMin || (isDemoMode ? 5 : liveEstimate?.durationMin)
    : isDemoMode ? trip.durationMin : liveEstimate?.durationMin || trip.durationMin;
  const routeDistanceKm = arriving
    ? null
    : isDemoMode ? trip.distanceKm : liveEstimate?.distanceKm;

  return (
    <View style={s.screen}>
      <MapView style={{ flex: 1 }} onLocate={refreshLocation} showsUserLocation
        userLocation={location} region={mapRegion}>
        <Marker coordinate={target} title={arriving ? 'Recogida' : 'Destino'} pinColor={arriving ? colors.accent : colors.danger} />
        {path.length > 0 && <Polyline coordinates={path} strokeWidth={5} strokeColor={colors.ink} />}
      </MapView>
      <View style={{ padding: 16, backgroundColor: '#fff' }}>
        <View style={{ alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 16, flexDirection: 'row', marginBottom: 12, padding: 14 }}>
          <View style={{ alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, height: 44, justifyContent: 'center', marginRight: 12, width: 44 }}>
            <Ionicons name="time-outline" size={23} color={colors.accentDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.accentDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>
              {arriving ? 'LLEGADA ESTIMADA AL PASAJERO' : 'LLEGADA ESTIMADA AL DESTINO'}
            </Text>
            <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: 2 }}>
              {etaMin ? `${etaMin} min` : 'Calculando ruta…'}
              {!!routeDistanceKm && <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '500' }}> · {routeDistanceKm.toFixed(1)} km</Text>}
            </Text>
          </View>
          {!!liveEstimate && (
            <Ionicons name="navigate-circle-outline" size={25} color={colors.accentDark} />
          )}
        </View>
        <Text style={s.h2}>{arriving ? 'Ve al punto de recogida' : 'Lleva al pasajero al destino'}</Text>
        <View style={{ alignItems: 'center', flexDirection: 'row', marginBottom: 8 }}>
          <Ionicons name={arriving ? 'location-outline' : 'flag-outline'} size={18} color={arriving ? colors.accent : colors.danger} />
          <Text style={[s.muted, { flex: 1, marginLeft: 6 }]}>{(arriving ? trip.origin : trip.destination).address}</Text>
        </View>
        {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
        {incomingCall && (
          <View style={{ backgroundColor: colors.accentSoft, borderRadius: 14, marginBottom: 8, padding: 12 }}>
            <Text style={{ color: colors.ink, fontWeight: '700', marginBottom: 4 }}>
              Llamada entrante de {incomingCall.callerName || trip.passengerName || 'Pasajero'}
            </Text>
            <Button
              title="Responder llamada"
              icon="call"
              onPress={() => navigateToTripStack(navigation, 'TripCall', {
                tripId,
                callId: incomingCall.id,
                direction: 'incoming',
                remoteName: incomingCall.callerName || trip.passengerName || 'Pasajero',
              })}
            />
          </View>
        )}
        <Button
          title={`Chat con ${trip.passengerName || 'el pasajero'}`}
          icon="chatbubble-ellipses-outline"
          variant="ghost"
          onPress={() => navigateToTripStack(navigation, 'TripChat', { tripId, passengerName: trip.passengerName })}
        />
        <Button
          title={startingCall ? 'Preparando llamada…' : 'Llamar al pasajero'}
          icon="call-outline"
          variant="ghost"
          onPress={callPassenger}
          disabled={startingCall || isDemoMode || !trip.passengerId}
        />
        {isDemoMode && (
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 6, textAlign: 'center' }}>
            Las llamadas se habilitan con Firebase y la app del pasajero conectada.
          </Text>
        )}
        {arriving && <Button title={t('passengerOnBoard')} onPress={onBoard} />}
        {arriving && <Button title={t('cancelTrip')} variant="danger" onPress={cancel} />}
        {status === 'in_progress' && <Button title={finishing ? 'Finalizando…' : t('finishTrip')} onPress={finish} disabled={finishing} />}
      </View>
    </View>
  );
}


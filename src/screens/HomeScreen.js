// Code documentation: Application screen and its user interactions.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import MapView from '../components/MapView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { doc, updateDoc } from '../config/firestore';
import { db, isDemoMode } from '../config/firebase';
import { useApp } from '../context/AppContext';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useTripRequests } from '../hooks/useTripRequests';
import { registerPushToken } from '../services/notifications';
import { colors } from '../config/theme';
import { Button, s } from '../components/ui';
import { createDemoRequest } from '../services/localDemoStore';
import { COPACABANA_CENTER, MEDELLIN_DEMO_ROUTE_COUNT } from '../services/medellinDemo';

export default function HomeScreen({ navigation }) {
  const { driver, t, activeTripId } = useApp();
  const focused = useIsFocused();
  const [available, setAvailable] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [actionError, setActionError] = useState('');
  const approved = driver?.status === 'approved';
  const tracking = available && approved && focused; // se detiene al salir de la pantalla
  const { location, error, refreshLocation } = useDriverLocation(tracking, driver?.id);
  const { requests, error: requestsError } = useTripRequests(available && approved, driver);
  const shown = useRef(null);
  const autoRequestDelay = useRef(8000);

  useEffect(() => {
    AsyncStorage.getItem('pref:available')
      .then((v) => v === '1' && approved && setAvailable(true))
      .catch((storageError) => {
        console.error('No se pudo recuperar el estado de disponibilidad:', storageError);
        setActionError('No se pudo recuperar tu preferencia de disponibilidad.');
      });
    if (driver?.id) {
      registerPushToken(driver.id).catch((notificationError) => {
        console.warn('No se pudo registrar la notificación push:', notificationError);
      });
    }
  }, [approved, driver?.id]);

  const toggle = useCallback(async (value) => {
    if (!approved) return;
    setActionError('');
    setAvailable(value);
    try {
      await AsyncStorage.setItem('pref:available', value ? '1' : '0');
      await updateDoc(doc(db, 'drivers', driver.id), { available: value });
    } catch (updateError) {
      console.error('No se pudo guardar el estado de disponibilidad:', updateError);
      setAvailable(!value);
      setActionError('No se pudo actualizar tu disponibilidad. Revisa la conexión e inténtalo de nuevo.');
    }
  }, [approved, driver?.id]);

  const requestDemoTrip = useCallback(async (paymentMethod) => {
    setDemoError('');
    autoRequestDelay.current = 30000;
    try {
      const tripId = await createDemoRequest(driver.id, driver.category, paymentMethod);
      const stackNavigation = navigation.getParent();
      (stackNavigation || navigation).navigate('IncomingRequest', { tripId });
    } catch (e) {
      setDemoError(e.message || 'No se pudo crear la solicitud de demostración');
    }
  }, [driver?.id, driver?.category, navigation]);

  useEffect(() => {
    if (!isDemoMode || !available || !approved || !focused || activeTripId || !driver?.id) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await createDemoRequest(driver.id, driver.category);
        autoRequestDelay.current = 30000;
      } catch (requestError) {
        console.error('No se pudo generar una solicitud demo de Medellín:', requestError);
        if (!cancelled) setDemoError('No se pudo generar el pasajero simulado. Inténtalo otra vez.');
      }
    }, autoRequestDelay.current);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [available, approved, focused, activeTripId, driver?.id, driver?.category]);

  useEffect(() => {
    const first = requests[0];
    if (first && shown.current !== first.id && focused) {
      shown.current = first.id;
      const stackNavigation = navigation.getParent();
      (stackNavigation || navigation).navigate('IncomingRequest', { tripId: first.id });
    }
  }, [requests, focused, navigation]);

  return (
    <View style={s.screen}>
      <MapView
        style={{ flex: 1 }}
        onLocate={refreshLocation}
        showsUserLocation
        region={{ ...(location || COPACABANA_CENTER), latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      />
      <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line }}>
        {!approved && <Text style={{ color: colors.warn, marginBottom: 8 }}>{t('pendingApproval')}</Text>}
        {!!error && <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text>}
        {!!requestsError && <Text style={{ color: colors.danger, marginBottom: 8 }}>{requestsError}</Text>}
        {!!actionError && <Text style={{ color: colors.danger, marginBottom: 8 }}>{actionError}</Text>}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: available ? colors.accent : colors.muted }}>
            {available ? t('available') : t('unavailable')}
          </Text>
          <Switch value={available} onValueChange={toggle} disabled={!approved} trackColor={{ true: colors.accent }} />
        </View>
        {isDemoMode && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 8 }}>
              Ubicación demo: Copacabana, Antioquia · {MEDELLIN_DEMO_ROUTE_COUNT} rutas de pasajeros por Centro, Laureles, Belén, San Javier, Envigado y El Poblado. Recibirás solicitudes automáticas al estar disponible.
            </Text>
            <Button title="Simular pasajero · efectivo" icon="cash-outline" onPress={() => requestDemoTrip('cash')} disabled={!available || !approved} />
            <Button title="Simular pasajero · tarjeta" icon="card-outline" variant="ghost" onPress={() => requestDemoTrip('mercadopago')} disabled={!available || !approved} />
            {!!demoError && <Text style={{ color: colors.danger, marginTop: 6 }}>{demoError}</Text>}
          </View>
        )}
      </View>
    </View>
  );
}


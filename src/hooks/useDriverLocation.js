// Code documentation: Reusable React hook with lifecycle and subscription logic.
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { doc, serverTimestamp, updateDoc } from '../config/firestore';
import { db, isDemoMode } from '../config/firebase';
import { PRICING } from '../config/pricing';
import { COPACABANA_CENTER } from '../services/medellinDemo';

// Ubicación inicial siempre; seguimiento + escritura en Firestore solo si `tracking` es true.
export function useDriverLocation(tracking, driverId) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const lastWrite = useRef(0);

  const refreshLocation = useCallback(async () => {
    if (isDemoMode) {
      setLocation(COPACABANA_CENTER);
      setError('');
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permite el acceso a tu ubicación para mostrarte en el mapa.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setError('');
    } catch (locationError) {
      console.error('No se pudo obtener la ubicación del conductor:', locationError);
      setError('No se pudo obtener tu ubicación. Revisa el permiso del navegador o dispositivo.');
    }
  }, []);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    if (isDemoMode || !tracking || !driverId) return undefined;
    let sub = null;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permite el acceso a tu ubicación para compartirla durante el viaje.');
          return;
        }
        const subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: PRICING.locationIntervalMs, distanceInterval: 10 },
          (position) => {
            const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            setLocation(coords);
            setError('');
            const now = Date.now();
            if (now - lastWrite.current >= PRICING.locationIntervalMs) {
              lastWrite.current = now;
              updateDoc(doc(db, 'drivers', driverId), {
                location: { lat: coords.latitude, lng: coords.longitude },
                locationUpdatedAt: serverTimestamp(),
              }).catch((writeError) => {
                console.error('No se pudo guardar la ubicación en Firebase:', writeError);
                setError('No se pudo compartir tu ubicación. Revisa la conexión con Firebase.');
              });
            }
          },
        );
        if (cancelled) subscription.remove(); else sub = subscription;
      } catch (locationError) {
        console.error('No se pudo iniciar el seguimiento de ubicación:', locationError);
        if (!cancelled) setError('No se pudo iniciar el seguimiento de ubicación.');
      }
    })();
    return () => { cancelled = true; if (sub) sub.remove(); }; // limpieza: detiene el seguimiento
  }, [tracking, driverId]);

  return { location, error, refreshLocation };
}


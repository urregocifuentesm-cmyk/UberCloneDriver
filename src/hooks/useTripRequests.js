// Code documentation: Reusable React hook with lifecycle and subscription logic.
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from '../config/firestore';
import { db } from '../config/firebase';

// Escucha solicitudes de la categoría del conductor mientras está disponible.
export function useTripRequests(enabled, driver) {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const driverId = driver?.id;
  const category = driver?.category;

  useEffect(() => {
    if (!enabled || !driverId) { setRequests([]); setError(''); return undefined; }
    const q = query(collection(db, 'trips'), where('status', '==', 'requested'), where('category', '==', category));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => !(t.rejectedBy || []).includes(driverId) && (!t.offeredTo || t.offeredTo === driverId));
      setRequests(list);
      setError('');
    }, (snapshotError) => {
      console.error('No se pudieron cargar las solicitudes de viaje:', snapshotError);
      setError('No se pudieron cargar las solicitudes. Revisa la conexión y las reglas de Firestore.');
    });
    return unsub;
  }, [enabled, driverId, category]);

  return { requests, error };
}


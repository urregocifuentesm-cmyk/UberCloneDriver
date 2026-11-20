// Code documentation: Reusable React hook with lifecycle and subscription logic.
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from '../config/firestore';
import { db } from '../config/firebase';
import { startOfDay, startOfMonth, startOfWeek, tsToDate } from '../utils/dates';

const summarize = (trips) => {
  const count = trips.length;
  const billed = trips.reduce((s, t) => s + (t.fare || 0), 0);
  const commissions = trips.reduce((s, t) => s + (t.commission || 0), 0);
  const tips = trips.reduce((s, t) => s + (t.tip || 0), 0);
  const net = Math.max(0, trips.reduce((s, t) => s + (t.driverEarnings || 0), 0));
  return { count, billed, commissions, tips, net, average: count ? Math.round(net / count) : 0 };
};

export function useEarnings(driverId) {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (!driverId) return undefined;
    const q = query(collection(db, 'trips'), where('driverId', '==', driverId), where('status', '==', 'paid'));
    const unsub = onSnapshot(q, (snap) =>
      setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data(), _date: tsToDate(d.data().completedAt) }))));
    return unsub;
  }, [driverId]);

  return useMemo(() => {
    const since = (from) => trips.filter((t) => t._date && t._date >= from);
    // Saldo: ganancias pagadas por pasarela menos comisiones de viajes en efectivo.
    const balance = Math.max(0, trips.reduce(
      (s, t) => s + (t.paymentMethod === 'cash' ? -(t.commission || 0) : t.driverEarnings || 0), 0));
    return {
      today: summarize(since(startOfDay())),
      week: summarize(since(startOfWeek())),
      month: summarize(since(startOfMonth())),
      balance,
    };
  }, [trips]);
}


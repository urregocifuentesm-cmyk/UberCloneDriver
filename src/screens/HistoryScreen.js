// Code documentation: Application screen and its user interactions.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, limit, orderBy, query, startAfter, Timestamp, where } from '../config/firestore';
import { db } from '../config/firebase';
import { PRICING } from '../config/pricing';
import { COP, colors } from '../config/theme';
import { useApp } from '../context/AppContext';
import { DateField } from '../components/Fields';
import { Empty, s } from '../components/ui';
import { endOfDay, formatDateTime, fromISODate, startOfDay, startOfMonth, startOfWeek, toISODate, tsToDate } from '../utils/dates';
import { CATEGORY_LABEL, METHOD_LABEL, PAYMENT_LABEL } from '../utils/tripStatus';

const Chip = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 6, marginBottom: 6,
    backgroundColor: active ? colors.ink : '#fff', borderWidth: 1, borderColor: colors.line }}>
    <Text style={{ color: active ? '#fff' : colors.ink }}>{label}</Text>
  </Pressable>
);

export default function HistoryScreen({ navigation }) {
  const { driver, t } = useApp();
  const [period, setPeriod] = useState('today');
  const [method, setMethod] = useState('all');
  const [from, setFrom] = useState(toISODate(startOfMonth()));
  const [to, setTo] = useState(toISODate(new Date()));
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const bounds = useCallback(() => {
    if (period === 'today') return [startOfDay(), endOfDay()];
    if (period === 'week') return [startOfWeek(), endOfDay()];
    if (period === 'month') return [startOfMonth(), endOfDay()];
    return [startOfDay(fromISODate(from)), endOfDay(fromISODate(to))];
  }, [period, from, to]);

  // Requiere índice compuesto: driverId (asc) + createdAt (desc). Firestore da el enlace para crearlo.
  const load = useCallback(async (reset) => {
    if (loading || (!reset && !more)) return;
    setLoading(true);
    try {
      const [a, b] = bounds();
      const parts = [collection(db, 'trips'), where('driverId', '==', driver.id),
        where('createdAt', '>=', Timestamp.fromDate(a)), where('createdAt', '<=', Timestamp.fromDate(b)),
        orderBy('createdAt', 'desc'), limit(PRICING.historyPageSize)];
      if (!reset && cursor) parts.push(startAfter(cursor));
      const snap = await getDocs(query(...parts));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => ['paid', 'completed', 'cancelled'].includes(x.status));
      setItems((prev) => (reset ? rows : [...prev, ...rows]));
      setCursor(snap.docs[snap.docs.length - 1] || null);
      setMore(snap.docs.length === PRICING.historyPageSize);
    } finally { setLoading(false); }
  }, [loading, more, bounds, driver.id, cursor]);

  useEffect(() => { setCursor(null); setMore(true); load(true); }, [period, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedSearch = search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visible = items.filter((i) => {
    if (method !== 'all' && i.paymentMethod !== method) return false;
    if (!normalizedSearch) return true;
    const text = [i.passengerName, i.origin?.address, i.destination?.address, i.id]
      .filter(Boolean)
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return text.includes(normalizedSearch);
  });

  const header = (
    <View style={{ padding: 12 }}>
      <View style={{ alignItems: 'center', backgroundColor: '#fff', borderColor: colors.line, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginBottom: 12, paddingHorizontal: 12 }}>
        <Ionicons name="search-outline" size={20} color={colors.muted} />
        <TextInput
          accessibilityLabel="Buscar viajes por pasajero o dirección"
          onChangeText={setSearch}
          placeholder="Pasajero, origen o destino"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={{ color: colors.ink, flex: 1, fontSize: 15, minHeight: 48, paddingHorizontal: 10 }}
          value={search}
        />
        {!!search && (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" hitSlop={10} onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[['today', t('today')], ['week', t('week')], ['month', t('month')], ['range', t('range')]].map(([k, l]) => (
          <Chip key={k} label={l} active={period === k} onPress={() => setPeriod(k)} />))}
      </View>
      {period === 'range' && (
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, marginRight: 6 }}><DateField label="Desde" value={from} onChange={setFrom} maximumDate={new Date()} /></View>
          <View style={{ flex: 1 }}><DateField label="Hasta" value={to} onChange={setTo} maximumDate={new Date()} /></View>
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[['all', t('allMethods')], ['mercadopago', 'Mercado Pago'], ['stripe', 'Stripe'], ['cash', 'Efectivo']].map(([k, l]) => (
          <Chip key={k} label={l} active={method === k} onPress={() => setMethod(k)} />))}
      </View>
    </View>
  );

  return (
    <FlatList
      style={s.screen}
      data={visible}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={header}
      ListEmptyComponent={loading
        ? <ActivityIndicator style={{ margin: 24 }} />
        : <Empty text={search ? 'No encontramos viajes cargados que coincidan con la búsqueda.' : t('emptyHistory')} />}
      onEndReached={() => load(false)}
      onEndReachedThreshold={0.4}
      ListFooterComponent={loading && visible.length ? <ActivityIndicator style={{ margin: 12 }} /> : null}
      renderItem={({ item }) => (
        <Pressable style={[s.card, { marginHorizontal: 12 }]} onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}>
          <Text style={s.muted}>{formatDateTime(tsToDate(item.createdAt))}</Text>
          <Text style={{ fontWeight: '600', color: colors.ink, marginVertical: 4 }}>{item.origin.address} → {item.destination.address}</Text>
          <Text style={s.muted}>{CATEGORY_LABEL[item.category]} · {METHOD_LABEL[item.paymentMethod]}</Text>
          {item.status === 'cancelled' ? <Text style={{ color: colors.danger }}>Cancelado</Text> : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text>Tarifa {COP(item.fare)}</Text>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>Neto {COP(item.driverEarnings)}</Text>
              <Text>{PAYMENT_LABEL[item.paymentStatus] || 'Pendiente'}</Text>
            </View>)}
        </Pressable>
      )}
    />
  );
}


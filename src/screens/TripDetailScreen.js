// Code documentation: Application screen and its user interactions.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import MapView, { Marker, Polyline } from '../components/MapView';
import { doc, getDoc } from '../config/firestore';
import { db } from '../config/firebase';
import { COP, colors } from '../config/theme';
import { decodePolyline } from '../services/directions';
import { formatDateTime, tsToDate } from '../utils/dates';
import { CATEGORY_LABEL, METHOD_LABEL, PAYMENT_LABEL, toCoords } from '../utils/tripStatus';
import { Card, Row, s } from '../components/ui';

export default function TripDetailScreen({ route }) {
  const [trip, setTrip] = useState(null);
  useEffect(() => {
    getDoc(doc(db, 'trips', route.params.tripId)).then((d) => setTrip({ id: d.id, ...d.data() }));
  }, [route.params.tripId]);
  if (!trip) return <View style={s.screen}><ActivityIndicator style={{ marginTop: 40 }} /></View>;

  // La ruta guardada se dibuja con Polyline (sin Static Maps, para cuidar el cupo).
  const path = trip.routePolyline ? decodePolyline(trip.routePolyline) : [];
  const o = toCoords(trip.origin); const d = toCoords(trip.destination);
  return (
    <ScrollView style={s.screen}>
      <MapView style={{ height: 240 }}
        initialRegion={{ latitude: (o.latitude + d.latitude) / 2, longitude: (o.longitude + d.longitude) / 2,
          latitudeDelta: Math.abs(o.latitude - d.latitude) * 1.8 + 0.01, longitudeDelta: Math.abs(o.longitude - d.longitude) * 1.8 + 0.01 }}>
        <Marker coordinate={o} pinColor={colors.accent} /><Marker coordinate={d} pinColor={colors.danger} />
        {path.length > 0 && <Polyline coordinates={path} strokeWidth={4} strokeColor={colors.ink} />}
      </MapView>
      <View style={s.pad}>
        <Card>
          <Row label="Fecha" value={formatDateTime(tsToDate(trip.createdAt))} />
          <Row label="Origen" value={trip.origin.address} />
          <Row label="Destino" value={trip.destination.address} />
          <Row label="Categoría" value={CATEGORY_LABEL[trip.category]} />
          <Row label="Distancia" value={`${trip.distanceKm?.toFixed(1)} km`} />
          <Row label="Duración" value={`${trip.durationMin} min`} />
          <Row label="Tarifa" value={COP(trip.fare)} />
          <Row label={`Comisión (${Math.round((trip.commissionRate || 0) * 100)} %)`} value={COP(trip.commission)} />
          <Row label="Propina" value={COP(trip.tip)} />
          <Row label="Ganancia neta" value={COP(trip.driverEarnings)} bold />
          <Row label="Pago" value={`${METHOD_LABEL[trip.paymentMethod]} · ${PAYMENT_LABEL[trip.paymentStatus] || 'Pendiente'}`} />
          <Row label="Calificación del pasajero" value={trip.rating ? `${'★'.repeat(trip.rating)} (${trip.rating}/5)` : 'Sin calificar'} />
        </Card>
      </View>
    </ScrollView>
  );
}


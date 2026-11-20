// Code documentation: Google Directions route lookup and route rendering data.
import { Platform } from 'react-native';
import { isDemoMode } from '../config/firebase';
import { loadGoogleMapsLibrary } from './googleMaps';

const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

async function getWebRoute(from, to) {
  const { DirectionsService, TravelMode } = await loadGoogleMapsLibrary('routes');
  const result = await new DirectionsService().route({
    origin: { lat: from.latitude, lng: from.longitude },
    destination: { lat: to.latitude, lng: to.longitude },
    travelMode: TravelMode.DRIVING,
  });
  const route = result.routes?.[0];
  const leg = route?.legs?.[0];
  if (!route || !leg?.distance || !leg.duration) {
    throw new Error('Google Maps no encontró una ruta para este viaje.');
  }
  return {
    encoded: route.overview_polyline,
    coords: route.overview_path.map((point) => ({ latitude: point.lat(), longitude: point.lng() })),
    distanceKm: leg.distance.value / 1000,
    durationMin: Math.ceil(leg.duration.value / 60),
  };
}

export function decodePolyline(str) {
  let index = 0, lat = 0, lng = 0;
  const out = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    out.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return out;
}

// Una llamada por fase del viaje (no por cada movimiento) para cuidar el cupo gratuito.
export async function getRoute(from, to) {
  if (isDemoMode) {
    const coords = Array.from({ length: 5 }, (_, i) => {
      const progress = i / 4;
      return {
        latitude: from.latitude + (to.latitude - from.latitude) * progress,
        longitude: from.longitude + (to.longitude - from.longitude) * progress,
      };
    });
    return { encoded: '', coords, distanceKm: 8.5, durationMin: 22 };
  }
  if (Platform.OS === 'web') return getWebRoute(from, to);
  if (!KEY) throw new Error('Falta EXPO_PUBLIC_GOOGLE_MAPS_KEY en .env.');
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${from.latitude},${from.longitude}` +
    `&destination=${to.latitude},${to.longitude}&mode=driving&key=${KEY}`;
  const json = await (await fetch(url)).json();
  const route = json.routes?.[0];
  if (!route) throw new Error('No se encontró ruta');
  const leg = route.legs[0];
  return {
    encoded: route.overview_polyline.points,
    coords: decodePolyline(route.overview_polyline.points),
    distanceKm: leg.distance.value / 1000,
    durationMin: Math.ceil(leg.duration.value / 60),
  };
}

// Distance Matrix: una vez al aceptar la solicitud (tiempo hasta el punto de recogida).
export async function getPickupEta(from, to) {
  if (isDemoMode) return 5;
  if (Platform.OS === 'web') return (await getWebRoute(from, to)).durationMin;
  if (!KEY) throw new Error('Falta EXPO_PUBLIC_GOOGLE_MAPS_KEY en .env.');
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${from.latitude},${from.longitude}` +
    `&destinations=${to.latitude},${to.longitude}&key=${KEY}`;
  const json = await (await fetch(url)).json();
  const el = json.rows?.[0]?.elements?.[0];
  return el?.status === 'OK' ? Math.ceil(el.duration.value / 60) : null;
}


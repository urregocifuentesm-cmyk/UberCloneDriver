// Code documentation: Web map adapter using Google Maps or an OpenStreetMap fallback.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadGoogleMapsLibrary } from '../services/googleMaps';
import { COPACABANA_CENTER } from '../services/medellinDemo';

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const defaultRegion = {
  ...COPACABANA_CENTER,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function Marker() {
  return null;
}

export function Polyline() {
  return null;
}

function getZoom(region) {
  return Math.max(3, Math.min(20, Math.round(Math.log2(360 / (region.latitudeDelta || 0.02)))));
}

function makeFallbackUrl(region, marker) {
  const latDelta = Math.max(region.latitudeDelta || 0.02, 0.01);
  const lngDelta = Math.max(region.longitudeDelta || 0.02, 0.01);
  const bounds = [
    region.longitude - lngDelta / 2,
    region.latitude - latDelta / 2,
    region.longitude + lngDelta / 2,
    region.latitude + latDelta / 2,
  ].join(',');
  const pin = marker ? `&marker=${marker.latitude},${marker.longitude}` : '';
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik${pin}`;
}

export default function MapView({
  children,
  initialRegion,
  onLocate,
  region,
  showsUserLocation,
  style,
  userLocation,
}) {
  const mapElement = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const routeRef = useRef([]);
  const userMarkerRef = useRef(null);
  const [mapsLibrary, setMapsLibrary] = useState(null);
  const [fallback, setFallback] = useState(!apiKey);
  const [mapError, setMapError] = useState('');
  const [locating, setLocating] = useState(false);
  const items = useMemo(() => React.Children.toArray(children), [children]);
  const markers = items.filter((item) => React.isValidElement(item) && item.type === Marker);
  const routes = items.filter((item) => React.isValidElement(item) && item.type === Polyline);
  const center = region || initialRegion || defaultRegion;
  const fallbackMarker = markers.find((marker) => marker.props.coordinate)?.props.coordinate;

  useEffect(() => {
    if (!apiKey) return undefined;
    let active = true;
    loadGoogleMapsLibrary('maps')
      .then((library) => {
        if (!active || !mapElement.current) return;
        const startRegion = region || initialRegion || defaultRegion;
        mapInstance.current = new library.Map(mapElement.current, {
          center: { lat: startRegion.latitude, lng: startRegion.longitude },
          zoom: getZoom(startRegion),
          clickableIcons: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
          mapTypeControl: false,
          streetViewControl: false,
          styles: mapStyles,
        });
        setMapsLibrary(library);
        setMapError('');
      })
      .catch((error) => {
        if (!active) return;
        setMapError(error.message || 'No se pudo cargar Google Maps.');
        setFallback(true);
      });

    return () => {
      active = false;
      markersRef.current.forEach((marker) => marker.setMap(null));
      routeRef.current.forEach((route) => route.setMap(null));
      if (userMarkerRef.current) userMarkerRef.current.setMap(null);
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapsLibrary || !mapInstance.current) return;
    const map = mapInstance.current;
    const maps = mapsLibrary;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = markers
      .filter((marker) => marker.props.coordinate)
      .map((marker) => new maps.Marker({
        map,
        position: { lat: marker.props.coordinate.latitude, lng: marker.props.coordinate.longitude },
        title: marker.props.title,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          fillColor: marker.props.pinColor || '#0F9D8A',
          fillOpacity: 1,
          scale: 8,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      }));

    routeRef.current.forEach((route) => route.setMap(null));
    routeRef.current = routes
      .filter((route) => route.props.coordinates?.length > 1)
      .map((route) => new maps.Polyline({
        map,
        path: route.props.coordinates,
        geodesic: true,
        strokeColor: route.props.strokeColor || '#1B2430',
        strokeOpacity: 0.9,
        strokeWeight: route.props.strokeWidth || 5,
      }));

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    const position = userLocation || region;
    if (showsUserLocation && position) {
      userMarkerRef.current = new maps.Marker({
        map,
        position: { lat: position.latitude, lng: position.longitude },
        title: 'Tu ubicación',
        zIndex: 1000,
        icon: {
          path: maps.SymbolPath.CIRCLE,
          fillColor: '#4285F4',
          fillOpacity: 1,
          scale: 7,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });
    }
  }, [items, mapsLibrary, region, routes, showsUserLocation, markers, userLocation]);

  useEffect(() => {
    if (mapInstance.current && region) {
      mapInstance.current.setCenter({ lat: region.latitude, lng: region.longitude });
    }
  }, [region]);

  const locate = async () => {
    if (!onLocate) return;
    setLocating(true);
    try {
      await onLocate();
    } finally {
      setLocating(false);
    }
  };

  return (
    <View
      accessibilityLabel="Mapa de ubicación del conductor"
      accessibilityRole="image"
      style={[{ backgroundColor: '#e8eef0', minHeight: 220, overflow: 'hidden', position: 'relative' }, style]}
    >
      <View ref={mapElement} style={{ height: '100%', width: '100%', display: fallback ? 'none' : 'flex' }} />
      {fallback && React.createElement('iframe', {
        title: 'Mapa OpenStreetMap',
        src: makeFallbackUrl(center, fallbackMarker),
        style: { border: 0, height: '100%', width: '100%' },
        loading: 'lazy',
        referrerPolicy: 'no-referrer-when-downgrade',
      })}
      {!!onLocate && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar mi ubicación"
          onPress={locate}
          hitSlop={8}
          style={{ alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, elevation: 3, height: 48, justifyContent: 'center', position: 'absolute', right: 14, top: 14, width: 48 }}
        >
          {locating
            ? <ActivityIndicator color="#0B8F72" />
            : <Ionicons name="locate-outline" size={23} color="#172B3A" />}
        </Pressable>
      )}
      {!fallback && !mapsLibrary && (
        <View style={statusStyle}>
          <ActivityIndicator color="#0F9D8A" />
          <Text style={statusTextStyle}>Cargando mapa…</Text>
        </View>
      )}
      {fallback && (
        <View style={[statusStyle, { bottom: 10, top: undefined }]}>
          <Text style={statusTextStyle}>
            {mapError ? 'Google Maps no disponible · OpenStreetMap' : '© OpenStreetMap'}
          </Text>
          {!!mapError && <Text style={{ color: '#6B7684', fontSize: 11, marginTop: 2 }}>{mapError}</Text>}
        </View>
      )}
    </View>
  );
}

const statusStyle = {
  alignItems: 'center',
  alignSelf: 'center',
  backgroundColor: 'rgba(255,255,255,0.94)',
  borderRadius: 10,
  paddingHorizontal: 14,
  paddingVertical: 10,
  position: 'absolute',
  top: 16,
};

const statusTextStyle = { color: '#1B2430', fontSize: 12, fontWeight: '600' };

const mapStyles = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2f5f2' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dcecf2' }] },
];


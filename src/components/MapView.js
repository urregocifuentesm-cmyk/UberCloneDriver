// Code documentation: Native map adapter for React Native Maps.
import React from 'react';
import NativeMapView, { Marker, Polyline } from 'react-native-maps';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export { Marker, Polyline };

export default function MapView({ onLocate, userLocation, style, ...props }) {
  return (
    <View style={[{ overflow: 'hidden', position: 'relative' }, style]}>
      <NativeMapView {...props} style={{ flex: 1 }} />
      {!!onLocate && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualizar mi ubicación"
          onPress={onLocate}
          hitSlop={8}
          style={{ alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, elevation: 3, height: 48, justifyContent: 'center', position: 'absolute', right: 14, top: 14, width: 48 }}
        >
          <Ionicons name="locate-outline" size={23} color="#172B3A" />
        </Pressable>
      )}
    </View>
  );
}


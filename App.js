import 'react-native-gesture-handler';
import React from 'react';
import { Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/context/AppContext';
import {
  firebaseConfigurationError,
  firebaseConfigurationMessage,
  isDemoMode,
} from './src/config/firebase';
import { colors } from './src/config/theme';
import Navigation from './src/navigation';

// Application root: handles global configuration errors, demo warnings, providers, and navigation.
export default function App() {
  if (firebaseConfigurationError) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: colors.paper, flex: 1, justifyContent: 'center', padding: 28 }}>
        <StatusBar style="dark" />
        <View style={{ backgroundColor: colors.card, borderRadius: 18, maxWidth: 520, padding: 24, width: '100%' }}>
          <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '700', marginBottom: 10 }}>
            Configura Firebase
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23 }}>
            {firebaseConfigurationMessage || 'Completa EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, EXPO_PUBLIC_FIREBASE_PROJECT_ID y EXPO_PUBLIC_FIREBASE_APP_ID en .env. Después reinicia Expo.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <AppProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {isDemoMode && (
          <View style={{ backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: colors.accentDark, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
              RUMBORA DEMO · pasajeros y pagos simulados
            </Text>
          </View>
        )}
        <Navigation />
      </View>
    </AppProvider>
  );
}

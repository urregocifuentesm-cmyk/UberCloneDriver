// Code documentation: Application source module.
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Public Firebase configuration loaded from Expo environment variables.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);

// Demo mode is enabled explicitly or automatically when Firebase is not configured.
const demoFlag = process.env.EXPO_PUBLIC_DEMO_MODE;
export const isDemoMode = demoFlag === 'true' || (!demoFlag && !isFirebaseConfigured);
let authInstance = null;
let firestoreInstance = null;
let initializationError = '';

// Initialize Firebase Authentication and Firestore only outside demo mode.
if (isFirebaseConfigured && !isDemoMode) {
  try {
    const app = getApps().find((item) => item.name === '[DEFAULT]') || initializeApp(firebaseConfig);
    if (Platform.OS === 'web') {
      authInstance = getAuth(app);
    } else {
      try {
        authInstance = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
      } catch (error) {
        if (error.code !== 'auth/already-initialized') throw error;
        authInstance = getAuth(app);
      }
    }
    firestoreInstance = getFirestore(app);
  } catch (error) {
    if (!['auth/invalid-api-key', 'app/invalid-app-options'].includes(error.code)) throw error;
    initializationError = 'Firebase rechazó la configuración. Verifica las variables del archivo .env.';
    console.error(initializationError, error);
  }
}

export const auth = authInstance;
export const db = firestoreInstance;
export const firebaseConfigurationError = !isDemoMode && (!isFirebaseConfigured || !!initializationError);
export const firebaseConfigurationMessage = initializationError;


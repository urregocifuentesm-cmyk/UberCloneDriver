// Code documentation: Global session, profile, trip, language, and connection state.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from '../config/auth';
import { doc, onSnapshot, updateDoc } from '../config/firestore';
import { auth, db } from '../config/firebase';
import { translate } from '../config/i18n';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Sesión del conductor + viaje activo + idioma. AsyncStorage solo guarda preferencias.
export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(undefined); // undefined = cargando, null = sin registro
  const [authReady, setAuthReady] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [activeTripId, setActiveTripId] = useState(null);
  const [language, setLanguageState] = useState('es');

  useEffect(() => {
    AsyncStorage.getItem('pref:language').then((l) => l && setLanguageState(l));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      setConnectionError('');
      if (!u) setDriver(undefined);
    }, (error) => {
      console.error('No se pudo observar la sesión de Firebase:', error);
      setAuthReady(true);
      setConnectionError('No se pudo conectar con Firebase Authentication. Revisa la configuración y la conexión.');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const unsub = onSnapshot(
      doc(db, 'drivers', user.uid),
      (snap) => {
        setDriver(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setConnectionError('');
      },
      (error) => {
        console.error('No se pudo leer el perfil del conductor en Firestore:', error);
        setConnectionError('No se pudo cargar tu perfil desde Firestore. Revisa las reglas y la conexión.');
      },
    );
    return unsub;
  }, [user]);

  const setLanguage = useCallback(async (l) => {
    setLanguageState(l);
    await AsyncStorage.setItem('pref:language', l);
    if (user) updateDoc(doc(db, 'drivers', user.uid), { language: l }).catch(() => {});
  }, [user]);

  const t = useCallback((key) => translate(language, key), [language]);
  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({ user, driver, authReady, connectionError, activeTripId, setActiveTripId, language, setLanguage, t, logout }),
    [user, driver, authReady, connectionError, activeTripId, language, setLanguage, t, logout],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}


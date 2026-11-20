// Code documentation: Application screen and its user interactions.
import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createUserWithEmailAndPassword, signInDemo, signInWithEmailAndPassword } from '../config/auth';
import { auth, isDemoMode } from '../config/firebase';
import { TextField } from '../components/Fields';
import { Button, s } from '../components/ui';
import { colors } from '../config/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setBusy(true); setError('');
    try {
      if (mode === 'login') await signInWithEmailAndPassword(auth, email.trim(), password);
      else await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(e.code === 'auth/invalid-credential' ? 'Correo o contraseña incorrectos' : 'No se pudo continuar: revisa los datos');
    } finally { setBusy(false); }
  };
  const demo = async () => {
    setBusy(true); setError('');
    try { await signInDemo(); }
    catch (e) { setError(e.message || 'No se pudo iniciar la demostración'); }
    finally { setBusy(false); }
  };
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && password.length >= 6;

  return (
    <View style={[s.screen, { justifyContent: 'center', padding: 24 }]}>
      <Text style={[s.h1, { fontSize: 30, textAlign: 'center' }]}>Rumbora</Text>
      <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 1.5, marginBottom: 20, textAlign: 'center' }}>
        CONDUCTOR
      </Text>
      {isDemoMode ? (
        <>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 16, textAlign: 'center' }}>
            Accede con un conductor de prueba para recorrer una solicitud, completar un viaje y revisar ganancias e historial.
          </Text>
          {busy ? <ActivityIndicator /> : <Button title="Continuar como conductor demo" onPress={demo} />}
          {!!error && <Text style={{ color: colors.danger, marginTop: 8, textAlign: 'center' }}>{error}</Text>}
        </>
      ) : (
        <>
          <TextField label="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField label="Contraseña (mínimo 6)" value={password} onChangeText={setPassword} secureTextEntry error={error} />
          {busy ? <ActivityIndicator /> : <Button title={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} onPress={go} disabled={!ok} />}
          <Button variant="ghost" title={mode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} />
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>Después de crear la cuenta completarás tu registro de conductor.</Text>
        </>
      )}
    </View>
  );
}


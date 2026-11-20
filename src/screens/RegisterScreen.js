// Code documentation: Application screen and its user interactions.
import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { doc, serverTimestamp, setDoc } from '../config/firestore';
import { db, isDemoMode } from '../config/firebase';
import { useApp } from '../context/AppContext';
import { uploadImage } from '../services/cloudinary';
import { Button, s } from '../components/ui';
import { colors } from '../config/theme';
import { RegistrationProvider, useReg } from './register/RegistrationContext';
import PersonalTab from './register/PersonalTab';
import VehicleTab from './register/VehicleTab';
import DocumentsTab from './register/DocumentsTab';

const Tab = createBottomTabNavigator();
const IMAGE_FIELDS = ['photo', 'vehiclePhoto', 'licensePhoto', 'soatPhoto', 'rtmPhoto'];

function SubmitBar() {
  const { form, allValid } = useReg();
  const { user, setLanguage } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const data = { ...form, plate: form.plate.toUpperCase(), email: form.email.trim(), mpEmail: form.mpEmail.trim() };
      for (const k of IMAGE_FIELDS) if (data[k]) data[k] = await uploadImage(data[k]);
      await setDoc(doc(db, 'drivers', user.uid), {
        ...data,
        capacity: Number(data.capacity), year: Number(data.year),
        status: isDemoMode ? 'approved' : 'pending',
        available: false,
        createdAt: serverTimestamp(),
      }, { merge: true });
      setLanguage(form.language);
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <View style={{ padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.line }}>
      {!!error && <Text style={{ color: colors.danger, marginBottom: 4 }}>{error}</Text>}
      {busy ? <ActivityIndicator /> : <Button title="Enviar registro" onPress={submit} disabled={!allValid} />}
    </View>
  );
}

function Tabs() {
  const { tabValid } = useReg();
  const label = (name, tab) => `${name} ${tabValid(tab) ? '✓' : '•'}`;
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: colors.accent, tabBarIconStyle: { display: 'none' }, tabBarLabelStyle: { fontSize: 13, marginBottom: 14 } }}>
      <Tab.Screen name="Personal" component={PersonalTab} options={{ title: label('Datos personales', 'personal') }} />
      <Tab.Screen name="Vehiculo" component={VehicleTab} options={{ title: label('Vehículo', 'vehicle') }} />
      <Tab.Screen name="Documentos" component={DocumentsTab} options={{ title: label('Documentos', 'documents') }} />
    </Tab.Navigator>
  );
}

export default function RegisterScreen() {
  const { user, logout } = useApp();
  return (
    <RegistrationProvider initial={{ email: user?.email || '' }}>
      <View style={s.screen}>
        <View style={{ flex: 1 }}><Tabs /></View>
        <SubmitBar />
        <Button title="Cerrar sesión" variant="ghost" onPress={logout} style={{ marginHorizontal: 12 }} />
      </View>
    </RegistrationProvider>
  );
}


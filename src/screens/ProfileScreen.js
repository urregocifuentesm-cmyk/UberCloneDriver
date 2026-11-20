// Code documentation: Application screen and its user interactions.
import React, { useState } from 'react';
import { Image, ScrollView, Text } from 'react-native';
import { doc, updateDoc } from '../config/firestore';
import { db } from '../config/firebase';
import { useApp } from '../context/AppContext';
import { SelectField, TextField } from '../components/Fields';
import { Button, Card, Row, s } from '../components/ui';
import { colors } from '../config/theme';
import { CATEGORY_LABEL } from '../utils/tripStatus';
import { GENDERS, validateField } from '../utils/validators';

export default function ProfileScreen() {
  const { driver, user, language, setLanguage, logout, t } = useApp();
  const [form, setForm] = useState({
    fullName: driver.fullName || '',
    phone: driver.phone || '',
    gender: driver.gender || '',
    email: driver.email || user?.email || '',
    mpEmail: driver.mpEmail || '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const errors = Object.fromEntries(Object.keys(form).map((k) => [k, validateField(k, form)]));
  const valid = Object.values(errors).every((e) => !e);
  const set = (k) => (v) => { setSaved(false); setError(''); setForm((p) => ({ ...p, [k]: v })); };

  const save = async () => {
    if (!valid) return;
    try {
      await updateDoc(doc(db, 'drivers', driver.id), form);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message || 'No se pudieron guardar los cambios');
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      {!!driver.photo && <Image source={{ uri: driver.photo }} style={{ width: 90, height: 90, borderRadius: 45, alignSelf: 'center', marginBottom: 8 }} />}
      <Text style={{ textAlign: 'center', color: colors.muted, marginBottom: 12 }}>Estado de la cuenta: {driver.status === 'approved' ? 'Aprobado' : 'Pendiente de aprobación'}</Text>
      <TextField label="Nombre completo" value={form.fullName} onChangeText={set('fullName')} error={errors.fullName} />
      <TextField label="Celular" value={form.phone} onChangeText={set('phone')} keyboardType="number-pad" maxLength={10} error={errors.phone} />
      <SelectField label="Género" value={form.gender} onChange={set('gender')} items={GENDERS} error={errors.gender} />
      <TextField label="Correo electrónico" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} />
      <TextField label="Correo de Mercado Pago" value={form.mpEmail} onChangeText={set('mpEmail')} autoCapitalize="none" error={errors.mpEmail} />
      <SelectField label={t('language')} value={language} onChange={setLanguage} items={[{ label: 'Español', value: 'es' }, { label: 'English', value: 'en' }]} />
      <Button title={t('save')} onPress={save} disabled={!valid} />
      {saved && <Text style={{ color: colors.accent, textAlign: 'center' }}>Cambios guardados</Text>}
      {!!error && <Text style={{ color: colors.danger, textAlign: 'center' }}>{error}</Text>}
      <Card>
        <Text style={s.h2}>Vehículo</Text>
        <Row label="Categoría" value={CATEGORY_LABEL[driver.category]} />
        <Row label="Placa" value={driver.plate} />
        <Row label="Vehículo" value={`${driver.brand} ${driver.model} ${driver.year}`} />
        <Row label="Color / capacidad" value={`${driver.color} / ${driver.capacity}`} />
      </Card>
      <Card>
        <Text style={s.h2}>Documentos</Text>
        <Row label="Licencia vence" value={driver.licenseExpiry} />
        <Row label="SOAT vence" value={driver.soatExpiry} />
        {!!driver.rtmExpiry && <Row label="Técnico-mecánica vence" value={driver.rtmExpiry} />}
      </Card>
      <Button title={t('logout')} variant="ghost" onPress={logout} />
    </ScrollView>
  );
}


// Code documentation: Driver registration tab or registration state logic.
import React from 'react';
import { ScrollView } from 'react-native';
import { CheckField, DateField, ImageField, SelectField, TextField } from '../../components/Fields';
import { GENDERS } from '../../utils/validators';
import { useReg } from './RegistrationContext';

export default function PersonalTab() {
  const { bind } = useReg();
  const max = new Date(); max.setFullYear(max.getFullYear() - 18);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <ImageField label="Foto de perfil" {...pick(bind('photo'))} />
      <TextField label="Nombre completo (máx. 50)" maxLength={50} autoCapitalize="words" {...txt(bind('fullName'))} />
      <TextField label="Documento de identidad" keyboardType="number-pad" maxLength={10} {...txt(bind('idNumber'))} />
      <TextField label="Número de celular" keyboardType="number-pad" maxLength={10} {...txt(bind('phone'))} />
      <DateField label="Fecha de nacimiento (mayor de 18)" maximumDate={max} {...pick(bind('birthDate'))} />
      <SelectField label="Género" items={GENDERS} {...pick(bind('gender'))} />
      <TextField label="Correo electrónico" keyboardType="email-address" autoCapitalize="none" {...txt(bind('email'))} />
      <SelectField label="Idioma" items={[{ label: 'Español', value: 'es' }, { label: 'English', value: 'en' }]} {...pick(bind('language'))} />
    </ScrollView>
  );
}
// Helpers para pasar solo las props que usa cada tipo de campo.
export const txt = ({ value, onChangeText, onBlur, error }) => ({ value, onChangeText, onBlur, error });
export const pick = ({ value, onChange, error }) => ({ value, onChange, error });


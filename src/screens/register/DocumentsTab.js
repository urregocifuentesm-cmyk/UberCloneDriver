// Code documentation: Driver registration tab or registration state logic.
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { CheckField, DateField, ImageField, TextField } from '../../components/Fields';
import { PRICING } from '../../config/pricing';
import { rtmRequired } from '../../utils/validators';
import { useReg } from './RegistrationContext';
import { pick, txt } from './PersonalTab';
import { colors } from '../../config/theme';

export default function DocumentsTab() {
  const { bind, form } = useReg();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const pct = Math.round(PRICING.commissionRate * 100);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <TextField label="Número de licencia de conducción" autoCapitalize="characters" {...txt(bind('licenseNumber'))} />
      <ImageField label="Foto de la licencia" {...pick(bind('licensePhoto'))} />
      <DateField label="Vencimiento de la licencia" minimumDate={tomorrow} {...pick(bind('licenseExpiry'))} />
      <ImageField label="Foto del SOAT" {...pick(bind('soatPhoto'))} />
      <DateField label="Vencimiento del SOAT" minimumDate={tomorrow} {...pick(bind('soatExpiry'))} />
      {rtmRequired(form) ? (
        <>
          <ImageField label="Foto de la revisión técnico-mecánica" {...pick(bind('rtmPhoto'))} />
          <DateField label="Vencimiento de la revisión técnico-mecánica" minimumDate={tomorrow} {...pick(bind('rtmExpiry'))} />
        </>
      ) : (
        <Text style={{ color: colors.muted, marginBottom: 14 }}>
          La revisión técnico-mecánica aplica para vehículos con 5 años o más.
        </Text>
      )}
      <TextField label="Correo de tu cuenta de Mercado Pago" keyboardType="email-address" autoCapitalize="none" {...txt(bind('mpEmail'))} />
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 14 }}>
        No guardamos números de cuenta ni de tarjeta: los maneja la pasarela de pago.
      </Text>
      <CheckField label={`Acepto los términos. La plataforma cobra una comisión del ${pct} % sobre la tarifa de cada viaje.`} {...pick(bind('acceptTerms'))} />
    </ScrollView>
  );
}


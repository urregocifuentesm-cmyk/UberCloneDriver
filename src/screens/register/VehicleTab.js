// Code documentation: Driver registration tab or registration state logic.
import React from 'react';
import { ScrollView } from 'react-native';
import { ImageField, SelectField, TextField } from '../../components/Fields';
import { CATEGORIES, COLORS } from '../../utils/validators';
import { useReg } from './RegistrationContext';
import { pick, txt } from './PersonalTab';

export default function VehicleTab() {
  const { bind } = useReg();
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <SelectField label="Categoría" items={CATEGORIES} {...pick(bind('category'))} />
      <TextField label="Placa (ABC123)" autoCapitalize="characters" maxLength={6} {...txt(bind('plate'))} />
      <TextField label="Marca (máx. 30)" maxLength={30} {...txt(bind('brand'))} />
      <TextField label="Modelo (máx. 30)" maxLength={30} {...txt(bind('model'))} />
      <TextField label="Año" keyboardType="number-pad" maxLength={4} {...txt(bind('year'))} />
      <SelectField label="Color" items={COLORS} {...pick(bind('color'))} />
      <TextField label="Capacidad de pasajeros (XL: mínimo 6)" keyboardType="number-pad" maxLength={2} {...txt(bind('capacity'))} />
      <ImageField label="Foto del vehículo (la placa debe verse)" {...pick(bind('vehiclePhoto'))} />
    </ScrollView>
  );
}


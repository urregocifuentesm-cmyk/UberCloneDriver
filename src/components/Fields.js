// Code documentation: Reusable form fields, selectors, date pickers, images, and validation feedback.
import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../config/theme';
import { fromISODate, toISODate } from '../utils/dates';

const Wrap = ({ label, error, children }) => (
  <View style={f.wrap}>
    <Text style={f.label}>{label}</Text>
    {children}
    {!!error && <Text style={f.error}>{error}</Text>}
  </View>
);

export const TextField = ({ label, error, onBlur, ...props }) => (
  <Wrap label={label} error={error}>
    <TextInput style={[f.input, !!error && f.inputErr]} onBlur={onBlur} placeholderTextColor={colors.muted} {...props} />
  </Wrap>
);

// items: [{label, value}] o strings
export function SelectField({ label, value, onChange, items, error }) {
  const list = items.map((i) => (typeof i === 'string' ? { label: i, value: i } : i));
  return (
    <Wrap label={label} error={error}>
      <View style={[f.input, { padding: 0 }, !!error && f.inputErr]}>
        <Picker selectedValue={value || ''} onValueChange={(v) => onChange(v)}>
          <Picker.Item label="Selecciona…" value="" color={colors.muted} />
          {list.map((i) => <Picker.Item key={i.value} label={i.label} value={i.value} />)}
        </Picker>
      </View>
    </Wrap>
  );
}

export function DateField({ label, value, onChange, error, minimumDate, maximumDate }) {
  const [show, setShow] = useState(false);
  return (
    <Wrap label={label} error={error}>
      <Pressable style={[f.input, !!error && f.inputErr]} onPress={() => setShow(true)}>
        <Text style={{ color: value ? colors.ink : colors.muted }}>{value || 'Selecciona una fecha'}</Text>
      </Pressable>
      {show && (
        <DateTimePicker
          value={value ? fromISODate(value) : maximumDate || new Date()}
          mode="date"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(e, d) => {
            if (Platform.OS === 'android') setShow(false);
            if (e.type !== 'dismissed' && d) onChange(toISODate(d));
          }}
        />
      )}
    </Wrap>
  );
}

export function ImageField({ label, value, onChange, error }) {
  const pick = async (camera) => {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const opts = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled) onChange(res.assets[0].uri);
  };
  const choose = () =>
    Alert.alert(label, 'Elige el origen de la imagen', [
      { text: 'Cámara', onPress: () => pick(true) },
      { text: 'Galería', onPress: () => pick(false) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  return (
    <Wrap label={label} error={error}>
      <Pressable style={[f.imgBox, !!error && f.inputErr]} onPress={choose}>
        {value ? <Image source={{ uri: value }} style={f.img} /> : <Text style={{ color: colors.muted }}>Toca para agregar foto</Text>}
      </Pressable>
    </Wrap>
  );
}

export const CheckField = ({ label, value, onChange, error }) => (
  <View style={f.wrap}>
    <Pressable style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => onChange(!value)}>
      <View style={[f.box, value && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
        {value && <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text>}
      </View>
      <Text style={{ flex: 1, color: colors.ink }}>{label}</Text>
    </Pressable>
    {!!error && <Text style={f.error}>{error}</Text>}
  </View>
);

const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, backgroundColor: '#fff', fontSize: 15 },
  inputErr: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  imgBox: { height: 120, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  box: { width: 24, height: 24, borderWidth: 1.5, borderColor: colors.muted, borderRadius: 6, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
});


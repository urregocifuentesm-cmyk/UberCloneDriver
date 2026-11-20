// Code documentation: Reusable visual components and shared screen styles.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/theme';

export function Button({ title, onPress, disabled, variant = 'primary', style, icon }) {
  const bg = variant === 'danger' ? colors.danger : variant === 'ghost' ? 'transparent' : colors.accent;
  const color = variant === 'ghost' ? colors.ink : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[s.btn, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.line }, style]}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
        {!!icon && <Ionicons name={icon} size={19} color={color} />}
        <Text style={[s.btnText, { color }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

export const Card = ({ children, style }) => <View style={[s.card, style]}>{children}</View>;

export const Row = ({ label, value, bold }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <Text style={[s.rowValue, bold && { fontWeight: '700', color: colors.accent }]}>{value}</Text>
  </View>
);

export const Empty = ({ text }) => (
  <View style={{ padding: 32, alignItems: 'center' }}>
    <Text style={{ color: colors.muted, textAlign: 'center', lineHeight: 22 }}>{text}</Text>
  </View>
);

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  pad: { padding: 16 },
  btn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginVertical: 6 },
  btnText: { fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 18, marginVertical: 8, borderWidth: 1, borderColor: colors.line, elevation: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { color: colors.muted, fontSize: 14, flexShrink: 1, paddingRight: 8 },
  rowValue: { color: colors.ink, fontSize: 14, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  h1: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  muted: { color: colors.muted },
});


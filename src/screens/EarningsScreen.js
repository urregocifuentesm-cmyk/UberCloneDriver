// Code documentation: Application screen and its user interactions.
import React from 'react';
import { ScrollView, Text } from 'react-native';
import { COP, colors } from '../config/theme';
import { useApp } from '../context/AppContext';
import { useEarnings } from '../hooks/useEarnings';
import { Card, Row, s } from '../components/ui';

function Block({ title, d }) {
  return (
    <Card>
      <Text style={s.h2}>{title}</Text>
      <Row label="Viajes" value={d.count} />
      <Row label="Total facturado" value={COP(d.billed)} />
      <Row label="Comisiones" value={COP(d.commissions)} />
      <Row label="Propinas" value={COP(d.tips)} />
      <Row label="Ganancia neta" value={COP(d.net)} bold />
      <Row label="Promedio por viaje" value={COP(d.average)} />
    </Card>
  );
}

export default function EarningsScreen() {
  const { driver, t } = useApp();
  const { today, week, month, balance } = useEarnings(driver.id);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Card>
        <Text style={s.muted}>{t('balance')}</Text>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>{COP(Math.max(0, balance))}</Text>
        <Text style={[s.muted, { fontSize: 12 }]}>Saldo disponible después de descontar comisiones pendientes.</Text>
      </Card>
      <Block title={t('today')} d={today} />
      <Block title={t('week')} d={week} />
      <Block title={t('month')} d={month} />
    </ScrollView>
  );
}


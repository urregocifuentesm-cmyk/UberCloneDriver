// Code documentation: Automated tests for application behavior.
import { calculateFare } from '../utils/calculateFare';

test('Económico 8,5 km / 22 min (ejemplo sección 5)', () => {
  expect(calculateFare({ distanceKm: 8.5, durationMin: 22, category: 'economy', tip: 0 }))
    .toEqual({ fare: 19200, commission: 3840, driverEarnings: 15360 });
});
test('XL 8,5 km / 22 min', () => {
  expect(calculateFare({ distanceKm: 8.5, durationMin: 22, category: 'xl', tip: 0 }))
    .toEqual({ fare: 26900, commission: 5380, driverEarnings: 21520 });
});
test('aplica tarifa mínima y propina completa al conductor', () => {
  const r = calculateFare({ distanceKm: 0.5, durationMin: 2, category: 'economy', tip: 2000 });
  expect(r.fare).toBe(6000);
  expect(r.driverEarnings).toBe(6000 - 1200 + 2000);
});

test('sanitiza distancias, duraciones y propinas negativas', () => {
  const r = calculateFare({ distanceKm: -10, durationMin: -20, category: 'economy', tip: -500 });
  expect(r.fare).toBe(6000);
  expect(r.commission).toBe(1200);
  expect(r.driverEarnings).toBe(4800);
});


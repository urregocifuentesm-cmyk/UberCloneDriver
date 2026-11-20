// Code documentation: Central pricing categories and service configuration.
// Único lugar donde se configuran tarifas y comisión. Valores didácticos, en COP enteros.
export const PRICING = {
  baseFare: 3500,
  perKm: 1200,
  perMinute: 250,
  minimumFare: 6000,
  multipliers: { economy: 1.0, xl: 1.4, premium: 1.8 },
  commissionRate: 0.2,
  roundTo: 100,
  xlMinCapacity: 6,
  requestTimeoutSec: 15,
  locationIntervalMs: 5000,
  historyPageSize: 20,
};


// Code documentation: Pure fare, commission, and driver earnings calculation.
import { PRICING } from '../config/pricing';

/**
 * Función pura usada en la estimación del pasajero y en el cierre del viaje.
 * Devuelve pesos colombianos enteros.
 */
export function calculateFare({ distanceKm, durationMin, category = 'economy', tip = 0 }) {
  const multiplier = PRICING.multipliers[category] ?? 1;
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const safeDuration = Math.max(0, Number(durationMin) || 0);
  const safeTip = Math.max(0, Number(tip) || 0);
  const raw =
    (PRICING.baseFare + safeDistance * PRICING.perKm + safeDuration * PRICING.perMinute) * multiplier;
  const withMinimum = Math.max(PRICING.minimumFare, raw);
  const fare = Math.round(withMinimum / PRICING.roundTo) * PRICING.roundTo;
  const commission = Math.round(fare * PRICING.commissionRate);
  const driverEarnings = Math.max(0, fare - commission + safeTip);
  return { fare, commission, driverEarnings };
}


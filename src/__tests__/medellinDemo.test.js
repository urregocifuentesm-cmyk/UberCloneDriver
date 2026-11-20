// Code documentation: Automated tests for application behavior.
import {
  createMedellinDemoRequest,
  MEDELLIN_DEMO_ROUTE_COUNT,
} from '../services/medellinDemo';

describe('rutas de pasajeros demo en Medellín', () => {
  test('recorre varios sectores con pasajeros y distancias válidas', () => {
    const requests = Array.from(
      { length: MEDELLIN_DEMO_ROUTE_COUNT },
      (_, index) => createMedellinDemoRequest(index),
    );

    expect(new Set(requests.map((request) => request.origin.address)).size)
      .toBe(MEDELLIN_DEMO_ROUTE_COUNT);
    requests.forEach((request) => {
      expect(request.passengerName).toBeTruthy();
      expect(request.destination.address).toMatch(/Medellín|Envigado|Belén|El Poblado|Laureles|Aranjuez|Castilla|Guayabal|La Candelaria/);
      expect(request.origin.lat).toBeGreaterThan(6.1);
      expect(request.origin.lat).toBeLessThan(6.4);
      expect(request.distanceKm).toBeGreaterThan(0);
      expect(request.durationMin).toBeGreaterThan(0);
    });
  });
});


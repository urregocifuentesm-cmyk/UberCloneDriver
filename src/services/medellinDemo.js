// Code documentation: Sample Medellin and nearby trip routes for demo mode.
export const COPACABANA_CENTER = { latitude: 6.3467, longitude: -75.5087 };

const routes = [
  {
    passengerName: 'Valentina Ríos',
    passengerRating: 4.9,
    origin: { address: 'Parque de Berrío, La Candelaria', lat: 6.2518, lng: -75.5636 },
    destination: { address: 'Pueblito Paisa, Belén', lat: 6.2344, lng: -75.5785 },
  },
  {
    passengerName: 'Mateo Restrepo',
    passengerRating: 4.8,
    origin: { address: 'Segundo Parque de Laureles, Laureles-Estadio', lat: 6.2466, lng: -75.5965 },
    destination: { address: 'Parque Lleras, El Poblado', lat: 6.2087, lng: -75.5675 },
  },
  {
    passengerName: 'Sara Montoya',
    passengerRating: 5.0,
    origin: { address: 'Estación San Javier, San Javier', lat: 6.2562, lng: -75.6115 },
    destination: { address: 'Universidad de Antioquia, Aranjuez', lat: 6.2672, lng: -75.5681 },
  },
  {
    passengerName: 'Juan Pablo Gómez',
    passengerRating: 4.7,
    origin: { address: 'Aeropuerto Olaya Herrera, Guayabal', lat: 6.219, lng: -75.5906 },
    destination: { address: 'Centro Comercial Santafé, El Poblado', lat: 6.1986, lng: -75.5732 },
  },
  {
    passengerName: 'Mariana Vélez',
    passengerRating: 4.9,
    origin: { address: 'Estadio Atanasio Girardot, Laureles-Estadio', lat: 6.2562, lng: -75.5905 },
    destination: { address: 'Terminal del Norte, Castilla', lat: 6.2859, lng: -75.5694 },
  },
  {
    passengerName: 'Andrés Cárdenas',
    passengerRating: 4.8,
    origin: { address: 'Parque de Belén, Belén', lat: 6.2325, lng: -75.6017 },
    destination: { address: 'Parque de El Poblado, El Poblado', lat: 6.208, lng: -75.571 },
  },
  {
    passengerName: 'Isabella Ospina',
    passengerRating: 4.9,
    origin: { address: 'Parque Principal de Envigado, Envigado', lat: 6.1706, lng: -75.5866 },
    destination: { address: 'Plaza Botero, La Candelaria', lat: 6.2514, lng: -75.5684 },
  },
  {
    passengerName: 'Samuel Arango',
    passengerRating: 4.7,
    origin: { address: 'Parque de Robledo, Robledo', lat: 6.2808, lng: -75.585 },
    destination: { address: 'Parque de Ciudad del Río, El Poblado', lat: 6.2261, lng: -75.5748 },
  },
];

function haversineKm(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function createMedellinDemoRequest(sequence) {
  const routeIndex = sequence % routes.length;
  const route = routes[routeIndex];
  const distanceKm = Math.max(2, Number((haversineKm(route.origin, route.destination) * 1.35).toFixed(1)));

  return {
    ...route,
    passengerId: `demo-passenger-${routeIndex + 1}`,
    distanceKm,
    durationMin: Math.max(7, Math.round(distanceKm / 24 * 60)),
    paymentMethod: sequence % 2 === 0 ? 'cash' : 'mercadopago',
  };
}

export const MEDELLIN_DEMO_ROUTE_COUNT = routes.length;


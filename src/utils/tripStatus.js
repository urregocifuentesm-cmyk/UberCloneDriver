// Code documentation: Trip status labels and category display helpers.
export const PAYMENT_LABEL = {
  approved: 'Aprobado', pending: 'Pendiente', rejected: 'Rechazado', cash: 'Efectivo',
};
export const METHOD_LABEL = { mercadopago: 'Mercado Pago', stripe: 'Stripe', cash: 'Efectivo' };
export const CATEGORY_LABEL = { economy: 'Económico', xl: 'XL', premium: 'Premium' };
export const toCoords = (p) => ({ latitude: p.lat, longitude: p.lng });


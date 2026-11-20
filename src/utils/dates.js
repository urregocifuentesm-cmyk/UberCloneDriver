// Code documentation: Date parsing and formatting helpers.
export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const endOfDay = (d = new Date()) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
export const startOfWeek = (d = new Date()) => {
  const s = startOfDay(d);
  const diff = (s.getDay() + 6) % 7; // semana inicia el lunes
  s.setDate(s.getDate() - diff);
  return s;
};
export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
export const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISODate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const tsToDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);
export const formatDateTime = (d) =>
  d ? d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '-';


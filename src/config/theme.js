// Code documentation: Shared application colors and theme constants.
export const colors = {
  ink: '#172B3A',
  paper: '#F3F7F8',
  card: '#FFFFFF',
  accent: '#0B8F72',
  accentDark: '#08765E',
  accentSoft: '#E1F5ED',
  gold: '#F5AD2D',
  danger: '#D94F58',
  muted: '#68788A',
  line: '#DCE5E9',
  warn: '#C17C12',
};
export const COP = (n) =>
  `$${Math.max(0, Math.round(Number(n) || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} COP`;


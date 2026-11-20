// Code documentation: English and Spanish translations for user-facing labels.
const dict = {
  es: {
    home: 'Inicio', earnings: 'Ganancias', history: 'Historial', profile: 'Perfil',
    available: 'Disponible', unavailable: 'No disponible',
    pendingApproval: 'Tu cuenta está pendiente de aprobación. No puedes ponerte disponible aún.',
    accept: 'Aceptar', reject: 'Rechazar', passengerOnBoard: 'Pasajero a bordo',
    finishTrip: 'Finalizar viaje', cancelTrip: 'Cancelar viaje', logout: 'Cerrar sesión',
    save: 'Guardar cambios', emptyHistory: 'No hay viajes en este filtro. Cambia el filtro para ver otros.',
    today: 'Hoy', week: 'Semana', month: 'Mes', range: 'Rango', allMethods: 'Todos',
    balance: 'Saldo', language: 'Idioma', sendRegistration: 'Enviar registro',
    cashReceived: 'Efectivo recibido', charge: 'Cobrar con la pasarela', backHome: 'Volver al inicio',
  },
  en: {
    home: 'Home', earnings: 'Earnings', history: 'Trip history', profile: 'Profile',
    available: 'Available', unavailable: 'Unavailable',
    pendingApproval: 'Your account is pending approval. You cannot go available yet.',
    accept: 'Accept', reject: 'Reject', passengerOnBoard: 'Passenger on board',
    finishTrip: 'Finish trip', cancelTrip: 'Cancel trip', logout: 'Log out',
    save: 'Save changes', emptyHistory: 'No trips for this filter. Change the filter to see others.',
    today: 'Today', week: 'Week', month: 'Month', range: 'Range', allMethods: 'All',
    balance: 'Balance', language: 'Language', sendRegistration: 'Submit registration',
    cashReceived: 'Cash received', charge: 'Charge via gateway', backHome: 'Back to home',
  },
};
export const translate = (lang, key) => dict[lang]?.[key] ?? dict.es[key] ?? key;


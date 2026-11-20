// Code documentation: Form validation rules and field metadata.
import { PRICING } from '../config/pricing';
import { fromISODate, startOfDay } from './dates';

export const COLORS = ['Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja', 'Otro'];
export const GENDERS = ['Femenino', 'Masculino', 'Otro', 'Prefiero no decir'];
export const CATEGORIES = [
  { value: 'economy', label: 'Económico' },
  { value: 'xl', label: 'XL' },
  { value: 'premium', label: 'Premium' },
];

export const TAB_FIELDS = {
  personal: ['photo', 'fullName', 'idNumber', 'phone', 'birthDate', 'gender', 'email', 'language'],
  vehicle: ['category', 'plate', 'brand', 'model', 'year', 'color', 'capacity', 'vehiclePhoto'],
  documents: [
    'licenseNumber', 'licensePhoto', 'licenseExpiry', 'soatPhoto', 'soatExpiry',
    'rtmPhoto', 'rtmExpiry', 'mpEmail', 'acceptTerms',
  ],
};

const empty = (v) => v === null || v === undefined || String(v).trim() === '';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const currentYear = () => new Date().getFullYear();

// Colombia: la revisión técnico-mecánica aplica a carros con 5 años o más.
export const rtmRequired = (form) => {
  const y = Number(form.year);
  return Number.isInteger(y) && currentYear() - y >= 5;
};

const futureDate = (iso) => {
  const d = fromISODate(iso);
  const tomorrow = startOfDay();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d >= tomorrow;
};

export function validateField(key, form) {
  const v = form[key];
  const required = 'Este campo es obligatorio';
  switch (key) {
    case 'photo': return empty(v) ? 'Agrega una foto de perfil' : '';
    case 'fullName':
      if (empty(v)) return required;
      if (v.length > 50) return 'Máximo 50 caracteres';
      return /^[A-Za-zÁÉÁÓÚÁœáéíóúüÁ‘ñ ]+$/.test(v) ? '' : 'Solo letras y espacios';
    case 'idNumber':
      if (empty(v)) return required;
      return /^\d{6,10}$/.test(v) ? '' : 'Debe tener entre 6 y 10 dígitos';
    case 'phone':
      if (empty(v)) return required;
      return /^\d{10}$/.test(v) ? '' : 'Debe tener 10 dígitos';
    case 'birthDate': {
      if (empty(v)) return required;
      const d = fromISODate(v);
      const limit = new Date(currentYear() - 18, new Date().getMonth(), new Date().getDate());
      return d <= limit ? '' : 'Debes tener al menos 18 años';
    }
    case 'gender': return empty(v) ? 'Selecciona una opción' : '';
    case 'email':
    case 'mpEmail':
      if (empty(v)) return required;
      return EMAIL.test(v.trim()) ? '' : 'Correo no válido (ej. nombre@dominio.com)';
    case 'language': return empty(v) ? 'Selecciona un idioma' : '';
    case 'category': return empty(v) ? 'Selecciona una categoría' : '';
    case 'plate':
      if (empty(v)) return required;
      return /^[A-Z]{3}\d{3}$/.test(String(v).toUpperCase()) ? '' : 'Formato colombiano: ABC123';
    case 'brand':
    case 'model':
      if (empty(v)) return required;
      return v.length > 30 ? 'Máximo 30 caracteres' : '';
    case 'year': {
      if (empty(v)) return required;
      if (!/^\d{4}$/.test(v)) return 'Debe tener 4 dígitos';
      return Number(v) > currentYear() ? `No puede ser mayor a ${currentYear()}` : '';
    }
    case 'color': return empty(v) ? 'Selecciona un color' : '';
    case 'capacity': {
      if (empty(v)) return required;
      if (!/^\d+$/.test(v)) return 'Solo números';
      const n = Number(v);
      if (n < 1 || n > 10) return 'Entre 1 y 10 pasajeros';
      return form.category === 'xl' && n < PRICING.xlMinCapacity
        ? `XL exige mínimo ${PRICING.xlMinCapacity}` : '';
    }
    case 'vehiclePhoto': return empty(v) ? 'Agrega una foto donde se vea la placa' : '';
    case 'licenseNumber':
      if (empty(v)) return required;
      return /^[A-Za-z0-9]{5,20}$/.test(v) ? '' : 'Entre 5 y 20 caracteres alfanuméricos';
    case 'licensePhoto': case 'soatPhoto': return empty(v) ? 'Agrega la foto' : '';
    case 'rtmPhoto': return rtmRequired(form) && empty(v) ? 'Agrega la foto' : '';
    case 'licenseExpiry': case 'soatExpiry': case 'rtmExpiry':
      if (key === 'rtmExpiry' && !rtmRequired(form)) return '';
      if (empty(v)) return required;
      return futureDate(v) ? '' : 'Debe vencer después de hoy';
    case 'acceptTerms': return v ? '' : 'Debes aceptar los términos';
    default: return '';
  }
}

export function validateAll(form) {
  const errors = {};
  Object.values(TAB_FIELDS).flat().forEach((k) => {
    const e = validateField(k, form);
    if (e) errors[k] = e;
  });
  return errors;
}


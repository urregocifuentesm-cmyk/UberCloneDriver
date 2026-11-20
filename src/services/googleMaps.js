// Code documentation: Google Maps configuration and API helpers.
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const libraries = new Map();
let optionsSet = false;

export function loadGoogleMapsLibrary(name) {
  if (!apiKey) return Promise.reject(new Error('Falta EXPO_PUBLIC_GOOGLE_MAPS_KEY en .env.'));
  if (!optionsSet) {
    setOptions({ key: apiKey, v: 'weekly', language: 'es', region: 'CO' });
    optionsSet = true;
  }
  if (!libraries.has(name)) libraries.set(name, importLibrary(name));
  return libraries.get(name);
}


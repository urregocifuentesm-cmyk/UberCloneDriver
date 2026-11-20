const { expo } = require('./app.json');

module.exports = ({ config }) => {
  const base = config || expo;
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  const ios = { ...(base.ios || {}) };
  const android = { ...(base.android || {}) };
  const iosConfig = { ...(ios.config || {}) };
  const androidConfig = { ...(android.config || {}) };
  const googleMaps = { ...(androidConfig.googleMaps || {}) };

  if (mapsKey) {
    iosConfig.googleMapsApiKey = mapsKey;
    googleMaps.apiKey = mapsKey;
  } else {
    delete iosConfig.googleMapsApiKey;
    delete googleMaps.apiKey;
  }

  ios.config = iosConfig;
  androidConfig.googleMaps = googleMaps;
  android.config = androidConfig;

  return { ...base, ios, android };
};

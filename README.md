# Rumbora — App Conductor

App móvil (React Native + Expo, iOS/Android) para conductores: registro con validaciones, estado Disponible/No disponible con ubicación en tiempo real, solicitudes con temporizador de 15 s, navegación con Google Directions, cobro con Mercado Pago (o Stripe en modo prueba) o efectivo, comisión del 20 %, historial y ganancias.

## Estructura
- `src/config/pricing.js` — única fuente de tarifas y comisión.
- `src/utils/calculateFare.js` — función pura `{ fare, commission, driverEarnings }`.
- `src/hooks/` — `useDriverLocation`, `useTripRequests`, `useEarnings`.
- `src/context/AppContext.js` — sesión del conductor, viaje activo e idioma (Context).
- `src/navigation/` — Stack (viaje) + Tabs (registro) + Drawer (perfil, historial, ganancias).
- `backend/` — Express: crea el cobro, recibe webhooks y actualiza el viaje.

## Instalación (app)
```bash
npm install
npx expo install --check   # alinea versiones nativas con tu SDK de Expo
cp .env.example .env       # completar variables
npx expo start
```
`react-native-maps` y `expo-notifications` necesitan un **development build** (`npx expo run:android` / `eas build`) para funcionar completos; Expo Go no basta. Configura `EXPO_PUBLIC_GOOGLE_MAPS_KEY` en `.env`; `app.config.js` la aplica a iOS/Android al generar el proyecto.
Para ejecutar la interfaz en el navegador usa `npm run web` (localhost). La web usa Google Maps y rutas reales cuando hay una clave válida; si no está configurada o falla, muestra OpenStreetMap como alternativa.

## Variables de entorno
App (`.env`): ver `.env.example` (Firebase, llave de Google Maps, Cloudinary, URL del backend). Backend (`backend/.env`): ver `backend/.env.example`. **Los secretos (`MP_ACCESS_TOKEN`, `STRIPE_SECRET_KEY`, `TURN_SHARED_SECRET`) solo viven en el backend y `.env` está en `.gitignore`. Usa solo credenciales de prueba.**
Sin configuración Firebase, la app arranca en **demo local**: usa un conductor de prueba, persiste sus datos en el dispositivo y simula solicitudes y pagos; no conecta Firebase ni pasarelas reales. Para forzar el modo demo, establece `EXPO_PUBLIC_DEMO_MODE=true`. Para usar Firebase, configura las variables indicadas abajo y establece el modo en `false`. Para rutas web con Google Maps, habilita Maps JavaScript API y restringe la clave por dominio; para rutas móviles, habilita los servicios de rutas necesarios y restringe la clave a las aplicaciones.

En demo, entra con **Continuar como conductor demo** y activa **Disponible** para recibir pasajeros simulados automáticamente por Medellín; el conductor aparece en Copacabana, Antioquia, y puedes generar un pasajero al instante. Las rutas recorren sectores como Centro, Laureles, Belén, San Javier, Envigado y El Poblado. Acepta el viaje, marca al pasajero a bordo, finalízalo y confirma el pago simulado.

## Backend
```bash
cd backend && npm install && cp .env.example .env && npm start
```
Expón el puerto con un túnel (ej. `ngrok http 3000`), pon esa URL en `PUBLIC_URL` y configura los webhooks:
- Mercado Pago: `PUBLIC_URL/webhooks/mercadopago` (usa cuentas de vendedor y comprador de prueba).
- Stripe: `PUBLIC_URL/webhooks/stripe` (modo test).

## Firebase
1. Activa Authentication (correo/contraseña) y Firestore. Reglas de ejemplo en `firestore.rules` (endurécelas antes de entregar).
2. Historial: crea el índice compuesto `trips` → `driverId` (asc) + `createdAt` (desc). Firestore muestra el enlace en el error de consola la primera vez.
3. Para habilitar el chat y las llamadas, despliega las reglas de `firestore.rules` y los índices de `firestore.indexes.json`. Los mensajes viven en `tripMessages`. Las llamadas usan `tripCalls` y `tripCallCandidates`, con acceso limitado a los dos participantes del viaje activo.
4. Aprobar un conductor: en `drivers/{uid}` cambia `status` de `pending` a `approved`.
5. Colecciones: `drivers` y `trips` (modelo de la sección 6 del enunciado). El pasajero (otra app) crea `trips` con `status: "requested"`, `origin`, `destination`, `distanceKm`, `durationMin`, `category`, `paymentMethod`, `passengerId`, `createdAt`.

### Chat y llamadas de voz
La app del pasajero debe implementar la otra pantalla de chat/llamada y usar los mismos UID de Firebase y `tripId`. Para llamar al conductor, escucha `tripCalls` por `tripId` y `calleeId`, aplica `offer`, guarda `answer` y publica/escucha candidatos ICE en `tripCallCandidates` (`callId`, `tripId`, `senderId`, `candidate`, `createdAt`). Las llamadas requieren un **development build nativo** (`npx expo run:android` / `eas build`); Expo Go no incluye WebRTC. Configura `EXPO_PUBLIC_BACKEND_URL` en la app y `TURN_URL`, `TURN_SHARED_SECRET` y `TURN_CREDENTIAL_TTL_SECONDS` en `backend/.env`. El backend entrega credenciales TURN temporales solo a participantes autenticados del viaje; no pongas el secreto TURN en la app. Sin TURN se usa STUN como alternativa, pero algunas redes móviles no podrán conectar. La demo local no habilita llamadas entre dispositivos.

## Notificaciones
Se usa `expo-notifications` (FCM en Android) y el endpoint `POST /notify/new-trip`. Si el docente exige `@react-native-firebase/messaging`, cámbialo en `src/services/notifications.js` (requiere development build).

## Pruebas
`npm test` — valida `calculateFare` con el ejemplo de 8,5 km / 22 min del enunciado.

## Uso de IA
Ver la bitácora en [docs/AI_LOG.md](docs/AI_LOG.md). Cada integrante debe completarla con sus propias entradas.

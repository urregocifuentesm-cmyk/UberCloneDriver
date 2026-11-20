# Guia del codigo — UberClone Driver

## 1. Flujo general

1. `App.js` carga el proveedor global `AppProvider`, verifica Firebase y renderiza la navegación.
2. `AppContext.js` observa la sesión, carga el perfil del conductor y conserva el idioma.
3. `navigation/index.js` selecciona Login, Registro o la aplicación principal.
4. Los hooks consultan ubicación, solicitudes y ganancias.
5. Las pantallas ejecutan las acciones y actualizan Firebase o el almacenamiento demo local.
6. Los servicios aislados comunican la aplicación con mapas, imágenes, pagos y notificaciones.

No hay clases principales en JavaScript: la aplicación usa funciones, componentes React, hooks y contextos.

## 2. Punto de entrada

### `App.js`

- Inicializa el gesto de React Native.
- Muestra una pantalla si Firebase no fue configurado correctamente.
- Envuelve toda la aplicación en `AppProvider`.
- Activa el indicador visual de modo demo.
- Renderiza `Navigation`.

### `src/context/AppContext.js`

- `AppProvider` administra la sesión autenticada.
- `user` contiene el usuario de Firebase o el usuario demo.
- `driver` contiene el perfil guardado en Firestore.
- `authReady` indica que terminó la lectura inicial de la sesión.
- `activeTripId` conserva el viaje que está en ejecución.
- `language` guarda español o inglés.
- `setLanguage` cambia el idioma y lo persiste.
- `logout` cierra la sesión.
- `t` traduce una llave según el idioma activo.

## 3. Navegacion

### `src/navigation/index.js`

- `Stack.Navigator` administra pantallas independientes y flujos de viaje.
- `Drawer.Navigator` contiene Inicio, Ganancias, Historial y Perfil.
- Sin usuario: muestra Login.
- Usuario sin perfil: muestra el registro.
- Usuario con perfil aprobado o demo: muestra la aplicación principal.
- Las pantallas de viaje no permiten regresar con gestos ni mediante el botón atrás.

## 4. Configuracion

### `src/config/firebase.js`

- Lee las variables públicas de Expo.
- Calcula si Firebase está configurado.
- Calcula si la aplicación debe usar el modo demo.
- Inicializa Firebase Auth y Firestore.
- Exporta `auth`, `db` y los estados de configuración.

### `src/config/auth.js`

- Traduce las operaciones de autenticación a Firebase o al almacenamiento demo.
- Implementa inicio de sesión, registro, cierre de sesión y observación de sesión.
- Evita operaciones reales de Firebase en modo demo.

### `src/config/firestore.js`

- Envuelve los métodos principales de Firestore.
- Implementa `doc`, `collection`, `query`, transacciones y suscripciones.
- En modo demo redirige las operaciones a `localDemoStore`.

### `src/config/i18n.js`

- Contiene los textos en español e inglés.
- `translate(language, key)` obtiene el texto solicitado.

### `src/config/pricing.js`

- Centraliza tarifas, categorías y comisión.
- Debe ser la única fuente de precios compartidos por app y cálculos.

### `src/config/theme.js`

- Define los colores reutilizados por pantallas y componentes.

## 5. Componentes reutilizables

### `src/components/Fields.js`

- `TextField`: entrada de texto con etiqueta y error.
- `SelectField`: lista desplegable.
- `DateField`: selector de fecha.
- `ImageField`: cámara o galería.
- `CheckField`: casilla de aceptación.
- Cada campo puede mostrar una validación sin depender de una pantalla concreta.

### `src/components/ui.js`

- Contiene `Button`, `Card`, `Row` y estilos comunes.
- Normaliza botones, tarjetas, espaciado y colores.

### `src/components/MapView.native.js`

- Adaptador React Native para `react-native-maps`.
- Recibe ubicación, ruta y marcadores según la plataforma.

### `src/components/MapView.web.js`

- Usa Google Maps cuando existe una llave válida.
- Muestra OpenStreetMap como alternativa.
- Procesa marcadores, centro del mapa y errores de carga.

### `src/components/CallAudioOutput.native.js` y `.web.js`

- Seleccionan la salida de audio según plataforma.
- Mantienen separadas las APIs nativas y web.

## 6. Hooks

### `src/hooks/useDriverLocation.js`

- Solicita permisos.
- Obtiene la ubicación inicial.
- Ejecuta seguimiento continuo cuando está activo.
- Guarda la posición en Firebase o en la demostración local.
- Expone ubicación, carga y errores.

### `src/hooks/useTripRequests.js`

- Observa viajes solicitados para la categoría del conductor.
- Solo escucha solicitudes si el conductor está disponible.
- Convierte cambios de Firestore en solicitudes mostradas por la UI.

### `src/hooks/useEarnings.js`

- Lee los viajes completados del conductor.
- Filtra por periodo.
- Suma ganancias, cobros y otros totales mostrados en Ganancias.

## 7. Pantallas principales

### `src/screens/LoginScreen.js`

- Permite ingresar con correo y contraseña.
- Permite crear una cuenta.
- Permite entrar al modo demo si está habilitado.

### `src/screens/RegisterScreen.js`

- Organiza el registro en pestañas: Personal, Vehículo y Documentos.
- `SubmitBar` impide enviar hasta que todas las validaciones sean correctas.
- Sube imágenes y crea el documento `drivers/{uid}`.

### `src/screens/register/RegistrationContext.js`

- Conserva el formulario completo.
- Calcula errores con `validateAll`.
- Marca campos tocados para mostrar errores gradualmente.
- Expone `tabValid` y `allValid`.

### `src/screens/register/PersonalTab.js`

- Recopila foto, nombre, documento, celular, nacimiento, género, correo e idioma.

### `src/screens/register/VehicleTab.js`

- Recopila categoría, placa, marca, modelo, año, color, capacidad y foto.

### `src/screens/register/DocumentsTab.js`

- Recopila licencia, SOAT, revisión técnico-mecánica, correo de pagos y aceptación de términos.

### `src/screens/ProfileScreen.js`

- Muestra estado y datos del conductor.
- Permite editar nombre, celular, género, correo e idioma.
- Valida antes de actualizar Firestore.
- Permite cerrar sesión.

### `src/screens/HomeScreen.js`

- Permite activar o desactivar disponibilidad.
- Comparte ubicación.
- Recibe solicitudes reales o genera viajes demo.

### `src/screens/IncomingRequestScreen.js`

- Presenta una nueva solicitud.
- Ejecuta un temporizador.
- Permite aceptar o rechazar.
- Al aceptar actualiza el viaje al estado correspondiente.

### `src/screens/TripScreen.js`

- Controla el viaje activo.
- Muestra la ruta y posición.
- Cambia estados: aceptado, pasajero a bordo y finalizado.
- Permite abrir chat y llamada.

### `src/screens/TripChatScreen.js`

- Envía y recibe mensajes del viaje.
- Usa suscripciones de Firestore.

### `src/screens/TripCallScreen.js`

- Inicia la señalización WebRTC.
- Administra oferta, respuesta y candidatos ICE.
- Depende de Firebase, backend TURN y una build nativa.

### `src/screens/PaymentSummaryScreen.js`

- Calcula el cobro mostrado al finalizar.
- Permite efectivo o pasarela.
- Confirma el pago y continúa al historial.

### `src/screens/TripDetailScreen.js`

- Presenta origen, destino, fecha, tarifa, método de pago y estado.

### `src/screens/TripRatingScreen.js`

- Permite calificar el viaje y guardar un comentario opcional.

### `src/screens/HistoryScreen.js`

- Lista viajes con búsqueda y filtros.
- Permite abrir el detalle de un viaje.

### `src/screens/EarningsScreen.js`

- Resume ingresos por periodo.
- Separa ganancias y comisión.

## 8. Servicios

### `src/services/directions.js`

- Consulta una ruta entre origen y destino.
- Convierte los resultados de Google en coordenadas y datos de distancia.

### `src/services/googleMaps.js`

- Lee la llave de Google Maps.
- Identifica si la plataforma puede ejecutar mapas reales.

### `src/services/cloudinary.js`

- Sube imágenes locales a Cloudinary.
- Devuelve la URL que se guarda en el perfil.

### `src/services/payments.js`

- Solicita al backend la creación de una preferencia o sesión de pago.

### `src/services/notifications.js`

- Registra permisos y tokens de notificaciones.
- Contacta el backend cuando recibe un viaje nuevo.

### `src/services/localDemoStore.js`

- Simula Firestore y Authentication en AsyncStorage.
- Mantiene conductores, viajes y sesión demo.
- Permite probar solicitudes y pagos sin servicios externos.

### `src/services/medellinDemo.js`

- Contiene rutas demo alrededor de Medellín y municipios cercanos.
- Genera pasajeros, origen, destino y datos de viaje.

### `src/services/voiceEngine.native.js` y `.web.js`

- Inician y terminan llamadas según la plataforma.
- Administran el flujo técnico WebRTC.

### `src/services/voiceIceServers.js`

- Solicita credenciales TURN temporales al backend.
- Combina TURN y STUN para establecer llamadas.

## 9. Utilidades

### `src/utils/validators.js`

- Valida campos vacíos, nombres, celular, correo, fechas, vehículo y documentos.
- `validateAll` obtiene todos los errores del formulario.

### `src/utils/calculateFare.js`

- Recibe distancia y categoría.
- Calcula tarifa, comisión y ganancia del conductor.

### `src/utils/dates.js`

- Convierte fechas entre ISO y objetos JavaScript.
- Calcula fechas de inicio y fin para filtros.

### `src/utils/tripStatus.js`

- Traduce estados internos a etiquetas visibles.
- Traduce categorías y métodos de pago.

## 10. Backend

### `backend/server.js`

- Verifica la sesión del conductor.
- Crea preferencias de Mercado Pago.
- Crea sesiones de Stripe.
- Recibe webhooks de pagos.
- Envía notificaciones a conductores disponibles.
- Entrega credenciales TURN temporales sin exponer el secreto.

## 11. Pruebas

### `src/__tests__/calculateFare.test.js`

- Comprueba tarifas, comisión y ganancia.

### `src/__tests__/medellinDemo.test.js`

- Comprueba que las rutas demo tengan pasajeros, ciudades y distancias válidas.

Ejecuta las pruebas con:

```text
npm.cmd test -- --runInBand
```

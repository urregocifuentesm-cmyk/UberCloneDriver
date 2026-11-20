// Code documentation: Persistent local demo database, authentication, and subscriptions.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMedellinDemoRequest } from './medellinDemo';

const STORAGE_KEY = 'uberclone:local-demo:v1';
const DEMO_UID = 'demo-driver-001';
const DEMO_EMAIL = 'conductor@demo.local';
const subscribers = new Set();
const authSubscribers = new Set();
let store;
let loading;

const emptyStore = () => ({ drivers: {}, trips: {}, sessionUser: null, demoRequestSequence: 0 });
const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

function migrateLegacyDemoData(current) {
  let changed = false;
  const history = current.trips['demo-trip-paid-001'];
  if (history?.origin?.address?.includes('Bogotá')) {
    history.origin = { address: 'Terminal del Norte, Castilla', lat: 6.2859, lng: -75.5694 };
    history.destination = { address: 'Aeropuerto Olaya Herrera, Guayabal', lat: 6.219, lng: -75.5906 };
    changed = true;
  }

  for (const trip of Object.values(current.trips)) {
    const activeStatus = ['requested', 'accepted', 'driver_arriving', 'in_progress'].includes(trip.status);
    const oldCity = trip.origin?.address?.includes('Bogotá') || trip.origin?.lat < 5;
    if (activeStatus && oldCity) {
      trip.status = 'cancelled';
      trip.cancelledBy = 'demo-location-migration';
      changed = true;
    }
  }
  return changed;
}

async function getStore() {
  if (!loading) {
    loading = AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      store = raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
      if (migrateLegacyDemoData(store)) {
        return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store)).then(() => store);
      }
      return store;
    });
  }
  return loading;
}

async function saveStore() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function collectionName(ref) {
  if (ref.kind === 'query') return collectionName(ref.base);
  return ref.collection;
}

function compareValue(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return time;
  }
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  return value;
}

function equalValues(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function docSnapshot(ref, value) {
  return {
    id: ref.id,
    exists: () => value !== undefined,
    data: () => clone(value),
  };
}

function matchesQuery(data, constraints) {
  return constraints
    .filter((constraint) => constraint.type === 'where')
    .every(({ field, operator, value }) => {
      const actual = compareValue(data[field]);
      const expected = compareValue(value);
      if (operator === '==') return equalValues(data[field], value);
      if (operator === '>=') return actual >= expected;
      if (operator === '<=') return actual <= expected;
      if (operator === '>') return actual > expected;
      if (operator === '<') return actual < expected;
      return false;
    });
}

async function queryDocuments(ref) {
  const current = await getStore();
  const base = ref.kind === 'query' ? ref.base : ref;
  const constraints = ref.kind === 'query' ? ref.constraints : [];
  let docs = Object.entries(current[base.collection] || {})
    .filter(([, data]) => matchesQuery(data, constraints))
    .map(([id, data]) => docSnapshot({ collection: base.collection, id }, data));

  const ordering = constraints.find((constraint) => constraint.type === 'orderBy');
  if (ordering) {
    docs.sort((left, right) => {
      const a = compareValue(left.data()[ordering.field]);
      const b = compareValue(right.data()[ordering.field]);
      const result = a < b ? -1 : a > b ? 1 : 0;
      return ordering.direction === 'desc' ? -result : result;
    });
  }

  const cursor = constraints.find((constraint) => constraint.type === 'startAfter');
  if (cursor) {
    const index = docs.findIndex((item) => item.id === cursor.snapshot.id);
    if (index >= 0) docs = docs.slice(index + 1);
  }

  const max = constraints.find((constraint) => constraint.type === 'limit');
  if (max) docs = docs.slice(0, max.count);
  return docs;
}

async function snapshot(ref) {
  if (ref.kind === 'doc') {
    const current = await getStore();
    return docSnapshot(ref, current[ref.collection]?.[ref.id]);
  }

  const docs = await queryDocuments(ref);
  return { docs, size: docs.length, empty: docs.length === 0 };
}

function publish(collection) {
  for (const entry of subscribers) {
    if (collectionName(entry.ref) !== collection) continue;
    snapshot(entry.ref).then((result) => {
      if (entry.active) entry.callback(result);
    }).catch((error) => {
      if (entry.onError) entry.onError(error);
      else console.error('Error al actualizar los datos locales de demostración:', error);
    });
  }
}

export function onDemoSnapshot(ref, callback, onError) {
  const entry = { ref, callback, onError, active: true };
  subscribers.add(entry);
  getStore().then(() => snapshot(ref)).then((result) => {
    if (entry.active) callback(result);
  }).catch((error) => {
    if (onError) onError(error);
    else console.error('Error al leer los datos locales de demostración:', error);
  });
  return () => {
    entry.active = false;
    subscribers.delete(entry);
  };
}

export async function getDemoDoc(ref) {
  return snapshot(ref);
}

export async function getDemoDocs(ref) {
  return snapshot(ref);
}

function resolveValue(previous, value) {
  if (value && value.__localTransform === 'arrayUnion') {
    const values = Array.isArray(previous) ? [...previous] : [];
    for (const item of value.values) {
      if (!values.some((existing) => equalValues(existing, item))) values.push(clone(item));
    }
    return values;
  }
  return clone(value);
}

export async function setDemoDoc(ref, data, options) {
  const current = await getStore();
  const collection = current[ref.collection] || (current[ref.collection] = {});
  const old = collection[ref.id] || {};
  collection[ref.id] = options?.merge ? { ...old, ...clone(data) } : clone(data);
  await saveStore();
  publish(ref.collection);
}

export async function updateDemoDoc(ref, data) {
  const current = await getStore();
  const old = current[ref.collection]?.[ref.id];
  if (!old) throw new Error(`No existe el documento local ${ref.collection}/${ref.id}`);
  const updated = { ...old };
  for (const [field, value] of Object.entries(data)) updated[field] = resolveValue(old[field], value);
  current[ref.collection][ref.id] = updated;
  await saveStore();
  publish(ref.collection);
}

export async function runDemoTransaction(update) {
  const pending = [];
  const transaction = {
    get: getDemoDoc,
    update: (ref, data) => pending.push({ ref, data }),
  };
  const result = await update(transaction);
  for (const item of pending) await updateDemoDoc(item.ref, item.data);
  return result;
}

export async function getDemoSession() {
  return (await getStore()).sessionUser;
}

export function subscribeDemoAuth(callback, onError) {
  let active = true;
  const listener = () => getDemoSession().then((user) => {
    if (active) callback(user ? clone(user) : null);
  }).catch((error) => {
    if (active && onError) onError(error);
    else if (active) console.error('Error al leer la sesión demo local:', error);
  });
  authSubscribers.add(listener);
  getStore().then(listener);
  return () => {
    active = false;
    authSubscribers.delete(listener);
  };
}

async function setDemoSession(user) {
  const current = await getStore();
  current.sessionUser = user;
  await saveStore();
  for (const listener of authSubscribers) listener();
}

function demoDriver() {
  const future = new Date();
  future.setFullYear(future.getFullYear() + 2);
  const expiry = future.toISOString().slice(0, 10);
  return {
    id: DEMO_UID,
    fullName: 'Conductor Rumbora',
    idNumber: '12345678',
    phone: '3001234567',
    birthDate: '1985-01-01',
    gender: 'Prefiero no decir',
    email: DEMO_EMAIL,
    language: 'es',
    category: 'economy',
    plate: 'ABC123',
    brand: 'Renault',
    model: 'Logan',
    year: new Date().getFullYear(),
    color: 'Blanco',
    capacity: 4,
    photo: '',
    vehiclePhoto: '',
    licenseNumber: 'DEMO12345',
    licensePhoto: '',
    licenseExpiry: expiry,
    soatPhoto: '',
    soatExpiry: expiry,
    mpEmail: 'pagos@demo.local',
    acceptTerms: true,
    status: 'approved',
    available: false,
    createdAt: new Date(),
  };
}

function seedDemoHistory(current) {
  const id = 'demo-trip-paid-001';
  if (current.trips[id]) {
    if (current.trips[id].origin?.address?.includes('Bogotá')) {
      current.trips[id].origin = { address: 'Terminal del Norte, Castilla', lat: 6.2859, lng: -75.5694 };
      current.trips[id].destination = { address: 'Aeropuerto Olaya Herrera, Guayabal', lat: 6.219, lng: -75.5906 };
    }
    return;
  }
  const createdAt = new Date(Date.now() - 60 * 60 * 1000);
  current.trips[id] = {
    driverId: DEMO_UID,
    passengerId: 'demo-passenger-1',
    passengerName: 'Valentina Ríos',
    origin: { address: 'Terminal del Norte, Castilla', lat: 6.2859, lng: -75.5694 },
    destination: { address: 'Aeropuerto Olaya Herrera, Guayabal', lat: 6.219, lng: -75.5906 },
    distanceKm: 8.5,
    durationMin: 22,
    category: 'economy',
    paymentMethod: 'cash',
    status: 'paid',
    paymentStatus: 'cash',
    fare: 19200,
    commission: 3840,
    commissionRate: 0.2,
    driverEarnings: 15360,
    tip: 0,
    createdAt,
    completedAt: createdAt,
    paidAt: createdAt,
    rating: 5,
  };
}

export async function signInAsDemoDriver() {
  const current = await getStore();
  current.drivers[DEMO_UID] = current.drivers[DEMO_UID] || demoDriver();
  seedDemoHistory(current);
  await saveStore();
  const user = { uid: DEMO_UID, email: DEMO_EMAIL, isDemo: true };
  await setDemoSession(user);
  return { user };
}

export async function signOutDemoDriver() {
  await setDemoSession(null);
}

export async function createDemoRequest(driverId, category, paymentMethod) {
  const current = await getStore();
  const pending = Object.entries(current.trips).find(([, trip]) =>
    trip.status === 'requested'
      && (trip.offeredTo === driverId || trip.driverId === driverId)
      && !(trip.rejectedBy || []).includes(driverId));
  if (pending) return pending[0];

  const sequence = Number(current.demoRequestSequence) || 0;
  const passenger = createMedellinDemoRequest(sequence);
  current.demoRequestSequence = sequence + 1;
  const id = `demo-trip-${Date.now()}-${sequence}`;
  current.trips[id] = {
    passengerId: passenger.passengerId,
    passengerName: passenger.passengerName,
    passengerRating: passenger.passengerRating,
    driverId: null,
    offeredTo: driverId,
    rejectedBy: [],
    origin: passenger.origin,
    destination: passenger.destination,
    distanceKm: passenger.distanceKm,
    durationMin: passenger.durationMin,
    category,
    paymentMethod: paymentMethod || passenger.paymentMethod,
    tip: 0,
    status: 'requested',
    createdAt: new Date(),
  };
  await saveStore();
  publish('trips');
  return id;
}


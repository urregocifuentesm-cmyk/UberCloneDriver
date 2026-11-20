// Code documentation: Firestore adapter with Firebase and local demo implementations.
import {
  arrayUnion as firebaseArrayUnion,
  collection as firebaseCollection,
  doc as firebaseDoc,
  getDoc as firebaseGetDoc,
  getDocs as firebaseGetDocs,
  limit as firebaseLimit,
  onSnapshot as firebaseOnSnapshot,
  orderBy as firebaseOrderBy,
  query as firebaseQuery,
  runTransaction as firebaseRunTransaction,
  serverTimestamp as firebaseServerTimestamp,
  setDoc as firebaseSetDoc,
  startAfter as firebaseStartAfter,
  Timestamp as FirebaseTimestamp,
  updateDoc as firebaseUpdateDoc,
  where as firebaseWhere,
} from 'firebase/firestore';
import { db, isDemoMode } from './firebase';
import {
  getDemoDoc,
  getDemoDocs,
  onDemoSnapshot,
  runDemoTransaction,
  setDemoDoc,
  updateDemoDoc,
} from '../services/localDemoStore';

export function doc(...args) {
  if (!isDemoMode) return firebaseDoc(...args);
  const [parent, name, ...segments] = args;
  if (parent?.kind === 'collection') return { kind: 'doc', collection: parent.collection, id: String(name) };
  return { kind: 'doc', collection: String(name), id: segments.map(String).join('/') };
}

export function collection(_database, name) {
  if (!isDemoMode) return firebaseCollection(_database, name);
  return { kind: 'collection', collection: String(name) };
}

export function query(source, ...constraints) {
  if (!isDemoMode) return firebaseQuery(source, ...constraints);
  return { kind: 'query', base: source, constraints };
}

export function where(field, operator, value) {
  if (!isDemoMode) return firebaseWhere(field, operator, value);
  return { type: 'where', field, operator, value };
}

export function orderBy(field, direction) {
  if (!isDemoMode) return firebaseOrderBy(field, direction);
  return { type: 'orderBy', field, direction: direction || 'asc' };
}

export function limit(count) {
  if (!isDemoMode) return firebaseLimit(count);
  return { type: 'limit', count };
}

export function startAfter(snapshot) {
  if (!isDemoMode) return firebaseStartAfter(snapshot);
  return { type: 'startAfter', snapshot };
}

export function serverTimestamp() {
  return isDemoMode ? new Date() : firebaseServerTimestamp();
}

export function arrayUnion(...values) {
  return isDemoMode
    ? { __localTransform: 'arrayUnion', values }
    : firebaseArrayUnion(...values);
}

export const Timestamp = isDemoMode ? { fromDate: (date) => date } : FirebaseTimestamp;

export function onSnapshot(reference, callback, onError) {
  return isDemoMode
    ? onDemoSnapshot(reference, callback, onError)
    : firebaseOnSnapshot(reference, callback, onError);
}

export function getDoc(reference) {
  return isDemoMode ? getDemoDoc(reference) : firebaseGetDoc(reference);
}

export function getDocs(reference) {
  return isDemoMode ? getDemoDocs(reference) : firebaseGetDocs(reference);
}

export function setDoc(reference, data, options) {
  return isDemoMode
    ? setDemoDoc(reference, data, options)
    : firebaseSetDoc(reference, data, options);
}

export function updateDoc(reference, data) {
  return isDemoMode ? updateDemoDoc(reference, data) : firebaseUpdateDoc(reference, data);
}

export function runTransaction(database, update) {
  return isDemoMode
    ? runDemoTransaction(update)
    : firebaseRunTransaction(database, update);
}


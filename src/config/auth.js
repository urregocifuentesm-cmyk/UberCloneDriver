// Code documentation: Authentication adapter with Firebase and local demo implementations.
import {
  createUserWithEmailAndPassword as firebaseCreateUser,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignIn,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, isDemoMode } from './firebase';
import { signInAsDemoDriver, signOutDemoDriver, subscribeDemoAuth } from '../services/localDemoStore';

export function onAuthStateChanged(_instance, callback, onError) {
  return isDemoMode
    ? subscribeDemoAuth(callback, onError)
    : firebaseOnAuthStateChanged(auth, callback, onError);
}

export function signInWithEmailAndPassword(_instance, email, password) {
  if (isDemoMode) throw new Error('En modo demo, usa el acceso de conductor de demostración.');
  return firebaseSignIn(auth, email, password);
}

export function createUserWithEmailAndPassword(_instance, email, password) {
  if (isDemoMode) throw new Error('El registro de cuentas está desactivado en el modo demo local.');
  return firebaseCreateUser(auth, email, password);
}

export function signOut(_instance) {
  return isDemoMode ? signOutDemoDriver() : firebaseSignOut(auth);
}

export function signInDemo() {
  if (!isDemoMode) throw new Error('El acceso demo solo está disponible sin Firebase.');
  return signInAsDemoDriver();
}


// Code documentation: Payment gateway service adapter.
import { auth } from '../config/firebase';

// La app solo envía tripId y monto; el backend valida contra Firestore y usa la llave secreta.
export async function createCheckout(tripId, amount) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/payments/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tripId, amount }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'No se pudo crear el cobro');
  return json.url;
}


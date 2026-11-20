// Code documentation: TURN and STUN ICE server configuration.
import { auth, isDemoMode } from '../config/firebase';

const defaultIceServers = [{
  urls: process.env.EXPO_PUBLIC_WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302',
}];

const relayUnavailable = 'No hay servidor TURN configurado; algunas redes móviles pueden bloquear la llamada.';

export async function getVoiceIceServers(tripId) {
  if (isDemoMode) return { iceServers: defaultIceServers, warning: relayUnavailable };
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (!backendUrl) return { iceServers: defaultIceServers, warning: relayUnavailable };
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Inicia sesión con Firebase para obtener la configuración segura de llamada.');

  const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/voice/ice-servers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tripId }),
  });
  if (response.status === 503) {
    return { iceServers: defaultIceServers, warning: relayUnavailable };
  }
  if (!response.ok) {
    throw new Error(`El servidor de llamadas respondió con error (${response.status}).`);
  }

  const result = await response.json();
  if (!Array.isArray(result.iceServers) || !result.iceServers.length) {
    throw new Error('El servidor no devolvió servidores ICE válidos.');
  }
  return { iceServers: [...defaultIceServers, ...result.iceServers], warning: '' };
}


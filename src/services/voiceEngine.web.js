// Code documentation: WebRTC voice engine implementation for the web.
export function createPeerConnection(configuration) {
  if (typeof RTCPeerConnection === 'undefined') {
    throw new Error('Este navegador no es compatible con llamadas WebRTC.');
  }
  return new RTCPeerConnection(configuration);
}

export function captureAudio() {
  if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
    throw new Error('El navegador no permite acceso al micrófono. Usa localhost o una conexión HTTPS.');
  }
  return globalThis.navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

export function makeSessionDescription(description) {
  return new RTCSessionDescription(description);
}

export function makeIceCandidate(candidate) {
  return new RTCIceCandidate(candidate);
}


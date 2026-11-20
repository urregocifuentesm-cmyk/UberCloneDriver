// Code documentation: Native WebRTC voice engine implementation.
import {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
} from 'react-native-webrtc';

export function createPeerConnection(configuration) {
  return new RTCPeerConnection(configuration);
}

export function captureAudio() {
  return mediaDevices.getUserMedia({ audio: true, video: false });
}

export function makeSessionDescription(description) {
  return new RTCSessionDescription(description);
}

export function makeIceCandidate(candidate) {
  return new RTCIceCandidate(candidate);
}


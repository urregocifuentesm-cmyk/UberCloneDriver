// Code documentation: Application screen and its user interactions.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from '../config/firestore';
import { db, isDemoMode } from '../config/firebase';
import { Button, s } from '../components/ui';
import CallAudioOutput from '../components/CallAudioOutput';
import { colors } from '../config/theme';
import { useApp } from '../context/AppContext';
import { captureAudio, createPeerConnection, makeIceCandidate, makeSessionDescription } from '../services/voiceEngine';
import { getVoiceIceServers } from '../services/voiceIceServers';

const TERMINAL_STATUSES = ['ended', 'rejected', 'failed', 'missed'];

function serializeDescription(description) {
  return typeof description.toJSON === 'function'
    ? description.toJSON()
    : { type: description.type, sdp: description.sdp };
}

function serializeCandidate(candidate) {
  return typeof candidate.toJSON === 'function'
    ? candidate.toJSON()
    : {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
    };
}

function newCandidateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function TripCallScreen({ route, navigation }) {
  const { tripId, callId, direction, remoteName } = route.params;
  const { driver } = useApp();
  const [call, setCall] = useState(null);
  const [callStatus, setCallStatus] = useState(direction === 'incoming' ? 'ringing' : 'preparing');
  const [remoteStream, setRemoteStream] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [connectionState, setConnectionState] = useState('new');
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);
  const seenCandidates = useRef(new Set());
  const remoteDescriptionSet = useRef(false);
  const answerStarted = useRef(false);
  const offerStarted = useRef(false);
  const disposed = useRef(false);
  const allowNavigation = useRef(false);

  const closeMedia = useCallback(() => {
    const peer = peerRef.current;
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onaddstream = null;
      peer.onconnectionstatechange = null;
      peer.close();
      peerRef.current = null;
    }
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setRemoteStream(null);
  }, []);

  const applyRemoteCandidate = useCallback(async (item) => {
    if (!item.candidate) return;
    const peer = peerRef.current;
    if (!peer?.remoteDescription) {
      pendingCandidates.current.push(item);
      return;
    }
    try {
      await peer.addIceCandidate(makeIceCandidate(item.candidate));
    } catch (candidateError) {
      console.error('No se pudo aplicar un candidato ICE de la llamada:', candidateError);
      setError('La llamada tiene problemas de conexión. Comprueba tu red e inténtalo de nuevo.');
    }
  }, []);

  const receiveCandidate = useCallback(async (item) => {
    if (item.senderId === driver.id || seenCandidates.current.has(item.id)) return;
    seenCandidates.current.add(item.id);
    await applyRemoteCandidate(item);
  }, [applyRemoteCandidate, driver.id]);

  const flushCandidates = useCallback(async () => {
    const queued = pendingCandidates.current.splice(0);
    for (const candidate of queued) await applyRemoteCandidate(candidate);
  }, [applyRemoteCandidate]);

  const applyRemoteAnswer = useCallback(async (answer) => {
    const peer = peerRef.current;
    if (!peer || remoteDescriptionSet.current) return;
    try {
      await peer.setRemoteDescription(makeSessionDescription(answer));
      remoteDescriptionSet.current = true;
      await flushCandidates();
    } catch (answerError) {
      console.error('No se pudo establecer la respuesta WebRTC:', answerError);
      setError('No se pudo conectar el audio de la llamada. Inténtalo otra vez.');
    }
  }, [flushCandidates]);

  const setupPeer = useCallback(async () => {
    const iceConfig = await getVoiceIceServers(tripId);
    setWarning(iceConfig.warning);
    const stream = await captureAudio();
    if (disposed.current) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error('La pantalla de llamada ya se cerró.');
    }
    localStreamRef.current = stream;
    const peer = createPeerConnection({ iceServers: iceConfig.iceServers });
    peerRef.current = peer;
    stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidateId = newCandidateId();
      setDoc(doc(db, 'tripCallCandidates', candidateId), {
        callId,
        tripId,
        senderId: driver.id,
        candidate: serializeCandidate(event.candidate),
        createdAt: serverTimestamp(),
      }).catch((candidateError) => {
        console.error('No se pudo enviar un candidato ICE:', candidateError);
        setError('No se pudo establecer la conexión de voz. Comprueba tu conexión.');
      });
    };
    peer.ontrack = (event) => {
      if (event.streams?.[0]) setRemoteStream(event.streams[0]);
    };
    peer.onaddstream = (event) => {
      if (event.stream) setRemoteStream(event.stream);
    };
    peer.onconnectionstatechange = () => {
      setConnectionState(peer.connectionState || peer.iceConnectionState || 'connecting');
    };
    return peer;
  }, [callId, driver.id, tripId]);

  useEffect(() => {
    if (isDemoMode) return undefined;
    const callUnsubscribe = onSnapshot(doc(db, 'tripCalls', callId), (snapshot) => {
      if (!snapshot.exists()) {
        setError('La llamada ya no está disponible.');
        return;
      }
      const nextCall = { id: snapshot.id, ...snapshot.data() };
      setCall(nextCall);
      setCallStatus(nextCall.status);
      if (direction === 'outgoing' && nextCall.status === 'active' && nextCall.answer) {
        applyRemoteAnswer(nextCall.answer);
      }
    }, (snapshotError) => {
      console.error('No se pudo observar la llamada:', snapshotError);
      setError('Se perdió la conexión con la llamada. Revisa Firebase e inténtalo de nuevo.');
    });
    const candidateQuery = query(
      collection(db, 'tripCallCandidates'),
      where('callId', '==', callId),
    );
    const candidateUnsubscribe = onSnapshot(candidateQuery, (snapshot) => {
      snapshot.docs.forEach((item) => {
        receiveCandidate({ id: item.id, ...item.data() });
      });
    }, (snapshotError) => {
      console.error('No se pudieron recibir candidatos ICE:', snapshotError);
      setError('No se pudo completar la conexión de voz. Comprueba tu conexión.');
    });
    return () => {
      callUnsubscribe();
      candidateUnsubscribe();
    };
  }, [applyRemoteAnswer, callId, direction, receiveCandidate]);

  const startOutgoing = useCallback(async () => {
    if (offerStarted.current || isDemoMode) return;
    offerStarted.current = true;
    setBusy(true);
    setError('');
    try {
      const peer = await setupPeer();
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await updateDoc(doc(db, 'tripCalls', callId), {
        offer: serializeDescription(peer.localDescription || offer),
        status: 'ringing',
        updatedAt: serverTimestamp(),
      });
      setCallStatus('ringing');
    } catch (startError) {
      console.error('No se pudo iniciar la llamada WebRTC:', startError);
      setError(startError.message || 'No se pudo iniciar la llamada. Revisa el permiso del micrófono.');
      setCallStatus('failed');
      try {
        await updateDoc(doc(db, 'tripCalls', callId), {
          status: 'failed',
          endedBy: driver.id,
          updatedAt: serverTimestamp(),
        });
      } catch (updateError) {
        console.error('No se pudo marcar la llamada como fallida:', updateError);
      }
    } finally {
      setBusy(false);
    }
  }, [callId, driver.id, setupPeer]);

  useEffect(() => {
    if (direction === 'outgoing') startOutgoing();
  }, [direction, startOutgoing]);

  const answerCall = useCallback(async () => {
    if (answerStarted.current || !call?.offer || busy) return;
    answerStarted.current = true;
    setBusy(true);
    setError('');
    try {
      const peer = await setupPeer();
      await peer.setRemoteDescription(makeSessionDescription(call.offer));
      remoteDescriptionSet.current = true;
      await flushCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await updateDoc(doc(db, 'tripCalls', callId), {
        answer: serializeDescription(peer.localDescription || answer),
        status: 'active',
        updatedAt: serverTimestamp(),
      });
      setCallStatus('active');
    } catch (answerError) {
      console.error('No se pudo responder la llamada:', answerError);
      setError(answerError.message || 'No se pudo responder. Revisa el permiso del micrófono.');
      setCallStatus('failed');
      try {
        await updateDoc(doc(db, 'tripCalls', callId), {
          status: 'failed',
          endedBy: driver.id,
          updatedAt: serverTimestamp(),
        });
      } catch (updateError) {
        console.error('No se pudo marcar la llamada como fallida:', updateError);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, call?.offer, callId, driver.id, flushCandidates, setupPeer]);

  useEffect(() => {
    if (callStatus !== 'active') return undefined;
    const startedAt = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  useEffect(() => {
    if (direction !== 'outgoing' || callStatus !== 'ringing') return undefined;
    const timer = setTimeout(() => {
      updateDoc(doc(db, 'tripCalls', callId), {
        status: 'missed',
        endedBy: driver.id,
        updatedAt: serverTimestamp(),
      }).catch((timeoutError) => {
        console.error('No se pudo cerrar la llamada sin respuesta:', timeoutError);
        setError('No se pudo finalizar la llamada. Comprueba la conexión.');
      });
    }, 45000);
    return () => clearTimeout(timer);
  }, [callId, callStatus, direction, driver.id]);

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(callStatus)) closeMedia();
  }, [callStatus, closeMedia]);

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      closeMedia();
    };
  }, [closeMedia]);

  const finishCall = useCallback(async (status) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await updateDoc(doc(db, 'tripCalls', callId), {
        status,
        endedBy: driver.id,
        updatedAt: serverTimestamp(),
      });
      closeMedia();
      allowNavigation.current = true;
      navigation.goBack();
    } catch (finishError) {
      console.error('No se pudo cerrar la llamada:', finishError);
      setError('No se pudo cerrar la llamada en el servidor. El micrófono se desconectó; vuelve al viaje e inténtalo de nuevo.');
      closeMedia();
    } finally {
      setBusy(false);
    }
  }, [busy, callId, closeMedia, driver.id, navigation]);

  const toggleMute = () => {
    const nextMuted = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setMuted(nextMuted);
  };

  const returnToTrip = () => navigation.goBack();
  const handlePlaybackError = useCallback((playbackError) => setError(playbackError), []);
  const terminal = TERMINAL_STATUSES.includes(callStatus);
  const leaveCall = useCallback(() => {
    const status = direction === 'incoming' && callStatus === 'ringing' ? 'rejected' : 'ended';
    finishCall(status);
  }, [callStatus, direction, finishCall]);
  const protectCallNavigation = useCallback((event) => {
    if (isDemoMode || allowNavigation.current || terminal) return;
    event.preventDefault();
    leaveCall();
  }, [leaveCall, terminal]);
  useEffect(() => navigation.addListener('beforeRemove', protectCallNavigation), [navigation, protectCallNavigation]);
  const statusText = callStatus === 'preparing' ? 'Preparando micrófono…'
    : callStatus === 'ringing' ? (direction === 'incoming' ? 'Llamada entrante' : 'Llamando…')
      : callStatus === 'active' ? (connectionState === 'connected' ? formatDuration(seconds) : 'Conectando audio…')
        : callStatus === 'rejected' ? 'Llamada rechazada'
          : callStatus === 'missed' ? 'Sin respuesta'
            : callStatus === 'failed' ? 'No se pudo conectar'
              : 'Llamada finalizada';

  if (isDemoMode) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Ionicons name="call-outline" size={48} color={colors.accent} />
        <Text style={[s.h2, { marginTop: 16, textAlign: 'center' }]}>Llamadas de voz</Text>
        <Text style={{ color: colors.muted, lineHeight: 22, marginBottom: 16, textAlign: 'center' }}>
          Las llamadas necesitan Firebase activo, un build nativo de Expo y la app del pasajero conectada. El modo demo no puede enlazar otro dispositivo.
        </Text>
        <Button title="Volver al viaje" icon="arrow-back-outline" onPress={returnToTrip} />
      </View>
    );
  }

  return (
    <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
      <CallAudioOutput
        stream={remoteStream}
        onPlaybackError={handlePlaybackError}
      />
      <View style={{ alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: 44, height: 88, justifyContent: 'center', marginBottom: 20, width: 88 }}>
        <Ionicons name="person-outline" size={40} color={colors.accentDark} />
      </View>
      <Text style={[s.h1, { textAlign: 'center' }]}>{remoteName || 'Pasajero'}</Text>
      <Text style={{ color: callStatus === 'failed' ? colors.danger : colors.muted, fontSize: 16, marginBottom: 24 }}>
        {statusText}
      </Text>
      {busy && <ActivityIndicator color={colors.accent} style={{ marginBottom: 12 }} />}
      {!!warning && <Text style={{ color: colors.warn, lineHeight: 18, marginBottom: 12, textAlign: 'center' }}>{warning}</Text>}
      {!!error && <Text style={{ color: colors.danger, lineHeight: 20, marginBottom: 14, textAlign: 'center' }}>{error}</Text>}

      {direction === 'incoming' && callStatus === 'ringing' && (
        <View style={{ width: '100%' }}>
          <Button title="Responder" icon="call" onPress={answerCall} disabled={busy || !call?.offer} />
          <Button title="Rechazar" icon="call-outline" variant="danger" onPress={() => finishCall('rejected')} disabled={busy} />
        </View>
      )}
      {direction === 'outgoing' && ['preparing', 'ringing'].includes(callStatus) && (
        <Button title="Cancelar llamada" icon="call-outline" variant="danger" onPress={() => finishCall('ended')} disabled={busy} />
      )}
      {callStatus === 'active' && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', width: '100%' }}>
          <Button
            title={muted ? 'Activar micrófono' : 'Silenciar'}
            icon={muted ? 'mic-off-outline' : 'mic-outline'}
            variant="ghost"
            style={{ flex: 1, marginRight: 8 }}
            onPress={toggleMute}
          />
          <Button title="Finalizar" icon="call" variant="danger" style={{ flex: 1, marginLeft: 8 }} onPress={() => finishCall('ended')} disabled={busy} />
        </View>
      )}
      {terminal && <Button title="Volver al viaje" icon="arrow-back-outline" onPress={returnToTrip} />}
    </View>
  );
}


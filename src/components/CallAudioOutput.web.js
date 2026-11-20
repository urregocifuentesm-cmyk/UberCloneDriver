// Code documentation: Web implementation for the call audio output component.
import React, { useEffect, useRef } from 'react';

export default function CallAudioOutput({ stream, onPlaybackError }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stream) return undefined;
    audio.srcObject = stream;
    const playback = audio.play();
    if (playback?.catch) {
      playback.catch((error) => {
        console.warn('El navegador no pudo reproducir el audio remoto:', error);
        onPlaybackError('Permite la reproducción de audio en el navegador para escuchar la llamada.');
      });
    }
    return () => {
      audio.srcObject = null;
    };
  }, [stream, onPlaybackError]);

  return React.createElement('audio', { autoPlay: true, playsInline: true, ref: audioRef, style: { display: 'none' } });
}


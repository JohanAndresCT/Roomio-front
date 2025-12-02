import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';

interface UseVoiceCallProps {
  meetingId: string;
  userId: string;
  enabled: boolean; // Si el micrófono está habilitado
}

interface PeerConnection {
  peer: Peer.Instance;
  userId: string;
}

export function useVoiceCall({ meetingId, userId, enabled }: UseVoiceCallProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const isInitializingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Función para detectar actividad de voz
  const setupAudioDetection = (stream: MediaStream, speakerId: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);
      
      // Guardar referencias
      if (speakerId === userId) {
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }
      
      const detectSpeaking = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calcular volumen promedio
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        // Umbral de detección de voz (ajustable)
        const threshold = 30;
        const isSpeaking = average > threshold;
        
        setSpeakingUsers(prev => {
          const newSet = new Set(prev);
          if (isSpeaking) {
            newSet.add(speakerId);
          } else {
            newSet.delete(speakerId);
          }
          return newSet;
        });
        
        animationFrameRef.current = requestAnimationFrame(detectSpeaking);
      };
      
      detectSpeaking();
    } catch (err) {
      console.error('Error al configurar detección de audio:', err);
    }
  };

  useEffect(() => {
    if (!meetingId || !userId) return;
    
    // Prevenir doble inicialización
    if (isInitializingRef.current) {
      console.log('⚠️ Ya hay una inicialización en curso');
      return;
    }

    const initVoiceConnection = async () => {
      isInitializingRef.current = true;
      
      try {
        console.log('🎤 Iniciando conexión de voz...');
        console.log('🌐 URL del servidor:', import.meta.env.VITE_VOICE_SERVER_URL);

        // Configuración ICE hardcodeada (temporal hasta que el backend esté arreglado)
        const iceServers = [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ];
        console.log('🌐 ICE Servers configurados (hardcoded):', iceServers);

        // Conectar al servidor de voz
        console.log('🔌 Conectando al servidor de voz...');
        const voiceSocket = io(import.meta.env.VITE_VOICE_SERVER_URL || 'https://roomio-voice-service.onrender.com', {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
        socketRef.current = voiceSocket;

        // Registrar listeners de socket
        voiceSocket.on('connect', async () => {
          console.log('✅ Conectado al servidor de voz');
          setIsConnected(true);

          // Obtener stream de audio local
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }, 
              video: false 
            });
            localStreamRef.current = stream;
            
            // Mutear/desmutear según el estado inicial
            stream.getAudioTracks().forEach(track => {
              track.enabled = enabled;
            });

            console.log('🎤 Stream de audio obtenido');

            // Configurar análisis de audio local para detectar cuando hablo
            setupAudioDetection(stream, userId);

            // Unirse a la reunión
            console.log('📤 Emitiendo join-meeting:', { meetingId, userId });
            voiceSocket.emit('join-meeting', meetingId, userId);
            
            console.log('✅ join-meeting emitido, esperando evento user-connected...');
          } catch (err) {
            console.error('❌ Error al obtener audio:', err);
            setError('No se pudo acceder al micrófono');
          }
        });

        // Cuando un nuevo usuario se conecta
        voiceSocket.on('user-connected', (remoteUserId: string) => {
          console.log('👤 Usuario conectado:', remoteUserId);
          console.log('Mi userId:', userId);
          console.log('¿Tengo stream local?:', !!localStreamRef.current);
          
          if (!localStreamRef.current) {
            console.warn('⚠️ No hay stream local, no se puede crear peer');
            return;
          }

          // No crear peer si es el mismo usuario
          if (remoteUserId === userId) {
            console.log('⚠️ No crear peer conmigo mismo');
            return;
          }

          try {
            // Crear peer como initiator
            const peer = new Peer({
              initiator: true,
              trickle: false,
              stream: localStreamRef.current,
              config: { iceServers }
            });

            peer.on('signal', (signalData) => {
              console.log('📤 Enviando señal a:', remoteUserId);
              console.log('📦 Datos de señal:', signalData.type);
              voiceSocket.emit('signal', {
                to: remoteUserId,
                from: userId,
                signalData
              });
            });

            peer.on('stream', (remoteStream) => {
              console.log('🔊 Stream remoto recibido de:', remoteUserId);
              console.log('🎵 Tracks de audio:', remoteStream.getAudioTracks().length);
              playRemoteStream(remoteStream, remoteUserId);
              // Configurar detección de audio para el stream remoto
              setupAudioDetection(remoteStream, remoteUserId);
            });

            peer.on('error', (err) => {
              console.error('❌ Error en peer:', err);
            });

            peer.on('close', () => {
              console.log('🔌 Peer cerrado:', remoteUserId);
            });

            const peerObj: PeerConnection = { peer, userId: remoteUserId };
            peersRef.current.set(remoteUserId, peerObj);
            setPeers(new Map(peersRef.current));
            
            console.log('✅ Peer creado para:', remoteUserId);
            console.log('📊 Total peers:', peersRef.current.size);
          } catch (err) {
            console.error('❌ Error al crear peer:', err);
          }
        });

        // Cuando recibimos una señal
        voiceSocket.on('signal', ({ from, signalData }: { from: string; signalData: any }) => {
          console.log('📥 Señal recibida de:', from);
          
          let peer = peersRef.current.get(from)?.peer;

          if (!peer && localStreamRef.current) {
            // Crear peer como receptor
            peer = new Peer({
              initiator: false,
              trickle: false,
              stream: localStreamRef.current,
              config: { iceServers }
            });

            peer.on('signal', (responseSignal) => {
              console.log('📤 Respondiendo señal a:', from);
              voiceSocket.emit('signal', {
                to: from,
                from: userId,
                signalData: responseSignal
              });
            });

            peer.on('stream', (remoteStream) => {
              console.log('🔊 Stream remoto recibido de:', from);
              playRemoteStream(remoteStream, from);
              // Configurar detección de audio para el stream remoto
              setupAudioDetection(remoteStream, from);
            });

            peer.on('error', (err) => {
              console.error('❌ Error en peer:', err);
            });

            const peerObj: PeerConnection = { peer, userId: from };
            peersRef.current.set(from, peerObj);
            setPeers(new Map(peersRef.current));
          }

          if (peer) {
            peer.signal(signalData);
          }
        });

        // Cuando un usuario se desconecta
        voiceSocket.on('user-disconnected', (disconnectedUserId: string) => {
          console.log('👋 Usuario desconectado:', disconnectedUserId);
          const peerObj = peersRef.current.get(disconnectedUserId);
          if (peerObj) {
            peerObj.peer.destroy();
            peersRef.current.delete(disconnectedUserId);
            setPeers(new Map(peersRef.current));
          }
          
          // Remover elemento de audio
          const audioElement = document.getElementById(`audio-${disconnectedUserId}`) as HTMLAudioElement;
          if (audioElement) {
            audioElement.remove();
          }
        });

        voiceSocket.on('connect_error', (err) => {
          console.error('❌ Error de conexión socket:', err);
          console.error('Error detalles:', err.message);
          setError(`Error al conectar: ${err.message}`);
          setIsConnected(false);
          isInitializingRef.current = false;
        });

        voiceSocket.on('disconnect', () => {
          console.log('🔌 Socket desconectado');
          setIsConnected(false);
          isInitializingRef.current = false;
        });

        // Inicialización exitosa
        console.log('✅ Hook de voz inicializado correctamente');

      } catch (err: any) {
        console.error('❌ Error al inicializar voz (catch):', err);
        console.error('Error stack:', err?.stack);
        console.error('Error message:', err?.message);
        setError(err?.message || 'Error al inicializar conexión de voz');
        isInitializingRef.current = false;
      }
    };

    initVoiceConnection();

    return () => {
      console.log('🔌 Limpiando conexión de voz...');
      isInitializingRef.current = false;
      
      // Detener análisis de audio
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      // Detener tracks locales
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Destruir todos los peers
      peersRef.current.forEach(({ peer }) => {
        peer.destroy();
      });
      peersRef.current.clear();

      // Desconectar socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Remover todos los elementos de audio
      document.querySelectorAll('[id^="audio-"]').forEach(el => el.remove());
    };
  }, [meetingId, userId]);

  // Efecto para mutear/desmutear cuando cambia el estado
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log(enabled ? '🔊 Micrófono activado' : '🔇 Micrófono silenciado');
    }
  }, [enabled]);

  const playRemoteStream = (stream: MediaStream, userId: string) => {
    // Crear elemento de audio para el stream remoto
    let audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
    
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = `audio-${userId}`;
      audioElement.autoplay = true;
      document.body.appendChild(audioElement);
    }

    audioElement.srcObject = stream;
  };

  return {
    isConnected,
    error,
    peers: Array.from(peers.values()),
    speakingUsers: Array.from(speakingUsers)
  };
}

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer from 'simple-peer';

/**
 * Props for the useVoiceCall hook.
 * @interface UseVoiceCallProps
 * @property {string} meetingId - Unique identifier for the meeting room.
 * @property {string} userId - Unique identifier for the current user.
 * @property {boolean} enabled - Whether the microphone is enabled/unmuted.
 */
interface UseVoiceCallProps {
  meetingId: string;
  userId: string;
  enabled: boolean;
}

/**
 * Represents a peer-to-peer connection with another user.
 * @interface PeerConnection
 * @property {Peer.Instance} peer - SimplePeer instance for WebRTC connection.
 * @property {string} userId - User ID of the remote peer.
 */
interface PeerConnection {
  peer: Peer.Instance;
  userId: string;
}

/**
 * Custom hook for managing WebRTC voice connections in a video call.
 * 
 * This hook handles:
 * - WebRTC peer-to-peer connections using SimplePeer
 * - Voice activity detection using Web Audio API
 * - Socket.io signaling for connection establishment
 * - Microphone state management (mute/unmute)
 * 
 * @param {UseVoiceCallProps} props - Hook configuration parameters.
 * @param {string} props.meetingId - Meeting room identifier.
 * @param {string} props.userId - Current user identifier.
 * @param {boolean} props.enabled - Microphone enabled state.
 * 
 * @returns {Object} Voice call state and utilities.
 * @returns {boolean} isConnected - Whether connected to voice server.
 * @returns {string | null} error - Error message if connection failed.
 * @returns {PeerConnection[]} peers - Array of active peer connections.
 * @returns {string[]} speakingUsers - Array of user IDs currently speaking.
 * 
 * @example
 * const { isConnected, error, peers, speakingUsers } = useVoiceCall({
 *   meetingId: 'MTG-001',
 *   userId: 'user123',
 *   enabled: isMicOn
 * });
 */
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

  /**
   * usability story HU-005: Visual Voice Detection
   * 
   * Sets up audio analysis to detect when a user is speaking.
   * Uses Web Audio API to analyze audio frequency data and determine
   * if the volume exceeds the speaking threshold.
   * 
   * @param {MediaStream} stream - Audio stream to analyze.
   * @param {string} speakerId - User ID of the speaker.
   */
  const setupAudioDetection = (stream: MediaStream, speakerId: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);
      
      // Save references for cleanup later
      if (speakerId === userId) {
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }
      
      const detectSpeaking = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        // HU-005: Voice detection threshold (adjustable)
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
    
    // Prevent double initialization
    if (isInitializingRef.current) {
      console.log('⚠️ Initialization already in progress');
      return;
    }

    /**
     * Initializes WebRTC voice connection.
     * 
     * Steps:
     * 1. Connect to Socket.io voice server
     * 2. Request microphone access
     * 3. Set up audio detection
     * 4. Join meeting room
     * 5. Listen for peer connection events
     */
    const initVoiceConnection = async () => {
      isInitializingRef.current = true;
      
      try {
        console.log('🎤 Starting voice connection...');
        console.log('🌐 Server URL:', import.meta.env.VITE_VOICE_SERVER_URL);

        // ICE configuration (hardcoded until backend is fixed)
        const iceServers = [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ];
        console.log('🌐 ICE Servers configured (hardcoded):', iceServers);

        // Connect to voice server
        console.log('🔌 Connecting to voice server...');
        const voiceSocket = io(import.meta.env.VITE_VOICE_SERVER_URL || 'https://roomio-voice-service.onrender.com', {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
        socketRef.current = voiceSocket;

        // Register socket event listeners
        voiceSocket.on('connect', async () => {
          console.log('✅ Connected to voice server');
          setIsConnected(true);

          // Get local audio stream
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
            
            // Mute/unmute according to initial state
            stream.getAudioTracks().forEach(track => {
              track.enabled = enabled;
            });

            console.log('🎤 Audio stream obtained');

            // Set up local audio analysis to detect when I speak
            setupAudioDetection(stream, userId);

            // Join the meeting
            console.log('📤 Emitting join-meeting:', { meetingId, userId });
            voiceSocket.emit('join-meeting', meetingId, userId);
            
            console.log('✅ join-meeting emitido, esperando evento user-connected...');
          } catch (err) {
            console.error('❌ Error al obtener audio:', err);
            setError('No se pudo acceder al micrófono');
          }
        });

        // When a new user connects
        voiceSocket.on('user-connected', (remoteUserId: string) => {
          console.log('👤 User connected:', remoteUserId);
          console.log('My userId:', userId);
          console.log('Do I have local stream?:', !!localStreamRef.current);
          
          if (!localStreamRef.current) {
            console.warn('⚠️ No local stream, cannot create peer');
            return;
          }

          // Don't create peer if it's the same user
          if (remoteUserId === userId) {
            console.log('⚠️ Not creating peer with myself');
            return;
          }

          try {
            // Create peer as initiator
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
              console.log('🔊 Remote stream received from:', remoteUserId);
              console.log('🎵 Audio tracks:', remoteStream.getAudioTracks().length);
              playRemoteStream(remoteStream, remoteUserId);
              // Set up audio detection for remote stream
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

        // When we receive a signal
        voiceSocket.on('signal', ({ from, signalData }: { from: string; signalData: any }) => {
          console.log('📥 Señal recibida de:', from);
          
          let peer = peersRef.current.get(from)?.peer;

          if (!peer && localStreamRef.current) {
            // Create peer as receiver
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

        // When a user disconnects
        voiceSocket.on('user-disconnected', (disconnectedUserId: string) => {
          console.log('👋 User disconnected:', disconnectedUserId);
          const peerObj = peersRef.current.get(disconnectedUserId);
          if (peerObj) {
            peerObj.peer.destroy();
            peersRef.current.delete(disconnectedUserId);
            setPeers(new Map(peersRef.current));
          }
          
          // Remove audio element
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

        // Successful initialization
        console.log('✅ Voice hook initialized correctly');

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
      console.log('🔌 Cleaning up voice connection...');
      isInitializingRef.current = false;
      
      // Stop audio analysis
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Destroy all peers
      peersRef.current.forEach(({ peer }) => {
        peer.destroy();
      });
      peersRef.current.clear();

      // Disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Remove all audio elements
      document.querySelectorAll('[id^="audio-"]').forEach(el => el.remove());
    };
  }, [meetingId, userId]);

  // Effect to mute/unmute when state changes
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      console.log(enabled ? '🔊 Microphone enabled' : '🔇 Microphone muted');
    }
  }, [enabled]);

  /**
   * Creates and plays an HTML audio element for a remote stream.
   * 
   * @param {MediaStream} stream - Remote audio stream to play.
   * @param {string} userId - User ID for the audio element.
   */
  const playRemoteStream = (stream: MediaStream, userId: string) => {
    // Create audio element for remote stream
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

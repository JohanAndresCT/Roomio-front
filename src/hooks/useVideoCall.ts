import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Configuration for WebRTC Ice Servers
 */
interface IceServerConfig {
  iceServers: RTCIceServer[];
}

/**
 * Peer connection information
 */
interface PeerConnection {
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

/**
 * Hook options
 */
interface UseVideoCallOptions {
  meetingId: string;
  userId: string;
  enabled: boolean;
  serverUrl?: string;
}

/**
 * Custom hook for managing WebRTC video connections in a meeting.
 * Handles peer-to-peer video streaming, signaling, and connection management.
 * 
 * @param options - Configuration options for the video call
 * @returns Video call state and control functions
 */
export function useVideoCall({ 
  meetingId, 
  userId, 
  enabled,
  serverUrl = import.meta.env.VITE_VIDEO_SERVER_URL || 'https://roomio-video-service.onrender.com'
}: UseVideoCallOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceConfigRef = useRef<IceServerConfig | null>(null);

  /**
   * Creates a new RTCPeerConnection with ICE servers
   */
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const config: RTCConfiguration = iceConfigRef.current || {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const pc = new RTCPeerConnection(config);

    // Add local stream tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('📹 Received remote track from', peerId);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream));
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          roomId: meetingId,
          to: peerId
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`📡 Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError(`Connection with peer ${peerId} failed`);
      }
    };

    return pc;
  }, [meetingId]);

  /**
   * Starts local video stream
   */
  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: false // Audio is handled separately
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsVideoEnabled(true);
      setError(null);
      
      console.log('📹 Local video stream started');
      
      // Add tracks to existing peer connections
      peersRef.current.forEach((peer) => {
        stream.getTracks().forEach(track => {
          peer.connection.addTrack(track, stream);
        });
      });

      return stream;
    } catch (err: any) {
      console.error('❌ Error starting video:', err);
      setError(err.message || 'Failed to start video');
      return null;
    }
  }, []);

  /**
   * Stops local video stream
   */
  const stopVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setIsVideoEnabled(false);
      console.log('📹 Local video stream stopped');
      
      // Notify peers about video state
      if (socketRef.current) {
        socketRef.current.emit('toggle-video', { 
          roomId: meetingId, 
          enabled: false 
        });
      }
    }
  }, [meetingId]);

  /**
   * Toggles local video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (isVideoEnabled) {
      stopVideo();
    } else {
      await startVideo();
      if (socketRef.current) {
        socketRef.current.emit('toggle-video', { 
          roomId: meetingId, 
          enabled: true 
        });
      }
    }
  }, [isVideoEnabled, startVideo, stopVideo, meetingId]);

  /**
   * Creates an offer for a peer
   */
  const createOffer = useCallback(async (peerId: string) => {
    try {
      const pc = createPeerConnection(peerId);
      peersRef.current.set(peerId, { connection: pc });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('video-offer', {
          offer,
          roomId: meetingId,
          to: peerId
        });
      }
    } catch (err) {
      console.error('❌ Error creating offer:', err);
      setError('Failed to create video offer');
    }
  }, [createPeerConnection, meetingId]);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return;

    console.log('🎥 Initializing video call for meeting:', meetingId);

    const socket = io(serverUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to video server');
      setIsConnected(true);
      socket.emit('join-video-room', meetingId);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from video server');
      setIsConnected(false);
    });

    socket.on('ice-config', (config: IceServerConfig) => {
      console.log('🧊 Received ICE config');
      iceConfigRef.current = config;
    });

    socket.on('roomFull', () => {
      setError('Meeting room is full (max 10 participants)');
    });

    socket.on('user-joined', ({ userId: joinedUserId }: { userId: string }) => {
      console.log('👤 User joined:', joinedUserId);
      createOffer(joinedUserId);
    });

    socket.on('video-offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      console.log('📨 Received video offer from:', from);
      try {
        const pc = createPeerConnection(from);
        peersRef.current.set(from, { connection: pc });

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('video-answer', {
          answer,
          roomId: meetingId,
          to: from
        });
      } catch (err) {
        console.error('❌ Error handling offer:', err);
        setError('Failed to handle video offer');
      }
    });

    socket.on('video-answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      console.log('📨 Received video answer from:', from);
      try {
        const peer = peersRef.current.get(from);
        if (peer) {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('❌ Error handling answer:', err);
        setError('Failed to handle video answer');
      }
    });

    socket.on('ice-candidate', async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      console.log('🧊 Received ICE candidate from:', from);
      try {
        const peer = peersRef.current.get(from);
        if (peer && candidate) {
          await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('❌ Error adding ICE candidate:', err);
      }
    });

    socket.on('peer-toggle-video', ({ peerId, enabled }: { peerId: string; enabled: boolean }) => {
      console.log(`📹 Peer ${peerId} toggled video:`, enabled);
      // Handle remote peer video toggle if needed
    });

    socket.on('peer-disconnected', ({ peerId }: { peerId: string }) => {
      console.log('👋 Peer disconnected:', peerId);
      const peer = peersRef.current.get(peerId);
      if (peer) {
        peer.connection.close();
        peersRef.current.delete(peerId);
      }
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(peerId);
        return newMap;
      });
    });

    return () => {
      console.log('🧹 Cleaning up video call');
      stopVideo();
      peersRef.current.forEach(peer => peer.connection.close());
      peersRef.current.clear();
      socket.disconnect();
    };
  }, [enabled, meetingId, serverUrl, createPeerConnection, createOffer, stopVideo]);

  return {
    isConnected,
    error,
    localStream,
    remoteStreams,
    isVideoEnabled,
    toggleVideo,
    startVideo,
    stopVideo
  };
}

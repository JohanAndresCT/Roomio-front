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

    console.log(`[PC-${peerId}] Creating peer connection`);

    // Add local stream tracks if available
    if (localStreamRef.current) {
      console.log(`[PC-${peerId}] Adding ${localStreamRef.current.getTracks().length} local tracks`);
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`[PC-${peerId}] Adding track: ${track.kind} (${track.label})`);
        pc.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.log(`[PC-${peerId}] No local stream available yet`);
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`[PC-${peerId}] Received remote track:`, event.track.kind);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log(`[PC-${peerId}] Setting remote stream with ${remoteStream.getTracks().length} tracks`);
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
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
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
      
      console.log('Local video stream started');
      
      // Note: tracks will be added to peer connections during renegotiation

      return stream;
    } catch (err: any) {
      console.error('Error starting video:', err);
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
      console.log('Local video stream stopped');
      
      // Remove tracks from all peer connections
      peersRef.current.forEach((peer, peerId) => {
        const senders = peer.connection.getSenders();
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === 'video') {
            peer.connection.removeTrack(sender);
            console.log(`Removed video track from peer ${peerId}`);
          }
        });
      });
      
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
      const stream = await startVideo();
      if (stream && socketRef.current) {
        console.log('Video started, adding tracks to existing peers');
        
        // Add new video tracks to all existing peer connections
        peersRef.current.forEach(async (peer, peerId) => {
          stream.getTracks().forEach(track => {
            // Check if this track is already being sent
            const senders = peer.connection.getSenders();
            const existingSender = senders.find(s => s.track?.id === track.id);
            
            if (!existingSender) {
              console.log(`Adding ${track.kind} track to existing peer ${peerId}`);
              peer.connection.addTrack(track, stream);
            } else {
              console.log(`Track ${track.kind} already exists for peer ${peerId}, skipping`);
            }
          });
          
          // Renegotiate the connection
          try {
            const offer = await peer.connection.createOffer();
            await peer.connection.setLocalDescription(offer);
            
            socketRef.current?.emit('video-offer', {
              offer,
              roomId: meetingId,
              to: peerId
            });
            console.log(`Renegotiated connection with ${peerId} after video toggle`);
          } catch (err) {
            console.error(`Failed to renegotiate with ${peerId}:`, err);
          }
        });
        
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
      console.log(`[OFFER] Creating offer for peer: ${peerId}`);
      const pc = createPeerConnection(peerId);
      peersRef.current.set(peerId, { connection: pc });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(`[OFFER] Offer created and set as local description for ${peerId}`);

      if (socketRef.current) {
        socketRef.current.emit('video-offer', {
          offer,
          roomId: meetingId,
          to: peerId
        });
        console.log(`[OFFER] Sent offer to ${peerId}`);
      }
    } catch (err) {
      console.error('Error creating offer:', err);
      setError('Failed to create video offer');
    }
  }, [createPeerConnection, meetingId]);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return;

    console.log('Initializing video call for meeting:', meetingId);

    const socket = io(serverUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to video server');
      setIsConnected(true);
      socket.emit('join-video-room', meetingId);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from video server');
      setIsConnected(false);
    });

    socket.on('ice-config', (config: IceServerConfig) => {
      console.log('Received ICE config');
      iceConfigRef.current = config;
    });

    socket.on('roomFull', () => {
      setError('Meeting room is full (max 10 participants)');
    });

    // Handle existing users in the room
    socket.on('existing-users', ({ users }: { users: string[] }) => {
      console.log('Existing users in room:', users);
      // Create offers for all existing users
      users.forEach(existingUserId => {
        console.log('Creating offer for existing user:', existingUserId);
        createOffer(existingUserId);
      });
    });

    socket.on('user-joined', ({ userId: joinedUserId }: { userId: string }) => {
      console.log('User joined:', joinedUserId);
      createOffer(joinedUserId);
    });

    socket.on('video-offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      console.log(`[ANSWER] Received video offer from: ${from}`);
      try {
        // Check if we already have a connection with this peer
        let pc = peersRef.current.get(from)?.connection;
        
        if (pc) {
          console.log(`[ANSWER] Existing connection found for ${from}, renegotiating`);
          // Renegotiation - just update the remote description
        } else {
          console.log(`[ANSWER] Creating new connection for ${from}`);
          pc = createPeerConnection(from);
          peersRef.current.set(from, { connection: pc });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log(`[ANSWER] Set remote description from ${from}`);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log(`[ANSWER] Created and set answer for ${from}`);

        socket.emit('video-answer', {
          answer,
          roomId: meetingId,
          to: from
        });
        console.log(`[ANSWER] Sent answer to ${from}`);
      } catch (err) {
        console.error('Error handling offer:', err);
        setError('Failed to handle video offer');
      }
    });

    socket.on('video-answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
      console.log(`[COMPLETE] Received video answer from: ${from}`);
      try {
        const peer = peersRef.current.get(from);
        if (peer) {
          await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`[COMPLETE] Set remote description from answer for ${from}`);
        } else {
          console.warn(`[COMPLETE] No peer connection found for ${from}`);
        }
      } catch (err) {
        console.error('Error handling answer:', err);
        setError('Failed to handle video answer');
      }
    });

    socket.on('ice-candidate', async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      console.log('Received ICE candidate from:', from);
      try {
        const peer = peersRef.current.get(from);
        if (peer && candidate) {
          await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    socket.on('peer-toggle-video', ({ peerId, enabled }: { peerId: string; enabled: boolean }) => {
      console.log(`Peer ${peerId} toggled video:`, enabled);
      // Handle remote peer video toggle if needed
    });

    socket.on('peer-disconnected', ({ peerId }: { peerId: string }) => {
      console.log('Peer disconnected:', peerId);
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
      console.log('Cleaning up video call');
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

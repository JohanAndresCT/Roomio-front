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
    console.log(`[CREATE-PC] Creating peer connection for: ${peerId}`);
    console.log(`[CREATE-PC] Current peer connections:`, Array.from(peersRef.current.keys()));
    
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
        console.log(`[PC-${peerId}] Sending ICE candidate:`, event.candidate.type);
        socketRef.current.emit('ice-candidate', {
          candidate: event.candidate,
          roomId: meetingId,
          to: peerId
        });
      } else if (!event.candidate) {
        console.log(`[PC-${peerId}] ICE gathering complete`);
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log(`[PC-${peerId}] ICE connection state:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.error(`[PC-${peerId}] ICE connection ${pc.iceConnectionState}`);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError(`Connection with peer ${peerId} failed`);
      } else if (pc.connectionState === 'connected') {
        console.log(`[PC-${peerId}] Successfully connected!`);
        setError(null);
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
        
        // Add new video tracks to all existing peer connection
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
      
      // Check if peer connection already exists
      let existingPeer = peersRef.current.get(peerId);
      let pc: RTCPeerConnection;
      
      if (existingPeer) {
        console.log(`[OFFER] Reusing existing connection for ${peerId} (renegotiation)`);
        pc = existingPeer.connection;
      } else {
        console.log(`[OFFER] Creating new peer connection for ${peerId}`);
        pc = createPeerConnection(peerId);
        peersRef.current.set(peerId, { connection: pc });
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: true
      });
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
      console.log('📋 ========================================');
      console.log('📋 EXISTING USERS EVENT');
      console.log('📋 Existing users in room:', users);
      console.log('📋 Will create offers for each user');
      console.log('📋 ========================================');
      // Create offers for all existing users
      users.forEach(existingUserId => {
        console.log('Creating offer for existing user:', existingUserId);
        createOffer(existingUserId);
      });
    });

    socket.on('user-joined', ({ userId: joinedUserId }: { userId: string }) => {
      console.log('👤 ========================================');
      console.log('👤 USER JOINED EVENT');
      console.log('👤 User joined:', joinedUserId);
      console.log('👤 Creating offer for new user');
      console.log('👤 ========================================');
      createOffer(joinedUserId);
    });

    socket.on('video-offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
      console.log(`[ANSWER] Received video offer from: ${from}`);
      try {
        // Check if we already have a connection with this peer
        let existingPeer = peersRef.current.get(from);
        let pc: RTCPeerConnection;
        
        if (existingPeer) {
          console.log(`[ANSWER] Reusing existing connection for ${from} (renegotiation)`);
          pc = existingPeer.connection;
        } else {
          console.log(`[ANSWER] Creating new connection for ${from}`);
          pc = createPeerConnection(from);
          peersRef.current.set(from, { connection: pc });
        }

        // IMPORTANT: Add our local tracks if we have them (for renegotiation)
        if (localStreamRef.current) {
          const existingSenders = pc.getSenders();
          localStreamRef.current.getTracks().forEach(track => {
            const existingSender = existingSenders.find(s => s.track?.id === track.id);
            if (!existingSender) {
              console.log(`[ANSWER] Adding our ${track.kind} track to connection with ${from}`);
              pc.addTrack(track, localStreamRef.current!);
            }
          });
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
          console.log(`[COMPLETE] Peer connection state:`, peer.connection.connectionState);
          console.log(`[COMPLETE] Signaling state:`, peer.connection.signalingState);
          
          // Only set remote description if we're in the right state
          if (peer.connection.signalingState === 'have-local-offer') {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
            console.log(`[COMPLETE] Set remote description from answer for ${from}`);
          } else {
            console.warn(`[COMPLETE] Cannot set remote description, signaling state is: ${peer.connection.signalingState}`);
          }
        } else {
          console.warn(`[COMPLETE] No peer connection found for ${from}`);
        }
      } catch (err: any) {
        console.error('Error handling answer:', err);
        console.error('Error details:', err.message, err.name);
        setError('Failed to handle video answer');
      }
    });

    socket.on('ice-candidate', async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
      console.log(`Received ICE candidate from: ${from}, type:`, candidate.candidate ? 'valid' : 'end-of-candidates');
      try {
        const peer = peersRef.current.get(from);
        if (peer && candidate) {
          // Wait for remote description to be set before adding ICE candidates
          if (peer.connection.remoteDescription) {
            await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log(`[PC-${from}] ICE candidate added successfully`);
          } else {
            console.warn(`[PC-${from}] Remote description not set yet, queuing ICE candidate`);
            // Queue the candidate and add it after remote description is set
            setTimeout(async () => {
              if (peer.connection.remoteDescription) {
                await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(`[PC-${from}] Queued ICE candidate added`);
              }
            }, 100);
          }
        } else if (!peer) {
          console.warn(`No peer connection found for ${from}`);
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

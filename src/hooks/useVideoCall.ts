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
  isNegotiating?: boolean; // Track if negotiation is in progress
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
  const blackVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  /**
   * Creates a black video track (placeholder)
   */
  const createBlackVideoTrack = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const stream = canvas.captureStream();
    return stream.getVideoTracks()[0];
  }, []);

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

    // ALWAYS add a video track (black placeholder if camera is off)
    const videoTrack = localStreamRef.current?.getVideoTracks()[0] || blackVideoTrackRef.current;
    if (videoTrack) {
      const stream = new MediaStream([videoTrack]);
      console.log(`[PC-${peerId}] Adding video track: ${videoTrack.label}, kind: ${videoTrack.kind}, enabled: ${videoTrack.enabled}`);
      pc.addTrack(videoTrack, stream);
    } else {
      // Create black track if we don't have one yet (fallback)
      console.warn(`[PC-${peerId}] No video track available, creating new black track`);
      const blackTrack = createBlackVideoTrack();
      blackVideoTrackRef.current = blackTrack;
      const stream = new MediaStream([blackTrack]);
      console.log(`[PC-${peerId}] Adding black placeholder track`);
      pc.addTrack(blackTrack, stream);
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`[PC-${peerId}] Received remote track:`, event.track.kind, 'enabled:', event.track.enabled, 'readyState:', event.track.readyState);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log(`[PC-${peerId}] Setting remote stream with ${remoteStream.getTracks().length} tracks`);
        
        // Log all tracks in the stream
        remoteStream.getTracks().forEach(track => {
          console.log(`[PC-${peerId}] Stream track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        });
        
        // Create a new MediaStream object to force React re-render
        // This is necessary because replaceTrack doesn't change the stream reference
        const newStream = new MediaStream(remoteStream.getTracks());
        
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(peerId, newStream);
          console.log(`[PC-${peerId}] Updated remoteStreams map with NEW stream instance, now has ${newMap.size} streams`);
          return newMap;
        });
      } else {
        console.warn(`[PC-${peerId}] No stream provided with track`);
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
      
      // DON'T remove tracks - just let toggleVideo replace them with black track
      // Removing tracks causes signaling state issues
      
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
      // Turning OFF video - replace with black track (no renegotiation needed)
      stopVideo();
      
      const blackTrack = createBlackVideoTrack();
      blackVideoTrackRef.current = blackTrack;
      
      // Simply replace tracks without renegotiation (more efficient)
      const replacePromises = Array.from(peersRef.current.entries()).map(async ([peerId, peer]) => {
        const senders = peer.connection.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(blackTrack);
          console.log(`[TOGGLE-VIDEO-OFF] Replaced with black track for peer ${peerId}`);
        }
      });
      
      await Promise.all(replacePromises);
      
    } else {
      // Turning ON video - replace with camera track and renegotiate
      const stream = await startVideo();
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const replacePromises = Array.from(peersRef.current.entries()).map(async ([peerId, peer]) => {
            const senders = peer.connection.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            
            if (videoSender) {
              // Replace track
              await videoSender.replaceTrack(videoTrack);
              console.log(`[TOGGLE-VIDEO-ON] Replaced black track with camera for peer ${peerId}`);
              
              // Force renegotiation to ensure remote peer receives new track
              try {
                // Only renegotiate if in stable state and not already negotiating
                if (peer.connection.signalingState === 'stable' && !peer.isNegotiating) {
                  peer.isNegotiating = true;
                  const offer = await peer.connection.createOffer();
                  await peer.connection.setLocalDescription(offer);
                  socketRef.current?.emit('video-offer', {
                    offer,
                    roomId: meetingId,
                    to: peerId
                  });
                  console.log(`[TOGGLE-VIDEO-ON] Sent renegotiation offer to ${peerId}`);
                } else {
                  console.warn(`[TOGGLE-VIDEO-ON] Skipping renegotiation for ${peerId}, signalingState: ${peer.connection.signalingState}, isNegotiating: ${peer.isNegotiating}`);
                }
              } catch (err) {
                console.error(`[TOGGLE-VIDEO-ON] Renegotiation failed for ${peerId}:`, err);
                peer.isNegotiating = false;
              }
            }
          });
          
          await Promise.all(replacePromises);
        }
        
        if (socketRef.current) {
          socketRef.current.emit('toggle-video', { 
            roomId: meetingId, 
            enabled: true 
          });
        }
      }
    }
  }, [isVideoEnabled, startVideo, stopVideo, meetingId, createBlackVideoTrack]);

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
        
        // Prevent simultaneous negotiations
        if (existingPeer.isNegotiating) {
          console.warn(`[OFFER] Already negotiating with ${peerId}, skipping`);
          return;
        }
        
        // Wait for stable state before renegotiating
        if (pc.signalingState !== 'stable') {
          console.warn(`[OFFER] Signaling state is ${pc.signalingState}, waiting for stable`);
          // Wait a bit and retry
          setTimeout(() => createOffer(peerId), 100);
          return;
        }
      } else {
        console.log(`[OFFER] Creating new peer connection for ${peerId}`);
        pc = createPeerConnection(peerId);
        peersRef.current.set(peerId, { connection: pc, isNegotiating: false });
      }

      // Mark as negotiating
      if (existingPeer) {
        existingPeer.isNegotiating = true;
        peersRef.current.set(peerId, existingPeer);
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
    
    // Create black video track at initialization
    if (!blackVideoTrackRef.current) {
      blackVideoTrackRef.current = createBlackVideoTrack();
      console.log('Created initial black video track');
    }

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
          
          // If we're already negotiating, wait for it to complete
          if (existingPeer.isNegotiating) {
            console.warn(`[ANSWER] Already negotiating, queuing offer from ${from}`);
            // Queue the offer to be processed after current negotiation
            setTimeout(() => {
              socket.emit('video-offer', { offer, from });
            }, 100);
            return;
          }
        } else {
          console.log(`[ANSWER] Creating new connection for ${from}`);
          pc = createPeerConnection(from);
          peersRef.current.set(from, { connection: pc, isNegotiating: false });
          existingPeer = peersRef.current.get(from)!;
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
        
        // Mark negotiation complete after sending answer
        if (existingPeer) {
          existingPeer.isNegotiating = false;
          peersRef.current.set(from, existingPeer);
        }
      } catch (err) {
        console.error('Error handling offer:', err);
        
        // Reset negotiating flag on error
        const peer = peersRef.current.get(from);
        if (peer) {
          peer.isNegotiating = false;
          peersRef.current.set(from, peer);
        }
        
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
            
            // Mark negotiation as complete
            peer.isNegotiating = false;
            peersRef.current.set(from, peer);
          } else if (peer.connection.signalingState === 'stable') {
            // Already stable - this can happen in race conditions
            // The connection is already established, just mark negotiation as complete
            console.log(`[COMPLETE] Already in stable state, negotiation complete for ${from}`);
            peer.isNegotiating = false;
            peersRef.current.set(from, peer);
          } else {
            console.warn(`[COMPLETE] Unexpected signaling state: ${peer.connection.signalingState}`);
            // Reset negotiating flag to allow retry
            peer.isNegotiating = false;
            peersRef.current.set(from, peer);
          }
        } else {
          console.warn(`[COMPLETE] No peer connection found for ${from}`);
        }
      } catch (err: any) {
        console.error('Error handling answer:', err);
        console.error('Error details:', err.message, err.name);
        
        // Reset negotiating flag on error
        const peer = peersRef.current.get(from);
        if (peer) {
          peer.isNegotiating = false;
          peersRef.current.set(from, peer);
        }
        
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

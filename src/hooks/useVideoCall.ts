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
  const [videoSocketId, setVideoSocketId] = useState<string | null>(null);
  
  // Maps to track socket ID <-> user ID relationship
  const [socketToUserMap, setSocketToUserMap] = useState<Map<string, string>>(new Map());
  const [userToSocketMap, setUserToSocketMap] = useState<Map<string, string>>(new Map());
  
  // Force re-render counter when streams change
  const [, forceUpdate] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceConfigRef = useRef<IceServerConfig | null>(null);
  const blackVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());

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
        
        // Update the ref AND state together
        remoteStreamsRef.current.set(peerId, newStream);
        
        // Force React re-render by creating new Map and triggering forceUpdate
        setRemoteStreams(new Map(remoteStreamsRef.current));
        forceUpdate(prev => prev + 1);
        
        console.log(`[PC-${peerId}] Updated remoteStreams map with NEW stream instance, now has ${remoteStreamsRef.current.size} streams`);
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
      if (pc.connectionState === 'failed') {
        console.error(`[PC-${peerId}] Connection failed, attempting ICE restart`);
        setError(`Connection with peer ${peerId} failed, attempting to reconnect...`);
        
        // Try ICE restart first
        const peer = peersRef.current.get(peerId);
        if (peer && peer.connection.signalingState === 'stable') {
          console.log(`[PC-${peerId}] Attempting ICE restart`);
          peer.connection.createOffer({ iceRestart: true })
            .then(offer => {
              return peer.connection.setLocalDescription(offer);
            })
            .then(() => {
              if (socketRef.current) {
                socketRef.current.emit('video-offer', {
                  offer: peer.connection.localDescription,
                  roomId: meetingId,
                  to: peerId
                });
                console.log(`[PC-${peerId}] Sent ICE restart offer`);
              }
            })
            .catch(err => {
              console.error(`[PC-${peerId}] ICE restart failed:`, err);
              // If ICE restart fails, remove the stream
              remoteStreamsRef.current.delete(peerId);
              setRemoteStreams(new Map(remoteStreamsRef.current));
              forceUpdate(prev => prev + 1);
            });
        } else {
          // Can't do ICE restart, just clean up
          remoteStreamsRef.current.delete(peerId);
          setRemoteStreams(new Map(remoteStreamsRef.current));
          forceUpdate(prev => prev + 1);
          console.log(`[PC-${peerId}] Removed failed stream from remoteStreams`);
        }
      } else if (pc.connectionState === 'disconnected') {
        console.warn(`[PC-${peerId}] Connection disconnected, waiting to see if it recovers`);
        // Don't immediately remove - give it time to reconnect
      } else if (pc.connectionState === 'connected') {
        console.log(`[PC-${peerId}] Successfully connected!`);
        setError(null);
      }
    };

    return pc;
  }, [meetingId, createBlackVideoTrack]);

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
      // Turning ON video - need to start stream first, then renegotiate ALL connections
      const stream = await startVideo();
      if (!stream) {
        console.error('[TOGGLE-VIDEO-ON] Failed to start video stream');
        return;
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        console.error('[TOGGLE-VIDEO-ON] No video track found in stream');
        return;
      }
      
      console.log('[TOGGLE-VIDEO-ON] Video track obtained:', videoTrack.label);
      
      // For each peer connection, remove old track and add new one, then renegotiate
      for (const [peerId, peer] of peersRef.current.entries()) {
        try {
          // Force rollback if in have-local-offer state (stuck offer)
          if (peer.connection.signalingState === 'have-local-offer') {
            console.warn(`[TOGGLE-VIDEO-ON] Peer ${peerId} is stuck in have-local-offer, attempting rollback`);
            try {
              await peer.connection.setLocalDescription({ type: 'rollback' });
              console.log(`[TOGGLE-VIDEO-ON] Rollback successful for ${peerId}`);
              
              // Wait a bit for the state to stabilize
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (rollbackErr) {
              console.error(`[TOGGLE-VIDEO-ON] Rollback failed for ${peerId}, will recreate connection:`, rollbackErr);
              
              // Close the corrupted connection
              peer.connection.close();
              
              // Create a new peer connection
              console.log(`[TOGGLE-VIDEO-ON] Creating new peer connection for ${peerId}`);
              const newPc = createPeerConnection(peerId);
              peersRef.current.set(peerId, { connection: newPc, isNegotiating: false });
              
              // Add the video track to the new connection
              newPc.addTrack(videoTrack, stream);
              console.log(`[TOGGLE-VIDEO-ON] Added video track to new peer connection for ${peerId}`);
              
              // Create and send a new offer
              const offer = await newPc.createOffer();
              await newPc.setLocalDescription(offer);
              
              socketRef.current?.emit('video-offer', {
                offer,
                roomId: meetingId,
                to: peerId
              });
              
              console.log(`[TOGGLE-VIDEO-ON] Sent new offer to recreated peer ${peerId}`);
              continue; // Move to next peer
            }
          }
          
          // Now check if stable
          if (peer.connection.signalingState !== 'stable') {
            console.error(`[TOGGLE-VIDEO-ON] Peer ${peerId} still not stable: ${peer.connection.signalingState}`);
            continue; // Skip this peer
          }
          
          // Skip if already negotiating
          if (peer.isNegotiating) {
            console.warn(`[TOGGLE-VIDEO-ON] Peer ${peerId} is already negotiating, skipping`);
            continue;
          }
          
          peer.isNegotiating = true;
          
          // Use replaceTrack instead of removeTrack + addTrack to maintain m-line order
          const senders = peer.connection.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          
          if (videoSender) {
            await videoSender.replaceTrack(videoTrack);
            console.log(`[TOGGLE-VIDEO-ON] Replaced track with real video for peer ${peerId}`);
          } else {
            // Fallback: if no sender exists, add the track
            peer.connection.addTrack(videoTrack, stream);
            console.log(`[TOGGLE-VIDEO-ON] Added new video track to peer ${peerId}`);
          }
          
          // Create and send offer
          const offer = await peer.connection.createOffer();
          await peer.connection.setLocalDescription(offer);
          
          console.log(`[TOGGLE-VIDEO-ON] Created offer for ${peerId}:`, {
            type: offer.type,
            socketConnected: socketRef.current?.connected,
            socketId: socketRef.current?.id
          });
          
          if (!socketRef.current?.connected) {
            console.error(`[TOGGLE-VIDEO-ON] Socket not connected! Cannot send renegotiation`);
            peer.isNegotiating = false;
            continue;
          }
          
          console.log(`[TOGGLE-VIDEO-ON] About to emit video-renegotiate:`, {
            to: peerId,
            roomId: meetingId,
            socketId: socketRef.current.id,
            offerType: offer.type
          });
          
          socketRef.current.emit('video-renegotiate', {
            sdp: offer,
            roomId: meetingId,
            to: peerId
          });
          
          console.log(`[TOGGLE-VIDEO-ON] Sent renegotiation offer to ${peerId}`);
          
        } catch (err) {
          console.error(`[TOGGLE-VIDEO-ON] Error renegotiating with ${peerId}:`, err);
          peer.isNegotiating = false;
        }
      }
      
      // Notify via socket
      if (socketRef.current) {
        socketRef.current.emit('toggle-video', { 
          roomId: meetingId, 
          enabled: true 
        });
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
    if (!enabled) {
      console.log('[VIDEO-CALL] Video call disabled, skipping initialization');
      return;
    }

    console.log('[VIDEO-CALL] ========================================');
    console.log('[VIDEO-CALL] Initializing video call');
    console.log('[VIDEO-CALL] Meeting ID:', meetingId);
    console.log('[VIDEO-CALL] User ID:', userId);
    console.log('[VIDEO-CALL] Server URL:', serverUrl);
    console.log('[VIDEO-CALL] ========================================');
    
    // Create black video track at initialization
    if (!blackVideoTrackRef.current) {
      blackVideoTrackRef.current = createBlackVideoTrack();
      console.log('[VIDEO-CALL] Created initial black video track');
    }

    console.log('[VIDEO-CALL] Attempting to connect to video server...');
    const socket = io(serverUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[VIDEO-CALL] ✅ Connected to video server!');
      console.log('[VIDEO-CALL] Socket ID:', socket.id);
      setVideoSocketId(socket.id || null);
      setIsConnected(true);
      console.log('[VIDEO-CALL] Joining video room:', meetingId);
      
      // Send both meetingId and userId to establish the mapping on the server
      socket.emit('join-video-room', { roomId: meetingId, userId: userId });
      
      // Also add our own mapping locally immediately
      if (socket.id) {
        console.log('[VIDEO-MAPPING] Adding own mapping:', { userId, socketId: socket.id });
        setSocketToUserMap(prev => {
          const newMap = new Map(prev);
          newMap.set(socket.id!, userId);
          return newMap;
        });
        setUserToSocketMap(prev => {
          const newMap = new Map(prev);
          newMap.set(userId, socket.id!);
          return newMap;
        });
      }
      
      // Debug: log all incoming events
      socket.onAny((eventName, ...args) => {
        console.log(`[VIDEO-SOCKET] Received event: "${eventName}"`, args);
      });
    });

    socket.on('connect_error', (error) => {
      console.error('[VIDEO-CALL] ❌ Connection error:', error);
      console.error('[VIDEO-CALL] Error message:', error.message);
    });

    socket.on('disconnect', () => {
      console.log('[VIDEO-CALL] Disconnected from video server');
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
    // Handle user mapping event (socketId -> userId)
    socket.on('user-mapping', ({ socketId, userId: mappedUserId }: { socketId: string; userId: string }) => {
      console.log('[VIDEO-MAPPING] Received user mapping:', { socketId, userId: mappedUserId });
      setSocketToUserMap(prev => {
        const newMap = new Map(prev);
        newMap.set(socketId, mappedUserId);
        return newMap;
      });
      setUserToSocketMap(prev => {
        const newMap = new Map(prev);
        newMap.set(mappedUserId, socketId);
        return newMap;
      });
    });

    socket.on('existing-users', ({ users }: { users: string[] }) => {
      console.log('📋 ========================================');
      console.log('📋 EXISTING USERS EVENT');
      console.log('📋 Existing users (socket IDs):', users);
      console.log('📋 Will create offers for each user');
      console.log('📋 ========================================');
      // Create offers for all existing users (these are socket IDs)
      users.forEach(existingSocketId => {
        console.log('Creating offer for existing user (socket):', existingSocketId);
        createOffer(existingSocketId);
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
          
          // Handle glare condition (both sides trying to negotiate)
          if (pc.signalingState === 'have-local-offer') {
            console.warn(`[ANSWER] Glare detected with ${from}, rolling back local offer`);
            // Rollback by accepting remote offer
            await pc.setLocalDescription({type: 'rollback'});
          }
          
          // If we're already negotiating, this rollback handles it
          if (existingPeer.isNegotiating) {
            console.log(`[ANSWER] Was negotiating, now accepting remote offer from ${from}`);
            existingPeer.isNegotiating = false;
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

    socket.on('video-renegotiate', async ({ sdp, from }: { sdp: RTCSessionDescriptionInit; from: string }) => {
      console.log(`[RENEGOTIATE] Received renegotiation SDP from: ${from}, type: ${sdp.type}`);
      try {
        const peer = peersRef.current.get(from);
        if (!peer) {
          console.warn(`[RENEGOTIATE] No peer connection found for ${from}`);
          return;
        }

        console.log(`[RENEGOTIATE] Current signaling state: ${peer.connection.signalingState}`);

        // Handle based on SDP type
        if (sdp.type === 'offer') {
          // Handle glare condition: if we're also in have-local-offer state, do rollback
          if (peer.connection.signalingState === 'have-local-offer') {
            console.warn(`[RENEGOTIATE] Glare detected! Rolling back local offer from ${from}`);
            await peer.connection.setLocalDescription({ type: 'rollback' });
            console.log(`[RENEGOTIATE] Rollback complete, waiting for stable state`);
            
            // Wait for stable state after rollback
            await new Promise<void>((resolve) => {
              const checkStable = () => {
                if (peer.connection.signalingState === 'stable') {
                  console.log(`[RENEGOTIATE] Connection is now stable after rollback`);
                  resolve();
                } else {
                  setTimeout(checkStable, 50);
                }
              };
              checkStable();
            });
          }
          
          // Received an offer - need to answer
          await peer.connection.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log(`[RENEGOTIATE] Set remote offer from ${from}`);
          
          const answer = await peer.connection.createAnswer();
          await peer.connection.setLocalDescription(answer);
          console.log(`[RENEGOTIATE] Created and set answer for ${from}`);

          socket.emit('video-renegotiate', {
            sdp: answer,
            roomId: meetingId,
            to: from
          });
          console.log(`[RENEGOTIATE] Sent renegotiation answer to ${from}`);
          
          // Mark negotiation as complete
          peer.isNegotiating = false;
          peersRef.current.set(from, peer);
        } else if (sdp.type === 'answer') {
          // Received an answer - just set it
          if (peer.connection.signalingState === 'have-local-offer') {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(sdp));
            console.log(`[RENEGOTIATE] Set remote answer from ${from}`);
            
            // Mark negotiation as complete
            peer.isNegotiating = false;
            peersRef.current.set(from, peer);
          } else {
            console.warn(`[RENEGOTIATE] Cannot set answer, wrong state: ${peer.connection.signalingState}`);
          }
        }
      } catch (err) {
        console.error('[RENEGOTIATE] Error handling renegotiation:', err);
        
        // Reset negotiating flag on error
        const peer = peersRef.current.get(from);
        if (peer) {
          peer.isNegotiating = false;
          peersRef.current.set(from, peer);
        }
      }
    });

    socket.on('peer-disconnected', ({ peerId }: { peerId: string }) => {
      console.log('Peer disconnected:', peerId);
      const peer = peersRef.current.get(peerId);
      if (peer) {
        peer.connection.close();
        peersRef.current.delete(peerId);
      }
      remoteStreamsRef.current.delete(peerId);
      setRemoteStreams(new Map(remoteStreamsRef.current));
      forceUpdate(prev => prev + 1);
    });

    return () => {
      console.log('Cleaning up video call');
      stopVideo();
      peersRef.current.forEach(peer => peer.connection.close());
      peersRef.current.clear();
      socket.disconnect();
    };
  }, [enabled, meetingId, serverUrl, createPeerConnection, createOffer, stopVideo]);

  /**
   * Add a mapping between a user ID and their video socket ID
   */
  const addUserMapping = useCallback((userId: string, socketId: string) => {
    console.log('[VIDEO-MAPPING] Adding mapping:', { userId, socketId });
    setSocketToUserMap(prev => {
      const newMap = new Map(prev);
      newMap.set(socketId, userId);
      return newMap;
    });
    setUserToSocketMap(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, socketId);
      return newMap;
    });
  }, []);

  return {
    isConnected,
    error,
    localStream,
    remoteStreams,
    isVideoEnabled,
    toggleVideo,
    startVideo,
    stopVideo,
    videoSocketId,
    socketToUserMap,
    userToSocketMap,
    addUserMapping
  };
}

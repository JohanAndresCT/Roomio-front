import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useVoiceCall } from '../hooks/useVoiceCall';
import { useVideoCall } from '../hooks/useVideoCall';
import { io } from 'socket.io-client';
import { useParams, useLocation } from 'react-router-dom';
import { DateTime } from "luxon";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  Phone,
  Users,
  MoreVertical,
  User,
  Sparkles,
  Contrast
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChatPanel } from '../components/ChatPanel';

/**
 * Props for the VideoCallRoom component.
 * @typedef {Object} VideoCallRoomProps
 * @property {(page: string) => void} onNavigate - Function to navigate between pages.
 */
interface VideoCallRoomProps {
  onNavigate: (page: string) => void;
}


/**
 * Represents a meeting participant.
 * @typedef {Object} Participant
 * @property {string} id - Unique participant ID.
 * @property {string} name - Participant name.
 * @property {boolean} isMuted - Whether the participant's mic is muted.
 * @property {boolean} isVideoOff - Whether the participant's video is off.
 * @property {boolean} isSpeaking - Whether the participant is currently speaking.
 */
interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
  photoURL?: string | null;
}


/**
 * VideoCallRoom component.
 * Displays the video call interface, participants, controls, and chat panel.
 * Handles mic, video, chat, accessibility, and AI summary toggles.
 * @param {VideoCallRoomProps} props - Component props.
 * @returns {JSX.Element} Video call room layout.
 */
const VideoCallRoom = ({ onNavigate }: VideoCallRoomProps) => {
  const params = useParams();
  const location = useLocation();
  const meetingId = params.meetingId || 'MTG-001';
  const { user } = useAuth();
  // Meeting name is no longer retrieved from query

  const [currentTime, setCurrentTime] = useState(() => {
    return DateTime.now().setZone('America/Bogota').toFormat('HH:mm:ss');
  });

  useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTime(DateTime.now().setZone('America/Bogota').toFormat('HH:mm:ss'));
      }, 1000);
      return () => clearInterval(interval);
    }, []);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [socket, setSocket] = useState<any>(null);

  // usability story HU-007: Voice Connection Indicator
  // Hook to manage WebRTC voice connection
  const { isConnected: isVoiceConnected, error: voiceError, peers: voicePeers, speakingUsers } = useVoiceCall({
    meetingId: meetingId,
    userId: user?.uid || '',
    enabled: isMicOn
  });

  // Hook to manage WebRTC video connection
  const { 
    localStream: videoLocalStream, 
    remoteStreams: videoRemoteStreams, 
    isVideoEnabled, 
    toggleVideo,
    error: videoError,
    videoSocketId,
    socketToUserMap,
    userToSocketMap,
    addUserMapping
  } = useVideoCall({
    meetingId: meetingId,
    userId: user?.uid || '',
    enabled: true // Always enabled to allow toggle
  });

  // Sync video state with local UI state and backend
  useEffect(() => {
    setIsVideoOn(isVideoEnabled);
    
    // Sync with backend when video state changes
    if (socket?.connected) {
      console.log('📹 Video state changed, syncing with backend:', isVideoEnabled);
      socket.emit('update-media-state', {
        meetingId,
        isMuted: !isMicOn,
        isVideoOff: !isVideoEnabled
      });
      
      // Update local participant state
      setParticipants(prev => prev.map(p => 
        p.id === user?.uid ? { ...p, isVideoOff: !isVideoEnabled } : p
      ));
    }
  }, [isVideoEnabled, socket, meetingId, isMicOn, user?.uid]);

  // HU-007: Display voice connection status in console
  useEffect(() => {
    if (isVoiceConnected) {
      console.log('✅ Voz conectada. Peers activos:', voicePeers.length);
    }
    if (voiceError) {
      console.error('❌ Error de voz:', voiceError);
    }
  }, [isVoiceConnected, voiceError, voicePeers]);

  // Display video errors
  useEffect(() => {
    if (videoError) {
      console.error('❌ Error de video:', videoError);
    }
  }, [videoError]);

  // Debug video streams only when they change (controlled logging)
  useEffect(() => {
    console.log('📹 Video Remote Streams Updated:', {
      count: videoRemoteStreams.size,
      socketIds: Array.from(videoRemoteStreams.keys())
    });
  }, [videoRemoteStreams]);

  // Debug mapping state
  useEffect(() => {
    console.log('🗺️ ID Mapping Updated:', {
      userToSocket: Array.from(userToSocketMap.entries()),
      socketToUser: Array.from(socketToUserMap.entries())
    });
  }, [userToSocketMap, socketToUserMap]);

  // Send videoSocketId to other participants via chat socket when it's available
  useEffect(() => {
    if (videoSocketId && socket?.connected && user?.uid) {
      console.log('[VIDEO-MAPPING] Broadcasting my video socket ID:', {
        firebaseUid: user.uid,
        videoSocketId: videoSocketId,
        meetingId: meetingId
      });
      
      // Add our own mapping locally
      addUserMapping(user.uid, videoSocketId);
      
      // Broadcast to all participants in the meeting
      socket.emit('video-socket-mapping', {
        meetingId: meetingId,
        userId: user.uid,
        videoSocketId: videoSocketId
      });
    }
  }, [videoSocketId, socket, user?.uid, meetingId, addUserMapping]);

  useEffect(() => {
    // If there's already an active connection, don't create another
    if (socket?.connected) {
      console.log("⚠️ Socket already connected, skipping reconnection");
      return;
    }

    if (!user) {
      console.log("⚠️ No user, waiting...");
      return;
    }

    console.log("🔌 Initiating socket connection for:", user.uid);

    // Initialize with current user while connecting
    setParticipants([{
      id: user.uid,
      name: user.displayName || 'You',
      isMuted: false,
      isVideoOff: true,
      isSpeaking: false,
      photoURL: user.photoURL || null,
    }]);

    const connectSocket = async () => {
      // Get Firebase token
      let token = '';
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          token = await currentUser.getIdToken();
        }
      } catch (err) {
        console.error("Error getting token:", err);
      }

      console.log("Connecting to socket server...");
      console.log("URL:", import.meta.env.VITE_CHAT_SERVER_URL || 'https://roomio-chat-service.onrender.com');
      console.log("meetingId:", meetingId, "uid:", user?.uid);

      // Connect to socket server
      const socket = io(import.meta.env.VITE_CHAT_SERVER_URL || 'https://roomio-chat-service.onrender.com', {
        transports: ['websocket'],
        auth: { token },
        query: { meetingId, uid: user?.uid },
      });
      setSocket(socket);

      socket.on('connect', () => {
        console.log("Connected to socket server");
        console.log("✅ Socket ID:", socket.id);
        console.log("✅ Socket connected:", socket.connected);
        // Join meeting after connecting with user information
        console.log("Emitting join-meeting for:", meetingId);
        console.log("User data:", {
          uid: user?.uid,
          displayName: user?.displayName,
          photoURL: user?.photoURL
        });
        console.log("🎤 Initial media state:", { isMicOn, isVideoOn, sending_isMuted: !isMicOn, sending_isVideoOff: !isVideoOn });
        socket.emit('join-meeting', {
          meetingId,
          photoURL: user?.photoURL || null,
          isMuted: !isMicOn,
          isVideoOff: !isVideoOn
        });
      });

      socket.on('connect_error', (error) => {
        console.error("Connection error:", error);
      });

      // Debug: Listen to ALL events to see what's coming from backend
      const originalOn = socket.on.bind(socket);
      socket.on = function(event: string, listener: any) {
        if (!event.startsWith('$')) { // Skip internal socket.io events
          console.log(`📥 Registering listener for event: "${event}"`);
        }
        return originalOn(event, listener);
      };
      
      // Log all incoming events
      socket.onAny((eventName: string, ...args: any[]) => {
        console.log(`📨 Received event: "${eventName}"`, args);
      });

      // Listen for updates to the complete participants array
      socket.on('participants', (list: any[]) => {
        console.log("=== EVENTO PARTICIPANTS RECIBIDO ===");
        console.log("Lista de participantes recibida del backend:", JSON.stringify(list, null, 2));
        console.log("Total recibido del backend:", list.length);
        list.forEach(p => {
          console.log(`Participant ${p.userName}: isMuted=${p.isMuted}, isVideoOff=${p.isVideoOff}`);
        });
        
        // Find current user in the list
        const currentUserInList = list.find(p => p.userId === user?.uid);
        if (currentUserInList) {
          console.log("👤 Current user state from backend:", {
            isMuted: currentUserInList.isMuted,
            isVideoOff: currentUserInList.isVideoOff,
            local_isMicOn: isMicOn,
            local_isVideoOn: isVideoOn
          });
        }
        
        if (!list || list.length === 0) {
          console.warn("Empty participants list, keeping current user");
          return;
        }
        
        setParticipants(prevParticipants => {
          const updatedList = list.map((p: any) => {
            const isCurrentUser = p.userId === user?.uid;
            const existingParticipant = prevParticipants.find(prev => prev.id === p.userId);
            
            console.log(`Processing participant: ${p.userName} (${p.userId})`, {
              isCurrentUser,
              photoURL: p.photoURL,
              backendMuted: p.isMuted,
              backendVideoOff: p.isVideoOff,
              existingMuted: existingParticipant?.isMuted,
              existingVideoOff: existingParticipant?.isVideoOff
            });
            
            // For current user only: check if we have a pending local state change
            // Only preserve if the local state is different from backend (indicates optimistic update)
            if (isCurrentUser && existingParticipant) {
              const hasLocalChanges = 
                existingParticipant.isMuted !== p.isMuted || 
                existingParticipant.isVideoOff !== p.isVideoOff;
              
              if (hasLocalChanges) {
                console.log("🔒 Current user has local changes, preserving for this update cycle");
                return {
                  id: p.userId,
                  name: p.userName,
                  isMuted: existingParticipant.isMuted,
                  isVideoOff: existingParticipant.isVideoOff,
                  isSpeaking: existingParticipant.isSpeaking,
                  photoURL: user?.photoURL || p.photoURL || null,
                };
              }
            }
            
            // For all participants (including current user if no local changes), use backend state
            // But preserve existing media state if backend doesn't provide it
            return {
              id: p.userId,
              name: p.userName,
              // Use backend state if available, otherwise keep existing state
              isMuted: p.isMuted !== undefined ? p.isMuted : (existingParticipant?.isMuted ?? true),
              isVideoOff: p.isVideoOff !== undefined ? p.isVideoOff : (existingParticipant?.isVideoOff ?? true),
              isSpeaking: existingParticipant?.isSpeaking ?? false,
              photoURL: isCurrentUser && user?.photoURL ? user.photoURL : (p.photoURL || null),
            };
          });
          
          console.log("Final participants list:", updatedList);
          console.log("FINAL number of participants:", updatedList.length);
          return updatedList;
        });
      });

      // Note: user-joined and user-left events are handled by useChatSocket for chat display
      // No need to listen here to avoid duplicate messages

      // HU-006: Listen for media state changes (mic/camera)
      console.log("🎧 Registering listener for 'media-state-updated' event");
      socket.on('media-state-updated', ({ userId, isMuted, isVideoOff }: any) => {
        const isCurrentUser = userId === user?.uid;
        console.log(`📡 Media state updated: ${userId}`, { 
          isMuted, 
          isVideoOff,
          isCurrentUser,
          currentUserId: user?.uid 
        });
        
        // Update immediately - this has priority over participants event
        setParticipants(prev => {
          const updated = prev.map(p => 
            p.id === userId ? { ...p, isMuted, isVideoOff } : p
          );
          console.log('✅ Participants after media-state-updated:', updated);
          
          // Find the updated participant to log
          const updatedParticipant = updated.find(p => p.id === userId);
          if (updatedParticipant) {
            console.log(`✅ ${updatedParticipant.name} media state:`, {
              isMuted: updatedParticipant.isMuted,
              isVideoOff: updatedParticipant.isVideoOff
            });
          }
          
          return updated;
        });
      });

      // Listen for video socket ID mappings from other participants
      socket.on('video-socket-mapping', ({ userId: remoteUserId, videoSocketId: remoteVideoSocketId }: any) => {
        console.log('[VIDEO-MAPPING] Received mapping from participant:', {
          firebaseUid: remoteUserId,
          videoSocketId: remoteVideoSocketId
        });
        
        // Add the mapping to our video hook
        addUserMapping(remoteUserId, remoteVideoSocketId);
      });
    };

    connectSocket();

    return () => {
      console.log("🔌 Disconnecting socket...");
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [meetingId, user?.uid]); // Only reconnect if meetingId or user uid changes

  // usability story HU-006: Microphone State Synchronization
  const handleMicToggle = () => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    console.log(newMicState ? '🎤 Microphone activated' : '🔇 Microphone deactivated');
    console.log('Emitting update-media-state:', { 
      meetingId, 
      isMuted: !newMicState, 
      isVideoOff: !isVideoOn 
    });
    
    // HU-006: Optimistic update of local state
    setParticipants(prev => prev.map(p => 
      p.id === user?.uid ? { ...p, isMuted: !newMicState } : p
    ));
    
    // HU-006: Synchronize state with all participants via Socket.io
    if (socket?.connected) {
      socket.emit('update-media-state', {
        meetingId,
        isMuted: !newMicState,
        isVideoOff: !isVideoOn
      });
    } else {
      console.error('❌ Socket not connected, cannot send media state update');
    }
  };

  const handleVideoToggle = async () => {
    console.log('📹 Toggling camera...');
    // Toggle video using the hook - the useEffect will handle backend sync
    await toggleVideo();
  };

  const handleLeaveCall = () => {
    console.log('🚪 Leaving meeting...');
    
    // Disconnect socket to trigger user-left event on backend
    if (socket?.connected) {
      console.log('🔌 Disconnecting socket...');
      socket.disconnect();
    }
    
    console.log('✅ You have left the meeting');
    onNavigate('dashboard');
  };

  return (
    <div className="video-call-room">
      {/* Header */}
      <header className="video-call-header">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <div className="recording-indicator" aria-hidden="true"></div>
          <span className="text-white text-xs sm:text-sm md:text-base truncate">Reunión en progreso</span>
          <Badge variant="secondary" className="flex-shrink-0 text-xs px-1.5 py-0.5">
            <Users className="w-3 h-3 mr-1" aria-hidden="true" />
            {participants.length}
          </Badge>
          {/* Meeting name is no longer displayed */}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-white">
            <span>{meetingId}</span>
            <span className="text-white/60">|</span>
            <span>{currentTime}</span>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-700/50 w-8 h-8 sm:w-9 sm:h-9">
            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Video Grid */}
      <main className="video-call-main">
        <div className={`video-call-grid ${
          participants.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' :
          participants.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' :
          participants.length <= 6 ? 'grid-cols-2 lg:grid-cols-3' :
          'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {participants.map((participant) => {
            // HU-005: Detect if participant is speaking
            const isSpeaking = speakingUsers.includes(participant.id);
            const isCurrentUser = participant.id === user?.uid;
            
            // Get video stream for this participant
            // For remote users, we need to map their Firebase UID to their video socket ID
            let videoStream: MediaStream | undefined;
            if (isCurrentUser) {
              videoStream = videoLocalStream || undefined;
            } else {
              // Get the socket ID for this participant's Firebase UID
              const participantSocketId = userToSocketMap.get(participant.id);
              if (participantSocketId) {
                videoStream = videoRemoteStreams.get(participantSocketId);
              }
            }
            
            return (
            <div
              key={participant.id}
              className={`participant-card ${isSpeaking ? 'participant-speaking' : ''}`}
              role="group"
              aria-label={`Video of ${participant.name}`}
            >
              {/* usability story HU-008: Profile Picture Visualization */}
              {participant.isVideoOff ? (
                <div className="participant-video-off">
                  <div className="participant-avatar">
                    {participant.photoURL ? (
                      <img
                        src={participant.photoURL}
                        alt={participant.id === user?.uid ? 'Your profile picture' : `${participant.name}'s picture`}
                      />
                    ) : (
                      <User className="text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="participant-video-on">
                  {/* Real video element */}
                  {videoStream ? (
                    <video
                      autoPlay
                      playsInline
                      muted={isCurrentUser} // Mute own video to avoid feedback
                      ref={(video) => {
                        if (video) {
                          // Always update srcObject to ensure track changes are reflected
                          if (video.srcObject !== videoStream) {
                            console.log(`Setting video srcObject for ${participant.name}`);
                            video.srcObject = videoStream;
                          }
                          
                          // Force video to play in case it was paused
                          video.play().catch(err => {
                            console.warn(`Failed to play video for ${participant.name}:`, err);
                          });
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <span className="text-white text-sm">Cargando video...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Participant info */}
              <div className="participant-info">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm truncate">
                    {participant.id === user?.uid ? 'Tú' : participant.name}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* HU-006: Synchronized muted microphone indicator */}
                    {participant.isMuted && (
                      <div className="participant-muted-icon">
                        <MicOff className="w-3 h-3 text-white" aria-hidden="true" />
                      </div>
                    )}
                    {/* HU-005: Active voice visual indicator */}
                    {isSpeaking && !participant.isMuted && (
                      <div className="voice-indicator">
                        <span className="voice-bar"></span>
                        <span className="voice-bar voice-bar-delay-1"></span>
                        <span className="voice-bar voice-bar-delay-2"></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </main>

      {/* Controls */}
      <footer className="video-call-footer">
        <div className="video-call-controls">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            {/* Reserved space */}
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant={isMicOn ? 'secondary' : 'destructive'}
              size="icon"
              className="control-button"
              onClick={handleMicToggle}
              aria-label={isMicOn ? 'Turn off microphone' : 'Turn on microphone'}
              aria-pressed={isMicOn}
            >
              {isMicOn ? (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              ) : (
                <MicOff className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              )}
            </Button>

            <Button
              variant={isVideoOn ? 'secondary' : 'destructive'}
              size="icon"
              className="control-button"
              onClick={handleVideoToggle}
              aria-label={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
              aria-pressed={isVideoOn}
            >
              {isVideoOn ? (
                <Video className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              ) : (
                <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
              )}
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="control-button relative"
              onClick={() => setIsChatOpen(!isChatOpen)}
              aria-label="Open chat"
              aria-pressed={isChatOpen}
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="control-button control-button-ai"
              onClick={() => setIsAISummaryOpen(!isAISummaryOpen)}
              aria-label="Open AI summary"
              aria-pressed={isAISummaryOpen}
              title="AI meeting summary"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="control-button"
              onClick={() => setIsAccessibilityOpen(!isAccessibilityOpen)}
              aria-label="Open accessibility"
              aria-pressed={isAccessibilityOpen}
              title="Accessibility"
            >
              <Contrast className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </Button>

            <Button
              variant="destructive"
              size="icon"
              className="control-button control-button-leave"
              onClick={handleLeaveCall}
              aria-label="Leave meeting"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 rotate-135" aria-hidden="true" />
            </Button>
          </div>

          {/* Right controls */}
          <div className="w-10 sm:w-20 hidden sm:block"></div>
        </div>
      </footer>

      {/* Panels */}
      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        meetingId={meetingId}
        externalSocket={socket}
      />
      {/* <AccessibilityPanel isOpen={isAccessibilityOpen} onClose={() => setIsAccessibilityOpen(false)} />
      <AISummaryPanel isOpen={isAISummaryOpen} onClose={() => setIsAISummaryOpen(false)} /> */}
    </div>
  );
};

/**
 * Exports the VideoCallRoom component as default.
 */
export default VideoCallRoom;
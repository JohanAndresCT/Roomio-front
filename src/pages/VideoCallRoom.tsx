import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useVoiceCall } from '../hooks/useVoiceCall';
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

  const [participants, setParticipants] = useState<Participant[]>([]);
  const socketRef = useRef<any>(null);

  // usability story HU-007: Voice Connection Indicator
  // Hook to manage WebRTC voice connection
  const { isConnected: isVoiceConnected, error: voiceError, peers: voicePeers, speakingUsers } = useVoiceCall({
    meetingId: meetingId,
    userId: user?.uid || '',
    enabled: isMicOn
  });

  // HU-007: Display voice connection status in console
  useEffect(() => {
    if (isVoiceConnected) {
      console.log('✅ Voz conectada. Peers activos:', voicePeers.length);
    }
    if (voiceError) {
      console.error('❌ Error de voz:', voiceError);
    }
  }, [isVoiceConnected, voiceError, voicePeers]);

  useEffect(() => {
    // If there's already an active connection, don't create another
    if (socketRef.current?.connected) {
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
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log("Connected to socket server");
        // Join meeting after connecting with user information
        console.log("Emitting join-meeting for:", meetingId);
        console.log("User data:", {
          uid: user?.uid,
          displayName: user?.displayName,
          photoURL: user?.photoURL
        });
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

      // Listen for updates to the complete participants array
      socket.on('participants', (list: any[]) => {
        console.log("=== EVENTO PARTICIPANTS RECIBIDO ===");
        console.log("Lista de participantes recibida del backend:", JSON.stringify(list, null, 2));
        console.log("Total recibido del backend:", list.length);
        
        if (!list || list.length === 0) {
          console.warn("Empty participants list, keeping current user");
          return;
        }
        
        setParticipants(prevParticipants => {
          const updatedList = list.map((p: any) => {
            // If it's the current user, preserve local states
            const isCurrentUser = p.userId === user?.uid;
            const existingParticipant = prevParticipants.find(prev => prev.id === p.userId);
            
            console.log(`Processing participant: ${p.userName} (${p.userId})`, {
              isCurrentUser,
              photoURL: p.photoURL,
              willUsePhoto: isCurrentUser && user?.photoURL ? user.photoURL : (p.photoURL || null)
            });
            
            return {
              id: p.userId,
              name: p.userName,
              // Use backend state if available, otherwise default values
              isMuted: p.isMuted !== undefined ? p.isMuted : (isCurrentUser ? !isMicOn : true),
              isVideoOff: p.isVideoOff !== undefined ? p.isVideoOff : true,
              isSpeaking: false,
              photoURL: isCurrentUser && user?.photoURL ? user.photoURL : (p.photoURL || null),
            };
          });
          
          console.log("Final participants list:", updatedList);
          console.log("FINAL number of participants:", updatedList.length);
          return updatedList;
        });
      });

      socket.on('user-joined', (payload: any) => {
        console.log("=== EVENTO USER-JOINED ===", payload);
      });

      socket.on('user-left', (payload: any) => {
        console.log("=== EVENTO USER-LEFT ===", payload);
      });

      // HU-006: Listen for media state changes (mic/camera)
      socket.on('media-state-updated', ({ userId, isMuted, isVideoOff }: any) => {
        console.log(`📡 Media state updated: ${userId}`, { isMuted, isVideoOff });
        setParticipants(prev => prev.map(p => 
          p.id === userId ? { ...p, isMuted, isVideoOff } : p
        ));
      });
    };

    connectSocket();

    return () => {
      console.log("🔌 Disconnecting socket...");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [meetingId, user?.uid]); // Only reconnect if meetingId or user uid changes

  // usability story HU-006: Microphone State Synchronization
  const handleMicToggle = () => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    console.log(newMicState ? 'Microphone activated' : 'Microphone deactivated');
    
    // HU-006: Optimistic update of local state
    setParticipants(prev => prev.map(p => 
      p.id === user?.uid ? { ...p, isMuted: !newMicState } : p
    ));
    
    // HU-006: Synchronize state with all participants via Socket.io
    if (socketRef.current) {
      socketRef.current.emit('update-media-state', {
        meetingId,
        isMuted: !newMicState,
        isVideoOff: !isVideoOn
      });
    }
  };

  const handleVideoToggle = () => {
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    console.log(newVideoState ? 'Camera activated' : 'Camera deactivated');
    
    // Update current participant state
    setParticipants(prev => prev.map(p => 
      p.id === user?.uid ? { ...p, isVideoOff: !newVideoState } : p
    ));
    
    // Send state to backend to synchronize with other users
    if (socketRef.current) {
      socketRef.current.emit('update-media-state', {
        meetingId,
        isMuted: !isMicOn,
        isVideoOff: !newVideoState
      });
    }
  };

  const handleLeaveCall = () => {
    console.log('You have left the meeting');
    onNavigate('dashboard');
  };

  return (
    <div className="video-call-room">
      {/* Header */}
      <header className="video-call-header">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <div className="recording-indicator" aria-hidden="true"></div>
          <span className="text-white text-xs sm:text-sm md:text-base truncate">Meeting in progress</span>
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
                  {/* Video simulation - in production would be a real video element */}
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted text-sm">[Live video]</span>
                  </div>
                </div>
              )}

              {/* Participant info */}
              <div className="participant-info">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm truncate">
                    {participant.id === user?.uid ? 'You' : participant.name}
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
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} meetingId={meetingId} />
      {/* <AccessibilityPanel isOpen={isAccessibilityOpen} onClose={() => setIsAccessibilityOpen(false)} />
      <AISummaryPanel isOpen={isAISummaryOpen} onClose={() => setIsAISummaryOpen(false)} /> */}
    </div>
  );
};

/**
 * Exports the VideoCallRoom component as default.
 */
export default VideoCallRoom;
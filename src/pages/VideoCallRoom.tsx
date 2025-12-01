import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
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
  // Ya no se obtiene el nombre de la reunión desde la query

  const [currentTime, setCurrentTime] = useState(() => {
    return DateTime.now().setZone('America/Bogota').toFormat('HH:mm:ss');
  });

  useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTime(DateTime.now().setZone('America/Bogota').toFormat('HH:mm:ss'));
      }, 1000);
      return () => clearInterval(interval);
    }, []);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Inicializar con el usuario actual
    if (user) {
      setParticipants([{
        id: user.uid,
        name: user.displayName || 'Tú',
        isMuted: false,
        isVideoOff: false,
        isSpeaking: false,
        photoURL: user.photoURL || null,
      }]);
    }

    // Connect to socket server
    const socket = io(import.meta.env.VITE_CHAT_SERVER_URL || 'https://roomio-chat-service.onrender.com', {
      transports: ['websocket'],
      query: { meetingId, uid: user?.uid },
    });
    socketRef.current = socket;

    // Cuando un usuario entra a la reunión
    socket.on('user-joined', (payload: { userId: string; userName: string }) => {
      console.log(`${payload.userName} ha entrado a la reunión`);
      // Agregar participante si no es el usuario actual
      if (payload.userId !== user?.uid) {
        setParticipants(prev => {
          const exists = prev.some(p => p.id === payload.userId);
          if (!exists) {
            return [...prev, {
              id: payload.userId,
              name: payload.userName,
              isMuted: false,
              isVideoOff: false,
              isSpeaking: false,
              photoURL: null,
            }];
          }
          return prev;
        });
      }
    });

    // Cuando un usuario sale de la reunión
    socket.on('user-left', (payload: { userId: string; userName: string }) => {
      console.log(`${payload.userName} ha salido de la reunión`);
      // Eliminar participante
      setParticipants(prev => prev.filter(p => p.id !== payload.userId));
      
      // Mostrar en el chat
      if (window && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('chat-system-message', {
          detail: `${payload.userName} ha salido de la reunión`
        }));
      }
    });

    // Join meeting on mount
    socket.emit('join-meeting', meetingId);

    return () => {
      socket.disconnect();
    };
  }, [meetingId, onNavigate, user]);

  const handleMicToggle = () => {
    setIsMicOn(!isMicOn);
    console.log(isMicOn ? 'Micrófono desactivado' : 'Micrófono activado');
  };

  const handleVideoToggle = () => {
    setIsVideoOn(!isVideoOn);
    console.log(isVideoOn ? 'Cámara desactivada' : 'Cámara activada');
  };

  const handleLeaveCall = () => {
    console.log('Has salido de la reunión');
    onNavigate('dashboard');
  };

  return (
    <div className="video-call-room">
      {/* Header */}
      <header className="video-call-header">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <div className="recording-indicator" aria-hidden="true"></div>
          <span className="text-white text-xs sm:text-sm md:text-base truncate">Reunión en curso</span>
          <Badge variant="secondary" className="flex-shrink-0 text-xs px-1.5 py-0.5">
            <Users className="w-3 h-3 mr-1" aria-hidden="true" />
            {participants.length}
          </Badge>
          {/* Ya no se muestra el nombre de la reunión */}
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
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={`participant-card ${participant.isSpeaking ? 'participant-speaking' : ''}`}
              role="group"
              aria-label={`Video de ${participant.name}`}
            >
              {/* Video placeholder o avatar */}
              {participant.isVideoOff ? (
                <div className="participant-video-off">
                  <div className="participant-avatar">
                    {participant.photoURL ? (
                      <img
                        src={participant.photoURL}
                        alt={participant.id === user?.uid ? 'Tu foto de perfil' : `Foto de ${participant.name}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="participant-video-on">
                  {/* Simulación de video - en producción sería un elemento video real */}
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted text-sm">[Video en vivo]</span>
                  </div>
                </div>
              )}

              {/* Participant info */}
              <div className="participant-info">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm truncate">
                    {participant.id === user?.uid ? 'Tú' : participant.name}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {participant.isMuted && (
                      <div className="participant-muted-icon">
                        <MicOff className="w-3 h-3 text-white" aria-hidden="true" />
                      </div>
                    )}
                    {participant.isSpeaking && !participant.isMuted && (
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
          ))}
        </div>
      </main>

      {/* Controls */}
      <footer className="video-call-footer">
        <div className="video-call-controls">
          {/* Left controls */}
          <div className="flex items-center gap-2">
            {/* Espacio reservado */}
          </div>

          {/* Center controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant={isMicOn ? 'secondary' : 'destructive'}
              size="icon"
              className="control-button"
              onClick={handleMicToggle}
              aria-label={isMicOn ? 'Desactivar micrófono' : 'Activar micrófono'}
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
              aria-label={isVideoOn ? 'Desactivar cámara' : 'Activar cámara'}
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
              aria-label="Abrir chat"
              aria-pressed={isChatOpen}
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="control-button control-button-ai"
              onClick={() => setIsAISummaryOpen(!isAISummaryOpen)}
              aria-label="Abrir resumen de IA"
              aria-pressed={isAISummaryOpen}
              title="Resumen de reunión por IA"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="control-button"
              onClick={() => setIsAccessibilityOpen(!isAccessibilityOpen)}
              aria-label="Abrir accesibilidad"
              aria-pressed={isAccessibilityOpen}
              title="Accesibilidad"
            >
              <Contrast className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
            </Button>

            <Button
              variant="destructive"
              size="icon"
              className="control-button control-button-leave"
              onClick={handleLeaveCall}
              aria-label="Salir de la reunión"
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
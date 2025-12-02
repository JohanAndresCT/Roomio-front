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
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isAISummaryOpen, setIsAISummaryOpen] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const socketRef = useRef<any>(null);

  // 🎤 Hook para manejar la conexión de voz
  const { isConnected: isVoiceConnected, error: voiceError, peers: voicePeers, speakingUsers } = useVoiceCall({
    meetingId: meetingId,
    userId: user?.uid || '',
    enabled: isMicOn
  });

  // Mostrar estado de conexión de voz
  useEffect(() => {
    if (isVoiceConnected) {
      console.log('✅ Voz conectada. Peers activos:', voicePeers.length);
    }
    if (voiceError) {
      console.error('❌ Error de voz:', voiceError);
    }
  }, [isVoiceConnected, voiceError, voicePeers]);

  useEffect(() => {
    // Si ya hay una conexión activa, no crear otra
    if (socketRef.current?.connected) {
      console.log("⚠️ Socket ya conectado, saltando reconexión");
      return;
    }

    if (!user) {
      console.log("⚠️ No hay usuario, esperando...");
      return;
    }

    console.log("🔌 Iniciando conexión de socket para:", user.uid);

    // Inicializar con el usuario actual mientras conecta
    setParticipants([{
      id: user.uid,
      name: user.displayName || 'Tú',
      isMuted: false,
      isVideoOff: true,
      isSpeaking: false,
      photoURL: user.photoURL || null,
    }]);

    const connectSocket = async () => {
      // Obtener token de Firebase
      let token = '';
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          token = await currentUser.getIdToken();
        }
      } catch (err) {
        console.error("Error al obtener token:", err);
      }

      console.log("Conectando al servidor de sockets...");
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
        console.log("Conectado al servidor de sockets");
        // Unirse a la reunión después de conectar con información del usuario
        console.log("Emitiendo join-meeting para:", meetingId);
        console.log("Datos del usuario:", {
          uid: user?.uid,
          displayName: user?.displayName,
          photoURL: user?.photoURL
        });
        socket.emit('join-meeting', {
          meetingId,
          photoURL: user?.photoURL || null
        });
      });

      socket.on('connect_error', (error) => {
        console.error("Error de conexión:", error);
      });

      // Escuchar actualizaciones del array completo de participantes
      socket.on('participants', (list: any[]) => {
        console.log("=== EVENTO PARTICIPANTS RECIBIDO ===");
        console.log("Lista de participantes recibida del backend:", JSON.stringify(list, null, 2));
        console.log("Total recibido del backend:", list.length);
        
        if (!list || list.length === 0) {
          console.warn("Lista de participantes vacía, manteniendo usuario actual");
          return;
        }
        
        setParticipants(prevParticipants => {
          const updatedList = list.map((p: any) => {
            // Si es el usuario actual, preservar estados locales
            const isCurrentUser = p.userId === user?.uid;
            const existingParticipant = prevParticipants.find(prev => prev.id === p.userId);
            
            console.log(`Procesando participante: ${p.userName} (${p.userId})`, {
              isCurrentUser,
              photoURL: p.photoURL,
              willUsePhoto: isCurrentUser && user?.photoURL ? user.photoURL : (p.photoURL || null)
            });
            
            return {
              id: p.userId,
              name: p.userName,
              // Si es el usuario actual y ya existe, preservar sus estados locales
              isMuted: isCurrentUser && existingParticipant ? existingParticipant.isMuted : false,
              isVideoOff: isCurrentUser && existingParticipant ? existingParticipant.isVideoOff : true,
              isSpeaking: false,
              photoURL: isCurrentUser && user?.photoURL ? user.photoURL : (p.photoURL || null),
            };
          });
          
          console.log("Lista final de participantes:", updatedList);
          console.log("Número de participantes FINAL:", updatedList.length);
          return updatedList;
        });
      });

      socket.on('user-joined', (payload: any) => {
        console.log("=== EVENTO USER-JOINED ===", payload);
      });

      socket.on('user-left', (payload: any) => {
        console.log("=== EVENTO USER-LEFT ===", payload);
      });
    };

    connectSocket();

    return () => {
      console.log("🔌 Desconectando socket...");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [meetingId, user?.uid]); // Solo reconectar si cambia el meetingId o el uid del usuario

  const handleMicToggle = () => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    console.log(newMicState ? 'Cámara activada' : 'Cámara desactivada');
    
    // Actualizar el estado del participante actual
    setParticipants(prev => prev.map(p => 
      p.id === user?.uid ? { ...p, isMuted: !newMicState } : p
    ));
  };

  const handleVideoToggle = () => {
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    console.log(newVideoState ? 'Cámara activada' : 'Cámara desactivada');
    
    // Actualizar el estado del participante actual
    setParticipants(prev => prev.map(p => 
      p.id === user?.uid ? { ...p, isVideoOff: !newVideoState } : p
    ));
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
          {participants.map((participant) => {
            const isSpeaking = speakingUsers.includes(participant.id);
            return (
            <div
              key={participant.id}
              className={`participant-card ${isSpeaking ? 'participant-speaking' : ''}`}
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
                      />
                    ) : (
                      <User className="text-muted-foreground" aria-hidden="true" />
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
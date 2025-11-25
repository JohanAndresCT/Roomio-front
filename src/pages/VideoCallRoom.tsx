import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

interface VideoCallRoomProps {
  onNavigate: (page: string) => void;
}

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeaking: boolean;
}

export function VideoCallRoom({ onNavigate }: VideoCallRoomProps) {
      // Estado para la hora actual
  const params = useParams();
  const meetingId = params.meetingId || 'MTG-001';

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

  const [participants] = useState<Participant[]>([
    { id: '1', name: 'Tú', isMuted: false, isVideoOff: false, isSpeaking: false },
    { id: '2', name: 'Ana García', isMuted: false, isVideoOff: false, isSpeaking: true },
    { id: '3', name: 'Carlos López', isMuted: true, isVideoOff: false, isSpeaking: false },
    { id: '4', name: 'María Rodríguez', isMuted: false, isVideoOff: false, isSpeaking: false },
    { id: '5', name: 'Juan Martínez', isMuted: false, isVideoOff: true, isSpeaking: false },
    { id: '6', name: 'Laura Sánchez', isMuted: true, isVideoOff: false, isSpeaking: false }
  ]);

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
              className={`participant-card ${
                participant.isSpeaking ? 'participant-speaking' : ''
              }`}
              role="group"
              aria-label={`Video de ${participant.name}`}
            >
              {/* Video placeholder */}
              {participant.isVideoOff ? (
                <div className="participant-video-off">
                  <div className="participant-avatar">
                    <User className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
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
                  <span className="text-white text-sm truncate">{participant.name}</span>
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
              <span className="notification-badge">3</span>
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
}

export default VideoCallRoom;

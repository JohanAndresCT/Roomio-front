import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChatSocket } from '../hooks/useChatSocket';
import { Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';

interface Message {
  id: string;
  user?: string;
  text?: string;
  message?: string;
  userId?: string;
  userName?: string;
  timestamp: Date | string;
  isOwn?: boolean;
  notSaved?: boolean;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId?: string;
}

export function ChatPanel({ isOpen, onClose, meetingId: meetingIdProp }: ChatPanelProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Usar el meetingId recibido por prop, si existe, si no, intentar obtenerlo de la URL
  const meetingId = meetingIdProp
    || (typeof window !== 'undefined' && window.location.pathname.includes('/meeting/')
      ? (window.location.pathname.split('/meeting/')[1] || 'MTG-001')
      : 'MTG-001');
  const userId = user?.uid || 'anon';
  const userName = user?.displayName || user?.email || 'Invitado';
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    async function fetchToken() {
      if (user) {
        // Usar Firebase Auth API directamente
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const currentUser = auth.currentUser;
          if (currentUser) {
            const t = await currentUser.getIdToken();
            setToken(t);
          }
        } catch (err) {
          setToken('');
        }
      } else {
        setToken('');
      }
    }
    fetchToken();
  }, [user]);

  const chatServerUrl = import.meta.env.VITE_CHAT_SERVER_URL || 'https://roomio-chat-service.onrender.com';
  const {
    messages,
    error,
    sendMessage,
    connected,
    reconnecting,
  } = useChatSocket({ meetingId, userId, userName, token, serverUrl: chatServerUrl });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage('');
    }
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;
  if (!user) return <div className="p-4">Inicia sesión para usar el chat.</div>;

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white border-l border-border shadow-xl flex flex-col z-40"
      role="complementary"
      aria-label="Panel de chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-foreground">Chat de la reunión</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar chat"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Mensajes en tiempo real */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4" ref={scrollRef}>
          {messages.map((message) => {
            const isOwn = message.userId === userId;
            // Mostrar el nombre real del usuario en los mensajes propios
            const displayName = isOwn ? userName : (message.userName || message.userId || 'Invitado');
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {!isOwn && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {displayName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
                  <span className="text-sm font-medium text-foreground mb-1">
                    {displayName}
                  </span>
                  <div
                    className={`px-4 py-2 rounded-lg max-w-[85%] break-words ${
                      isOwn
                        ? 'bg-primary text-white'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    <p className="text-sm">{message.text ?? ''}</p>
                    {message.notSaved && (
                      <span title="No guardado en Firestore" className="ml-2 text-yellow-500">⚠️</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Escribe un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-input-background"
            aria-label="Mensaje"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary hover:bg-primary/90 flex-shrink-0"
            disabled={!newMessage.trim() || !connected || reconnecting}
            aria-label="Enviar mensaje"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
        {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
      </form>
    </div>
  );
}

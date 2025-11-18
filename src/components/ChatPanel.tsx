import { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      user: 'Ana García',
      text: '¡Hola a todos! ¿Están listos para comenzar?',
      timestamp: new Date(Date.now() - 600000),
      isOwn: false
    },
    {
      id: '2',
      user: 'Tú',
      text: 'Sí, todo listo por aquí',
      timestamp: new Date(Date.now() - 540000),
      isOwn: true
    },
    {
      id: '3',
      user: 'Carlos López',
      text: 'Perfecto, compartí el documento en el chat',
      timestamp: new Date(Date.now() - 480000),
      isOwn: false
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        user: 'Tú',
        text: newMessage,
        timestamp: new Date(),
        isOwn: true
      };
      setMessages([...messages, message]);
      setNewMessage('');

      // Simular respuesta
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const response: Message = {
            id: (Date.now() + 1).toString(),
            user: 'Ana García',
            text: 'Gracias por compartir esa información',
            timestamp: new Date(),
            isOwn: false
          };
          setMessages(prev => [...prev, response]);
        }, 2000);
      }, 1000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.isOwn ? 'flex-row-reverse' : ''}`}
            >
              {!message.isOwn && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {message.user.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`flex flex-col ${message.isOwn ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
                {!message.isOwn && (
                  <span className="text-sm font-medium text-foreground mb-1">
                    {message.user}
                  </span>
                )}
                <div
                  className={`px-4 py-2 rounded-lg max-w-[85%] break-words ${
                    message.isOwn
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  A
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-foreground mb-1">
                  Ana García
                </span>
                <div className="px-4 py-2 rounded-lg bg-secondary">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
            disabled={!newMessage.trim()}
            aria-label="Enviar mensaje"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}

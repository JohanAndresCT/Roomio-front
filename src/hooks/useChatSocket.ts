import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  system?: boolean;
  notSaved?: boolean;
}

export interface ChatEvent {
  type: 'user-joined' | 'user-left' | 'system';
  userName?: string;
  message?: string;
  timestamp: string;
}

interface UseChatSocketOptions {
  meetingId: string;
  userId: string;
  userName: string;
  token: string;
  serverUrl?: string;
}

export function useChatSocket({ meetingId, userId, userName, token, serverUrl = 'https://roomio-chat-service.onrender.com' }: UseChatSocketOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);

  // Scroll helper (for ChatPanel)
  const scrollToBottom = useCallback(() => {
    const chatList = document.getElementById('chat-message-list');
    if (chatList) {
      chatList.scrollTop = chatList.scrollHeight;
    }
  }, []);

  useEffect(() => {
    // Connect socket
    const socket = io(serverUrl, {
      transports: ['websocket'],
      auth: { token },
      query: { userId, userName },
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      setError(null);
      // Unirse a la reunión
      socket.emit('join-meeting', meetingId);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('reconnect_attempt', () => {
      setReconnecting(true);
      reconnectAttempts.current += 1;
      if (reconnectAttempts.current === 1) setError('Reconectando...');
      if (reconnectAttempts.current > 3) {
        setError('No se pudo conectar al chat. Recarga la página');
        socket.disconnect();
      }
    });

    socket.on('chat-history', (history: any[]) => {
      setMessages(history.map(msg => ({
        id: msg._id || msg.id || Math.random().toString(),
        userId: msg.senderId,
        userName: msg.userName || msg.senderId,
        text: msg.message,
        timestamp: msg.time,
      })));
      setEvents(ev => [
        ...ev,
        { type: 'system', message: 'Conectado al chat', timestamp: new Date().toISOString() },
      ]);
      scrollToBottom();
    });

    socket.on('new-message', (msg: any) => {
      setMessages(prev => {
        // Si existe un mensaje provisional con el mismo texto y userId, reemplazarlo por el definitivo
        const idx = prev.findIndex(m => m.notSaved && m.text === msg.message && m.userId === msg.senderId);
        const newMsg = {
          id: msg._id || msg.id || Math.random().toString(),
          userId: msg.senderId,
          userName: msg.userName || msg.senderId,
          text: msg.message,
          timestamp: msg.time,
        };
        if (idx !== -1) {
          // Reemplazar provisional por definitivo
          const updated = [...prev];
          updated[idx] = newMsg;
          return updated;
        }
        // Si no existe, agregar normalmente
        return [...prev, newMsg];
      });
      scrollToBottom();
    });

    socket.on('user-joined', ({ userId }) => {
      setEvents(ev => [
        ...ev,
        { type: 'user-joined', userName: userId, timestamp: new Date().toISOString() },
      ]);
    });

    // Puedes agregar más eventos aquí si el backend los implementa

    socket.on('connect_error', (err: any) => {
      setError('No se pudo conectar al chat. Recarga la página');
    });

    return () => {
      socket.disconnect();
    };
  }, [meetingId, userId, userName, token, serverUrl, scrollToBottom]);

  // Enviar mensaje
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) {
      setError('Escribe algo antes de enviar');
      return;
    }
    setError(null);
    const socket = socketRef.current;
    if (socket && connected) {
      // Mensaje local provisional (no guardado)
      const tempId = 'temp-' + Math.random().toString(36).slice(2);
      setMessages(prev => [...prev, {
        id: tempId,
        userId,
        userName,
        text,
        timestamp: new Date().toISOString(),
        notSaved: true,
      }]);
      socket.emit('send-message', {
        meetingId,
        message: text,
      });
    }
  }, [meetingId, connected, userId, userName]);

  return {
    messages,
    events,
    connected,
    reconnecting,
    error,
    sendMessage,
    scrollToBottom,
  };
}

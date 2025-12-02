import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Represents a chat message in the meeting chat.
 * @typedef {Object} ChatMessage
 * @property {string} id - Unique message ID.
 * @property {string} userId - Sender user ID.
 * @property {string} userName - Sender user name.
 * @property {string} text - Message text content.
 * @property {string} timestamp - ISO timestamp of the message.
 * @property {boolean} [system] - Whether the message is a system message.
 * @property {boolean} [notSaved] - Whether the message is not yet saved on the server.
 */
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
  system?: boolean;
  notSaved?: boolean;
}


/**
 * Represents a chat event (user joined, left, or system event).
 * @typedef {Object} ChatEvent
 * @property {'user-joined' | 'user-left' | 'system'} type - Type of event.
 * @property {string} [userName] - Name of the user involved in the event.
 * @property {string} [message] - Event message.
 * @property {string} timestamp - ISO timestamp of the event.
 */
export interface ChatEvent {
  type: 'user-joined' | 'user-left' | 'system';
  userName?: string;
  message?: string;
  timestamp: string;
}


/**
 * Options for initializing the useChatSocket hook.
 * @typedef {Object} UseChatSocketOptions
 * @property {string} meetingId - Meeting ID to join.
 * @property {string} userId - User ID of the participant.
 * @property {string} userName - User name of the participant.
 * @property {string} token - Authentication token for the chat server.
 * @property {string} [serverUrl] - Chat server URL (default provided).
 * @property {Socket} [externalSocket] - Optional external socket to use instead of creating a new one.
 */
interface UseChatSocketOptions {
  meetingId: string;
  userId: string;
  userName: string;
  token: string;
  serverUrl?: string;
  externalSocket?: Socket | null;
}


/**
 * Custom React hook for managing chat socket connection in a meeting.
 * Handles connection, reconnection, message sending, and event handling.
 * @param {UseChatSocketOptions} options - Options for chat socket connection.
 * @returns {Object} Chat state and actions (messages, events, sendMessage, etc).
 */
export function useChatSocket({ meetingId, userId, userName, token, serverUrl = 'https://roomio-chat-service.onrender.com', externalSocket = null }: UseChatSocketOptions) {
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
    // Use external socket if provided, otherwise create a new one
    let socket: Socket;
    let isExternalSocket = false;
    
    if (externalSocket) {
      console.log('💬 Using external shared socket for chat');
      socket = externalSocket;
      isExternalSocket = true;
      socketRef.current = socket;
    } else {
      console.log('💬 Creating new socket for chat');
      socket = io(serverUrl, {
        transports: ['websocket'],
        auth: { token },
        query: { uid: userId },
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 4000,
      });
      socketRef.current = socket;
    }

    socket.on('connect', () => {
      setConnected(true);
      setReconnecting(false);
      setError(null);
      // Only emit join-meeting if this is NOT an external socket
      // (external socket already joined via VideoCallRoom)
      if (!isExternalSocket) {
        console.log('📧 Chat socket emitting join-meeting');
        socket.emit('join-meeting', meetingId);
      } else {
        console.log('📧 External socket already joined, skipping join-meeting');
      }
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


    socket.on('user-joined', ({ userId, userName: joinedUserName }) => {
      setEvents(ev => [
        ...ev,
        { type: 'user-joined', userName: joinedUserName || userId, timestamp: new Date().toISOString() },
      ]);
    });

    // Handle user-left event
    socket.on('user-left', (payload) => {
      // Si el backend envía userName, úsalo; si no, muestra el UID
      const name = payload.userName || payload.userId || payload.leftUserId;
      setEvents(ev => [
        ...ev,
        { type: 'user-left', userName: name, timestamp: new Date().toISOString() },
      ]);
    });

    // Handle meeting-ended event to clear chat session
    socket.on('meeting-ended', ({ meetingId: endedMeetingId, cleared }) => {
      if (endedMeetingId === meetingId && cleared) {
        setMessages([]);
        setEvents(ev => [
          ...ev,
          { type: 'system', message: 'La reunión ha finalizado y el historial de chat ha sido limpiado.', timestamp: new Date().toISOString() },
        ]);
      }
    });


    socket.on('connect_error', (err: any) => {
      setError('No se pudo conectar al chat. Recarga la página');
    });

    return () => {
      // Remove all event listeners to prevent duplicates
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect_attempt');
      socket.off('chat-history');
      socket.off('new-message');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('meeting-ended');
      socket.off('connect_error');
      
      // Only disconnect if this is NOT an external socket
      if (!isExternalSocket) {
        socket.disconnect();
      }
    };
  }, [meetingId, userId, userName, token, serverUrl, scrollToBottom, externalSocket]);

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

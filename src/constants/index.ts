/**
 * Application Constants
 * Central location for all constant values used across the Roomio application
 */

// ============================================
// API CONFIGURATION
// ============================================

/**
 * Base URL for API requests
 * Loaded from environment variable
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://roomio-server-6pbs.onrender.com';

/**
 * API request timeout in milliseconds
 */
export const API_TIMEOUT = 30000; // 30 seconds

// ============================================
// STORAGE KEYS
// ============================================

/**
 * LocalStorage keys used throughout the application
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'roomio_auth_token',
  USER_DATA: 'roomio_user_data',
  THEME: 'roomio_theme',
  LANGUAGE: 'roomio_language',
  MEETING_PREFERENCES: 'roomio_meeting_preferences',
} as const;

// ============================================
// FIREBASE CONFIGURATION
// ============================================

/**
 * Firebase configuration object
 */
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
} as const;

// ============================================
// ROUTE PATHS
// ============================================

/**
 * Application route paths
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  CREATE_MEETING: '/create-meeting',
  JOIN_MEETING: '/join-meeting',
  MEETING_ROOM: '/room/:roomId',
  ABOUT: '/about',
  SITEMAP: '/sitemap',
} as const;

// ============================================
// MEETING CONFIGURATION
// ============================================

/**
 * Meeting duration options in minutes
 */
export const MEETING_DURATIONS = [15, 30, 45, 60, 90, 120] as const;

/**
 * Maximum participants per meeting
 */
export const MAX_PARTICIPANTS = 50;

/**
 * Minimum meeting name length
 */
export const MIN_MEETING_NAME_LENGTH = 3;

/**
 * Maximum meeting name length
 */
export const MAX_MEETING_NAME_LENGTH = 100;

// ============================================
// VALIDATION RULES
// ============================================

/**
 * Password validation requirements
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: false,
} as const;

/**
 * Email regex pattern for validation
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// UI CONFIGURATION
// ============================================

/**
 * Animation duration in milliseconds
 */
export const ANIMATION_DURATION = 300;

/**
 * Toast notification duration in milliseconds
 */
export const TOAST_DURATION = 3000;

/**
 * Debounce delay for search inputs in milliseconds
 */
export const SEARCH_DEBOUNCE_DELAY = 500;

// ============================================
// CHAT CONFIGURATION
// ============================================

/**
 * Maximum message length in characters
 */
export const MAX_MESSAGE_LENGTH = 500;

/**
 * Chat history limit (number of messages to load)
 */
export const CHAT_HISTORY_LIMIT = 50;

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================

/**
 * Maximum file size for uploads in bytes (5MB)
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Allowed file types for avatar uploads
 */
export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

/**
 * Allowed file types for meeting attachments
 */
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Common error messages in Spanish
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Por favor, verifica tu conexión a internet.',
  TIMEOUT_ERROR: 'La solicitud ha tardado demasiado. Por favor, inténtalo de nuevo.',
  UNAUTHORIZED: 'No autorizado. Por favor, inicia sesión nuevamente.',
  FORBIDDEN: 'No tienes permisos para realizar esta acción.',
  NOT_FOUND: 'El recurso solicitado no fue encontrado.',
  SERVER_ERROR: 'Error del servidor. Por favor, inténtalo más tarde.',
  VALIDATION_ERROR: 'Por favor, verifica los datos ingresados.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado.',
} as const;

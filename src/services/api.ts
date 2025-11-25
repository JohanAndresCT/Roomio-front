/**
 * API Service
 * Central API client for making HTTP requests to the Roomio backend
 * Uses JWT tokens from backend for authentication
 */

import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS, ERROR_MESSAGES } from '../constants';
import type { ApiResponse } from '../types';

// ============================================
// REQUEST CONFIGURATION
// ============================================

/**
 * Request configuration options
 */
interface RequestConfig extends RequestInit {
  timeout?: number;
  requiresAuth?: boolean;
}

// ============================================
// API CLIENT CLASS
// ============================================

/**
 * API client class for making HTTP requests
 */
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string, timeout: number) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Get authentication token from localStorage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // Simplemente obtener el token del localStorage
      // El token viene del backend después de login/register
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('🔑 Obteniendo token para request:', token ? `${token.substring(0, 30)}...` : 'No hay token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Build headers for request
   */
  private async buildHeaders(requiresAuth: boolean = false): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔐 Header Authorization agregado:', `Bearer ${token.substring(0, 30)}...`);
      } else {
        console.warn('⚠️ Se requiere autenticación pero no hay token disponible');
      }
    }

    return headers;
  }

  /**
   * Make HTTP request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    config: RequestConfig
  ): Promise<Response> {
    const { timeout = this.timeout, ...fetchConfig } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(ERROR_MESSAGES.TIMEOUT_ERROR);
      }
      if (error instanceof TypeError) {
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }
      throw error;
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');

    // Leer el body una sola vez antes de procesar
    let responseData: any = null;
    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
        console.log('📦 Respuesta del backend (status ' + response.status + '):', responseData);
      } catch (e) {
        console.error('⚠️ No se pudo parsear la respuesta JSON');
      }
    }

    // Handle different HTTP status codes
    if (response.status === 401) {
      console.error('🔴 Error 401 - Detalles:', responseData);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      
      // Usar el mensaje específico del backend si existe
      const errorMessage = responseData?.message || responseData?.error || ERROR_MESSAGES.UNAUTHORIZED;
      throw new Error(errorMessage);
    }

    if (response.status === 403) {
      const errorMessage = responseData?.message || responseData?.error || ERROR_MESSAGES.FORBIDDEN;
      throw new Error(errorMessage);
    }

    if (response.status === 404) {
      const errorMessage = responseData?.message || responseData?.error || ERROR_MESSAGES.NOT_FOUND;
      throw new Error(errorMessage);
    }

    if (response.status >= 500) {
      console.error('🔴 Error 500 - Detalles:', responseData);
      const errorMessage = responseData?.message || responseData?.error || ERROR_MESSAGES.SERVER_ERROR;
      throw new Error(errorMessage);
    }

    if (responseData) {
      if (!response.ok) {
        // Si el backend devuelve un error en formato ApiResponse
        const errorData = responseData as ApiResponse<T>;
        throw new Error(errorData.message || errorData.error || ERROR_MESSAGES.UNKNOWN_ERROR);
      }

      // Si el backend devuelve ya en formato ApiResponse, devolverlo tal cual
      if (responseData.success !== undefined && responseData.data !== undefined) {
        return responseData as ApiResponse<T>;
      }

      // Si el backend devuelve directamente los datos (sin envolver en ApiResponse),
      // envolverlos en la estructura ApiResponse
      return {
        success: true,
        message: 'Success',
        data: responseData as T,
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Return empty response for non-JSON responses
    return {
      success: true,
      message: 'Success',
      data: undefined as T,
    };
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, requiresAuth: boolean = false): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.buildHeaders(requiresAuth);
    
    console.log('🔧 GET request:', { endpoint, requiresAuth, headers });
    
    const config: RequestConfig = {
      method: 'GET',
      headers,
      requiresAuth,
    };

    const response = await this.fetchWithTimeout(url, config);
    return this.handleResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    requiresAuth: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.buildHeaders(requiresAuth);
    
    console.log('🔧 POST request:', { endpoint, requiresAuth, headers });
    
    const config: RequestConfig = {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
    };

    const response = await this.fetchWithTimeout(url, config);
    return this.handleResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    requiresAuth: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.buildHeaders(requiresAuth);
    
    console.log('🔧 PUT request:', { endpoint, requiresAuth, headers, data });
    
    const config: RequestConfig = {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
    };

    const response = await this.fetchWithTimeout(url, config);
    return this.handleResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string,
    requiresAuth: boolean = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.buildHeaders(requiresAuth);
    
    const config: RequestConfig = {
      method: 'DELETE',
      headers,
      requiresAuth,
    };

    const response = await this.fetchWithTimeout(url, config);
    return this.handleResponse<T>(response);
  }

  /**
   * Upload file (multipart/form-data)
   */
  async upload<T>(
    endpoint: string,
    file: File,
    fieldName: string = 'file',
    additionalData?: Record<string, string>,
    requiresAuth: boolean = true
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const formData = new FormData();
    formData.append(fieldName, file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers: HeadersInit = {};
    if (requiresAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestConfig = {
      method: 'POST',
      headers,
      body: formData,
      requiresAuth,
    };

    const response = await this.fetchWithTimeout(url, config);
    return this.handleResponse<T>(response);
  }
}

// ============================================
// API CLIENT INSTANCE
// ============================================

/**
 * Create and export API client instance
 */
export const apiClient = new ApiClient(API_BASE_URL, API_TIMEOUT);

/**
 * Export type for use in other services
 */
export type { ApiClient };

// ============================================
// USER API
// ============================================

export const userAPI = {
  /**
   * Get user profile
   */
  getProfile: () => 
    apiClient.get('/users/profile', true),

  /**
   * Update user profile
   */
  updateProfile: (data: { displayName?: string; bio?: string; photoURL?: string }) =>
    apiClient.put('/users/profile', data, true),

  /**
   * Upload user avatar
   */
  uploadAvatar: (file: File) =>
    apiClient.upload('/users/avatar', file, 'avatar', undefined, true),

  /**
   * Delete user account
   */
  deleteAccount: () =>
    apiClient.delete('/users/account', true),
};

// ============================================
// MEETING API
// ============================================

export const meetingAPI = {
  /**
   * Create a new meeting
   */
  createMeeting: (data: {
    name: string;
    description?: string;
    scheduledAt?: Date;
    duration?: number;
  }) =>
    apiClient.post<import('../types').Meeting>('/meetings', data, true),

  /**
   * Get all meetings for current user
   */
  getMeetings: () =>
    apiClient.get('/meetings', true),

  /**
   * Get meeting by ID
   */
  getMeeting: (meetingId: string) =>
    apiClient.get(`/meetings/${meetingId}`, true),

  /**
   * Update meeting
   */
  updateMeeting: (meetingId: string, data: {
    name?: string;
    description?: string;
    scheduledAt?: Date;
    duration?: number;
  }) =>
    apiClient.put(`/meetings/${meetingId}`, data, true),

  /**
   * Delete meeting
   */
  deleteMeeting: (meetingId: string) =>
    apiClient.delete(`/meetings/${meetingId}`, true),

  /**
   * Join a meeting
   */
  joinMeeting: async (roomId: string) => {
    // Usar GET para verificar si la reunión existe
    try {
      const res = await apiClient.get(`/meetings/${roomId}`, true);
      if (res && typeof res.data === 'object' && res.data && 'meetingId' in res.data) {
        return { success: true, meeting: res.data };
      }
      return { success: false, message: 'No se encontró la reunión' };
    } catch (err) {
      return { success: false, message: 'No se pudo conectar con el servidor' };
    }
  },

  /**
   * Leave a meeting
   */
  leaveMeeting: (meetingId: string) =>
    apiClient.post(`/meetings/${meetingId}/leave`, {}, true),

  /**
   * Get meeting participants
   */
  getParticipants: (meetingId: string) =>
    apiClient.get(`/meetings/${meetingId}/participants`, true),

  /**
   * Start meeting recording
   */
  startRecording: (meetingId: string) =>
    apiClient.post(`/meetings/${meetingId}/recording/start`, {}, true),

  /**
   * Stop meeting recording
   */
  stopRecording: (meetingId: string) =>
    apiClient.post(`/meetings/${meetingId}/recording/stop`, {}, true),

  /**
   * Get meeting recordings
   */
  getRecordings: (meetingId: string) =>
    apiClient.get(`/meetings/${meetingId}/recordings`, true),
};

// ============================================
// CHAT API
// ============================================

export const chatAPI = {
  /**
   * Send a chat message
   */
  sendMessage: (meetingId: string, message: string) =>
    apiClient.post('/chat/messages', { meetingId, message }, true),

  /**
   * Get chat messages for a meeting
   */
  getMessages: (meetingId: string, limit: number = 50) =>
    apiClient.get(`/chat/messages/${meetingId}?limit=${limit}`, true),

  /**
   * Delete a chat message
   */
  deleteMessage: (messageId: string) =>
    apiClient.delete(`/chat/messages/${messageId}`, true),
};

// ============================================
// AI API
// ============================================

export const aiAPI = {
  /**
   * Generate meeting summary
   */
  generateSummary: (meetingId: string) =>
    apiClient.post('/ai/summary', { meetingId }, true),

  /**
   * Get meeting summary
   */
  getSummary: (meetingId: string) =>
    apiClient.get(`/ai/summary/${meetingId}`, true),

  /**
   * Generate meeting transcript
   */
  generateTranscript: (meetingId: string) =>
    apiClient.post('/ai/transcript', { meetingId }, true),
};

// ============================================
// ANALYTICS API
// ============================================

export const analyticsAPI = {
  /**
   * Get user analytics
   */
  getUserAnalytics: (startDate?: Date, endDate?: Date) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());
    
    return apiClient.get(`/analytics/user?${params.toString()}`, true);
  },

  /**
   * Get meeting analytics
   */
  getMeetingAnalytics: (meetingId: string) =>
    apiClient.get(`/analytics/meeting/${meetingId}`, true),

  /**
   * Get dashboard statistics
   */
  getDashboardStats: () =>
    apiClient.get('/analytics/dashboard', true),
};

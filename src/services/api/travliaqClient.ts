/**
 * Travliaq API Client
 *
 * Axios client configured for Travliaq API on Railway
 * Base URL: https://travliaq-api-production.up.railway.app
 */

import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_TRAVLIAQ_API_URL ||
  'https://travliaq-api-production.up.railway.app';

/**
 * Axios instance for Travliaq API
 */
export const travliaqClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor for logging (development only)
 */
travliaqClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling and logging
 */
travliaqClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error: AxiosError) => {
    // Extract useful error information
    const errorInfo = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data,
      url: error.config?.url,
    };

    console.error('[API Response Error]', errorInfo);

    // Enhance error with user-friendly messages
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;

      if (status === 404) {
        error.message = 'Ressource non trouvée';
      } else if (status === 500) {
        error.message = 'Erreur serveur. Veuillez réessayer plus tard.';
      } else if (status === 503) {
        error.message = 'Service temporairement indisponible';
      } else if (status >= 400 && status < 500) {
        error.message = 'Requête invalide. Vérifiez vos paramètres.';
      }
    } else if (error.request) {
      // Request made but no response
      error.message = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    }

    return Promise.reject(error);
  }
);

/**
 * Helper to check if error is an API error
 */
export const isApiError = (error: unknown): error is AxiosError => {
  return axios.isAxiosError(error);
};

/**
 * Helper to extract error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as any;
      return data.detail || data.message || error.message;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Une erreur inconnue est survenue';
};

export default travliaqClient;

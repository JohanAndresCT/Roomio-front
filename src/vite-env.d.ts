/// <reference types="vite/client" />

/**
 * Environment variables available in Vite projects.
 * @typedef {Object} ImportMetaEnv
 * @property {string} VITE_API_BASE_URL - Base URL for API requests.
 * @property {string} VITE_FIREBASE_API_KEY - Firebase API key.
 * @property {string} VITE_FIREBASE_AUTH_DOMAIN - Firebase Auth domain.
 * @property {string} VITE_FIREBASE_PROJECT_ID - Firebase project ID.
 * @property {string} VITE_FIREBASE_STORAGE_BUCKET - Firebase storage bucket.
 * @property {string} VITE_FIREBASE_MESSAGING_SENDER_ID - Firebase messaging sender ID.
 * @property {string} VITE_FIREBASE_APP_ID - Firebase app ID.
 * @property {string} VITE_FIREBASE_MEASUREMENT_ID - Firebase measurement ID.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
}

/**
 * Extends the ImportMeta interface to include Vite environment variables.
 * @typedef {Object} ImportMeta
 * @property {ImportMetaEnv} env - Environment variables object.
 */
interface ImportMeta {
  readonly env: ImportMetaEnv
}

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

/**
 * Firebase configuration object for Roomio.
 * Contains environment variables for Firebase setup.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Debug: Verificar configuración de Firebase
console.log('🔥 Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? '✅ Presente' : '❌ Falta',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  appId: firebaseConfig.appId ? '✅ Presente' : '❌ Falta'
});

// Initialize Firebase app lazily
/**
 * Lazily initializes and returns the Firebase app instance.
 * @returns {FirebaseApp} Initialized Firebase app.
 */
let app: ReturnType<typeof initializeApp> | null = null
export function getFirebaseApp() {
  if (!app) {
    console.log('🔥 Initializing Firebase App...');
    app = initializeApp(firebaseConfig as any);
    console.log('✅ Firebase App initialized');
  }
  return app
}

/**
 * Returns the Firebase Auth client instance.
 * @returns {Auth} Firebase Auth client.
 */
export function getAuthClient() {
  getFirebaseApp()
  return getAuth()
}

/**
 * Returns the Firestore client instance.
 * @returns {Firestore} Firebase Firestore client.
 */
export function getFirestoreClient() {
  getFirebaseApp()
  return getFirestore()
}

/**
 * Google Auth provider for OAuth sign-in.
 * @type {GoogleAuthProvider}
 */
export const googleProvider = new GoogleAuthProvider()

/**
 * GitHub Auth provider for OAuth sign-in.
 * @type {GithubAuthProvider}
 */
export const githubProvider = new GithubAuthProvider()

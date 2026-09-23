import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase Web App Configuration
 * Project: mdm-app-1b19e
 *
 * Config values are retrieved from Vite environment variables (VITE_FIREBASE_*)
 * with fallback defaults for project mdm-app-1b19e.
 */
const getEnv = (key: string, fallback = ''): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process?.env?.[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

export const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', ''),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', 'mdm-app-1b19e.firebaseapp.com'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', 'mdm-app-1b19e'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', 'mdm-app-1b19e.firebasestorage.app'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', ''),
  appId: getEnv('VITE_FIREBASE_APP_ID', ''),
};

/**
 * Initialize and export the FirebaseApp instance singleton.
 * Safe for repeated imports and hot module reloads.
 */
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Firebase Authentication instance
 */
export const auth: Auth = getAuth(app);

/**
 * Firebase Firestore instance
 */
export const db: Firestore = getFirestore(app);

export default app;


import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Singleton holder for the trusted server-side Firebase Admin App instance.
 *
 * Security Design:
 * - Strictly server-side; NEVER imported into client-side React code.
 * - Initialized with Application Default Credentials (ADC) in Google Cloud / Cloud Functions environments.
 * - Zero hardcoded service-account keys, API secrets, or credentials in source code.
 */
let adminAppInstance: App | undefined;

/**
 * Returns the initialized Firebase Admin App singleton.
 * Uses ADC or existing instance safely.
 */
export function getAdminApp(): App {
  if (!adminAppInstance) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminAppInstance = existingApps[0];
    } else {
      adminAppInstance = initializeApp();
    }
  }
  return adminAppInstance;
}

/**
 * Returns the Firebase Admin Auth service for trusted identity and custom claims operations.
 */
export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

/**
 * Returns the Firebase Admin Firestore service for trusted server-side database operations.
 */
export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

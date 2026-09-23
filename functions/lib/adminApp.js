"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminApp = getAdminApp;
exports.getAdminAuth = getAdminAuth;
exports.getAdminFirestore = getAdminFirestore;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
/**
 * Singleton holder for the trusted server-side Firebase Admin App instance.
 *
 * Security Design:
 * - Strictly server-side; NEVER imported into client-side React code.
 * - Initialized with Application Default Credentials (ADC) in Google Cloud / Cloud Functions environments.
 * - Zero hardcoded service-account keys, API secrets, or credentials in source code.
 */
let adminAppInstance;
/**
 * Returns the initialized Firebase Admin App singleton.
 * Uses ADC or existing instance safely.
 */
function getAdminApp() {
    if (!adminAppInstance) {
        const existingApps = (0, app_1.getApps)();
        if (existingApps.length > 0) {
            adminAppInstance = existingApps[0];
        }
        else {
            adminAppInstance = (0, app_1.initializeApp)();
        }
    }
    return adminAppInstance;
}
/**
 * Returns the Firebase Admin Auth service for trusted identity and custom claims operations.
 */
function getAdminAuth() {
    return (0, auth_1.getAuth)(getAdminApp());
}
/**
 * Returns the Firebase Admin Firestore service for trusted server-side database operations.
 */
function getAdminFirestore() {
    return (0, firestore_1.getFirestore)(getAdminApp());
}
//# sourceMappingURL=adminApp.js.map
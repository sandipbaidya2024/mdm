import { getFirestore, type Firestore } from 'firebase/firestore';
import { app, db } from '../firebase';

/**
 * Official Modular Firestore SDK Integration
 * Project: mdm-app-1b19e
 * 
 * Exports the Firestore singleton instance initialized with the existing Firebase App.
 * No collections or documents are created or written here.
 */

export { db, getFirestore, type Firestore };
export default db;

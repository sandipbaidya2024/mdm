import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  type DocumentReference,
} from 'firebase/firestore';
import { db as firestoreDb } from '../firebase';
import {
  normalizeUdise,
  validateUdiseCode,
  getCurrentSchoolIdentity,
  getSchoolAuthMappingByUser,
  type SchoolAuthIdentity,
} from '../auth/authService';
import type { User } from 'firebase/auth';
import type { SchoolProfile } from '../types/mdm';

/**
 * Canonical Firestore School Document Schema
 * 
 * Location: schools/{udiseCode}
 * Document ID: udiseCode (The permanent canonical unique school key).
 * 
 * Contains only core school identity fields.
 * Operational data (attendance, rice, money, reports) are strictly segregated
 * and not part of this document.
 */
export interface FirestoreSchoolDocument {
  udiseCode: string; // Canonical school key, identical to doc ID
  schoolName: string;
  schoolType: 'PRIMARY' | 'HIGHER_SECONDARY';
  district: string;
  blockCircle: string;
  address: string;
  headTeacherName: string; // Head Teacher / Teacher-In-Charge (TIC)
  contactNumber: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns the canonical Firestore document path for a school:
 * "schools/{udiseCode}"
 *
 * @param udiseCode - 11-digit UDISE Code (normalized automatically)
 * @returns string - Path formatted as "schools/{udiseCode}"
 */
export function getSchoolDocumentPath(udiseCode: string): string {
  const normalized = normalizeUdise(udiseCode);
  const validation = validateUdiseCode(normalized);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid UDISE Code');
  }
  return `schools/${normalized}`;
}

/**
 * Returns the Firestore DocumentReference for a school.
 * Enforces that document ID is strictly the normalized UDISE Code.
 *
 * @param udiseCode - 11-digit UDISE Code
 * @returns DocumentReference
 */
export function getSchoolDocRef(
  udiseCode: string
): DocumentReference<FirestoreSchoolDocument> {
  const normalized = normalizeUdise(udiseCode);
  const validation = validateUdiseCode(normalized);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid UDISE Code');
  }
  return doc(firestoreDb, 'schools', normalized) as DocumentReference<FirestoreSchoolDocument>;
}

/**
 * Resolves the Firestore document path for the currently authenticated user session:
 * "schools/{authenticatedUdiseCode}"
 *
 * Throws an error if the user is unauthenticated or has no resolved school identity.
 *
 * @param user - Current Firebase Auth user or null
 * @returns string - "schools/{authenticatedUdiseCode}"
 */
export function resolveAuthenticatedSchoolDocPath(user: User | null): string {
  if (!user) {
    const err: any = new Error(
      'Unauthenticated: Cannot resolve school document path without an active authenticated session.'
    );
    err.code = 'auth/unauthenticated';
    throw err;
  }

  // Attempt resolving from session identity first, then from user profile mapping
  const sessionIdentity = getCurrentSchoolIdentity();
  const identity: SchoolAuthIdentity | null =
    sessionIdentity && sessionIdentity.authUid === user.uid
      ? sessionIdentity
      : getSchoolAuthMappingByUser(user);

  if (!identity || !identity.udiseCode) {
    const err: any = new Error(
      'No registered school identity associated with this authenticated account.'
    );
    err.code = 'auth/school-not-resolved';
    throw err;
  }

  return getSchoolDocumentPath(identity.udiseCode);
}

/**
 * Pure projection helper: converts a local SchoolProfile into the canonical
 * FirestoreSchoolDocument representation.
 *
 * Guarantees that:
 * 1. UDISE Code is canonical and preserved.
 * 2. No secondary auto-generated school ID is produced.
 * 3. No operational MDM collections (attendance, rice, transactions) are attached.
 */
export function toFirestoreSchoolDocument(
  profile: Partial<SchoolProfile>,
  canonicalUdise: string
): FirestoreSchoolDocument {
  const normalizedUdise = normalizeUdise(canonicalUdise);
  const validation = validateUdiseCode(normalizedUdise);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid UDISE Code');
  }

  const now = new Date().toISOString();

  return {
    udiseCode: normalizedUdise,
    schoolName: (profile.schoolName || '').trim(),
    schoolType: profile.schoolType === 'HIGHER_SECONDARY' ? 'HIGHER_SECONDARY' : 'PRIMARY',
    district: (profile.district || '').trim(),
    blockCircle: (profile.blockCircle || '').trim(),
    address: (profile.address || '').trim(),
    headTeacherName: (profile.headTeacherName || '').trim(),
    contactNumber: (profile.contactNumber || '').trim(),
    createdAt: profile.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Service Helper: Fetch a school document from Firestore.
 * Prepared for future sync integration; not invoked automatically.
 */
export async function fetchSchoolProfileFromFirestore(
  udiseCode: string
): Promise<FirestoreSchoolDocument | null> {
  const docRef = getSchoolDocRef(udiseCode);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as FirestoreSchoolDocument;
  }
  return null;
}

/**
 * Service Helper: Create a school document in Firestore using UDISE as document ID.
 * Prepared for future sync integration; not invoked automatically.
 */
export async function createSchoolProfileInFirestore(
  profile: FirestoreSchoolDocument
): Promise<void> {
  const normalizedUdise = normalizeUdise(profile.udiseCode);
  const docRef = getSchoolDocRef(normalizedUdise);
  await setDoc(docRef, {
    ...profile,
    udiseCode: normalizedUdise,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Service Helper: Update an existing school document in Firestore.
 * Strictly guarantees that UDISE Code cannot be mutated.
 * Prepared for future sync integration; not invoked automatically.
 */
export async function updateSchoolProfileInFirestore(
  udiseCode: string,
  fields: Partial<Omit<FirestoreSchoolDocument, 'udiseCode' | 'createdAt'>>
): Promise<void> {
  const normalizedUdise = normalizeUdise(udiseCode);
  const docRef = getSchoolDocRef(normalizedUdise);

  // Strip udiseCode from fields to guarantee immutability
  const { udiseCode: _ignored, ...allowedFields } = (fields as any) || {};

  await updateDoc(docRef, {
    ...allowedFields,
    updatedAt: new Date().toISOString(),
  });
}

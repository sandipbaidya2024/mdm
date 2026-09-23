import {
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
  type User,
  type UserCredential,
  type NextOrObserver,
  type Unsubscribe,
} from 'firebase/auth';
import { auth } from '../firebase';

/**
 * School Authentication & Identity Specification
 * 
 * UDISE Code is the authoritative unique school key.
 * Users authenticate using UDISE Code + Password.
 * Recovery Email is stored strictly for password recovery and is never exposed as a login field.
 */
export interface SchoolAuthIdentity {
  udiseCode: string;
  schoolName: string;
  recoveryEmail: string;
  authUid: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RegisterSchoolParams {
  udiseCode: string;
  schoolName: string;
  recoveryEmail: string;
  password: string;
}

export interface SchoolDataScope {
  schoolId: string;
  udiseCode: string;
  schoolName: string;
  rootCollectionPath: string; // e.g. `schools/${udiseCode}`
  subcollections: {
    dailyAttendance: string;
    riceTransactions: string;
    moneyTransactions: string;
    monthlyPeriods: string;
    enrollmentHistory: string;
    cookingCostRateHistory: string;
    riceRateHistory: string;
    monthlyOfficialData: string;
  };
}

/**
 * Storage Key for UDISE -> Firebase Auth Identity mapping.
 * Plaintext passwords are NEVER stored in this mapping or anywhere in client storage.
 */
const STORAGE_KEY = 'mdm_school_auth_registry_v1';

/**
 * Default pre-seeded mapping for the benchmark school (Joypur Primary School).
 * Allows existing credentials to seamlessly authenticate using UDISE code 19180100101.
 */
const DEFAULT_PRESEEDED_MAPPINGS: Record<string, SchoolAuthIdentity> = {
  '19180100101': {
    udiseCode: '19180100101',
    schoolName: 'Joypur Primary School',
    recoveryEmail: 'sandipbaidya10@gmail.com',
    authUid: '',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

// In-memory fallback for non-browser / test environments
let memoryRegistry: Record<string, SchoolAuthIdentity> = { ...DEFAULT_PRESEEDED_MAPPINGS };

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Retrieve the active UDISE -> Auth registry.
 */
export function getStoredRegistry(): Record<string, SchoolAuthIdentity> {
  if (isBrowser) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with default pre-seeded mappings if not present
        return { ...DEFAULT_PRESEEDED_MAPPINGS, ...parsed };
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRESEEDED_MAPPINGS));
        return { ...DEFAULT_PRESEEDED_MAPPINGS };
      }
    } catch (e) {
      console.warn('Failed to read auth registry from localStorage', e);
    }
  }
  return memoryRegistry;
}

/**
 * Save the UDISE -> Auth registry.
 */
export function saveStoredRegistry(registry: Record<string, SchoolAuthIdentity>): void {
  memoryRegistry = { ...registry };
  if (isBrowser) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
    } catch (e) {
      console.warn('Failed to persist auth registry to localStorage', e);
    }
  }
}

/**
 * Normalize UDISE input by trimming whitespace.
 */
export function normalizeUdise(udise: string): string {
  return (udise || '').trim();
}

/**
 * Validate UDISE Code.
 * Checks for non-empty normalized string with proper length.
 */
export function validateUdiseCode(udise: string): { valid: boolean; error?: string } {
  const normalized = normalizeUdise(udise);
  if (!normalized) {
    return { valid: false, error: 'UDISE Code is required.' };
  }
  if (normalized.length < 8 || normalized.length > 15) {
    return { valid: false, error: 'Please enter a valid UDISE Code (typically 11 digits).' };
  }
  // Standard UDISE is numeric
  if (!/^\d+$/.test(normalized)) {
    return { valid: false, error: 'UDISE Code must contain only digits.' };
  }
  return { valid: true };
}

/**
 * Find school mapping by normalized UDISE Code.
 */
export function getSchoolAuthMapping(udise: string): SchoolAuthIdentity | null {
  const normalized = normalizeUdise(udise);
  const registry = getStoredRegistry();
  return registry[normalized] || null;
}

/**
 * Find school mapping by Firebase Auth UID or recovery email.
 */
export function getSchoolAuthMappingByUser(user: User | null): SchoolAuthIdentity | null {
  if (!user) return null;
  const registry = getStoredRegistry();
  const values = Object.values(registry);
  
  // Try matching by authUid first
  const byUid = values.find((item) => item.authUid && item.authUid === user.uid);
  if (byUid) return byUid;

  // Try matching by recoveryEmail
  if (user.email) {
    const userEmailLower = user.email.toLowerCase().trim();
    const byEmail = values.find(
      (item) => item.recoveryEmail.toLowerCase().trim() === userEmailLower
    );
    if (byEmail) return byEmail;
  }

  // Try parsing from user displayName if formatted like "School [UDISE:19180100101]"
  if (user.displayName) {
    const match = user.displayName.match(/UDISE:(\d+)/);
    if (match && match[1]) {
      const byParsed = registry[match[1]];
      if (byParsed) return byParsed;
    }
  }

  return null;
}

/**
 * Currently active school identity in session.
 */
let activeSchoolIdentity: SchoolAuthIdentity | null = null;

export function getCurrentSchoolIdentity(): SchoolAuthIdentity | null {
  if (activeSchoolIdentity) return activeSchoolIdentity;
  const currentUser = auth.currentUser;
  if (currentUser) {
    activeSchoolIdentity = getSchoolAuthMappingByUser(currentUser);
  }
  return activeSchoolIdentity;
}

export function setActiveSchoolIdentity(identity: SchoolAuthIdentity | null): void {
  activeSchoolIdentity = identity;
}

/**
 * Sign in using UDISE Code and Password.
 * Resolves the UDISE Code to the internal Firebase Auth identity.
 * Email is never exposed in the UI.
 */
export async function signInWithUdise(
  udiseCode: string,
  password: string
): Promise<{ user: User; identity: SchoolAuthIdentity }> {
  const normalizedUdise = normalizeUdise(udiseCode);
  const validation = validateUdiseCode(normalizedUdise);
  if (!validation.valid) {
    const error: any = new Error(validation.error);
    error.code = 'auth/invalid-udise';
    throw error;
  }

  const mapping = getSchoolAuthMapping(normalizedUdise);
  if (!mapping) {
    const error: any = new Error(
      `No school account found matching UDISE Code "${normalizedUdise}". Please verify your UDISE Code or register a new school.`
    );
    error.code = 'auth/user-not-found';
    throw error;
  }

  // Sign in to Firebase Authentication using the mapped recovery identity
  const userCredential = await firebaseSignInWithEmailAndPassword(
    auth,
    mapping.recoveryEmail,
    password
  );

  // Update mapping with UID if it wasn't recorded previously
  if (!mapping.authUid && userCredential.user.uid) {
    mapping.authUid = userCredential.user.uid;
    const registry = getStoredRegistry();
    registry[normalizedUdise] = mapping;
    saveStoredRegistry(registry);
  }

  setActiveSchoolIdentity(mapping);
  return { user: userCredential.user, identity: mapping };
}

/**
 * Register a new school using UDISE Code, School Name, Recovery Email, and Password.
 * Enforces UDISE Code uniqueness: two schools can never share the same UDISE Code.
 */
export async function signUpWithUdise(
  params: RegisterSchoolParams
): Promise<{ user: User; identity: SchoolAuthIdentity }> {
  const normalizedUdise = normalizeUdise(params.udiseCode);
  const schoolName = (params.schoolName || '').trim();
  const recoveryEmail = (params.recoveryEmail || '').trim();

  // 1. Validate UDISE
  const udiseValidation = validateUdiseCode(normalizedUdise);
  if (!udiseValidation.valid) {
    const error: any = new Error(udiseValidation.error);
    error.code = 'auth/invalid-udise';
    throw error;
  }

  // 2. Validate School Name
  if (!schoolName) {
    const error: any = new Error('School Name is required.');
    error.code = 'auth/invalid-school-name';
    throw error;
  }

  // 3. Validate Recovery Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!recoveryEmail || !emailRegex.test(recoveryEmail)) {
    const error: any = new Error('Please enter a valid Recovery Email address.');
    error.code = 'auth/invalid-email';
    throw error;
  }

  // 4. Validate Password length
  if (!params.password || params.password.length < 6) {
    const error: any = new Error('Password must be at least 6 characters long.');
    error.code = 'auth/weak-password';
    throw error;
  }

  // 5. Enforce UDISE Code Uniqueness
  const existingMapping = getSchoolAuthMapping(normalizedUdise);
  if (existingMapping) {
    const error: any = new Error(
      `UDISE Code "${normalizedUdise}" is already registered for "${existingMapping.schoolName}". Duplicate UDISE Codes are strictly disallowed.`
    );
    error.code = 'auth/udise-already-in-use';
    throw error;
  }

  // 6. Create Firebase Authentication Account using Recovery Email
  const userCredential = await firebaseCreateUserWithEmailAndPassword(
    auth,
    recoveryEmail,
    params.password
  );

  // 7. Update display name with School Name and UDISE Code
  try {
    await firebaseUpdateProfile(userCredential.user, {
      displayName: `${schoolName} [UDISE:${normalizedUdise}]`,
    });
  } catch (err) {
    console.warn('Failed to set displayName on Firebase user', err);
  }

  // 8. Record the authoritative mapping
  const identity: SchoolAuthIdentity = {
    udiseCode: normalizedUdise,
    schoolName,
    recoveryEmail,
    authUid: userCredential.user.uid,
    createdAt: new Date().toISOString(),
  };

  const registry = getStoredRegistry();
  registry[normalizedUdise] = identity;
  saveStoredRegistry(registry);
  setActiveSchoolIdentity(identity);

  return { user: userCredential.user, identity };
}

/**
 * Trigger Firebase Password-Reset for a school identified by its UDISE Code.
 * Dispatches the reset email to the associated Recovery Email.
 * Returns a generic success response to prevent UDISE enumeration.
 */
export async function sendPasswordResetForUdise(
  udiseCode: string
): Promise<{ success: boolean; message: string }> {
  const normalizedUdise = normalizeUdise(udiseCode);
  const genericMessage =
    'If this UDISE Code is registered in the system, a password reset link has been dispatched to the school’s recovery email address. Please check your inbox and spam folder.';

  const mapping = getSchoolAuthMapping(normalizedUdise);
  if (mapping && mapping.recoveryEmail) {
    try {
      await firebaseSendPasswordResetEmail(auth, mapping.recoveryEmail);
    } catch (err: any) {
      console.error('Firebase password reset dispatch failed:', err);
      // If network error, throw so the user knows to check connectivity
      if (err?.code === 'auth/network-request-failed') {
        throw err;
      }
    }
  }

  // Always return the generic message so existence of UDISE codes cannot be enumerated
  return {
    success: true,
    message: genericMessage,
  };
}

/**
 * Sign out the currently authenticated user and clear active school identity.
 */
export async function logOut(): Promise<void> {
  activeSchoolIdentity = null;
  return firebaseSignOut(auth);
}

/**
 * Listen for changes to the user's sign-in state.
 */
export function subscribeToAuthState(
  nextOrObserver: NextOrObserver<User>
): Unsubscribe {
  return firebaseOnAuthStateChanged(auth, (user) => {
    if (user) {
      activeSchoolIdentity = getSchoolAuthMappingByUser(user);
    } else {
      activeSchoolIdentity = null;
    }
    if (typeof nextOrObserver === 'function') {
      nextOrObserver(user);
    } else if (nextOrObserver && nextOrObserver.next) {
      nextOrObserver.next(user);
    }
  });
}

/**
 * Retrieve the current authenticated user synchronously.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Prepares the multi-tenant architectural scope for future Firestore data sync.
 * Restricts all school collections under the unique schoolId / UDISE namespace.
 */
export function getSchoolDataScope(udiseCode: string, schoolName = ''): SchoolDataScope {
  const normalized = normalizeUdise(udiseCode);
  return {
    schoolId: normalized,
    udiseCode: normalized,
    schoolName,
    rootCollectionPath: `schools/${normalized}`,
    subcollections: {
      dailyAttendance: `schools/${normalized}/dailyAttendance`,
      riceTransactions: `schools/${normalized}/riceTransactions`,
      moneyTransactions: `schools/${normalized}/moneyTransactions`,
      monthlyPeriods: `schools/${normalized}/monthlyPeriods`,
      enrollmentHistory: `schools/${normalized}/enrollmentHistory`,
      cookingCostRateHistory: `schools/${normalized}/cookingCostRateHistory`,
      riceRateHistory: `schools/${normalized}/riceRateHistory`,
      monthlyOfficialData: `schools/${normalized}/monthlyOfficialData`,
    },
  };
}

// Backwards-compatibility helpers
export async function signUpWithEmail(email: string, password: string): Promise<UserCredential> {
  return firebaseCreateUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return firebaseSignInWithEmailAndPassword(auth, email.trim(), password);
}

export type { User, UserCredential, Unsubscribe };

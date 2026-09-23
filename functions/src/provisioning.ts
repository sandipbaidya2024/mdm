import {
  normalizeServerUdise,
  validateServerUdiseCode,
  setUserUdiseClaim,
  type UdiseAuthClaim,
} from './claims';
import { getAdminAuth, getAdminFirestore } from './adminApp';

/**
 * Benchmark school identity constants for protection.
 * These records must never be overwritten or tampered with.
 */
export const BENCHMARK_UDISE = '19180100101';
export const BENCHMARK_RECOVERY_EMAIL = 'sandipbaidya10@gmail.com';

/**
 * Server-side school registration request payload.
 */
export interface SchoolRegistrationRequest {
  udiseCode: string;
  schoolName: string;
  recoveryEmail: string;
  password: string;
  confirmPassword?: string;
  schoolType?: 'PRIMARY' | 'HIGHER_SECONDARY';
  district?: string;
  blockCircle?: string;
  address?: string;
  headTeacherName?: string;
  contactNumber?: string;
}

/**
 * Canonical Firestore School Document (server-side definition).
 * Location: schools/{udiseCode}
 */
export interface CanonicalSchoolDocument {
  udiseCode: string;
  schoolName: string;
  schoolType: 'PRIMARY' | 'HIGHER_SECONDARY';
  district: string;
  blockCircle: string;
  address: string;
  headTeacherName: string;
  contactNumber: string;
  authUid: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Successful provisioning result.
 */
export interface ProvisionedSchoolResult {
  success: true;
  udiseCode: string;
  authUid: string;
  schoolDocumentPath: string;
  schoolProfile: CanonicalSchoolDocument;
}

/**
 * Provisioning error details including rollback tracking.
 */
export interface ProvisioningFailureResult {
  success: false;
  code: string;
  message: string;
  orphanedAuthUid?: string;
  rollbackExecuted: boolean;
  rollbackSuccessful: boolean;
}

/**
 * Abstract provider for Firebase Admin Auth operations to allow safe unit testing
 * without interacting with live production users.
 */
export interface ProvisioningAuthProvider {
  createUser(properties: {
    email: string;
    password?: string;
    displayName?: string;
  }): Promise<{ uid: string; email?: string }>;
  getUserByEmail?(email: string): Promise<any>;
  deleteUser(uid: string): Promise<void>;
  setCustomUserClaims(uid: string, claims: object | null): Promise<void>;
  getUser(uid: string): Promise<{ customClaims?: Record<string, any> }>;
}

/**
 * Abstract provider for Firestore database operations to allow safe unit testing
 * without writing live production documents.
 */
export interface ProvisioningFirestoreProvider {
  getSchool(udiseCode: string): Promise<{ exists: boolean; data?: any }>;
  setSchool(udiseCode: string, data: CanonicalSchoolDocument): Promise<void>;
  deleteSchool?(udiseCode: string): Promise<void>;
}

/**
 * Live Admin SDK Auth Adapter
 */
export class LiveAdminAuthProvider implements ProvisioningAuthProvider {
  private auth = getAdminAuth();

  async createUser(properties: { email: string; password?: string; displayName?: string }) {
    const user = await this.auth.createUser(properties);
    return { uid: user.uid, email: user.email };
  }

  async getUserByEmail(email: string) {
    return this.auth.getUserByEmail(email);
  }

  async deleteUser(uid: string) {
    return this.auth.deleteUser(uid);
  }

  async setCustomUserClaims(uid: string, claims: object | null) {
    return this.auth.setCustomUserClaims(uid, claims);
  }

  async getUser(uid: string) {
    const u = await this.auth.getUser(uid);
    return { customClaims: u.customClaims };
  }
}

/**
 * Live Admin SDK Firestore Adapter
 */
export class LiveAdminFirestoreProvider implements ProvisioningFirestoreProvider {
  private firestore = getAdminFirestore();

  async getSchool(udiseCode: string) {
    const snap = await this.firestore.collection('schools').doc(udiseCode).get();
    return { exists: snap.exists, data: snap.data() };
  }

  async setSchool(udiseCode: string, data: CanonicalSchoolDocument) {
    await this.firestore.collection('schools').doc(udiseCode).set(data);
  }

  async deleteSchool(udiseCode: string) {
    await this.firestore.collection('schools').doc(udiseCode).delete();
  }
}

/**
 * Server-side validation of registration request fields.
 * Guarantees that unverified or malformed client data is rejected before processing.
 */
export function validateRegistrationRequest(
  request: SchoolRegistrationRequest
): { valid: boolean; normalizedUdise: string; error?: string; code?: string } {
  if (!request) {
    return { valid: false, normalizedUdise: '', error: 'Registration payload is missing.', code: 'INVALID_PAYLOAD' };
  }

  // 1. Validate UDISE Code
  const normalizedUdise = normalizeServerUdise(request.udiseCode);
  const udiseCheck = validateServerUdiseCode(normalizedUdise);
  if (!udiseCheck.valid) {
    return { valid: false, normalizedUdise, error: udiseCheck.error, code: 'INVALID_UDISE' };
  }

  // 2. Validate School Name
  const trimmedName = (request.schoolName || '').trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { valid: false, normalizedUdise, error: 'School name is required (minimum 2 characters).', code: 'INVALID_SCHOOL_NAME' };
  }

  // 3. Validate Recovery Email
  const trimmedEmail = (request.recoveryEmail || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    return { valid: false, normalizedUdise, error: 'A valid Recovery Email is required.', code: 'INVALID_RECOVERY_EMAIL' };
  }

  // 4. Validate Password
  const pwd = request.password;
  if (!pwd || typeof pwd !== 'string' || pwd.length < 6) {
    return { valid: false, normalizedUdise, error: 'Password must be at least 6 characters long.', code: 'INVALID_PASSWORD' };
  }

  // 5. Validate Confirm Password if supplied
  if (request.confirmPassword !== undefined && request.confirmPassword !== pwd) {
    return { valid: false, normalizedUdise, error: 'Password and Confirm Password do not match.', code: 'PASSWORD_MISMATCH' };
  }

  return { valid: true, normalizedUdise };
}

/**
 * Trusted server-side function to provision a new school identity atomically.
 *
 * Sequence:
 * 1. Validate all registration input server-side.
 * 2. Verify UDISE uniqueness against existing Firestore records.
 * 3. Verify benchmark protection.
 * 4. Create Firebase Authentication user with Recovery Email (never stores plaintext password).
 * 5. Set trusted custom claim: { udiseCode: "<validated UDISE>" }.
 * 6. Provision canonical Firestore document at schools/{udiseCode}.
 * 7. On any intermediate failure, execute atomic rollback to prevent orphaned resources.
 */
export async function provisionSchoolAccount(
  request: SchoolRegistrationRequest,
  providers?: {
    auth?: ProvisioningAuthProvider;
    firestore?: ProvisioningFirestoreProvider;
  }
): Promise<ProvisionedSchoolResult> {
  // Step 1: Server-side validation
  const validation = validateRegistrationRequest(request);
  if (!validation.valid) {
    const error: any = new Error(validation.error);
    error.code = validation.code;
    throw error;
  }

  const normalizedUdise = validation.normalizedUdise;
  const normalizedEmail = request.recoveryEmail.trim().toLowerCase();

  // Step 2: Protect Benchmark Account
  if (normalizedUdise === BENCHMARK_UDISE || normalizedEmail === BENCHMARK_RECOVERY_EMAIL) {
    const error: any = new Error(
      `Conflict: The benchmark school account (${BENCHMARK_UDISE} / ${BENCHMARK_RECOVERY_EMAIL}) is protected and cannot be overwritten.`
    );
    error.code = 'BENCHMARK_PROTECTED';
    throw error;
  }

  const auth = providers?.auth || new LiveAdminAuthProvider();
  const firestore = providers?.firestore || new LiveAdminFirestoreProvider();

  // Step 3: Check UDISE uniqueness in Firestore BEFORE creating any Auth user
  const existingSchoolDoc = await firestore.getSchool(normalizedUdise);
  if (existingSchoolDoc.exists) {
    const error: any = new Error(
      `School with UDISE Code ${normalizedUdise} is already registered. Duplicate registration is denied.`
    );
    error.code = 'UDISE_ALREADY_EXISTS';
    throw error;
  }

  // Step 4: Check if email is already in use in Auth (if provider supports lookup)
  if (auth.getUserByEmail) {
    try {
      const existingUser = await auth.getUserByEmail(normalizedEmail);
      if (existingUser) {
        const error: any = new Error(
          `The recovery email ${normalizedEmail} is already registered to an existing account.`
        );
        error.code = 'EMAIL_ALREADY_IN_USE';
        throw error;
      }
    } catch (lookupErr: any) {
      // 'auth/user-not-found' is the expected normal case; rethrow other genuine errors
      if (lookupErr?.code !== 'auth/user-not-found' && lookupErr?.code !== 'USER_NOT_FOUND') {
        if (lookupErr?.code === 'EMAIL_ALREADY_IN_USE') throw lookupErr;
      }
    }
  }

  // Step 5: Create Firebase Authentication user
  let createdUid: string | undefined;
  try {
    const userRecord = await auth.createUser({
      email: normalizedEmail,
      password: request.password,
      displayName: request.schoolName.trim(),
    });
    createdUid = userRecord.uid;
  } catch (authCreateErr: any) {
    const error: any = new Error(
      `Failed to create authentication user: ${authCreateErr?.message || authCreateErr}`
    );
    error.code = authCreateErr?.code || 'AUTH_CREATION_FAILED';
    throw error;
  }

  // Step 6: Assign trusted custom claim: { udiseCode: "<validated UDISE>" }
  try {
    await setUserUdiseClaim(createdUid, normalizedUdise, auth);
  } catch (claimErr: any) {
    // Rollback Auth user to avoid orphaned user without claim
    let rollbackSuccess = false;
    try {
      await auth.deleteUser(createdUid);
      rollbackSuccess = true;
    } catch (rbErr) {
      console.error(`[CRITICAL] Failed to rollback orphaned Auth user ${createdUid}:`, rbErr);
    }

    const failureErr: any = new Error(
      `Provisioning failed during custom claim assignment: ${claimErr?.message || claimErr}. ${
        rollbackSuccess ? 'Rollback completed (Auth user deleted).' : 'Rollback failed.'
      }`
    );
    failureErr.code = 'CLAIM_ASSIGNMENT_FAILED';
    failureErr.orphanedAuthUid = createdUid;
    failureErr.rollbackExecuted = true;
    failureErr.rollbackSuccessful = rollbackSuccess;
    throw failureErr;
  }

  // Step 7: Provision canonical school document at schools/{udiseCode}
  const now = new Date().toISOString();
  const schoolDocumentData: CanonicalSchoolDocument = {
    udiseCode: normalizedUdise,
    schoolName: request.schoolName.trim(),
    schoolType: request.schoolType === 'HIGHER_SECONDARY' ? 'HIGHER_SECONDARY' : 'PRIMARY',
    district: (request.district || '').trim(),
    blockCircle: (request.blockCircle || '').trim(),
    address: (request.address || '').trim(),
    headTeacherName: (request.headTeacherName || '').trim(),
    contactNumber: (request.contactNumber || '').trim(),
    authUid: createdUid,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await firestore.setSchool(normalizedUdise, schoolDocumentData);
  } catch (firestoreErr: any) {
    // Rollback Auth user to avoid orphaned user without school document
    let rollbackSuccess = false;
    try {
      await auth.deleteUser(createdUid);
      rollbackSuccess = true;
    } catch (rbErr) {
      console.error(`[CRITICAL] Failed to rollback orphaned Auth user ${createdUid}:`, rbErr);
    }

    const failureErr: any = new Error(
      `Provisioning failed during school document creation: ${firestoreErr?.message || firestoreErr}. ${
        rollbackSuccess ? 'Rollback completed (Auth user deleted).' : 'Rollback failed.'
      }`
    );
    failureErr.code = 'FIRESTORE_PROVISIONING_FAILED';
    failureErr.orphanedAuthUid = createdUid;
    failureErr.rollbackExecuted = true;
    failureErr.rollbackSuccessful = rollbackSuccess;
    throw failureErr;
  }

  // Step 8: Return successful provisioning result
  return {
    success: true,
    udiseCode: normalizedUdise,
    authUid: createdUid,
    schoolDocumentPath: `schools/${normalizedUdise}`,
    schoolProfile: schoolDocumentData,
  };
}

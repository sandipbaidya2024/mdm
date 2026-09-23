/**
 * Firebase Cloud Functions Backend Entry Point
 * 
 * SECURITY ARCHITECTURE:
 * - Server-side only; executes within Google Cloud trusted environment.
 * - Exposes ONE secure Firebase HTTPS Callable Function (v2): 'provisionSchool' in region 'asia-south1'.
 * - Arbitrary claim manipulation is impossible (setUserUdiseClaim is NOT exposed to clients).
 * - Accepts only strictly-validated school registration payload.
 * - Never leaks passwords, internal Auth UIDs, or Admin credentials.
 * - Enforces Application Default Credentials (ADC); zero hardcoded keys or secrets.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import {
  provisionSchoolAccount,
  validateRegistrationRequest,
  type SchoolRegistrationRequest,
} from './provisioning';

// Export internal trusted modules for test harnesses and server scripts
export { getAdminApp, getAdminAuth, getAdminFirestore } from './adminApp';
export {
  type UdiseAuthClaim,
  normalizeServerUdise,
  validateServerUdiseCode,
  buildUdiseClaim,
  setUserUdiseClaim,
  getUserUdiseClaim,
} from './claims';

export {
  type SchoolRegistrationRequest,
  type CanonicalSchoolDocument,
  type ProvisionedSchoolResult,
  type ProvisioningFailureResult,
  type ProvisioningAuthProvider,
  type ProvisioningFirestoreProvider,
  BENCHMARK_UDISE,
  BENCHMARK_RECOVERY_EMAIL,
  validateRegistrationRequest,
  provisionSchoolAccount,
} from './provisioning';

/**
 * Authoritative, secure school registration Cloud Function.
 * Region: asia-south1 (colocated with Firestore).
 * Callable mechanism: onCall.
 */
export const provisionSchool = onCall<SchoolRegistrationRequest>(
  {
    region: 'asia-south1',
    cors: false,
  },
  async (request) => {
    const data = request.data;

    if (!data || typeof data !== 'object') {
      throw new HttpsError('invalid-argument', 'Missing registration payload.', {
        code: 'MISSING_PAYLOAD',
      });
    }

    // Authoritative server-side validation check
    const validation = validateRegistrationRequest(data);
    if (!validation.valid) {
      throw new HttpsError('invalid-argument', validation.error || 'Invalid registration request.', {
        code: validation.code || 'INVALID_INPUT',
      });
    }

    try {
      const result = await provisionSchoolAccount(data);

      // Return ONLY sanitized public metadata.
      // NEVER return passwords, internal UIDs, Admin credentials, stack traces, or secrets.
      return {
        success: true,
        udiseCode: result.udiseCode,
        schoolName: result.schoolProfile.schoolName,
        schoolDocumentPath: result.schoolDocumentPath,
        message: 'School registration provisioned successfully.',
      };
    } catch (err: any) {
      const code = err?.code || 'SERVER_ERROR';
      const message = err?.message || 'Server error occurred during provisioning.';

      if (code === 'UDISE_ALREADY_EXISTS') {
        throw new HttpsError('already-exists', message, { code: 'UDISE_ALREADY_EXISTS' });
      }

      if (code === 'BENCHMARK_PROTECTED') {
        throw new HttpsError('permission-denied', message, { code: 'BENCHMARK_PROTECTED' });
      }

      if (
        code === 'INVALID_UDISE' ||
        code === 'PASSWORD_MISMATCH' ||
        code === 'INVALID_RECOVERY_EMAIL' ||
        code === 'MISSING_SCHOOL_NAME'
      ) {
        throw new HttpsError('invalid-argument', message, { code });
      }

      // Safe fallback internal error
      throw new HttpsError('internal', 'Server error occurred during school provisioning.', {
        code: 'PROVISIONING_FAILED',
      });
    }
  }
);

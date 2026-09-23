/**
 * Server-Side Provisioning Test Suite
 *
 * PROOF OF SAFETY:
 * - Uses in-memory test doubles (MockProvisioningAuthProvider & MockProvisioningFirestoreProvider)
 *   to verify all security, validation, claims assignment, canonical path, and rollback invariants
 *   WITHOUT modifying any production Firebase Authentication users or Firestore documents.
 */

import {
  validateRegistrationRequest,
  provisionSchoolAccount,
  BENCHMARK_UDISE,
  BENCHMARK_RECOVERY_EMAIL,
  type SchoolRegistrationRequest,
  type CanonicalSchoolDocument,
  type ProvisioningAuthProvider,
  type ProvisioningFirestoreProvider,
} from '../functions/src/provisioning';

class MockProvisioningAuthProvider implements ProvisioningAuthProvider {
  public users = new Map<string, { email: string; password?: string; displayName?: string }>();
  public claims = new Map<string, Record<string, any>>();
  public deletedUids: string[] = [];
  private idCounter = 1;

  async createUser(properties: { email: string; password?: string; displayName?: string }) {
    // Check email uniqueness
    for (const [_, u] of this.users.entries()) {
      if (u.email.toLowerCase() === properties.email.toLowerCase()) {
        const err: any = new Error('The email address is already in use by another account.');
        err.code = 'EMAIL_ALREADY_IN_USE';
        throw err;
      }
    }
    const uid = `mock-uid-${this.idCounter++}`;
    this.users.set(uid, { ...properties });
    return { uid, email: properties.email };
  }

  async getUserByEmail(email: string) {
    for (const [uid, u] of this.users.entries()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return { uid, email: u.email };
      }
    }
    return null;
  }

  async deleteUser(uid: string) {
    if (this.users.has(uid)) {
      this.users.delete(uid);
      this.claims.delete(uid);
      this.deletedUids.push(uid);
    }
  }

  async setCustomUserClaims(uid: string, claims: object | null) {
    if (!this.users.has(uid)) {
      throw new Error(`User ${uid} not found`);
    }
    if (claims) {
      this.claims.set(uid, { ...claims });
    } else {
      this.claims.delete(uid);
    }
  }

  async getUser(uid: string) {
    const u = this.users.get(uid);
    if (!u) throw new Error(`User ${uid} not found`);
    return { customClaims: this.claims.get(uid) };
  }
}

class MockProvisioningFirestoreProvider implements ProvisioningFirestoreProvider {
  public schools = new Map<string, CanonicalSchoolDocument>();
  public failNextSet = false;

  async getSchool(udiseCode: string) {
    const doc = this.schools.get(udiseCode);
    return { exists: !!doc, data: doc };
  }

  async setSchool(udiseCode: string, data: CanonicalSchoolDocument) {
    if (this.failNextSet) {
      throw new Error('Simulated Firestore write failure (Network Timeout)');
    }
    this.schools.set(udiseCode, { ...data });
  }

  async deleteSchool(udiseCode: string) {
    this.schools.delete(udiseCode);
  }
}

async function runProvisioningTestSuite() {
  console.log('====================================================');
  console.log('STARTING SECURE SCHOOL PROVISIONING TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
      console.log(`   Details: ${details}`);
    } else {
      failed++;
      console.error(`[FAIL] ${testName}`);
      console.error(`   Details: ${details}`);
    }
  }

  // --- VALIDATION TESTS ---

  // TEST 1: Valid registration data accepted
  const validRequest: SchoolRegistrationRequest = {
    udiseCode: '19180990001',
    schoolName: 'Kalyani Primary Vidyalaya',
    recoveryEmail: 'kalyani.head@example.com',
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
    schoolType: 'PRIMARY',
    district: 'Nadia',
    blockCircle: 'Kalyani',
  };

  const validationResult = validateRegistrationRequest(validRequest);
  assert(
    validationResult.valid === true && validationResult.normalizedUdise === '19180990001',
    'TEST 1: Valid Registration Payload Accepted',
    'Valid school registration payload passes all server-side validation checks.'
  );

  // TEST 2: Invalid UDISE rejected (length, non-numeric, whitespace-only)
  const invalidUdise1 = validateRegistrationRequest({ ...validRequest, udiseCode: '1918099000' }); // 10 digits
  const invalidUdise2 = validateRegistrationRequest({ ...validRequest, udiseCode: '191809900012' }); // 12 digits
  const invalidUdise3 = validateRegistrationRequest({ ...validRequest, udiseCode: '1918099000A' }); // alpha
  const invalidUdise4 = validateRegistrationRequest({ ...validRequest, udiseCode: '           ' }); // spaces

  assert(
    !invalidUdise1.valid && !invalidUdise2.valid && !invalidUdise3.valid && !invalidUdise4.valid,
    'TEST 2: Strict UDISE Validation Enforced',
    'Short, long, alphanumeric, and empty UDISE inputs are strictly rejected server-side.'
  );

  // TEST 3: Invalid Recovery Email rejected
  const invalidEmail1 = validateRegistrationRequest({ ...validRequest, recoveryEmail: 'not-an-email' });
  const invalidEmail2 = validateRegistrationRequest({ ...validRequest, recoveryEmail: 'missing-domain@' });
  const invalidEmail3 = validateRegistrationRequest({ ...validRequest, recoveryEmail: '' });

  assert(
    !invalidEmail1.valid && !invalidEmail2.valid && !invalidEmail3.valid,
    'TEST 3: Invalid Recovery Email Rejected',
    'Malformed and empty recovery emails are rejected server-side.'
  );

  // TEST 4: Mismatched passwords rejected
  const mismatchedPwd = validateRegistrationRequest({
    ...validRequest,
    password: 'Password123',
    confirmPassword: 'Password456',
  });
  assert(
    !mismatchedPwd.valid && mismatchedPwd.code === 'PASSWORD_MISMATCH',
    'TEST 4: Password and Confirm Password Mismatch Rejected',
    'Mismatched passwords rejected with code PASSWORD_MISMATCH.'
  );

  // --- PROVISIONING PIPELINE TESTS ---

  const mockAuth = new MockProvisioningAuthProvider();
  const mockFirestore = new MockProvisioningFirestoreProvider();

  // TEST 5: Full Successful Provisioning Execution
  const provisionResult = await provisionSchoolAccount(validRequest, {
    auth: mockAuth,
    firestore: mockFirestore,
  });

  assert(
    provisionResult.success === true &&
      provisionResult.udiseCode === '19180990001' &&
      typeof provisionResult.authUid === 'string' &&
      provisionResult.authUid.length > 0,
    'TEST 5: Full Registration Provisioning Pipeline Succeeded',
    `School 19180990001 successfully provisioned with auth UID ${provisionResult.authUid}.`
  );

  // TEST 6: Firebase Auth Identity Creation Path Verified
  const createdAuthUser = mockAuth.users.get(provisionResult.authUid);
  assert(
    createdAuthUser !== undefined &&
      createdAuthUser.email === 'kalyani.head@example.com' &&
      createdAuthUser.displayName === 'Kalyani Primary Vidyalaya',
    'TEST 6: Firebase Auth Identity Creation Path Verified',
    `Firebase Auth user created using recovery email: ${createdAuthUser?.email} (displayName: ${createdAuthUser?.displayName}).`
  );

  // TEST 7: Trusted Custom Claim Assignment Verified
  const userClaims = mockAuth.claims.get(provisionResult.authUid);
  assert(
    userClaims !== undefined && userClaims.udiseCode === '19180990001',
    'TEST 7: Trusted UDISE Custom Claim Assigned',
    `request.auth.token.udiseCode safely set to canonical school key: ${userClaims?.udiseCode}.`
  );

  // TEST 8: Canonical Firestore schools/{udiseCode} Path & Document ID Verified
  const savedDoc = mockFirestore.schools.get('19180990001');
  assert(
    provisionResult.schoolDocumentPath === 'schools/19180990001' &&
      savedDoc !== undefined &&
      savedDoc.udiseCode === '19180990001',
    'TEST 8: Canonical schools/{udiseCode} Document ID Verified',
    `Document persisted at path ${provisionResult.schoolDocumentPath} with document ID equal to UDISE.`
  );

  // TEST 9: AuthUid Binding Verified
  assert(
    savedDoc !== undefined && savedDoc.authUid === provisionResult.authUid,
    'TEST 9: AuthUid Document Binding Verified',
    `School document authUid field '${savedDoc?.authUid}' matches Firebase Auth UID '${provisionResult.authUid}'.`
  );

  // TEST 10: No Secondary School ID Generated
  const docKeys = Object.keys(savedDoc || {});
  const hasNoSecondaryId = !('id' in (savedDoc || {})) && !('schoolId' in (savedDoc || {})) && !('uuid' in (savedDoc || {}));
  assert(
    hasNoSecondaryId,
    'TEST 10: Prohibition of Secondary School IDs Verified',
    `Document keys: [${docKeys.join(', ')}]. No duplicate or generated schoolId/UUID present.`
  );

  // TEST 11: No Plaintext Password Stored
  const hasNoPassword =
    !('password' in (savedDoc || {})) &&
    !('plainPassword' in (savedDoc || {})) &&
    !('pwd' in (savedDoc || {})) &&
    !('password' in provisionResult);
  assert(
    hasNoPassword,
    'TEST 11: Prohibition of Plaintext Password Storage Verified',
    'Password is never stored in Firestore or returned in the provisioning result.'
  );

  // TEST 12: Duplicate UDISE Code Rejected Before Auth Creation
  let duplicateRejected = false;
  const initialAuthCount = mockAuth.users.size;
  try {
    await provisionSchoolAccount(
      {
        ...validRequest,
        recoveryEmail: 'different.email@example.com',
      },
      { auth: mockAuth, firestore: mockFirestore }
    );
  } catch (err: any) {
    if (err?.code === 'UDISE_ALREADY_EXISTS') {
      duplicateRejected = true;
    }
  }

  assert(
    duplicateRejected && mockAuth.users.size === initialAuthCount,
    'TEST 12: Duplicate UDISE Rejected BEFORE Auth User Creation',
    'Attempt to register already-existing UDISE 19180990001 was rejected; no extraneous Auth user was created.'
  );

  // TEST 13: Benchmark School Protection
  let benchmarkBlocked = false;
  try {
    await provisionSchoolAccount(
      {
        udiseCode: BENCHMARK_UDISE,
        schoolName: 'Joypur Tamper Attempt',
        recoveryEmail: BENCHMARK_RECOVERY_EMAIL,
        password: 'Password123!',
      },
      { auth: mockAuth, firestore: mockFirestore }
    );
  } catch (err: any) {
    if (err?.code === 'BENCHMARK_PROTECTED') {
      benchmarkBlocked = true;
    }
  }

  assert(
    benchmarkBlocked,
    'TEST 13: Benchmark Account Protection Verified',
    `Attempt to overwrite benchmark UDISE (${BENCHMARK_UDISE}) / email (${BENCHMARK_RECOVERY_EMAIL}) blocked with code BENCHMARK_PROTECTED.`
  );

  // TEST 14: Rollback & Safe Recovery Path on Firestore Failure
  mockFirestore.failNextSet = true;
  let rollbackHandled = false;
  const userCountBeforeFailure = mockAuth.users.size;

  try {
    await provisionSchoolAccount(
      {
        udiseCode: '19180990002',
        schoolName: 'Rollback Test School',
        recoveryEmail: 'rollback@example.com',
        password: 'Password123!',
      },
      { auth: mockAuth, firestore: mockFirestore }
    );
  } catch (err: any) {
    if (err?.code === 'FIRESTORE_PROVISIONING_FAILED' && err?.rollbackSuccessful === true) {
      rollbackHandled = true;
    }
  }

  assert(
    rollbackHandled && mockAuth.users.size === userCountBeforeFailure,
    'TEST 14: Atomic Rollback on Downstream Failure (Zero Orphaned Users)',
    'When Firestore document creation failed, the created Auth user was rolled back (deleted) immediately; zero orphaned accounts left.'
  );

  console.log('\n====================================================');
  console.log(`TOTALS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runProvisioningTestSuite().catch((err) => {
  console.error('Provisioning test failed:', err);
  process.exit(1);
});

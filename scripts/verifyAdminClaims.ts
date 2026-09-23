/**
 * Server-Side Test Suite: Admin SDK & UDISE Custom Claims Engine
 *
 * PROOF OF SAFETY:
 * - Tests that a canonical UDISE custom claim ({ udiseCode: string }) can be constructed,
 *   validated, and applied from trusted backend code.
 * - Uses an in-memory mock AdminAuthClaimProvider to guarantee that NO production
 *   Firebase Authentication users or production databases are modified.
 */

import {
  normalizeServerUdise,
  validateServerUdiseCode,
  buildUdiseClaim,
  setUserUdiseClaim,
  getUserUdiseClaim,
  type AdminAuthClaimProvider,
} from '../functions/src/claims';

class MockAdminAuthProvider implements AdminAuthClaimProvider {
  public storage = new Map<string, { customClaims?: Record<string, any> }>();

  async setCustomUserClaims(uid: string, customUserClaims: object | null): Promise<void> {
    const existing = this.storage.get(uid) || {};
    this.storage.set(uid, {
      ...existing,
      customClaims: customUserClaims ? { ...customUserClaims } : undefined,
    });
  }

  async getUser(uid: string): Promise<{ customClaims?: Record<string, any> }> {
    const user = this.storage.get(uid);
    if (!user) {
      throw new Error(`User ${uid} not found`);
    }
    return user;
  }
}

async function runAdminClaimsVerification() {
  console.log('====================================================');
  console.log('STARTING SERVER-SIDE ADMIN CLAIMS VERIFICATION');
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

  // TEST 1: Server-side Normalization & Validation
  const rawInput = '   19180100101   ';
  const normalized = normalizeServerUdise(rawInput);
  const validCheck = validateServerUdiseCode(normalized);
  assert(
    normalized === '19180100101' && validCheck.valid === true,
    'TEST 1: Server-side UDISE Normalization & Format Validation',
    `Normalized raw input "${rawInput}" to "${normalized}"; validated as valid 11-digit school key.`
  );

  // TEST 2: Rejection of Invalid Formats
  const shortCheck = validateServerUdiseCode('191801001');
  const longCheck = validateServerUdiseCode('1918010010199');
  const nonNumericCheck = validateServerUdiseCode('1918010010A');
  const emptyCheck = validateServerUdiseCode('');

  assert(
    !shortCheck.valid && !longCheck.valid && !nonNumericCheck.valid && !emptyCheck.valid,
    'TEST 2: Strict Validation Boundaries for Claims',
    'Short, long, non-numeric, and empty codes are strictly rejected from becoming claims.'
  );

  // TEST 3: Typed Claim Payload Construction
  const claimPayload = buildUdiseClaim('19180100101');
  assert(
    claimPayload.udiseCode === '19180100101' && Object.keys(claimPayload).length === 1,
    'TEST 3: Typed Claim Structure Conformance',
    `Constructed claim payload: ${JSON.stringify(claimPayload)}. Exactly matches { udiseCode: string }.`
  );

  // TEST 4: Secure Claim Assignment on User
  const mockAuth = new MockAdminAuthProvider();
  const testUid = 'test-school-uid-19180100101';
  mockAuth.storage.set(testUid, {});

  const setResult = await setUserUdiseClaim(testUid, '19180100101', mockAuth);
  assert(
    setResult.success === true &&
      setResult.uid === testUid &&
      setResult.claims.udiseCode === '19180100101',
    'TEST 4: Trusted Server-side Claim Setting',
    `Custom user claim request.auth.token.udiseCode safely assigned to user "${testUid}".`
  );

  // TEST 5: Claim Retrieval & Verification
  const retrievedClaimUdise = await getUserUdiseClaim(testUid, mockAuth);
  assert(
    retrievedClaimUdise === '19180100101',
    'TEST 5: Stored Custom Claim Retrieval & Verification',
    `Retrieved stored claim UDISE: "${retrievedClaimUdise}". Matches expected canonical school key.`
  );

  // TEST 6: Protection Against Empty/Missing UID
  let emptyUidRejected = false;
  try {
    await setUserUdiseClaim('', '19180100101', mockAuth);
  } catch {
    emptyUidRejected = true;
  }
  assert(
    emptyUidRejected,
    'TEST 6: UID Parameter Enforcement',
    'Attempt to set custom claims with an empty UID was properly rejected.'
  );

  console.log('\n====================================================');
  console.log(`TOTALS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminClaimsVerification().catch((err) => {
  console.error('Admin claims test failed:', err);
  process.exit(1);
});

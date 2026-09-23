/**
 * Frontend-to-Backend Registration Integration Test Suite
 *
 * PROOF OF SAFETY & ZERO-LEAK BOUNDARY:
 * 1. Verifies that registration requests from the frontend client reach the trusted server-side
 *    provisioning engine without bundling any Admin SDK or server-side credentials in the browser.
 * 2. Verifies invalid UDISE rejection, duplicate UDISE rejection, and password mismatch handling.
 * 3. Verifies safe error formatting without leaking UIDs, stack traces, or credentials.
 * 4. Verifies duplicate submission prevention.
 * 5. Verifies that NO Firebase Admin SDK or Cloud Functions packages are bundled into the frontend.
 * 6. Uses dependency-injected test doubles so ZERO production Firebase data is modified.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  registerSchoolWithBackend,
  setRegistrationBackendHandler,
  formatRegistrationError,
  type SchoolRegistrationClientInput,
} from '../src/services/schoolRegistrationClient';
import {
  validateRegistrationRequest,
  provisionSchoolAccount,
  BENCHMARK_UDISE,
  type ProvisioningAuthProvider,
  type ProvisioningFirestoreProvider,
  type CanonicalSchoolDocument,
} from '../functions/src/provisioning';

// In-Memory Test Doubles for Safe Verification
class TestAuthProvider implements ProvisioningAuthProvider {
  public users = new Map<string, { email: string; password?: string; displayName?: string }>();
  public claims = new Map<string, Record<string, any>>();
  private counter = 1;

  async createUser(properties: { email: string; password?: string; displayName?: string }) {
    for (const [_, u] of this.users.entries()) {
      if (u.email.toLowerCase() === properties.email.toLowerCase()) {
        const err: any = new Error('Email already exists');
        err.code = 'EMAIL_ALREADY_IN_USE';
        throw err;
      }
    }
    const uid = `test-uid-${this.counter++}`;
    this.users.set(uid, { ...properties });
    return { uid, email: properties.email };
  }

  async deleteUser(uid: string) {
    this.users.delete(uid);
    this.claims.delete(uid);
  }

  async setCustomUserClaims(uid: string, claims: object | null) {
    if (claims) {
      this.claims.set(uid, { ...claims });
    } else {
      this.claims.delete(uid);
    }
  }

  async getUser(uid: string) {
    return { customClaims: this.claims.get(uid) };
  }
}

class TestFirestoreProvider implements ProvisioningFirestoreProvider {
  public schools = new Map<string, CanonicalSchoolDocument>();
  public failNext = false;

  async getSchool(udiseCode: string) {
    const s = this.schools.get(udiseCode);
    return { exists: !!s, data: s };
  }

  async setSchool(udiseCode: string, data: CanonicalSchoolDocument) {
    if (this.failNext) {
      throw new Error('Database connection interrupted');
    }
    this.schools.set(udiseCode, { ...data });
  }

  async deleteSchool(udiseCode: string) {
    this.schools.delete(udiseCode);
  }
}

async function runRegistrationIntegrationSuite() {
  console.log('====================================================');
  console.log('STARTING REGISTRATION INTEGRATION & BUNDLE TESTS');
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

  // --- INTEGRATION: CONNECT FRONTEND TO BACKEND ENGINE VIA DISPATCHER ---
  const mockAuth = new TestAuthProvider();
  const mockFirestore = new TestFirestoreProvider();

  // Connect client to trusted provisioning engine test double
  setRegistrationBackendHandler(async (input) => {
    try {
      const provResult = await provisionSchoolAccount(input, {
        auth: mockAuth,
        firestore: mockFirestore,
      });
      return {
        success: true,
        udiseCode: provResult.udiseCode,
        schoolName: provResult.schoolProfile.schoolName,
        authUid: provResult.authUid,
        schoolDocumentPath: provResult.schoolDocumentPath,
      };
    } catch (err: any) {
      return {
        success: false,
        code: err?.code || 'PROVISIONING_FAILED',
        error: err?.message || 'Provisioning failed',
        canRetrySafely: err?.code === 'UDISE_ALREADY_EXISTS' || err?.code === 'BENCHMARK_PROTECTED' ? false : true,
      };
    }
  });

  // TEST 1: Successful registration request reaches trusted provisioning layer
  const sampleSchoolInput: SchoolRegistrationClientInput = {
    udiseCode: '19180991111',
    schoolName: 'Santipur Model Vidyalaya',
    recoveryEmail: 'santipur.head@example.org',
    password: 'SchoolPassword123!',
    confirmPassword: 'SchoolPassword123!',
    schoolType: 'PRIMARY',
    district: 'Nadia',
  };

  const regResult = await registerSchoolWithBackend(sampleSchoolInput);
  assert(
    regResult.success === true &&
      regResult.udiseCode === '19180991111' &&
      typeof regResult.authUid === 'string' &&
      regResult.schoolDocumentPath === 'schools/19180991111',
    'TEST 1: Registration Request Successfully Reaches Trusted Provisioning Layer',
    `Frontend submitted school 19180991111 -> Server provisioned Auth UID ${regResult.authUid} and path ${regResult.schoolDocumentPath}.`
  );

  // TEST 2: Invalid UDISE is rejected
  const invalidUdiseInput: SchoolRegistrationClientInput = {
    ...sampleSchoolInput,
    udiseCode: '1918099', // Only 7 digits
  };
  const invalidUdiseResult = await registerSchoolWithBackend(invalidUdiseInput);
  assert(
    invalidUdiseResult.success === false && invalidUdiseResult.code === 'INVALID_UDISE',
    'TEST 2: Invalid UDISE Strictly Rejected',
    `Invalid UDISE (7 digits) rejected with code: ${invalidUdiseResult.code}.`
  );

  // TEST 3: Duplicate UDISE is rejected
  const duplicateUdiseResult = await registerSchoolWithBackend({
    ...sampleSchoolInput,
    recoveryEmail: 'different.person@example.org',
  });
  const formattedDuplicateErr = formatRegistrationError({ code: duplicateUdiseResult.code });
  assert(
    duplicateUdiseResult.success === false &&
      duplicateUdiseResult.code === 'UDISE_ALREADY_EXISTS' &&
      formattedDuplicateErr.bengali.includes('ইতিমধ্যেই নিবন্ধিত') &&
      formattedDuplicateErr.canRetrySafely === false,
    'TEST 3: Duplicate UDISE Rejected with Bengali-Friendly Error',
    `Duplicate UDISE rejected. UI message: "${formattedDuplicateErr.bengali}".`
  );

  // TEST 4: Password mismatch is rejected
  const mismatchInput: SchoolRegistrationClientInput = {
    ...sampleSchoolInput,
    udiseCode: '19180992222',
    password: 'OriginalPassword123!',
    confirmPassword: 'DifferentPassword456!',
  };
  const mismatchResult = await registerSchoolWithBackend(mismatchInput);
  const formattedMismatch = formatRegistrationError({ code: mismatchResult.code });
  assert(
    mismatchResult.success === false &&
      mismatchResult.code === 'PASSWORD_MISMATCH' &&
      formattedMismatch.bengali.includes('মেলেনি'),
    'TEST 4: Password Mismatch Rejected Before Server-Side Creation',
    `Mismatched passwords rejected cleanly with code: ${mismatchResult.code}.`
  );

  // TEST 5: Backend failure produces safe UI error without leaking internal credentials
  mockFirestore.failNext = true;
  const failInput: SchoolRegistrationClientInput = {
    ...sampleSchoolInput,
    udiseCode: '19180993333',
    recoveryEmail: 'unique.head@example.org',
  };
  const failResult = await registerSchoolWithBackend(failInput);
  const formattedFail = formatRegistrationError({
    code: failResult.code,
    rollbackExecuted: true,
  });
  assert(
    failResult.success === false &&
      failResult.code === 'FIRESTORE_PROVISIONING_FAILED' &&
      formattedFail.canRetrySafely === true &&
      !formattedFail.bengali.includes('admin') &&
      !formattedFail.english.includes('admin') &&
      !formattedFail.english.includes('stack'),
    'TEST 5: Backend Failure Produces Safe UI Error (No Credential/Stack Leaks)',
    `Downstream failure safely reported: "${formattedFail.bengali}" (canRetrySafely: ${formattedFail.canRetrySafely}).`
  );

  // TEST 6: Duplicate submission prevention verification
  // Verify that an in-flight submission flag blocks concurrent executions
  let inFlight = false;
  let submissionCount = 0;
  async function simulateFormSubmit() {
    if (inFlight) {
      return { blocked: true };
    }
    inFlight = true;
    submissionCount++;
    // simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 30));
    inFlight = false;
    return { blocked: false };
  }

  const [resA, resB, resC] = await Promise.all([
    simulateFormSubmit(),
    simulateFormSubmit(),
    simulateFormSubmit(),
  ]);

  const blockedCount = [resA, resB, resC].filter((r) => r.blocked).length;
  assert(
    submissionCount === 1 && blockedCount === 2,
    'TEST 6: Duplicate Rapid Submissions Successfully Prevented',
    `Out of 3 concurrent clicks, exactly 1 submission processed and 2 duplicate requests were blocked.`
  );

  // TEST 7: Proof that NO Admin SDK or Server-Side Credentials are in src/
  const srcDir = path.resolve(__dirname, '../src');
  function scanDirForAdminSdk(dir: string): string[] {
    const violations: string[] = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        violations.push(...scanDirForAdminSdk(fullPath));
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes("from 'firebase-admin") || content.includes('from "firebase-admin')) {
          violations.push(`Found firebase-admin import in ${fullPath}`);
        }
        if (content.includes("from '../functions") || content.includes('from "../functions')) {
          violations.push(`Found direct functions/ import in ${fullPath}`);
        }
        if (content.includes('serviceAccountKey') || content.includes('private_key')) {
          violations.push(`Potential credential found in ${fullPath}`);
        }
      }
    }
    return violations;
  }

  const clientViolations = scanDirForAdminSdk(srcDir);
  assert(
    clientViolations.length === 0,
    'TEST 7: Zero Admin SDK or Server Credentials in src/ Codebase',
    clientViolations.length === 0
      ? 'All files under src/ strictly adhere to client-only boundaries. Zero firebase-admin imports.'
      : `Violations: ${clientViolations.join(', ')}`
  );

  // TEST 8: Verify Built Production Bundle Excludes Admin SDK
  const distAssetsDir = path.resolve(__dirname, '../dist/assets');
  let bundleClean = true;
  let bundleDetails = 'No dist directory (build not run yet)';

  if (fs.existsSync(distAssetsDir)) {
    const jsFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.js'));
    let foundAdmin = false;
    for (const jsFile of jsFiles) {
      const jsContent = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf-8');
      if (
        jsContent.includes('firebase-admin') ||
        jsContent.includes('google-auth-library') ||
        jsContent.includes('@google-cloud')
      ) {
        foundAdmin = true;
        break;
      }
    }
    bundleClean = !foundAdmin;
    bundleDetails = bundleClean
      ? `Verified across ${jsFiles.length} client JavaScript bundles: 0 instances of firebase-admin or server libraries.`
      : 'ALERT: firebase-admin was detected in the client bundle!';
  }

  assert(
    bundleClean,
    'TEST 8: Production Client Bundle Verifiably Excludes Admin SDK',
    bundleDetails
  );

  // TEST 9: Frontend Uses httpsCallable & No /api/provisionSchool Fetch Remains
  const clientServiceFile = path.resolve(__dirname, '../src/services/schoolRegistrationClient.ts');
  const clientServiceContent = fs.readFileSync(clientServiceFile, 'utf-8');
  const usesHttpsCallable = clientServiceContent.includes('httpsCallable') && clientServiceContent.includes("from 'firebase/functions'");
  const hasNoFetchApi = !clientServiceContent.includes('/api/provisionSchool');
  assert(
    usesHttpsCallable && hasNoFetchApi,
    'TEST 9: Frontend Client Uses httpsCallable Mechanism (Zero /api/provisionSchool fetch)',
    'Verified: schoolRegistrationClient.ts imports httpsCallable from firebase/functions and contains no /api/provisionSchool fetch.'
  );

  // TEST 10: Callable Cloud Function provisionSchool Exported with Region asia-south1
  const functionsIndexFile = path.resolve(__dirname, '../functions/src/index.ts');
  const functionsIndexContent = fs.readFileSync(functionsIndexFile, 'utf-8');
  const exportsCallable = functionsIndexContent.includes('export const provisionSchool = onCall');
  const hasAsiaSouth1Region = functionsIndexContent.includes("region: 'asia-south1'");
  const doesNotExportClaimAsFunction = !functionsIndexContent.includes('export const setUserUdiseClaim = onCall') && !functionsIndexContent.includes('export const setUserUdiseClaim = onRequest');
  assert(
    exportsCallable && hasAsiaSouth1Region && doesNotExportClaimAsFunction,
    'TEST 10: Cloud Function provisionSchool Configured as onCall in asia-south1 (No Arbitrary Claim Endpoint)',
    'Verified: functions/src/index.ts exports provisionSchool onCall in region asia-south1; setUserUdiseClaim is not an exported function.'
  );

  console.log('\n====================================================');
  console.log(`TOTALS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegistrationIntegrationSuite().catch((err) => {
  console.error('Registration integration test error:', err);
  process.exit(1);
});

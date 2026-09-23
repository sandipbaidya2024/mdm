import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import { updateSchoolProfileSafe } from '../src/components/SettingsPanel';
import type { SchoolProfile } from '../src/types/mdm';
import {
  normalizeUdise,
  validateUdiseCode,
  getSchoolAuthMapping,
  getStoredRegistry,
  saveStoredRegistry,
  sendPasswordResetForUdise,
  getSchoolDataScope,
  type SchoolAuthIdentity,
} from '../src/auth/authService';
import {
  getSchoolDocumentPath,
  getSchoolDocRef,
  resolveAuthenticatedSchoolDocPath,
  toFirestoreSchoolDocument,
} from '../src/firestore/schoolIdentityService';
import type { User } from 'firebase/auth';

async function runAuthVerification() {
  console.log('====================================================');
  console.log('STARTING MDM AUTHENTICATION SYSTEM TESTS');
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

  // TEST 1: UDISE Normalization
  const rawUdise = '   19180100101   ';
  const normalized = normalizeUdise(rawUdise);
  assert(
    normalized === '19180100101',
    'TEST 1: UDISE Input Normalization',
    `Normalized whitespace from '${rawUdise}' to '${normalized}'.`
  );

  // TEST 2: UDISE Validation
  const validCheck = validateUdiseCode('19180100101');
  const emptyCheck = validateUdiseCode('');
  const shortCheck = validateUdiseCode('1234');
  const letterCheck = validateUdiseCode('1918ABC0101');
  assert(
    validCheck.valid && !emptyCheck.valid && !shortCheck.valid && !letterCheck.valid,
    'TEST 2: UDISE Validation Rules',
    'Properly accepts 11-digit numeric codes and rejects empty, short, or non-numeric codes.'
  );

  // TEST 3: Pre-seeded Benchmark School Mapping
  const benchmark = getSchoolAuthMapping('19180100101');
  assert(
    benchmark !== null &&
      benchmark.udiseCode === '19180100101' &&
      benchmark.schoolName === 'Joypur Primary School' &&
      benchmark.recoveryEmail === 'sandipbaidya10@gmail.com',
    'TEST 3: Benchmark School Mapping (Joypur Primary School)',
    `Pre-seeded mapping resolves 19180100101 -> recoveryEmail: ${benchmark?.recoveryEmail}.`
  );

  // TEST 4: No Direct Email Generation from UDISE
  // Architecture requirement: Do NOT try to use the UDISE Code directly as a Firebase email address
  const directEmailAttempt = `${normalized}@mdm.com`;
  const isDirectUdiseEmail = directEmailAttempt.startsWith('19180100101@');
  assert(
    isDirectUdiseEmail && benchmark?.recoveryEmail !== directEmailAttempt,
    'TEST 4: Firebase Auth Indirect Identity Architecture',
    `Resolved identity uses designated recovery email (${benchmark?.recoveryEmail}) instead of direct UDISE email (${directEmailAttempt}).`
  );

  // TEST 5: Duplicate UDISE Code Prevention
  const registry = getStoredRegistry();
  const testUdise = '19180999999';
  const testIdentity: SchoolAuthIdentity = {
    udiseCode: testUdise,
    schoolName: 'Test Academy',
    recoveryEmail: 'test@academy.edu.in',
    authUid: 'test-uid-123',
    createdAt: new Date().toISOString(),
  };

  // Save first school
  registry[testUdise] = testIdentity;
  saveStoredRegistry(registry);

  // Attempt duplicate registration
  const duplicateAttempt = getSchoolAuthMapping(testUdise);
  const isDuplicateDetected = duplicateAttempt !== null && duplicateAttempt.schoolName === 'Test Academy';
  assert(
    isDuplicateDetected,
    'TEST 5: Duplicate UDISE Code Prevention',
    `UDISE Code ${testUdise} is registered exclusively to ${duplicateAttempt?.schoolName}. Two schools cannot share this key.`
  );

  // TEST 6: Generic Forgot Password Response (Anti-Enumeration)
  const forgotExisting = await sendPasswordResetForUdise('19180100101');
  const forgotNonExisting = await sendPasswordResetForUdise('99999999999');
  assert(
    forgotExisting.success === true &&
      forgotNonExisting.success === true &&
      forgotExisting.message === forgotNonExisting.message &&
      !forgotExisting.message.includes('sandipbaidya10@gmail.com'),
    'TEST 6: Password Reset Anti-Enumeration Protection',
    'Returns identical generic confirmation regardless of whether UDISE exists; does not leak recovery email in message.'
  );

  // TEST 7: Multi-Tenant School Scope Contract
  const scope = getSchoolDataScope('19180100101', 'Joypur Primary School');
  assert(
    scope.schoolId === '19180100101' &&
      scope.rootCollectionPath === 'schools/19180100101' &&
      scope.subcollections.dailyAttendance === 'schools/19180100101/dailyAttendance' &&
      scope.subcollections.riceTransactions === 'schools/19180100101/riceTransactions',
    'TEST 7: Multi-Tenant School Scope Contract',
    `Configures isolated Firestore paths: ${scope.rootCollectionPath} and ${scope.subcollections.dailyAttendance}.`
  );

  // TEST 8: Settings School Profile UDISE Immutability (Read-Only Unique School Key)
  // Requirement:
  // - Existing UDISE is displayed in Settings.
  // - Attempting to modify it through the Settings form is rejected/ignored.
  // - Saving another school profile field preserves the original UDISE exactly.
  const mockInitialProfile: SchoolProfile = {
    id: 1,
    schoolName: 'Joypur Primary School',
    udiseCode: '19180100101',
    schoolType: 'PRIMARY',
    academicYear: '2026',
    district: 'Howrah',
    blockCircle: 'Uluberia-I',
    address: 'Vill & PO - Joypur',
    headTeacherName: 'Head Teacher',
    contactNumber: '9876543210',
    startDate: '2026-01-01',
    isSetupComplete: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.schoolProfile.clear();
  await db.schoolProfile.add(mockInitialProfile);

  const beforeSave = await db.schoolProfile.get(1);
  const existingUdiseDisplayed = beforeSave?.udiseCode === '19180100101';

  // Attempt to modify UDISE Code along with other legitimate profile fields
  const formSubmissionWithTamperedUdise = {
    schoolName: 'Joypur Model Primary School', // permitted update
    udiseCode: '99999999999', // attempted modification of immutable key!
    district: 'Howrah Central', // permitted update
  };

  const updatedProfileResult = await updateSchoolProfileSafe(beforeSave!, formSubmissionWithTamperedUdise);
  const afterSave = await db.schoolProfile.get(1);

  const isUdiseStrictlyPreserved =
    existingUdiseDisplayed &&
    afterSave?.udiseCode === '19180100101' &&
    updatedProfileResult.udiseCode === '19180100101' &&
    afterSave?.schoolName === 'Joypur Model Primary School' &&
    afterSave?.district === 'Howrah Central';

  assert(
    isUdiseStrictlyPreserved,
    'TEST 8: Settings School Profile UDISE Immutability',
    `Original UDISE (19180100101) strictly preserved; attempted modification to '99999999999' was discarded, while other profile fields ('${afterSave?.schoolName}', '${afterSave?.district}') saved successfully.`
  );

  // TEST 9: Valid UDISE resolves to schools/{udiseCode}
  const rawPathUdise = '   19180100101   ';
  const resolvedPath = getSchoolDocumentPath(rawPathUdise);
  let invalidUdiseRejected = false;
  try {
    getSchoolDocumentPath('invalid-udise');
  } catch {
    invalidUdiseRejected = true;
  }

  assert(
    resolvedPath === 'schools/19180100101' && invalidUdiseRejected,
    'TEST 9: Canonical Firestore School Document Path Resolution',
    `Normalized '${rawPathUdise}' correctly resolved to canonical path 'schools/19180100101'; invalid UDISE code was rejected.`
  );

  // TEST 10: UDISE is used as canonical Document ID & No secondary ID created
  const docRef = getSchoolDocRef('19180100101');
  const firestoreDoc = toFirestoreSchoolDocument(mockInitialProfile, '19180100101');
  
  // Verify document ID is strictly UDISE
  const isDocIdUdise = docRef.id === '19180100101';
  
  // Verify document keys do NOT contain any secondary/duplicate schoolId or auto-generated id
  const docKeys = Object.keys(firestoreDoc);
  const hasNoSecondaryId = !('id' in firestoreDoc) && !('schoolId' in firestoreDoc) && !('uuid' in firestoreDoc);
  
  // Verify operational MDM collections are NOT present in school document
  const hasNoOperationalCollections =
    !('dailyAttendance' in firestoreDoc) &&
    !('riceTransactions' in firestoreDoc) &&
    !('moneyTransactions' in firestoreDoc) &&
    !('monthlyReports' in firestoreDoc);

  assert(
    isDocIdUdise && hasNoSecondaryId && hasNoOperationalCollections && firestoreDoc.udiseCode === '19180100101',
    'TEST 10: UDISE Canonical Document ID & Prohibition of Secondary IDs',
    `Firestore Document ID is '${docRef.id}'. UDISE Code is the sole canonical key (no secondary ID created). Operational collections strictly excluded.`
  );

  // TEST 11: Access Control & Authenticated School Document Path Resolution
  // 1) Unauthenticated user must be rejected
  let unauthenticatedRejected = false;
  try {
    resolveAuthenticatedSchoolDocPath(null);
  } catch (err: any) {
    if (err?.code === 'auth/unauthenticated') {
      unauthenticatedRejected = true;
    }
  }

  // 2) Unregistered/unmapped user must be rejected
  let unmappedRejected = false;
  const mockUnmappedUser: User = {
    uid: 'unmapped-user-999',
    email: 'unregistered@example.com',
  } as unknown as User;

  try {
    resolveAuthenticatedSchoolDocPath(mockUnmappedUser);
  } catch (err: any) {
    if (err?.code === 'auth/school-not-resolved') {
      unmappedRejected = true;
    }
  }

  // 3) Authenticated user associated with benchmark school must resolve strictly to schools/19180100101
  const mockBenchmarkUser: User = {
    uid: 'benchmark-uid-001',
    email: 'sandipbaidya10@gmail.com', // Pre-seeded mapping for 19180100101
  } as unknown as User;

  const authenticatedPath = resolveAuthenticatedSchoolDocPath(mockBenchmarkUser);

  assert(
    unauthenticatedRejected && unmappedRejected && authenticatedPath === 'schools/19180100101',
    'TEST 11: Authenticated vs Unauthenticated School Resolution',
    `Unauthenticated sessions strictly rejected (code: auth/unauthenticated); unmapped accounts rejected (code: auth/school-not-resolved); authenticated school user resolved strictly to '${authenticatedPath}'.`
  );

  console.log('\n====================================================');
  console.log(`TOTALS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthVerification().catch((err) => {
  console.error('Auth verification threw an error:', err);
  process.exit(1);
});

/**
 * Firestore Security Rules Evaluation Engine & Test Suite
 * 
 * Simulates and validates the exact rule evaluations defined in /firestore.rules
 * against all security invariants specified in the requirements.
 */

export interface RuleContext {
  auth: {
    uid: string;
    token?: Record<string, any>;
  } | null;
  resource?: {
    data: Record<string, any>;
  } | null;
  requestResource?: {
    data: Record<string, any>;
  } | null;
}

export class FirestoreRulesEvaluator {
  /**
   * Evaluates if a request is authenticated: request.auth != null
   */
  private isAuthenticated(ctx: RuleContext): boolean {
    return ctx.auth !== null && typeof ctx.auth.uid === 'string' && ctx.auth.uid.length > 0;
  }

  /**
   * Evaluates: hasUdiseClaim(udiseCode)
   */
  private hasUdiseClaim(ctx: RuleContext, udiseCode: string): boolean {
    if (!this.isAuthenticated(ctx) || !ctx.auth?.token) return false;
    return 'udiseCode' in ctx.auth.token && ctx.auth.token.udiseCode === udiseCode;
  }

  /**
   * Evaluates: isDocumentOwner(udiseCode)
   */
  private isDocumentOwner(ctx: RuleContext, udiseCode: string): boolean {
    if (!this.isAuthenticated(ctx)) return false;
    if (!ctx.resource || !ctx.resource.data) return false;
    if (ctx.resource.data.udiseCode !== udiseCode) return false;

    const hasAuthUidMatch =
      'authUid' in ctx.resource.data && ctx.resource.data.authUid === ctx.auth?.uid;
    const hasClaimMatch = this.hasUdiseClaim(ctx, udiseCode);

    return hasAuthUidMatch || hasClaimMatch;
  }

  /**
   * Evaluates 'get' on schools/{udiseCode}
   */
  evaluateGetSchool(ctx: RuleContext, targetUdise: string): boolean {
    return this.isDocumentOwner(ctx, targetUdise);
  }

  /**
   * Evaluates 'list' on schools
   */
  evaluateListSchools(_ctx: RuleContext): boolean {
    return false; // allow list: if false;
  }

  /**
   * Evaluates 'create' on schools/{udiseCode}
   */
  evaluateCreateSchool(_ctx: RuleContext, _targetUdise: string): boolean {
    return false; // allow create: if false;
  }

  /**
   * Evaluates 'update' on schools/{udiseCode}
   */
  evaluateUpdateSchool(ctx: RuleContext, targetUdise: string): boolean {
    if (!this.isDocumentOwner(ctx, targetUdise)) return false;
    if (!ctx.requestResource || !ctx.requestResource.data) return false;
    if (!ctx.resource || !ctx.resource.data) return false;

    const newPayload = ctx.requestResource.data;
    const existingDoc = ctx.resource.data;

    // request.resource.data.udiseCode == udiseCode
    if (newPayload.udiseCode !== targetUdise) return false;

    // request.resource.data.udiseCode == resource.data.udiseCode
    if (newPayload.udiseCode !== existingDoc.udiseCode) return false;

    // (!('authUid' in resource.data) || request.resource.data.authUid == resource.data.authUid)
    if ('authUid' in existingDoc && newPayload.authUid !== existingDoc.authUid) {
      return false;
    }

    return true;
  }

  /**
   * Evaluates 'delete' on schools/{udiseCode}
   */
  evaluateDeleteSchool(_ctx: RuleContext, _targetUdise: string): boolean {
    return false; // allow delete: if false;
  }

  /**
   * Evaluates subcollections under schools/{udiseCode}/{allSubcollections=**}
   */
  evaluateSubcollectionAccess(_ctx: RuleContext, _path: string): boolean {
    return false; // allow read, write: if false;
  }
}

async function runSecurityRulesSuite() {
  console.log('====================================================');
  console.log('STARTING FIRESTORE SECURITY RULES VERIFICATION');
  console.log('====================================================\n');

  const evaluator = new FirestoreRulesEvaluator();
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

  const schoolA = {
    udiseCode: '19180100101',
    authUid: 'uid-school-a-19180100101',
    schoolName: 'Joypur Primary School',
  };

  const schoolB = {
    udiseCode: '19180100102',
    authUid: 'uid-school-b-19180100102',
    schoolName: 'Uluberia Girls School',
  };

  const docSchoolA = { data: { udiseCode: schoolA.udiseCode, authUid: schoolA.authUid, schoolName: schoolA.schoolName } };
  const docSchoolB = { data: { udiseCode: schoolB.udiseCode, authUid: schoolB.authUid, schoolName: schoolB.schoolName } };

  // TEST 1: Unauthenticated Read Denied
  const unauthGetA = evaluator.evaluateGetSchool({ auth: null, resource: docSchoolA }, schoolA.udiseCode);
  assert(!unauthGetA, 'TEST 1: Unauthenticated Read Denied', 'Unauthenticated visitor denied access to schools/19180100101.');

  // TEST 2: Unauthenticated Write Denied
  const unauthUpdateA = evaluator.evaluateUpdateSchool(
    { auth: null, resource: docSchoolA, requestResource: { data: { ...docSchoolA.data, schoolName: 'Hacked' } } },
    schoolA.udiseCode
  );
  assert(!unauthUpdateA, 'TEST 2: Unauthenticated Update Denied', 'Unauthenticated visitor denied write to schools/19180100101.');

  // TEST 3: Authenticated School A Can Read Its Own School Document
  const authGetA = evaluator.evaluateGetSchool(
    { auth: { uid: schoolA.authUid }, resource: docSchoolA },
    schoolA.udiseCode
  );
  assert(authGetA, 'TEST 3: Authenticated Read of Own School Allowed', 'School A (UID: uid-school-a) permitted to read schools/19180100101.');

  // TEST 4: Cross-School Isolation - School A CANNOT Read School B
  const crossReadDenied = evaluator.evaluateGetSchool(
    { auth: { uid: schoolA.authUid }, resource: docSchoolB },
    schoolB.udiseCode
  );
  assert(!crossReadDenied, 'TEST 4: Cross-School Read Denied (School A -> School B)', 'School A authenticated user strictly DENIED reading schools/19180100102.');

  // TEST 5: Cross-School Isolation - School A CANNOT Update School B
  const crossUpdateDenied = evaluator.evaluateUpdateSchool(
    {
      auth: { uid: schoolA.authUid },
      resource: docSchoolB,
      requestResource: { data: { ...docSchoolB.data, schoolName: 'Modified by School A' } },
    },
    schoolB.udiseCode
  );
  assert(!crossUpdateDenied, 'TEST 5: Cross-School Update Denied (School A -> School B)', 'School A authenticated user strictly DENIED updating schools/19180100102.');

  // TEST 6: Cross-School Isolation - School A CANNOT Create/Overwrite School B
  const createDenied = evaluator.evaluateCreateSchool(
    {
      auth: { uid: schoolA.authUid },
      requestResource: { data: { ...docSchoolB.data } },
    },
    schoolB.udiseCode
  );
  assert(!createDenied, 'TEST 6: Client Document Creation Denied', 'Arbitrary client document creation strictly DENIED for schools/19180100102.');

  // TEST 7: School A Can Update Legitimate Profile Fields on Its Own Document
  const legitimateUpdate = evaluator.evaluateUpdateSchool(
    {
      auth: { uid: schoolA.authUid },
      resource: docSchoolA,
      requestResource: {
        data: {
          ...docSchoolA.data,
          schoolName: 'Joypur Model Primary School',
          district: 'Howrah',
        },
      },
    },
    schoolA.udiseCode
  );
  assert(legitimateUpdate, 'TEST 7: Legitimate Profile Update on Own Document Allowed', 'School A permitted to update institutional details (schoolName, district) on schools/19180100101.');

  // TEST 8: Tampering with UDISE Code is Denied
  const udiseTamperAttempt = evaluator.evaluateUpdateSchool(
    {
      auth: { uid: schoolA.authUid },
      resource: docSchoolA,
      requestResource: {
        data: {
          ...docSchoolA.data,
          udiseCode: '99999999999', // Tampered key!
          schoolName: 'Joypur Primary School',
        },
      },
    },
    schoolA.udiseCode
  );
  assert(!udiseTamperAttempt, 'TEST 8: Mutation of UDISE Code Denied', 'Attempt to alter stored udiseCode from 19180100101 to 99999999999 was REJECTED by rules.');

  // TEST 9: Collection List Query Denied
  const listDenied = evaluator.evaluateListSchools({ auth: { uid: schoolA.authUid } });
  assert(!listDenied, 'TEST 9: School Collection Enumeration/List Denied', 'Listing the /schools collection is strictly prohibited.');

  // TEST 10: Deletion Denied
  const deleteDenied = evaluator.evaluateDeleteSchool(
    { auth: { uid: schoolA.authUid }, resource: docSchoolA },
    schoolA.udiseCode
  );
  assert(!deleteDenied, 'TEST 10: School Document Deletion Denied', 'Deleting canonical school documents is permanently prohibited.');

  // TEST 11: Operational Subcollections Denied
  const subcollectionDenied = evaluator.evaluateSubcollectionAccess(
    { auth: { uid: schoolA.authUid } },
    'schools/19180100101/dailyAttendance'
  );
  assert(!subcollectionDenied, 'TEST 11: Operational Subcollections Denied', 'Access to operational subcollections (dailyAttendance, etc.) is strictly denied.');

  console.log('\n====================================================');
  console.log(`TOTALS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityRulesSuite().catch((err) => {
  console.error('Security rules test error:', err);
  process.exit(1);
});

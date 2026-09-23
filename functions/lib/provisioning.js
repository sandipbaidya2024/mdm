"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveAdminFirestoreProvider = exports.LiveAdminAuthProvider = exports.BENCHMARK_RECOVERY_EMAIL = exports.BENCHMARK_UDISE = void 0;
exports.validateRegistrationRequest = validateRegistrationRequest;
exports.provisionSchoolAccount = provisionSchoolAccount;
const claims_1 = require("./claims");
const adminApp_1 = require("./adminApp");
/**
 * Benchmark school identity constants for protection.
 * These records must never be overwritten or tampered with.
 */
exports.BENCHMARK_UDISE = '19180100101';
exports.BENCHMARK_RECOVERY_EMAIL = 'sandipbaidya10@gmail.com';
/**
 * Live Admin SDK Auth Adapter
 */
class LiveAdminAuthProvider {
    auth = (0, adminApp_1.getAdminAuth)();
    async createUser(properties) {
        const user = await this.auth.createUser(properties);
        return { uid: user.uid, email: user.email };
    }
    async getUserByEmail(email) {
        return this.auth.getUserByEmail(email);
    }
    async deleteUser(uid) {
        return this.auth.deleteUser(uid);
    }
    async setCustomUserClaims(uid, claims) {
        return this.auth.setCustomUserClaims(uid, claims);
    }
    async getUser(uid) {
        const u = await this.auth.getUser(uid);
        return { customClaims: u.customClaims };
    }
}
exports.LiveAdminAuthProvider = LiveAdminAuthProvider;
/**
 * Live Admin SDK Firestore Adapter
 */
class LiveAdminFirestoreProvider {
    firestore = (0, adminApp_1.getAdminFirestore)();
    async getSchool(udiseCode) {
        const snap = await this.firestore.collection('schools').doc(udiseCode).get();
        return { exists: snap.exists, data: snap.data() };
    }
    async setSchool(udiseCode, data) {
        await this.firestore.collection('schools').doc(udiseCode).set(data);
    }
    async deleteSchool(udiseCode) {
        await this.firestore.collection('schools').doc(udiseCode).delete();
    }
}
exports.LiveAdminFirestoreProvider = LiveAdminFirestoreProvider;
/**
 * Server-side validation of registration request fields.
 * Guarantees that unverified or malformed client data is rejected before processing.
 */
function validateRegistrationRequest(request) {
    if (!request) {
        return { valid: false, normalizedUdise: '', error: 'Registration payload is missing.', code: 'INVALID_PAYLOAD' };
    }
    // 1. Validate UDISE Code
    const normalizedUdise = (0, claims_1.normalizeServerUdise)(request.udiseCode);
    const udiseCheck = (0, claims_1.validateServerUdiseCode)(normalizedUdise);
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
async function provisionSchoolAccount(request, providers) {
    // Step 1: Server-side validation
    const validation = validateRegistrationRequest(request);
    if (!validation.valid) {
        const error = new Error(validation.error);
        error.code = validation.code;
        throw error;
    }
    const normalizedUdise = validation.normalizedUdise;
    const normalizedEmail = request.recoveryEmail.trim().toLowerCase();
    // Step 2: Protect Benchmark Account
    if (normalizedUdise === exports.BENCHMARK_UDISE || normalizedEmail === exports.BENCHMARK_RECOVERY_EMAIL) {
        const error = new Error(`Conflict: The benchmark school account (${exports.BENCHMARK_UDISE} / ${exports.BENCHMARK_RECOVERY_EMAIL}) is protected and cannot be overwritten.`);
        error.code = 'BENCHMARK_PROTECTED';
        throw error;
    }
    const auth = providers?.auth || new LiveAdminAuthProvider();
    const firestore = providers?.firestore || new LiveAdminFirestoreProvider();
    // Step 3: Check UDISE uniqueness in Firestore BEFORE creating any Auth user
    const existingSchoolDoc = await firestore.getSchool(normalizedUdise);
    if (existingSchoolDoc.exists) {
        const error = new Error(`School with UDISE Code ${normalizedUdise} is already registered. Duplicate registration is denied.`);
        error.code = 'UDISE_ALREADY_EXISTS';
        throw error;
    }
    // Step 4: Check if email is already in use in Auth (if provider supports lookup)
    if (auth.getUserByEmail) {
        try {
            const existingUser = await auth.getUserByEmail(normalizedEmail);
            if (existingUser) {
                const error = new Error(`The recovery email ${normalizedEmail} is already registered to an existing account.`);
                error.code = 'EMAIL_ALREADY_IN_USE';
                throw error;
            }
        }
        catch (lookupErr) {
            // 'auth/user-not-found' is the expected normal case; rethrow other genuine errors
            if (lookupErr?.code !== 'auth/user-not-found' && lookupErr?.code !== 'USER_NOT_FOUND') {
                if (lookupErr?.code === 'EMAIL_ALREADY_IN_USE')
                    throw lookupErr;
            }
        }
    }
    // Step 5: Create Firebase Authentication user
    let createdUid;
    try {
        const userRecord = await auth.createUser({
            email: normalizedEmail,
            password: request.password,
            displayName: request.schoolName.trim(),
        });
        createdUid = userRecord.uid;
    }
    catch (authCreateErr) {
        const error = new Error(`Failed to create authentication user: ${authCreateErr?.message || authCreateErr}`);
        error.code = authCreateErr?.code || 'AUTH_CREATION_FAILED';
        throw error;
    }
    // Step 6: Assign trusted custom claim: { udiseCode: "<validated UDISE>" }
    try {
        await (0, claims_1.setUserUdiseClaim)(createdUid, normalizedUdise, auth);
    }
    catch (claimErr) {
        // Rollback Auth user to avoid orphaned user without claim
        let rollbackSuccess = false;
        try {
            await auth.deleteUser(createdUid);
            rollbackSuccess = true;
        }
        catch (rbErr) {
            console.error(`[CRITICAL] Failed to rollback orphaned Auth user ${createdUid}:`, rbErr);
        }
        const failureErr = new Error(`Provisioning failed during custom claim assignment: ${claimErr?.message || claimErr}. ${rollbackSuccess ? 'Rollback completed (Auth user deleted).' : 'Rollback failed.'}`);
        failureErr.code = 'CLAIM_ASSIGNMENT_FAILED';
        failureErr.orphanedAuthUid = createdUid;
        failureErr.rollbackExecuted = true;
        failureErr.rollbackSuccessful = rollbackSuccess;
        throw failureErr;
    }
    // Step 7: Provision canonical school document at schools/{udiseCode}
    const now = new Date().toISOString();
    const schoolDocumentData = {
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
    }
    catch (firestoreErr) {
        // Rollback Auth user to avoid orphaned user without school document
        let rollbackSuccess = false;
        try {
            await auth.deleteUser(createdUid);
            rollbackSuccess = true;
        }
        catch (rbErr) {
            console.error(`[CRITICAL] Failed to rollback orphaned Auth user ${createdUid}:`, rbErr);
        }
        const failureErr = new Error(`Provisioning failed during school document creation: ${firestoreErr?.message || firestoreErr}. ${rollbackSuccess ? 'Rollback completed (Auth user deleted).' : 'Rollback failed.'}`);
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
//# sourceMappingURL=provisioning.js.map
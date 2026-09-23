"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionSchool = exports.provisionSchoolAccount = exports.validateRegistrationRequest = exports.BENCHMARK_RECOVERY_EMAIL = exports.BENCHMARK_UDISE = exports.getUserUdiseClaim = exports.setUserUdiseClaim = exports.buildUdiseClaim = exports.validateServerUdiseCode = exports.normalizeServerUdise = exports.getAdminFirestore = exports.getAdminAuth = exports.getAdminApp = void 0;
const https_1 = require("firebase-functions/v2/https");
const provisioning_1 = require("./provisioning");
// Export internal trusted modules for test harnesses and server scripts
var adminApp_1 = require("./adminApp");
Object.defineProperty(exports, "getAdminApp", { enumerable: true, get: function () { return adminApp_1.getAdminApp; } });
Object.defineProperty(exports, "getAdminAuth", { enumerable: true, get: function () { return adminApp_1.getAdminAuth; } });
Object.defineProperty(exports, "getAdminFirestore", { enumerable: true, get: function () { return adminApp_1.getAdminFirestore; } });
var claims_1 = require("./claims");
Object.defineProperty(exports, "normalizeServerUdise", { enumerable: true, get: function () { return claims_1.normalizeServerUdise; } });
Object.defineProperty(exports, "validateServerUdiseCode", { enumerable: true, get: function () { return claims_1.validateServerUdiseCode; } });
Object.defineProperty(exports, "buildUdiseClaim", { enumerable: true, get: function () { return claims_1.buildUdiseClaim; } });
Object.defineProperty(exports, "setUserUdiseClaim", { enumerable: true, get: function () { return claims_1.setUserUdiseClaim; } });
Object.defineProperty(exports, "getUserUdiseClaim", { enumerable: true, get: function () { return claims_1.getUserUdiseClaim; } });
var provisioning_2 = require("./provisioning");
Object.defineProperty(exports, "BENCHMARK_UDISE", { enumerable: true, get: function () { return provisioning_2.BENCHMARK_UDISE; } });
Object.defineProperty(exports, "BENCHMARK_RECOVERY_EMAIL", { enumerable: true, get: function () { return provisioning_2.BENCHMARK_RECOVERY_EMAIL; } });
Object.defineProperty(exports, "validateRegistrationRequest", { enumerable: true, get: function () { return provisioning_2.validateRegistrationRequest; } });
Object.defineProperty(exports, "provisionSchoolAccount", { enumerable: true, get: function () { return provisioning_2.provisionSchoolAccount; } });
/**
 * Authoritative, secure school registration Cloud Function.
 * Region: asia-south1 (colocated with Firestore).
 * Callable mechanism: onCall.
 */
exports.provisionSchool = (0, https_1.onCall)({
    region: 'asia-south1',
    cors: false,
}, async (request) => {
    const data = request.data;
    if (!data || typeof data !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'Missing registration payload.', {
            code: 'MISSING_PAYLOAD',
        });
    }
    // Authoritative server-side validation check
    const validation = (0, provisioning_1.validateRegistrationRequest)(data);
    if (!validation.valid) {
        throw new https_1.HttpsError('invalid-argument', validation.error || 'Invalid registration request.', {
            code: validation.code || 'INVALID_INPUT',
        });
    }
    try {
        const result = await (0, provisioning_1.provisionSchoolAccount)(data);
        // Return ONLY sanitized public metadata.
        // NEVER return passwords, internal UIDs, Admin credentials, stack traces, or secrets.
        return {
            success: true,
            udiseCode: result.udiseCode,
            schoolName: result.schoolProfile.schoolName,
            schoolDocumentPath: result.schoolDocumentPath,
            message: 'School registration provisioned successfully.',
        };
    }
    catch (err) {
        const code = err?.code || 'SERVER_ERROR';
        const message = err?.message || 'Server error occurred during provisioning.';
        if (code === 'UDISE_ALREADY_EXISTS') {
            throw new https_1.HttpsError('already-exists', message, { code: 'UDISE_ALREADY_EXISTS' });
        }
        if (code === 'BENCHMARK_PROTECTED') {
            throw new https_1.HttpsError('permission-denied', message, { code: 'BENCHMARK_PROTECTED' });
        }
        if (code === 'INVALID_UDISE' ||
            code === 'PASSWORD_MISMATCH' ||
            code === 'INVALID_RECOVERY_EMAIL' ||
            code === 'MISSING_SCHOOL_NAME') {
            throw new https_1.HttpsError('invalid-argument', message, { code });
        }
        // Safe fallback internal error
        throw new https_1.HttpsError('internal', 'Server error occurred during school provisioning.', {
            code: 'PROVISIONING_FAILED',
        });
    }
});
//# sourceMappingURL=index.js.map
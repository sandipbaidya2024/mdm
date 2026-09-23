/**
 * Firebase Cloud Functions Backend Entry Point
 * 
 * SECURITY NOTICE:
 * - This entry point provides trusted server-side functionality for MDM Cloud.
 * - In accordance with security specifications, no public HTTP or callable endpoint
 *   is exposed that allows arbitrary clients to set claims or provision schools directly.
 */

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

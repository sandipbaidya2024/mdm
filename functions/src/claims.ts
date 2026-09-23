import { getAdminAuth } from './adminApp';

/**
 * Canonical Typed UDISE Claim Interface.
 *
 * This payload is embedded in the user's Firebase Auth ID token and
 * evaluated by Firestore Security Rules as: `request.auth.token.udiseCode`.
 */
export interface UdiseAuthClaim {
  udiseCode: string;
}

/**
 * Normalizes a raw UDISE code string by trimming surrounding whitespace.
 */
export function normalizeServerUdise(rawUdise: string): string {
  if (!rawUdise || typeof rawUdise !== 'string') return '';
  return rawUdise.trim();
}

/**
 * Validates that a UDISE code strictly satisfies canonical school identity rules:
 * - Exactly 11 characters long
 * - Purely numeric digits (0-9)
 */
export function validateServerUdiseCode(udiseCode: string): { valid: boolean; error?: string } {
  const normalized = normalizeServerUdise(udiseCode);
  if (!normalized) {
    return { valid: false, error: 'UDISE Code is required.' };
  }
  if (!/^\d{11}$/.test(normalized)) {
    return {
      valid: false,
      error: `UDISE Code must be exactly 11 digits (found ${normalized.length} characters: "${normalized}").`,
    };
  }
  return { valid: true };
}

/**
 * Pure builder function: creates and validates a typed UdiseAuthClaim payload.
 * Throws a descriptive error if the UDISE code is invalid.
 */
export function buildUdiseClaim(udiseCode: string): UdiseAuthClaim {
  const normalized = normalizeServerUdise(udiseCode);
  const validation = validateServerUdiseCode(normalized);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid UDISE Code for authentication claim.');
  }
  return {
    udiseCode: normalized,
  };
}

/**
 * Minimal interface for Firebase Admin Auth operations required for claims management.
 * Facilitates dependency injection for offline testing without hitting production servers.
 */
export interface AdminAuthClaimProvider {
  setCustomUserClaims(uid: string, customUserClaims: object | null): Promise<void>;
  getUser(uid: string): Promise<{ customClaims?: Record<string, any> }>;
}

/**
 * Trusted server-side helper responsible for setting the canonical UDISE claim:
 * `request.auth.token.udiseCode`
 *
 * SECURITY INVARIANTS:
 * - This function is strictly server-side and MUST NOT be exposed as an unauthenticated
 *   or arbitrary client-callable HTTP endpoint.
 * - Enforces that `udiseCode` is an exact 11-digit numeric identifier before applying claims.
 * - Supports dependency injection of `authProvider` for safe automated verification.
 *
 * @param uid - The Firebase Authentication UID of the target user.
 * @param udiseCode - The canonical 11-digit UDISE Code of the school.
 * @param authProvider - Optional AdminAuthClaimProvider (defaults to live Admin Auth).
 */
export async function setUserUdiseClaim(
  uid: string,
  udiseCode: string,
  authProvider?: AdminAuthClaimProvider
): Promise<{ success: boolean; uid: string; claims: UdiseAuthClaim }> {
  if (!uid || typeof uid !== 'string' || uid.trim().length === 0) {
    throw new Error('A valid, non-empty Firebase Auth UID is required to set custom claims.');
  }

  const claim = buildUdiseClaim(udiseCode);
  const auth = authProvider || getAdminAuth();

  await auth.setCustomUserClaims(uid.trim(), claim);

  return {
    success: true,
    uid: uid.trim(),
    claims: claim,
  };
}

/**
 * Server-side helper to read and verify the existing UDISE claim on a Firebase Auth user.
 *
 * @param uid - Firebase Auth UID
 * @param authProvider - Optional AdminAuthClaimProvider
 * @returns string | null - The UDISE Code if present and valid, null otherwise.
 */
export async function getUserUdiseClaim(
  uid: string,
  authProvider?: AdminAuthClaimProvider
): Promise<string | null> {
  if (!uid || typeof uid !== 'string') return null;

  const auth = authProvider || getAdminAuth();
  try {
    const userRecord = await auth.getUser(uid);
    const claims = userRecord.customClaims as UdiseAuthClaim | undefined;
    if (claims && typeof claims.udiseCode === 'string' && /^\d{11}$/.test(claims.udiseCode)) {
      return claims.udiseCode;
    }
    return null;
  } catch {
    return null;
  }
}

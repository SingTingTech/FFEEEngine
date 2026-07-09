/**
 * Decode and inspect JWT tokens client-side.
 *
 * The backend's JwtAuthenticationFilter catches JwtException (incl.
 * ExpiredJwtException) and just clears the security context — it does
 * NOT write a 401. The request then reaches an authenticated endpoint
 * and Spring returns 403. So the frontend can't rely on a 401 status
 * alone to detect an expired token; it needs to read the `exp` claim
 * itself.
 *
 * Tokens are signed, so we can't verify them here without sharing the
 * secret. Reading the unverified payload is fine for detecting
 * expiration — false-positive expiry only means we ask the server for
 * a fresh token, and the server is the source of truth anyway.
 */

interface JwtPayload {
  exp?: number;   // seconds since epoch
  iat?: number;
  [k: string]: unknown;
}

/**
 * Decode the payload of a JWT without verifying the signature.
 * Returns null if the token is malformed.
 */
export function decodeJwt(token: string | null | undefined): JwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64)) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * True if the token's `exp` claim is at/before now (+ optional skew).
 * If the token doesn't have an `exp` (or can't be decoded), returns
 * false — we can't prove it's expired, so assume it's not.
 *
 * Called from the axios request interceptor before each call. There's
 * no proactive timer: the token string itself doesn't change once
 * issued, and a user who never makes requests can't act on stale
 * credentials anyway — the server will reject the next request the
 * moment they do.
 */
export function isTokenExpired(
  token: string | null | undefined,
  skewSeconds = 5,
): boolean {
  const decoded = decodeJwt(token);
  if (!decoded || typeof decoded.exp !== 'number') return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return decoded.exp <= nowSec + skewSeconds;
}

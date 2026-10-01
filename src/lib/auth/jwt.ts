/**
 * lib/auth/jwt.ts
 *
 * Minimal, dependency-free helpers for reading the `exp` claim of the
 * backend-issued JWT. The signature is NOT verified here — that is the
 * backend's job. We only need the expiry to drive the session timeout UI.
 */

interface JwtPayload {
  exp?: number;
  [claim: string]: unknown;
}

function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    // atob returns a binary string; decode it as UTF-8 for non-ASCII claims
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded, 'base64').toString('utf-8');
}

/** Decode the JWT payload, or return null if the token is malformed. */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return payload && typeof payload === 'object' ? (payload as JwtPayload) : null;
  } catch {
    return null;
  }
}

/**
 * Return the token expiry as a millisecond timestamp, or null when the
 * token has no usable `exp` claim (treated as "expiry unknown").
 */
export function getTokenExpiry(token: string): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
}

/** True when the expiry is known and already in the past. */
export function isExpired(expiresAt: number | null, now: number = Date.now()): boolean {
  return expiresAt !== null && expiresAt <= now;
}

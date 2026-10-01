/**
 * lib/auth/session.ts
 *
 * Session-expiry handling shared by the axios 401 interceptor and the
 * session timeout modal. Ensures that however many requests fail at once,
 * the user is logged out and redirected to login exactly once, with a
 * callbackUrl pointing back to the page they were on.
 */

import { useAuthStore } from '@/lib/hooks/use-auth-store';

export const LOGIN_PATH = '/auth/login';
export const DEFAULT_CALLBACK_URL = '/dashboard/shipments';

export type SessionEndReason = 'expired';

let redirecting = false;

/**
 * Accept only same-origin relative paths as a post-login destination.
 * Rejects absolute URLs, protocol-relative (`//evil.com`) and backslash
 * tricks (`/\evil.com`) to prevent open redirects, and never bounces the
 * user back to the login page itself.
 */
export function sanitizeCallbackUrl(
  raw: string | null | undefined,
  fallback: string = DEFAULT_CALLBACK_URL,
): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (raw === LOGIN_PATH || raw.startsWith(`${LOGIN_PATH}?`) || raw.startsWith(`${LOGIN_PATH}/`)) {
    return fallback;
  }
  return raw;
}

/** The current page (path + query) — what we want to return to after re-login. */
export function currentLocationAsCallback(): string {
  if (typeof window === 'undefined') return DEFAULT_CALLBACK_URL;
  const { pathname, search, hash } = window.location;
  return sanitizeCallbackUrl(`${pathname}${search}${hash}`);
}

export function buildLoginUrl(callbackUrl: string, reason?: SessionEndReason): string {
  const params = new URLSearchParams({ callbackUrl: sanitizeCallbackUrl(callbackUrl) });
  if (reason) params.set('reason', reason);
  return `${LOGIN_PATH}?${params.toString()}`;
}

/**
 * Clear auth state and send the user to login with a callbackUrl.
 * Idempotent: concurrent callers (e.g. several parallel 401s) trigger a
 * single redirect. Unsaved create-shipment drafts live under their own
 * localStorage key and are intentionally left untouched.
 */
export function endSession(reason: SessionEndReason = 'expired'): void {
  if (typeof window === 'undefined' || redirecting) return;
  redirecting = true;

  const callbackUrl = currentLocationAsCallback();
  useAuthStore.getState().logout();

  // Already on the login page — nothing to redirect to.
  if (window.location.pathname.startsWith(LOGIN_PATH)) {
    redirecting = false;
    return;
  }

  window.location.assign(buildLoginUrl(callbackUrl, reason));
}

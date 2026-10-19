/**
 * lib/auth/storage-keys.ts
 *
 * Single source of truth for the browser storage keys (localStorage + the
 * auth cookie) used by the app, plus a one-time migration away from the
 * old misspelled `chainsetttle_*` keys.
 *
 * Kept dependency-free so it can be imported from the Edge middleware and
 * from the auth store without creating an import cycle. It is re-exported
 * from `lib/auth/session.ts`.
 */

import { getTokenExpiry } from '@/lib/auth/jwt';

export const STORAGE_PREFIX = 'chainsettle_';

/** Old, misspelled prefix. Only referenced by the migration below. */
export const LEGACY_STORAGE_PREFIX = 'chainsetttle_';

export const TOKEN_KEY = `${STORAGE_PREFIX}token`;
export const ADDRESS_KEY = `${STORAGE_PREFIX}address`;
export const TEMPLATES_STORE_KEY = `${STORAGE_PREFIX}shipment_templates`;
export const LEGACY_TOKEN_COOKIE = `${LEGACY_STORAGE_PREFIX}token`;

export const displayNameKey = (address: string) => `${STORAGE_PREFIX}display_name_${address}`;
export const notificationPreferencesKey = (address: string) =>
  `${STORAGE_PREFIX}notification_preferences_${address}`;
export const shipmentDraftKey = (address: string) => `${STORAGE_PREFIX}shipment_draft_${address}`;

const DEFAULT_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function readCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/**
 * Move any `chainsetttle_*` localStorage entries and the legacy auth cookie
 * to their `chainsettle_*` names so existing users stay logged in and keep
 * their drafts, templates and preferences. Safe to call on every load:
 * once nothing legacy is left it is a no-op. A value already present under
 * the new key wins over the legacy one.
 */
export function migrateLegacyStorageKeys(): void {
  if (typeof window === 'undefined') return;

  try {
    const legacyKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LEGACY_STORAGE_PREFIX)) legacyKeys.push(key);
    }

    for (const legacyKey of legacyKeys) {
      const newKey = STORAGE_PREFIX + legacyKey.slice(LEGACY_STORAGE_PREFIX.length);
      const value = localStorage.getItem(legacyKey);
      if (value !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, value);
      }
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data) — skip.
  }

  const legacyCookie = readCookie(LEGACY_TOKEN_COOKIE);
  if (legacyCookie !== null) {
    if (readCookie(TOKEN_KEY) === null && legacyCookie) {
      const expiresAt = getTokenExpiry(legacyCookie);
      const maxAge = expiresAt !== null
        ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
        : DEFAULT_COOKIE_MAX_AGE;
      document.cookie = `${TOKEN_KEY}=${legacyCookie}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    document.cookie = `${LEGACY_TOKEN_COOKIE}=; path=/; max-age=0`;
  }
}

/**
 * lib/hooks/use-auth-store.ts
 *
 * Global Zustand store for authentication state.
 * Manages the connected Stellar address, JWT token, and user profile.
 * `expiresAt` is decoded from the JWT `exp` claim and drives the session
 * timeout warning (see components/auth/SessionTimeoutModal).
 */

import { create } from 'zustand';
import type { User } from '@/types';
import { getTokenExpiry, isExpired } from '@/lib/auth/jwt';
import {
  ADDRESS_KEY,
  TOKEN_KEY,
  displayNameKey,
  notificationPreferencesKey,
} from '@/lib/auth/storage-keys';

const DEFAULT_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADDRESS_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export interface NotificationPreferences {
  shipmentUpdates: boolean;
  milestoneUpdates: boolean;
  systemAlerts: boolean;
  desktopNotifications: boolean;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  shipmentUpdates: true,
  milestoneUpdates: true,
  systemAlerts: true,
  desktopNotifications: false,
};

interface AuthState {
  address: string | null;
  token: string | null;
  /** Token expiry as a ms timestamp, or null if the token has no exp claim */
  expiresAt: number | null;
  user: User | null;
  displayName: string | null;
  notificationPreferences: NotificationPreferences;
  isConnected: boolean;

  // Actions
  setAuth: (address: string, token: string, user: User) => void;
  setAddress: (address: string) => void;
  setDisplayName: (displayName: string) => void;
  setNotificationPreferences: (preferences: NotificationPreferences) => void;
  logout: () => void;
  rehydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  address: null,
  token: null,
  expiresAt: null,
  user: null,
  displayName: null,
  notificationPreferences: defaultNotificationPreferences,
  isConnected: false,

  setAuth: (address, token, user) => {
    const expiresAt = getTokenExpiry(token);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(ADDRESS_KEY, address);
      // Keep the middleware cookie alive exactly as long as the token itself
      const maxAge = expiresAt !== null
        ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
        : DEFAULT_COOKIE_MAX_AGE;
      document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    const displayName = typeof window !== 'undefined'
      ? localStorage.getItem(displayNameKey(address))
      : null;
    const storedPreferences = typeof window !== 'undefined'
      ? localStorage.getItem(notificationPreferencesKey(address))
      : null;
    set({
      address,
      token,
      expiresAt,
      user,
      displayName,
      notificationPreferences: storedPreferences
        ? { ...defaultNotificationPreferences, ...JSON.parse(storedPreferences) }
        : defaultNotificationPreferences,
      isConnected: true,
    });
  },

  setAddress: (address) => {
    set({ address, isConnected: true });
  },

  setDisplayName: (displayName) => {
    const value = displayName.trim() || null;
    const address = useAuthStore.getState().address;
    if (typeof window !== 'undefined' && address) {
      if (value) localStorage.setItem(displayNameKey(address), value);
      else localStorage.removeItem(displayNameKey(address));
    }
    set({ displayName: value });
  },

  setNotificationPreferences: (preferences) => {
    const address = useAuthStore.getState().address;
    if (typeof window !== 'undefined' && address) {
      localStorage.setItem(
        notificationPreferencesKey(address),
        JSON.stringify(preferences),
      );
    }
    set({ notificationPreferences: preferences });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      clearStoredSession();
    }
    set({
      address: null,
      token: null,
      expiresAt: null,
      user: null,
      displayName: null,
      notificationPreferences: defaultNotificationPreferences,
      isConnected: false,
    });
  },

  rehydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      const address = localStorage.getItem(ADDRESS_KEY);
      if (token && address) {
        const expiresAt = getTokenExpiry(token);
        // A stale token from a previous visit — drop it instead of
        // rendering a "connected" UI whose API calls will all 401
        if (isExpired(expiresAt)) {
          clearStoredSession();
          return;
        }
        const storedPreferences = localStorage.getItem(notificationPreferencesKey(address));
        set({
          token,
          expiresAt,
          address,
          displayName: localStorage.getItem(displayNameKey(address)),
          notificationPreferences: storedPreferences
            ? { ...defaultNotificationPreferences, ...JSON.parse(storedPreferences) }
            : defaultNotificationPreferences,
          isConnected: true,
        });
      }
    }
  },
}));

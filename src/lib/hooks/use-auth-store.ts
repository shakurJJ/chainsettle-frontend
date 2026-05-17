/**
 * lib/hooks/use-auth-store.ts
 *
 * Global Zustand store for authentication state.
 * Manages the connected Stellar address, JWT token, and user profile.
 */

import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  address: string | null;
  token: string | null;
  user: User | null;
  isConnected: boolean;

  // Actions
  setAuth: (address: string, token: string, user: User) => void;
  setAddress: (address: string) => void;
  logout: () => void;
  rehydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  address: null,
  token: null,
  user: null,
  isConnected: false,

  setAuth: (address, token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chainsetttle_token', token);
      localStorage.setItem('chainsetttle_address', address);
      document.cookie = `chainsetttle_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    }
    set({ address, token, user, isConnected: true });
  },

  setAddress: (address) => {
    set({ address, isConnected: true });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chainsetttle_token');
      localStorage.removeItem('chainsetttle_address');
      document.cookie = 'chainsetttle_token=; path=/; max-age=0';
    }
    set({ address: null, token: null, user: null, isConnected: false });
  },

  rehydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('chainsetttle_token');
      const address = localStorage.getItem('chainsetttle_address');
      if (token && address) {
        set({ token, address, isConnected: true });
      }
    }
  },
}));

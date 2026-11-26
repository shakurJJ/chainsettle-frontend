import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'high-contrast';

export const THEME_STORAGE_KEY = 'chainsettle_theme';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'high-contrast';
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('high-contrast', theme === 'high-contrast');
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
  rehydrateTheme: () => void;
}

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'high-contrast'];

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Ignore storage write errors in restricted browsing contexts
      }
    }
    applyThemeToDocument(theme);
    set({ theme });
  },

  cycleTheme: () => {
    const current = get().theme;
    const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
    get().setTheme(next);
  },

  rehydrateTheme: () => {
    const stored = readStoredTheme();
    applyThemeToDocument(stored);
    set({ theme: stored });
  },
}));

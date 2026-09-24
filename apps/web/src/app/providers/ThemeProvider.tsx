import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Theme state/provider foundation. Conceptually preserved from the
 * approved old BEZENT UI's `theme/ThemeContext.tsx` (see
 * docs/architecture/UI-MIGRATION-INVENTORY.md §8, §9) — mode/resolution
 * state only. Visual theme controls (a toggle button, a right-rail
 * control) are a later design-system component phase, not this one.
 *
 * Lives in `app/providers` rather than a new `platform/appearance`
 * boundary: nothing here is HRMS/business-specific, nothing yet needs a
 * dedicated platform capability, and creating one now would be
 * speculative scaffolding (AGENTS.md, Article 5).
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

/**
 * localStorage key. Kept identical to the approved old UI
 * (`src/theme/ThemeContext.tsx`) and to the inline FOUC-prevention script
 * in `index.html`, which must read the same key before React mounts.
 */
const STORAGE_KEY = 'bezent-theme';
export const THEME_STORAGE_KEY = STORAGE_KEY;

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'dark' || value === 'system') {
      return value;
    }
  } catch {
    // localStorage can throw in restricted/incognito contexts — fall through.
  }
  return 'light';
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Ignore write failures (restricted/incognito contexts).
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const currentResolved: ResolvedTheme = prev === 'system' ? getSystemTheme() : prev;
      const next: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore write failures.
      }
      return next;
    });
  }, []);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode, toggleTheme }),
    [mode, resolvedTheme, setMode, toggleTheme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

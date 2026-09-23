import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ThemeTransitionOverlay,
  type ThemeTransitionOrigin,
} from '../../design-system/components/ThemeTransition';

/**
 * Theme state/provider foundation with premium Arc Reactor + Circular Eclipse Reveal transition.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ToggleThemeOptions {
  origin?: ThemeTransitionOrigin;
}

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: (options?: ToggleThemeOptions) => void;
  isTransitioning?: boolean;
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

interface ActiveTransition {
  targetTheme: ResolvedTheme;
  origin: ThemeTransitionOrigin;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const [activeTransition, setActiveTransition] = useState<ActiveTransition | null>(null);
  const isTransitioningRef = useRef(false);

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

  const handleMidpoint = useCallback(() => {
    if (activeTransition) {
      setModeState(activeTransition.targetTheme);
      try {
        localStorage.setItem(STORAGE_KEY, activeTransition.targetTheme);
      } catch {
        // Ignore write failures.
      }
    }
  }, [activeTransition]);

  const handleComplete = useCallback(() => {
    setActiveTransition(null);
    isTransitioningRef.current = false;
  }, []);

  const toggleTheme = useCallback(
    (options?: ToggleThemeOptions) => {
      // Rapid click protection: avoid stacking animations or desyncing
      if (isTransitioningRef.current) return;

      const currentResolved: ResolvedTheme =
        mode === 'system' ? getSystemTheme() : (mode as ResolvedTheme);
      const next: ResolvedTheme = currentResolved === 'dark' ? 'light' : 'dark';

      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      if (prefersReducedMotion) {
        setMode(next);
        return;
      }

      const fallbackOrigin: ThemeTransitionOrigin =
        typeof window !== 'undefined'
          ? { x: window.innerWidth - 30, y: window.innerHeight - 30 }
          : { x: 0, y: 0 };

      const origin = options?.origin || fallbackOrigin;

      isTransitioningRef.current = true;
      setActiveTransition({ targetTheme: next, origin });
    },
    [mode, setMode],
  );

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      toggleTheme,
      isTransitioning: activeTransition !== null,
    }),
    [mode, resolvedTheme, setMode, toggleTheme, activeTransition],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
      {activeTransition && (
        <ThemeTransitionOverlay
          targetTheme={activeTransition.targetTheme}
          origin={activeTransition.origin}
          onMidpoint={handleMidpoint}
          onComplete={handleComplete}
        />
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

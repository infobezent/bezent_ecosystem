import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { ArcReactorTransition } from './ArcReactorTransition';

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

export type ThemeToggleOrigin =
  React.MouseEvent<HTMLElement> | HTMLElement | { x: number; y: number } | null | undefined;

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: (origin?: ThemeToggleOrigin) => void;
}

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

function getOriginCoordinates(origin?: ThemeToggleOrigin): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 0, y: 0 };

  if (origin && typeof origin === 'object') {
    if ('clientX' in origin && typeof (origin as React.MouseEvent).clientX === 'number') {
      const target =
        ((origin as React.MouseEvent).currentTarget as HTMLElement) ||
        ((origin as React.MouseEvent).target as HTMLElement);
      if (target && typeof target.getBoundingClientRect === 'function') {
        const rect = target.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      return {
        x: (origin as React.MouseEvent).clientX,
        y: (origin as React.MouseEvent).clientY,
      };
    }
    if (
      'getBoundingClientRect' in origin &&
      typeof (origin as HTMLElement).getBoundingClientRect === 'function'
    ) {
      const rect = (origin as HTMLElement).getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    if ('x' in origin && 'y' in origin) {
      return { x: origin.x, y: origin.y };
    }
  }

  // Fallback: dynamically find the authoritative right rail theme button
  const button = document.querySelector('.right-rail__theme') as HTMLElement | null;
  if (button) {
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  // Final fallback: bottom-right corner
  return { x: window.innerWidth - 34, y: window.innerHeight - 60 };
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const isTransitioningRef = useRef(false);
  const [transitionState, setTransitionState] = useState<{
    originX: number;
    originY: number;
    targetTheme: ResolvedTheme;
    isFallbackReveal: boolean;
  } | null>(null);

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

  const handleTransitionComplete = useCallback(() => {
    setTransitionState(null);
    isTransitioningRef.current = false;
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('--arc-origin-x');
      document.documentElement.style.removeProperty('--arc-origin-y');
      document.documentElement.style.removeProperty('--arc-max-radius');
    }
  }, []);

  const toggleTheme = useCallback(
    (origin?: ThemeToggleOrigin) => {
      // Rapid click protection
      if (isTransitioningRef.current) return;

      const currentResolved: ResolvedTheme = mode === 'system' ? systemTheme : mode;
      const nextResolved: ResolvedTheme = currentResolved === 'dark' ? 'light' : 'dark';
      const nextMode: ThemeMode = nextResolved;

      // Respect prefers-reduced-motion: instant/standard 180ms fade without radial energy wave
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      if (prefersReducedMotion) {
        setMode(nextMode);
        return;
      }

      // Calculate dynamic origin from toggle button runtime coordinates
      const { x, y } = getOriginCoordinates(origin);
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--arc-origin-x', `${x}px`);
        document.documentElement.style.setProperty('--arc-origin-y', `${y}px`);
        document.documentElement.style.setProperty('--arc-max-radius', `${maxRadius}px`);
      }

      isTransitioningRef.current = true;

      const doc =
        typeof document !== 'undefined'
          ? (document as Document & {
              startViewTransition?: (callback: () => void | Promise<void>) => {
                finished: Promise<void>;
              };
            })
          : null;

      if (doc && typeof doc.startViewTransition === 'function') {
        // Phase 1 (t=0ms): Mount overlay so button compresses & Arc Reactor core ignites visually
        setTransitionState({
          originX: x,
          originY: y,
          targetTheme: nextResolved,
          isFallbackReveal: false,
        });

        // Phase 2 (t=80ms): Suppress CSS color transitions globally so the
        // View Transitions snapshot captures a pristine, fully-resolved target
        // frame with zero intermediate interpolation fighting the clip-path reveal.
        setTimeout(() => {
          if (typeof document !== 'undefined') {
            document.documentElement.classList.add('is-theme-transitioning');
          }

          let transition: { finished: Promise<void> } | null = null;
          try {
            transition = doc.startViewTransition(() => {
              flushSync(() => {
                setModeState(nextMode);
                document.documentElement.setAttribute('data-theme', nextResolved);
              });
              try {
                localStorage.setItem(STORAGE_KEY, nextMode);
              } catch {
                // Ignore write failures in restricted/incognito contexts.
              }
            });
          } catch {
            // startViewTransition threw — graceful instant fallback
            setModeState(nextMode);
            if (typeof document !== 'undefined') {
              document.documentElement.classList.remove('is-theme-transitioning');
            }
            return;
          }

          // Phase 3 (t≈800ms): Once the 720ms radial reveal fully settles,
          // restore CSS color transitions so hover/focus states animate normally.
          transition.finished.finally(() => {
            if (typeof document !== 'undefined') {
              document.documentElement.classList.remove('is-theme-transitioning');
            }
          });
        }, 80);
      } else {
        // Fallback for browsers without View Transitions API
        setTransitionState({
          originX: x,
          originY: y,
          targetTheme: nextResolved,
          isFallbackReveal: true,
        });

        setTimeout(() => {
          setModeState(nextMode);
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', nextResolved);
          }
          try {
            localStorage.setItem(STORAGE_KEY, nextMode);
          } catch {
            // Ignore write failures in restricted/incognito contexts.
          }
        }, 360);
      }
    },
    [mode, systemTheme, setMode],
  );

  const contextValue = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode, toggleTheme }),
    [mode, resolvedTheme, setMode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
      {transitionState && (
        <ArcReactorTransition
          originX={transitionState.originX}
          originY={transitionState.originY}
          targetTheme={transitionState.targetTheme}
          isFallbackReveal={transitionState.isFallbackReveal}
          onComplete={handleTransitionComplete}
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

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ThemeTransitionOverlay.css';

export interface ThemeTransitionOrigin {
  x: number;
  y: number;
}

export interface ThemeTransitionOverlayProps {
  targetTheme: 'light' | 'dark';
  origin: ThemeTransitionOrigin;
  onMidpoint?: () => void;
  onComplete: () => void;
}

// Fixed subtle star positions for night atmosphere (deterministic, no random re-renders)
const NIGHT_PARTICLES = [
  { top: '18%', left: '22%', size: '3px' },
  { top: '28%', left: '74%', size: '2px' },
  { top: '42%', left: '35%', size: '2.5px' },
  { top: '65%', left: '80%', size: '3px' },
  { top: '75%', left: '15%', size: '2px' },
  { top: '82%', left: '58%', size: '2.5px' },
  { top: '33%', left: '88%', size: '2px' },
  { top: '55%', left: '25%', size: '3px' },
];

export function ThemeTransitionOverlay({
  targetTheme,
  origin,
  onMidpoint,
  onComplete,
}: ThemeTransitionOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // Apply dynamic origin variables via CSS properties on ref (no inline JSX style)
    if (containerRef.current) {
      const { innerWidth, innerHeight } = window;
      const ox = Math.max(0, Math.min(origin.x, innerWidth));
      const oy = Math.max(0, Math.min(origin.y, innerHeight));

      const maxRadius = Math.ceil(
        Math.hypot(Math.max(ox, innerWidth - ox), Math.max(oy, innerHeight - oy)),
      );

      containerRef.current.style.setProperty('--eclipse-origin-x', `${ox}px`);
      containerRef.current.style.setProperty('--eclipse-origin-y', `${oy}px`);
      containerRef.current.style.setProperty('--eclipse-max-radius', `${maxRadius + 60}px`);
    }

    if (prefersReducedMotion) {
      onMidpoint?.();
      const reducedTimer = setTimeout(() => {
        onComplete();
      }, 150);
      return () => clearTimeout(reducedTimer);
    }

    // Midpoint trigger: commit theme state while eclipse covers interface (~220ms)
    const midpointTimer = setTimeout(() => {
      onMidpoint?.();
    }, 220);

    // Settling trigger: begin fade out (~520ms)
    const settlingTimer = setTimeout(() => {
      setSettling(true);
    }, 520);

    // Completion trigger: unmount overlay (~620ms)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 620);

    return () => {
      clearTimeout(midpointTimer);
      clearTimeout(settlingTimer);
      clearTimeout(completeTimer);
    };
  }, [origin, onMidpoint, onComplete]);

  if (typeof document === 'undefined') return null;

  const modifierClass =
    targetTheme === 'dark'
      ? 'bezent-theme-transition--to-dark'
      : 'bezent-theme-transition--to-light';

  const portalContent = (
    <div
      ref={containerRef}
      className={`bezent-theme-transition-portal ${modifierClass} ${settling ? 'is-settling' : ''}`.trim()}
      aria-hidden="true"
    >
      {/* Phase 1 & 2: Arc Reactor Outward Energy Pulse Ring */}
      <div className="bezent-theme-transition__reactor-pulse" />

      {/* Phase 3: Expanding Circular Eclipse Reveal Layer */}
      <div className="bezent-theme-transition__eclipse">
        {targetTheme === 'dark' && (
          <div className="bezent-theme-transition__atmosphere">
            {NIGHT_PARTICLES.map((particle, idx) => (
              <span
                key={idx}
                className="bezent-theme-transition__particle"
                ref={(el) => {
                  if (el) {
                    el.style.setProperty('top', particle.top);
                    el.style.setProperty('left', particle.left);
                    el.style.setProperty('width', particle.size);
                    el.style.setProperty('height', particle.size);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Luminous Wavefront Leading Ring */}
      <div className="bezent-theme-transition__wavefront" />
    </div>
  );

  return createPortal(portalContent, document.body);
}

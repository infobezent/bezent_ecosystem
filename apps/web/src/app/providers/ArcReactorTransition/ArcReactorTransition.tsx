import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ResolvedTheme } from '../ThemeProvider';
import './ArcReactorTransition.css';

export interface ArcReactorTransitionProps {
  originX: number;
  originY: number;
  targetTheme: ResolvedTheme;
  isFallbackReveal?: boolean;
  onComplete: () => void;
}

/**
 * Arc Reactor Core SVG:
 * Miniature, highly stylized energy core with concentric nodes,
 * luminous outer bezel, and high-intensity energy center.
 */
function ReactorCoreSvg() {
  return (
    <svg
      className="arc-reactor__core-svg"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="16.5" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.8" />
      <circle
        cx="18"
        cy="18"
        r="13"
        stroke="#ffffff"
        strokeWidth="0.8"
        strokeOpacity="0.6"
        strokeDasharray="3 2"
      />
      <circle cx="18" cy="18" r="8.5" stroke="#38bdf8" strokeWidth="1.5" />
      <polygon
        points="18,11 24,21.5 12,21.5"
        stroke="#38bdf8"
        strokeWidth="1"
        strokeOpacity="0.75"
        fill="rgba(56, 189, 248, 0.2)"
      />
      <circle cx="18" cy="18" r="4.5" fill="#ffffff" filter="drop-shadow(0 0 4px #38bdf8)" />
    </svg>
  );
}

/**
 * Global Arc Reactor Transition Layer:
 * Mounts above the viewport during a theme transition, rendering:
 * 1. The glowing Arc Reactor Core directly at the toggle coordinates
 * 2. 3 expanding concentric energy shockwaves
 * 3. 6 micro-spark particles
 * 4. Luminous wavefront ring
 * 5. Cleanly unmounts automatically after the sequence completes
 */
export function ArcReactorTransition({
  targetTheme,
  isFallbackReveal,
  onComplete,
}: ArcReactorTransitionProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 850);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="arc-reactor-overlay" aria-hidden="true">
      {/* Fallback radial reveal when View Transitions API is unsupported */}
      {isFallbackReveal && <div className={`arc-reactor__reveal-fallback to-${targetTheme}`} />}

      {/* Luminous energy wavefront ring */}
      <div className={`arc-reactor__wavefront to-${targetTheme}`} />

      {/* 3 Staggered concentric shockwave rings */}
      <div className="arc-reactor__ring arc-reactor__ring--1" />
      <div className="arc-reactor__ring arc-reactor__ring--2" />
      <div className="arc-reactor__ring arc-reactor__ring--3" />

      {/* Arc Reactor Core bloom */}
      <div className="arc-reactor__core">
        <div className="arc-reactor__core-ambient" />
        <ReactorCoreSvg />
      </div>

      {/* 6 Micro energy sparks radiating outward */}
      <div className="arc-reactor__particle arc-reactor__particle--0" />
      <div className="arc-reactor__particle arc-reactor__particle--1" />
      <div className="arc-reactor__particle arc-reactor__particle--2" />
      <div className="arc-reactor__particle arc-reactor__particle--3" />
      <div className="arc-reactor__particle arc-reactor__particle--4" />
      <div className="arc-reactor__particle arc-reactor__particle--5" />
    </div>,
    document.body,
  );
}

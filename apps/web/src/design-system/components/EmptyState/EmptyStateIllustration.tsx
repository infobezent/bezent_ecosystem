import './EmptyStateIllustration.css';

export type EmptyStateIllustrationSize = 'default' | 'compact';

export interface EmptyStateIllustrationProps {
  size?: EmptyStateIllustrationSize;
  className?: string;
  isDark?: boolean;
}

/**
 * Clean 2D Flat-Vector Arc Reactor Empty-State Illustration.
 *
 * Designed strictly as a crisp 2D flat-vector / blueprint SVG:
 * - Symmetrical concentric geometric rings & precision calibration tracks
 * - 10-segment radial energy core containment blocks
 * - Central 2D geometric energy nucleus
 * - Sky blue primary, cyan accents, and very light blue technical details
 * - No 3D perspective, no metallic shaders, no heavy drop shadows
 */
export function EmptyStateIllustration({
  size = 'default',
  className,
  isDark: isDarkProp,
}: EmptyStateIllustrationProps) {
  const isDark =
    isDarkProp ??
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'dark');

  // Palette constants for clean 2D flat-vector rendering
  const primarySky = '#0284c7';
  const cyanAccent = '#06b6d4';
  const lightBlueBg = isDark ? '#0f172a' : '#f0f9ff';
  const lightBlueSecondary = isDark ? '#1e293b' : '#e0f2fe';
  const lineSubtle = isDark ? '#334155' : '#bae6fd';
  const lineContrast = isDark ? '#38bdf8' : '#0ea5e9';
  const coreFill = isDark ? '#082f49' : '#e0f2fe';

  return (
    <div
      className={`bezent-empty-illustration-container bezent-empty-illustration-container--${size} ${isDark ? 'is-dark' : ''} ${className || ''}`.trim()}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 220 220"
        width="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="bezent-arc-reactor"
      >
        {/* ── Layer 1: Outermost HUD Calibration & Alignment Markings ── */}
        <g className="bezent-reactor-hud-outer">
          {/* Subtle Outer Boundary Orbit */}
          <circle
            cx="110"
            cy="110"
            r="98"
            stroke={lineSubtle}
            strokeWidth="0.8"
            strokeDasharray="2 6"
          />
          <circle
            cx="110"
            cy="110"
            r="92"
            stroke={lineContrast}
            strokeWidth="0.9"
            strokeDasharray="24 8 4 8"
            strokeOpacity="0.85"
          />
          <circle cx="110" cy="110" r="86" stroke={lineSubtle} strokeWidth="0.6" />

          {/* 12 Outer Precision Calibration Ticks (30° intervals) */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 110 110)`}>
              <line
                x1="110"
                y1="13"
                x2="110"
                y2={deg % 90 === 0 ? '22' : '18'}
                stroke={deg % 90 === 0 ? primarySky : lineContrast}
                strokeWidth={deg % 90 === 0 ? '1.4' : '0.8'}
              />
            </g>
          ))}

          {/* 4 Cardinal Crosshair Dots */}
          <circle cx="110" cy="7" r="1.5" fill={primarySky} />
          <circle cx="110" cy="213" r="1.5" fill={primarySky} />
          <circle cx="7" cy="110" r="1.5" fill={primarySky} />
          <circle cx="213" cy="110" r="1.5" fill={primarySky} />

          {/* 4 Ordinal Diagonal Micro-Nodes */}
          <circle cx="48" cy="48" r="1.2" fill={cyanAccent} />
          <circle cx="172" cy="48" r="1.2" fill={cyanAccent} />
          <circle cx="48" cy="172" r="1.2" fill={cyanAccent} />
          <circle cx="172" cy="172" r="1.2" fill={cyanAccent} />
        </g>

        {/* ── Layer 2: Outer Reactor Chassis & Radial Energy Coils ── */}
        <g className="bezent-reactor-chassis">
          {/* Main Outer 2D Annular Ring Surface */}
          <circle
            cx="110"
            cy="110"
            r="76"
            stroke={lineContrast}
            strokeWidth="1.2"
            fill={lightBlueSecondary}
          />
          <circle
            cx="110"
            cy="110"
            r="62"
            stroke={primarySky}
            strokeWidth="1.2"
            fill={lightBlueBg}
          />

          {/* 10 Symmetrical 2D Radial Energy Containment Blocks */}
          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 110 110)`}>
              {/* Radial Division Channel Line */}
              <line x1="110" y1="34" x2="110" y2="48" stroke={lineSubtle} strokeWidth="1" />
              {/* Flat 2D Energy Segment Block */}
              <rect
                x="106"
                y="36"
                width="8"
                height="10"
                rx="1"
                fill={isDark ? '#0284c7' : '#ffffff'}
                stroke={primarySky}
                strokeWidth="1"
              />
              {/* Cyan Energy Indicator Stripe */}
              <line
                x1="110"
                y1="38"
                x2="110"
                y2="44"
                stroke={cyanAccent}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {/* Outer Micro Fastener Dot */}
              <circle cx="110" cy="30" r="0.9" fill={primarySky} />
            </g>
          ))}
        </g>

        {/* ── Layer 3: Mid Interlock & Guide Ring (Counter-Rotating) ── */}
        <g className="bezent-reactor-hud-mid">
          <circle
            cx="110"
            cy="110"
            r="54"
            stroke={cyanAccent}
            strokeWidth="1.2"
            strokeDasharray="28 10 8 10"
          />
          <circle
            cx="110"
            cy="110"
            r="48"
            stroke={lineContrast}
            strokeWidth="0.8"
            strokeDasharray="4 4"
          />
          {/* 8 Inner Interlock Anchor Points */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 110 110)`}>
              <circle cx="110" cy="54" r="1.2" fill={primarySky} />
            </g>
          ))}
        </g>

        {/* ── Layer 4: Inner Magnetic Confinement Ring ── */}
        <g className="bezent-reactor-inner-ring">
          <circle cx="110" cy="110" r="40" stroke={primarySky} strokeWidth="1.2" fill={coreFill} />
          <circle
            cx="110"
            cy="110"
            r="32"
            stroke={cyanAccent}
            strokeWidth="1"
            strokeDasharray="16 6"
          />

          {/* 6 Inner Radial Flux Teeth */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 110 110)`}>
              <line
                x1="110"
                y1="70"
                x2="110"
                y2="76"
                stroke={primarySky}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="110" cy="74" r="1" fill={cyanAccent} />
            </g>
          ))}
        </g>

        {/* ── Layer 5: Central 2D Arc Reactor Core Nexus ── */}
        <g className="bezent-reactor-core">
          {/* Core Boundary Circle */}
          <circle
            cx="110"
            cy="110"
            r="24"
            fill={isDark ? '#0369a1' : '#bae6fd'}
            stroke={primarySky}
            strokeWidth="1.4"
          />
          <circle
            cx="110"
            cy="110"
            r="18"
            fill={isDark ? '#0284c7' : '#e0f2fe'}
            stroke={cyanAccent}
            strokeWidth="1"
          />

          {/* Central 2D 'b' Lettermark */}
          <path
            d="M103 97 V121 M103 108.5 C105 106.8 107.8 105.5 111 105.5 C115.5 105.5 119 109 119 113.5 C119 118 115.5 121.5 111 121.5 C107.8 121.5 105 120.2 103 118.5"
            stroke={isDark ? '#38bdf8' : '#0284c7'}
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}

export default EmptyStateIllustration;

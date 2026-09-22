import './EmptyStateIllustration.css';

export type EmptyStateIllustrationSize = 'default' | 'compact';

export interface EmptyStateIllustrationProps {
  size?: EmptyStateIllustrationSize;
  className?: string;
  isDark?: boolean;
}

/**
 * Premium Futuristic Arc Reactor Empty-State Illustration.
 *
 * An advanced AI-powered activation core graphic featuring:
 * - Electric blue / cyan glowing energy core at the center
 * - Multi-layered concentric brushed-metallic alloy rings
 * - Holographic HUD orbital markings and calibration ticks
 * - Micro-machined magnetic confinement coils
 * - Gentle energy pulsing, counter-rotating HUD tracks, and floating ambient particles
 * - Clean, minimalistic Stark-tech engineering aesthetic on light canvas
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

  return (
    <div
      className={`bezent-empty-illustration-container bezent-empty-illustration-container--${size} ${isDark ? 'is-dark' : ''} ${className || ''}`.trim()}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 240 220"
        width="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="bezent-arc-reactor"
      >
        <defs>
          {/* Energy core radial gradient */}
          <radialGradient id="reactor-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#67e8f9" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#00c6ff" stopOpacity="0.85" />
            <stop offset="85%" stopColor="#0284c7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
          </radialGradient>

          {/* Ambient soft background aura */}
          <radialGradient id="reactor-ambient-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={isDark ? '0.35' : '0.18'} />
            <stop offset="45%" stopColor="#0ea5e9" stopOpacity={isDark ? '0.18' : '0.08'} />
            <stop offset="75%" stopColor="#0284c7" stopOpacity={isDark ? '0.06' : '0.02'} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          {/* Metallic outer ring gradient */}
          <linearGradient id="reactor-metal-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#475569' : '#f8fafc'} />
            <stop offset="25%" stopColor={isDark ? '#334155' : '#e2e8f0'} />
            <stop offset="50%" stopColor={isDark ? '#64748b' : '#cbd5e1'} />
            <stop offset="75%" stopColor={isDark ? '#1e293b' : '#94a3b8'} />
            <stop offset="100%" stopColor={isDark ? '#475569' : '#e2e8f0'} />
          </linearGradient>

          {/* Inner titanium bezel gradient */}
          <linearGradient id="reactor-inner-bezel" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#64748b' : '#ffffff'} />
            <stop offset="40%" stopColor={isDark ? '#334155' : '#cbd5e1'} />
            <stop offset="70%" stopColor={isDark ? '#1e293b' : '#94a3b8'} />
            <stop offset="100%" stopColor={isDark ? '#475569' : '#e2e8f0'} />
          </linearGradient>

          {/* Magnetic coil copper/cyan energy gradient */}
          <linearGradient id="reactor-coil-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* Glow filter for energy elements */}
          <filter id="reactor-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="reactor-subtle-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Layer 1: Ambient Energy Aura ── */}
        <circle
          cx="120"
          cy="110"
          r="92"
          fill="url(#reactor-ambient-aura)"
          className="bezent-reactor-aura"
        />

        {/* ── Layer 2: Outermost Technical HUD Calibration Ring (Counter-Clockwise) ── */}
        <g className="bezent-reactor-hud-outer">
          <circle
            cx="120"
            cy="110"
            r="84"
            stroke="#38bdf8"
            strokeWidth="0.85"
            strokeDasharray="2 8"
            strokeOpacity={isDark ? '0.45' : '0.35'}
          />
          <circle
            cx="120"
            cy="110"
            r="80"
            stroke="#0ea5e9"
            strokeWidth="0.6"
            strokeDasharray="28 12 8 12 18 12"
            strokeOpacity={isDark ? '0.5' : '0.4'}
          />
          {/* Compass / Angle Tick Marks */}
          <line
            x1="120"
            y1="23"
            x2="120"
            y2="28"
            stroke="#0ea5e9"
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
          <line
            x1="120"
            y1="192"
            x2="120"
            y2="197"
            stroke="#0ea5e9"
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
          <line
            x1="33"
            y1="110"
            x2="38"
            y2="110"
            stroke="#0ea5e9"
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
          <line
            x1="202"
            y1="110"
            x2="207"
            y2="110"
            stroke="#0ea5e9"
            strokeWidth="1.2"
            strokeOpacity="0.7"
          />
          {/* Diagonal Tick Nodes */}
          <circle cx="58" cy="48" r="1.5" fill="#38bdf8" fillOpacity="0.6" />
          <circle cx="182" cy="48" r="1.5" fill="#38bdf8" fillOpacity="0.6" />
          <circle cx="58" cy="172" r="1.5" fill="#38bdf8" fillOpacity="0.6" />
          <circle cx="182" cy="172" r="1.5" fill="#38bdf8" fillOpacity="0.6" />
        </g>

        {/* ── Layer 3: Main Outer Metallic Alloy Chassis Ring ── */}
        <g className="bezent-reactor-chassis">
          {/* Shadow behind chassis */}
          <circle
            cx="120"
            cy="111"
            r="68"
            stroke="rgba(0, 0, 0, 0.08)"
            strokeWidth="8"
            fill="none"
          />
          {/* Solid brushed titanium outer body */}
          <circle
            cx="120"
            cy="110"
            r="68"
            stroke="url(#reactor-metal-ring)"
            strokeWidth="7"
            fill="none"
          />
          {/* Outer ring precision border lines */}
          <circle
            cx="120"
            cy="110"
            r="71.5"
            stroke={isDark ? '#475569' : '#cbd5e1'}
            strokeWidth="0.75"
            fill="none"
          />
          <circle
            cx="120"
            cy="110"
            r="64.5"
            stroke={isDark ? '#334155' : '#94a3b8'}
            strokeWidth="0.75"
            fill="none"
          />

          {/* 8 Outer Structural Coil Anchors (Mechanical Details) */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 120 110)`}>
              <rect
                x="117.5"
                y="38.5"
                width="5"
                height="7"
                rx="1.2"
                fill={isDark ? '#1e293b' : '#ffffff'}
                stroke={isDark ? '#64748b' : '#94a3b8'}
                strokeWidth="0.8"
              />
              <circle cx="120" cy="42" r="1" fill="#0284c7" />
            </g>
          ))}
        </g>

        {/* ── Layer 4: Middle Segmented HUD Energy Track (Rotating Clockwise) ── */}
        <g className="bezent-reactor-hud-mid">
          <circle
            cx="120"
            cy="110"
            r="56"
            stroke="#0284c7"
            strokeWidth="1.8"
            strokeDasharray="42 16 18 16 32 16"
            strokeLinecap="round"
            filter="url(#reactor-subtle-glow)"
          />
          <circle
            cx="120"
            cy="110"
            r="52"
            stroke="#38bdf8"
            strokeWidth="0.8"
            strokeDasharray="6 6"
            strokeOpacity="0.7"
          />
        </g>

        {/* ── Layer 5: Inner Magnetic Confinement Chamber & Coils ── */}
        <g className="bezent-reactor-inner-ring">
          {/* Inner metallic housing */}
          <circle
            cx="120"
            cy="110"
            r="44"
            stroke="url(#reactor-inner-bezel)"
            strokeWidth="6"
            fill={isDark ? '#0f172a' : '#f8fafc'}
          />
          <circle
            cx="120"
            cy="110"
            r="47"
            stroke={isDark ? '#475569' : '#cbd5e1'}
            strokeWidth="0.75"
            fill="none"
          />
          <circle
            cx="120"
            cy="110"
            r="41"
            stroke="#0284c7"
            strokeWidth="1"
            fill="none"
            strokeOpacity="0.8"
          />

          {/* 10 Radial Magnetic Energy Coils */}
          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 120 110)`}>
              <path
                d="M118 69 L122 69 L121.2 75 L118.8 75 Z"
                fill="url(#reactor-coil-gradient)"
                stroke={isDark ? '#0284c7' : '#38bdf8'}
                strokeWidth="0.5"
              />
            </g>
          ))}
        </g>

        {/* ── Layer 6: Glass Confinement Ring & Inner Optical Halo ── */}
        <circle
          cx="120"
          cy="110"
          r="32"
          stroke="#00c6ff"
          strokeWidth="1.6"
          fill="none"
          strokeOpacity="0.8"
          filter="url(#reactor-subtle-glow)"
        />
        <circle
          cx="120"
          cy="110"
          r="28"
          stroke="#38bdf8"
          strokeWidth="0.75"
          strokeDasharray="4 4"
          fill="none"
          strokeOpacity="0.6"
        />

        {/* ── Layer 7: Central High-Energy Arc Reactor Core (Pulsing Center) ── */}
        <g className="bezent-reactor-core">
          {/* Core glow background */}
          <circle
            cx="120"
            cy="110"
            r="23"
            fill="url(#reactor-core-glow)"
            filter="url(#reactor-glow-filter)"
          />
          <circle cx="120" cy="110" r="16" fill="url(#reactor-core-glow)" />

          {/* Core Central Geometric Energy Matrix */}
          <polygon
            points="120,98 130.4,116 109.6,116"
            stroke="#ffffff"
            strokeWidth="1.4"
            fill="rgba(255, 255, 255, 0.25)"
            strokeLinejoin="round"
            className="bezent-reactor-matrix"
          />
          <polygon
            points="120,122 109.6,104 130.4,104"
            stroke="#00f2fe"
            strokeWidth="1"
            fill="none"
            strokeLinejoin="round"
            strokeOpacity="0.8"
            className="bezent-reactor-matrix-invert"
          />
          {/* Bright White Center Core Node */}
          <circle cx="120" cy="110" r="3.8" fill="#ffffff" filter="url(#reactor-subtle-glow)" />
        </g>

        {/* ── Layer 8: Floating Engineering Particles & HUD Dots ── */}
        <g className="bezent-reactor-particles">
          <circle cx="36" cy="72" r="1.5" fill="#38bdf8" className="bezent-particle bezent-p1" />
          <circle cx="204" cy="62" r="1.2" fill="#00f2fe" className="bezent-particle bezent-p2" />
          <circle cx="212" cy="148" r="1.6" fill="#38bdf8" className="bezent-particle bezent-p3" />
          <circle cx="28" cy="154" r="1.2" fill="#0ea5e9" className="bezent-particle bezent-p4" />
          {/* Micro HUD lines */}
          <path
            d="M24 100 L14 100 L10 106"
            stroke="#38bdf8"
            strokeWidth="0.8"
            strokeOpacity="0.45"
            fill="none"
          />
          <path
            d="M216 100 L226 100 L230 94"
            stroke="#38bdf8"
            strokeWidth="0.8"
            strokeOpacity="0.45"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}

export default EmptyStateIllustration;

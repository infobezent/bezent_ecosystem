import './EmptyStateIllustration.css';

export type EmptyStateIllustrationSize = 'default' | 'compact';

export interface EmptyStateIllustrationProps {
  size?: EmptyStateIllustrationSize;
  className?: string;
  isDark?: boolean;
}

/**
 * Premium Futuristic Spider-Web Digital Network Empty-State Illustration.
 *
 * An advanced digital organizational network graphic featuring:
 * - Perfectly symmetrical geometric spider-web structure (12 precision radial spokes & 6 concentric web tiers)
 * - Electric sky blue / cyan lines with subtle holographic glow
 * - Center glowing energy core node
 * - Interactive employee / organizational connection points at geometric intersections
 * - Outward expanding energy wave pulse
 * - Subtle background HUD rings, compass ticks, and floating ambient particles
 * - Clean, minimalistic high-tech aesthetic
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
        className="bezent-spider-web"
      >
        <defs>
          {/* Ambient soft background aura */}
          <radialGradient id="web-ambient-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={isDark ? '0.35' : '0.16'} />
            <stop offset="45%" stopColor="#0ea5e9" stopOpacity={isDark ? '0.18' : '0.07'} />
            <stop offset="75%" stopColor="#0284c7" stopOpacity={isDark ? '0.06' : '0.02'} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          {/* Central Energy Core Radial Gradient */}
          <radialGradient id="web-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#a5f3fc" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#00f2fe" stopOpacity="0.85" />
            <stop offset="90%" stopColor="#0284c7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
          </radialGradient>

          {/* Node Glow Gradient */}
          <radialGradient id="web-node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>

          {/* Precision Web Line Linear Gradient */}
          <linearGradient id="web-line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={isDark ? '0.8' : '0.65'} />
            <stop offset="50%" stopColor="#00f2fe" stopOpacity={isDark ? '0.95' : '0.85'} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={isDark ? '0.8' : '0.65'} />
          </linearGradient>

          {/* Glow filter for web lines & nodes */}
          <filter id="web-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="web-subtle-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Layer 1: Atmospheric Blue Ambient Aura ── */}
        <circle
          cx="120"
          cy="110"
          r="102"
          fill="url(#web-ambient-aura)"
          className="bezent-web-aura"
        />

        {/* ── Layer 2: Outward Energy Wave Ripple (Center outward) ── */}
        <circle
          cx="120"
          cy="110"
          r="16"
          stroke="#38bdf8"
          strokeWidth="1.2"
          fill="none"
          className="bezent-web-ripple bezent-web-ripple--1"
        />
        <circle
          cx="120"
          cy="110"
          r="16"
          stroke="#00f2fe"
          strokeWidth="1"
          fill="none"
          className="bezent-web-ripple bezent-web-ripple--2"
        />

        {/* ── Layer 3: Background Circular HUD Guides & Coordinate Rings ── */}
        <g className="bezent-web-hud-ring" opacity={isDark ? 0.35 : 0.22}>
          <circle
            cx="120"
            cy="110"
            r="100"
            stroke="#38bdf8"
            strokeWidth="0.75"
            strokeDasharray="3 5"
          />
          <circle
            cx="120"
            cy="110"
            r="84"
            stroke="#0ea5e9"
            strokeWidth="0.5"
            strokeDasharray="6 4"
          />
          <circle
            cx="120"
            cy="110"
            r="50"
            stroke="#0284c7"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />

          {/* Compass / Axis Ticks */}
          <line x1="120" y1="5" x2="120" y2="12" stroke="#38bdf8" strokeWidth="1.2" />
          <line x1="120" y1="208" x2="120" y2="215" stroke="#38bdf8" strokeWidth="1.2" />
          <line x1="15" y1="110" x2="22" y2="110" stroke="#38bdf8" strokeWidth="1.2" />
          <line x1="218" y1="110" x2="225" y2="110" stroke="#38bdf8" strokeWidth="1.2" />
        </g>

        {/* ── Layer 4: Symmetrical Futuristic Spider-Web Pattern ── */}
        <g className="bezent-web-structure" filter="url(#web-subtle-glow)">
          {/* 12 Precision Radial Rays (from Center out to R=96) */}
          {/* 0° & 180° (Horizontal) */}
          <line
            x1="24"
            y1="110"
            x2="216"
            y2="110"
            stroke="url(#web-line-gradient)"
            strokeWidth="0.9"
            opacity="0.75"
          />
          {/* 90° & 270° (Vertical) */}
          <line
            x1="120"
            y1="14"
            x2="120"
            y2="206"
            stroke="url(#web-line-gradient)"
            strokeWidth="0.9"
            opacity="0.75"
          />
          {/* 30° & 210° */}
          <line
            x1="36.8"
            y1="62"
            x2="203.2"
            y2="158"
            stroke="url(#web-line-gradient)"
            strokeWidth="0.85"
            opacity="0.65"
          />
          {/* 60° & 240° */}
          <line
            x1="72"
            y1="26.8"
            x2="168"
            y2="193.2"
            stroke="url(#web-line-gradient)"
            strokeWidth="0.85"
            opacity="0.65"
          />
          {/* 120° & 300° */}
          <line
            x1="168"
            y1="26.8"
            x2="72"
            y2="193.2"
            stroke="url(#web-line-gradient)"
            strokeWidth="0.85"
            opacity="0.65"
          />
          {/* 150° & 330° */}
          <line
            x1="203.2"
            y1="62"
            x2="36.8"
            y2="158"
            stroke="url(#web-line-gradient)"
            strokeWidth="0.85"
            opacity="0.65"
          />

          {/* ── Tier 1 Concentric Polygon Web (R = 18) ── */}
          <polygon
            points="
              138,110 135.6,119 129,125.6 120,128 111,125.6 104.4,119 
              102,110 104.4,101 111,94.4 120,92 129,94.4 135.6,101
            "
            stroke="#00f2fe"
            strokeWidth="0.8"
            fill="rgba(56, 189, 248, 0.04)"
          />

          {/* ── Tier 2 Concentric Polygon Web (R = 34) ── */}
          <polygon
            points="
              154,110 149.4,127 137,139.5 120,144 103,139.5 90.6,127 
              86,110 90.6,93 103,80.5 120,76 137,80.5 149.4,93
            "
            stroke="#38bdf8"
            strokeWidth="0.85"
            fill="rgba(56, 189, 248, 0.03)"
          />

          {/* ── Tier 3 Concentric Polygon Web (R = 50) ── */}
          <polygon
            points="
              170,110 163.3,135 145,153.3 120,160 95,153.3 76.7,135 
              70,110 76.7,85 95,66.7 120,60 145,66.7 163.3,85
            "
            stroke="#00f2fe"
            strokeWidth="0.9"
            fill="rgba(56, 189, 248, 0.02)"
          />

          {/* ── Tier 4 Concentric Polygon Web (R = 66) ── */}
          <polygon
            points="
              186,110 177.2,143 153,167.2 120,176 87,167.2 62.8,143 
              54,110 62.8,77 87,52.8 120,44 153,52.8 177.2,77
            "
            stroke="#38bdf8"
            strokeWidth="0.85"
            fill="rgba(56, 189, 248, 0.015)"
          />

          {/* ── Tier 5 Concentric Polygon Web (R = 82) ── */}
          <polygon
            points="
              202,110 191,151 161,181 120,192 79,181 49,151 
              38,110 49,69 79,39 120,28 161,39 191,69
            "
            stroke="#00f2fe"
            strokeWidth="0.9"
            fill="none"
          />

          {/* ── Tier 6 Outer Web Boundary (R = 96) ── */}
          <polygon
            points="
              216,110 203.2,158 168,193.2 120,206 72,193.2 36.8,158 
              24,110 36.8,62 72,26.8 120,14 168,26.8 203.2,62
            "
            stroke="#0ea5e9"
            strokeWidth="1"
            fill="none"
            opacity="0.8"
          />

          {/* Subtle Geometric Web Micro-Struts / Inter-web Cross Links */}
          <circle
            cx="120"
            cy="110"
            r="34"
            stroke="#67e8f9"
            strokeWidth="0.4"
            strokeDasharray="2 4"
            opacity="0.6"
          />
          <circle
            cx="120"
            cy="110"
            r="66"
            stroke="#67e8f9"
            strokeWidth="0.4"
            strokeDasharray="3 5"
            opacity="0.6"
          />
        </g>

        {/* ── Layer 5: Employee / Organizational Connection Nodes ── */}
        <g className="bezent-web-nodes">
          {/* Inner Tier Nodes */}
          <circle cx="154" cy="110" r="2.4" fill="#00f2fe" className="bezent-node bezent-node--1" />
          <circle
            cx="103"
            cy="139.5"
            r="2.2"
            fill="#38bdf8"
            className="bezent-node bezent-node--2"
          />
          <circle
            cx="103"
            cy="80.5"
            r="2.2"
            fill="#38bdf8"
            className="bezent-node bezent-node--3"
          />

          {/* Mid Tier Nodes */}
          <circle
            cx="145"
            cy="153.3"
            r="2.6"
            fill="#00f2fe"
            className="bezent-node bezent-node--4"
          />
          <circle cx="70" cy="110" r="2.8" fill="#38bdf8" className="bezent-node bezent-node--1" />
          <circle
            cx="145"
            cy="66.7"
            r="2.6"
            fill="#00f2fe"
            className="bezent-node bezent-node--5"
          />

          {/* Outer Tier Nodes */}
          <circle
            cx="177.2"
            cy="143"
            r="2.2"
            fill="#38bdf8"
            className="bezent-node bezent-node--2"
          />
          <circle cx="120" cy="176" r="2.5" fill="#00f2fe" className="bezent-node bezent-node--6" />
          <circle
            cx="62.8"
            cy="143"
            r="2.2"
            fill="#38bdf8"
            className="bezent-node bezent-node--3"
          />
          <circle cx="62.8" cy="77" r="2.2" fill="#38bdf8" className="bezent-node bezent-node--4" />
          <circle cx="120" cy="44" r="2.5" fill="#00f2fe" className="bezent-node bezent-node--5" />
          <circle
            cx="177.2"
            cy="77"
            r="2.2"
            fill="#38bdf8"
            className="bezent-node bezent-node--1"
          />

          {/* Boundary Tier Strategic Anchor Nodes */}
          <circle cx="202" cy="110" r="2" fill="#67e8f9" className="bezent-node bezent-node--6" />
          <circle cx="161" cy="181" r="2" fill="#67e8f9" className="bezent-node bezent-node--2" />
          <circle cx="79" cy="181" r="2" fill="#67e8f9" className="bezent-node bezent-node--3" />
          <circle cx="38" cy="110" r="2" fill="#67e8f9" className="bezent-node bezent-node--4" />
          <circle cx="79" cy="39" r="2" fill="#67e8f9" className="bezent-node bezent-node--5" />
          <circle cx="161" cy="39" r="2" fill="#67e8f9" className="bezent-node bezent-node--1" />
        </g>

        {/* ── Layer 6: Center Hub Glowing Energy Core ── */}
        <g className="bezent-web-core" filter="url(#web-glow-filter)">
          {/* Outer Core Glow Halo */}
          <circle cx="120" cy="110" r="14" fill="url(#web-core-glow)" opacity="0.85" />
          {/* Confinement Ring */}
          <circle
            cx="120"
            cy="110"
            r="8"
            stroke="#ffffff"
            strokeWidth="1.2"
            fill="rgba(56, 189, 248, 0.25)"
          />
          {/* Center Point */}
          <circle cx="120" cy="110" r="3.5" fill="#ffffff" />
          <circle cx="120" cy="110" r="1.8" fill="#00f2fe" />
        </g>

        {/* ── Layer 7: Floating Ambient Particles ── */}
        <g className="bezent-web-particles" opacity={isDark ? 0.85 : 0.65}>
          <circle cx="30" cy="40" r="1.2" fill="#38bdf8" className="bezent-p1" />
          <circle cx="210" cy="35" r="1.4" fill="#00f2fe" className="bezent-p2" />
          <circle cx="215" cy="180" r="1.1" fill="#38bdf8" className="bezent-p3" />
          <circle cx="25" cy="175" r="1.3" fill="#00f2fe" className="bezent-p4" />
        </g>
      </svg>
    </div>
  );
}

export default EmptyStateIllustration;

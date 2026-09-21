import './EmptyStateIllustration.css';

export type EmptyStateIllustrationSize = 'default' | 'compact';

export interface EmptyStateIllustrationProps {
  size?: EmptyStateIllustrationSize;
  className?: string;
  isDark?: boolean;
}

/**
 * Premium Futuristic Transformation / Activation Core Empty-State Illustration.
 * (Omnitrix-inspired original futuristic technology graphic)
 *
 * Features:
 * - Straight-on circular wrist-device / activation interface housing
 * - Dark titanium / gunmetal metallic outer bezel with mechanical notches and calibration ticks
 * - Concentric rotary dial rings with neon emerald energy conduits
 * - Central geometric transformation matrix / hourglass energy core
 * - Vivid emerald / lime green glowing energy blooms
 * - Micro-machined HUD markings, sequential status LEDs, and floating ambient particles
 * - Clean enterprise aesthetic with 3D glass and metallic depth
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
        className="bezent-omnitrix-device"
      >
        <defs>
          {/* Ambient soft green aura behind the device */}
          <radialGradient id="omni-ambient-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={isDark ? '0.35' : '0.18'} />
            <stop offset="45%" stopColor="#10b981" stopOpacity={isDark ? '0.18' : '0.08'} />
            <stop offset="75%" stopColor="#059669" stopOpacity={isDark ? '0.06' : '0.02'} />
            <stop offset="100%" stopColor="#047857" stopOpacity="0" />
          </radialGradient>

          {/* Central Vivid Green Energy Core Gradient */}
          <radialGradient id="omni-core-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#bbf7d0" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#22c55e" stopOpacity="0.9" />
            <stop offset="85%" stopColor="#15803d" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#14532d" stopOpacity="0" />
          </radialGradient>

          {/* Dark Metallic Bezel Outer Gradient */}
          <linearGradient id="omni-metal-outer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#334155' : '#475569'} />
            <stop offset="30%" stopColor={isDark ? '#1e293b' : '#334155'} />
            <stop offset="50%" stopColor={isDark ? '#475569' : '#64748b'} />
            <stop offset="70%" stopColor={isDark ? '#0f172a' : '#1e293b'} />
            <stop offset="100%" stopColor={isDark ? '#1e293b' : '#334155'} />
          </linearGradient>

          {/* Inner Gunmetal Dial Ring Gradient */}
          <linearGradient id="omni-metal-inner" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#64748b' : '#94a3b8'} />
            <stop offset="40%" stopColor={isDark ? '#1e293b' : '#334155'} />
            <stop offset="70%" stopColor={isDark ? '#0f172a' : '#1e293b'} />
            <stop offset="100%" stopColor={isDark ? '#334155' : '#475569'} />
          </linearGradient>

          {/* Geometric Hourglass Symbol Core Gradient */}
          <linearGradient id="omni-symbol-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="50%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>

          {/* Glass Lens Specular Highlight */}
          <linearGradient id="omni-glass-glare" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="65%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="omni-glow-strong" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="omni-glow-subtle" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Layer 1: Ambient Emerald Aura ── */}
        <circle
          cx="120"
          cy="110"
          r="104"
          fill="url(#omni-ambient-aura)"
          className="bezent-omni-aura"
        />

        {/* ── Layer 2: Outer Wrist-Device Metallic Housing & Mechanical Grips ── */}
        <g className="bezent-omni-outer-housing">
          {/* Mechanical Bezel Notches (Cardinal & Diagonal Interface Nodes) */}
          <rect
            x="114"
            y="14"
            width="12"
            height="10"
            rx="3"
            fill="url(#omni-metal-outer)"
            stroke="#64748b"
            strokeWidth="0.8"
          />
          <rect
            x="114"
            y="196"
            width="12"
            height="10"
            rx="3"
            fill="url(#omni-metal-outer)"
            stroke="#64748b"
            strokeWidth="0.8"
          />
          <rect
            x="24"
            y="104"
            width="10"
            height="12"
            rx="3"
            fill="url(#omni-metal-outer)"
            stroke="#64748b"
            strokeWidth="0.8"
          />
          <rect
            x="206"
            y="104"
            width="10"
            height="12"
            rx="3"
            fill="url(#omni-metal-outer)"
            stroke="#64748b"
            strokeWidth="0.8"
          />

          {/* Outer Housing Ring Chassis (R = 86) */}
          <circle
            cx="120"
            cy="110"
            r="86"
            fill="url(#omni-metal-outer)"
            stroke={isDark ? '#475569' : '#94a3b8'}
            strokeWidth="2.5"
            className="bezent-omni-chassis-shadow"
          />

          {/* Precision Housing Inset Track */}
          <circle
            cx="120"
            cy="110"
            r="80"
            stroke="#0f172a"
            strokeWidth="2"
            fill="none"
            opacity="0.8"
          />
          <circle cx="120" cy="110" r="78" stroke="#334155" strokeWidth="0.75" fill="none" />
        </g>

        {/* ── Layer 3: Rotating Outer HUD Calibration Ring ── */}
        <g className="bezent-omni-hud-outer">
          {/* Outer Calibration Ring */}
          <circle
            cx="120"
            cy="110"
            r="74"
            stroke="#22c55e"
            strokeWidth="1.2"
            strokeDasharray="6 8 2 8"
            opacity="0.7"
            fill="none"
          />
          <circle
            cx="120"
            cy="110"
            r="70"
            stroke="#10b981"
            strokeWidth="0.6"
            strokeDasharray="3 4"
            opacity="0.5"
            fill="none"
          />

          {/* Precision Calibration Ticks */}
          <circle cx="120" cy="38" r="1.5" fill="#4ade80" />
          <circle cx="120" cy="182" r="1.5" fill="#4ade80" />
          <circle cx="48" cy="110" r="1.5" fill="#4ade80" />
          <circle cx="192" cy="110" r="1.5" fill="#4ade80" />
        </g>

        {/* ── Layer 4: Middle Gunmetal Rotary Bezel (R = 64) ── */}
        <g className="bezent-omni-rotary-bezel">
          <circle
            cx="120"
            cy="110"
            r="64"
            fill="url(#omni-metal-inner)"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Circumferential Green Energy Conduits / Arc Channels */}
          <circle
            cx="120"
            cy="110"
            r="56"
            stroke="#22c55e"
            strokeWidth="2.2"
            strokeDasharray="28 14"
            className="bezent-omni-conduit-glow"
            fill="none"
            filter="url(#omni-glow-subtle)"
          />

          {/* Inner Titanium Ring */}
          <circle
            cx="120"
            cy="110"
            r="50"
            fill={isDark ? '#090d16' : '#0f172a'}
            stroke="#475569"
            strokeWidth="1.2"
          />
        </g>

        {/* ── Layer 5: Inner Activation Dial & Transformation Matrix (R = 46) ── */}
        <g className="bezent-omni-inner-dial">
          {/* Glowing Green Core Lens Underlay */}
          <circle
            cx="120"
            cy="110"
            r="44"
            fill="url(#omni-core-glow)"
            className="bezent-omni-core-glow"
          />

          {/* Dark Contrast Segments (Four Interlocking Outer Grip Flanges) */}
          <path
            d="M 120 66 A 44 44 0 0 1 151.1 78.9 L 140 94 A 24 24 0 0 0 120 86 Z"
            fill="#090d16"
            opacity="0.9"
          />
          <path
            d="M 164 110 A 44 44 0 0 1 151.1 141.1 L 140 126 A 24 24 0 0 0 144 110 Z"
            fill="#090d16"
            opacity="0.9"
          />
          <path
            d="M 120 154 A 44 44 0 0 1 88.9 141.1 L 100 126 A 24 24 0 0 0 120 134 Z"
            fill="#090d16"
            opacity="0.9"
          />
          <path
            d="M 76 110 A 44 44 0 0 1 88.9 78.9 L 100 94 A 24 24 0 0 0 96 110 Z"
            fill="#090d16"
            opacity="0.9"
          />

          {/* ── Center Transformation Symbol: Dual-Chevron / Hourglass Matrix ── */}
          <g className="bezent-omni-symbol" filter="url(#omni-glow-strong)">
            {/* Top Chevron / Wing */}
            <polygon
              points="96,78 144,78 128,102 112,102"
              fill="url(#omni-symbol-gradient)"
              stroke="#86efac"
              strokeWidth="0.8"
            />
            {/* Bottom Chevron / Wing */}
            <polygon
              points="128,118 144,142 96,142 112,118"
              fill="url(#omni-symbol-gradient)"
              stroke="#86efac"
              strokeWidth="0.8"
            />
            {/* Center Core Activation Diamond */}
            <polygon
              points="120,103 127,110 120,117 113,110"
              fill="#ffffff"
              stroke="#86efac"
              strokeWidth="0.6"
              className="bezent-omni-center-diamond"
            />
          </g>

          {/* 3D Glass Specular Reflection Highlight */}
          <path
            d="M 78 100 A 44 44 0 0 1 162 100 A 44 32 0 0 0 78 100 Z"
            fill="url(#omni-glass-glare)"
            opacity="0.65"
          />
        </g>

        {/* ── Layer 6: Status LED Nodes (Four Cardinal Activation Points) ── */}
        <g className="bezent-omni-leds">
          <circle
            cx="120"
            cy="52"
            r="2.4"
            fill="#22c55e"
            className="bezent-omni-led bezent-omni-led--1"
            filter="url(#omni-glow-subtle)"
          />
          <circle
            cx="178"
            cy="110"
            r="2.4"
            fill="#22c55e"
            className="bezent-omni-led bezent-omni-led--2"
            filter="url(#omni-glow-subtle)"
          />
          <circle
            cx="120"
            cy="168"
            r="2.4"
            fill="#22c55e"
            className="bezent-omni-led bezent-omni-led--3"
            filter="url(#omni-glow-subtle)"
          />
          <circle
            cx="62"
            cy="110"
            r="2.4"
            fill="#22c55e"
            className="bezent-omni-led bezent-omni-led--4"
            filter="url(#omni-glow-subtle)"
          />
        </g>

        {/* ── Layer 7: Floating Ambient Green Energy Particles ── */}
        <g className="bezent-omni-particles" opacity={isDark ? 0.85 : 0.65}>
          <circle cx="34" cy="42" r="1.4" fill="#4ade80" className="bezent-omni-p1" />
          <circle cx="206" cy="38" r="1.2" fill="#22c55e" className="bezent-omni-p2" />
          <circle cx="212" cy="176" r="1.3" fill="#86efac" className="bezent-omni-p3" />
          <circle cx="28" cy="172" r="1.5" fill="#22c55e" className="bezent-omni-p4" />
        </g>
      </svg>
    </div>
  );
}

export default EmptyStateIllustration;

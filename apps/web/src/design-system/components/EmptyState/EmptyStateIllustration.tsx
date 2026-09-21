import './EmptyStateIllustration.css';

export type EmptyStateIllustrationSize = 'default' | 'compact';

export interface EmptyStateIllustrationProps {
  /**
   * The old UI exposed five size names (`small`/`medium`/`large`/
   * `compact`/`default`) that only ever produced two distinct outputs
   * (135px vs 180px) — simplified to the two names that actually differ.
   */
  size?: EmptyStateIllustrationSize;
  className?: string;
  isDark?: boolean;
}

/**
 * Universal BEZENT SaaS Workspace Empty-State Illustration.
 *
 * Faithfully extracted from the old approved UI's
 * `BezentEmptyStateIllustration.tsx` — ambient aura, a floating workspace
 * card, a potted plant, a stack of three books, a breathing "+" button, a
 * gliding paper plane on a dotted flight path, and two pulsing accent
 * particles. Respects `prefers-reduced-motion`.
 *
 * Bug fixed during migration: the old `<svg>` had a literal `height="auto"`
 * attribute — invalid as an SVG presentation attribute (only valid in
 * CSS), which Chrome logs as a console error. Dropped; the SVG already
 * sizes its height from the `viewBox` aspect ratio once `width` is set.
 *
 * This illustration has genuine per-theme branching baked into its
 * artwork itself — dozens of bespoke gradient/shadow/fill hex values,
 * not semantic UI-state colors — preserved exactly as approved rather
 * than forced into the token system (the same documented exception as
 * the icon system's `assets` icon; see
 * docs/architecture/ICON-SYSTEM.md §8 and
 * docs/architecture/DESIGN-SYSTEM-COMPONENTS.md). `isDark` defaults to a
 * direct read of `document.documentElement`'s `data-theme` attribute —
 * the same pattern `BezentIcon` uses — so this component never imports
 * `ThemeProvider`/`useTheme` and stays a `design-system` dependency leaf.
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
      className={`bezent-empty-illustration-container bezent-empty-illustration-container--${size} ${className || ''}`.trim()}
    >
      <svg
        viewBox="0 0 340 215"
        width="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="bezentAura" cx="50%" cy="52%" r="50%" fx="50%" fy="52%">
            <stop
              offset="0%"
              stopColor={isDark ? '#4C1D95' : '#D3E3FD'}
              stopOpacity={isDark ? '0.35' : '0.65'}
            />
            <stop
              offset="65%"
              stopColor={isDark ? '#3B0B62' : '#EAF1FB'}
              stopOpacity={isDark ? '0.15' : '0.35'}
            />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          <linearGradient
            id="bezentPlusGrad"
            x1="190"
            y1="88"
            x2="230"
            y2="128"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={isDark ? '#A855F7' : '#1A73E8'} />
            <stop offset="50%" stopColor={isDark ? '#931CF5' : '#0B57D0'} />
            <stop offset="100%" stopColor={isDark ? '#7E22CE' : '#0842A0'} />
          </linearGradient>

          <linearGradient
            id="bezentCardGrad"
            x1="165"
            y1="52"
            x2="165"
            y2="178"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={isDark ? '#1E0B36' : '#FFFFFF'} />
            <stop offset="100%" stopColor={isDark ? '#150626' : '#F8FAFD'} />
          </linearGradient>

          <linearGradient
            id="bezentInnerGrad"
            x1="185"
            y1="85"
            x2="185"
            y2="165"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={isDark ? '#281045' : '#FFFFFF'} />
            <stop offset="100%" stopColor={isDark ? '#200A38' : '#F1F4F9'} />
          </linearGradient>

          <filter
            id="bezentCardShadow"
            x="65"
            y="40"
            width="205"
            height="155"
            filterUnits="userSpaceOnUse"
          >
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="10"
              floodColor={isDark ? '#000000' : '#0B57D0'}
              floodOpacity={isDark ? '0.45' : '0.07'}
            />
          </filter>

          <filter
            id="bezentPlusShadow"
            x="175"
            y="78"
            width="70"
            height="70"
            filterUnits="userSpaceOnUse"
          >
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="7"
              floodColor={isDark ? '#931CF5' : '#0B57D0'}
              floodOpacity={isDark ? '0.55' : '0.28'}
            />
          </filter>

          <filter
            id="bezentPotShadow"
            x="45"
            y="130"
            width="60"
            height="50"
            filterUnits="userSpaceOnUse"
          >
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="5"
              floodColor={isDark ? '#000000' : '#0B57D0'}
              floodOpacity={isDark ? '0.3' : '0.06'}
            />
          </filter>
        </defs>

        {/* Ambient background aura & soft clouds */}
        <ellipse cx="170" cy="112" rx="145" ry="92" fill="url(#bezentAura)" />
        <path
          d="M 52 174 C 52 165 60 156 70 156 C 72 156 75 157 77 158 C 82 150 91 146 100 148 C 108 150 114 157 116 165 C 122 165 128 168 128 174 Z"
          fill={isDark ? '#2A0E47' : '#EAF1FB'}
          opacity={isDark ? '0.45' : '0.6'}
        />
        <path
          d="M 226 174 C 226 165 234 157 244 157 C 247 157 251 159 253 161 C 258 152 268 147 278 150 C 286 153 292 160 294 167 C 300 167 306 170 306 174 Z"
          fill={isDark ? '#2A0E47' : '#EAF1FB'}
          opacity={isDark ? '0.4' : '0.55'}
        />

        {/* Workspace window card */}
        <g className="bezent-empty-card">
          <rect
            x="85"
            y="52"
            width="165"
            height="126"
            rx="12"
            fill="url(#bezentCardGrad)"
            stroke={isDark ? '#3D1368' : '#D3E3FD'}
            strokeWidth="1.2"
            filter="url(#bezentCardShadow)"
          />
          <circle cx="98" cy="64" r="2.4" fill={isDark ? '#581093' : '#A8C7FA'} />
          <circle cx="105.5" cy="64" r="2.4" fill={isDark ? '#581093' : '#A8C7FA'} />
          <circle cx="113" cy="64" r="2.4" fill={isDark ? '#581093' : '#A8C7FA'} />
          <line
            x1="85"
            y1="73"
            x2="250"
            y2="73"
            stroke={isDark ? '#310D55' : '#E7EBF0'}
            strokeWidth="1"
          />

          <rect
            x="94"
            y="83"
            width="22"
            height="4.5"
            rx="2"
            fill={isDark ? '#4C1D95' : '#A8C7FA'}
            opacity="0.85"
          />
          <rect
            x="94"
            y="93"
            width="18"
            height="4.5"
            rx="2"
            fill={isDark ? '#4C1D95' : '#D3E3FD'}
            opacity="0.6"
          />
          <rect
            x="94"
            y="103"
            width="20"
            height="4.5"
            rx="2"
            fill={isDark ? '#4C1D95' : '#D3E3FD'}
            opacity="0.6"
          />
          <rect
            x="94"
            y="113"
            width="16"
            height="4.5"
            rx="2"
            fill={isDark ? '#4C1D95' : '#D3E3FD'}
            opacity="0.45"
          />

          <line
            x1="124"
            y1="73"
            x2="124"
            y2="178"
            stroke={isDark ? '#310D55' : '#E7EBF0'}
            strokeWidth="1"
          />

          <rect
            x="132"
            y="81"
            width="110"
            height="88"
            rx="8"
            fill="url(#bezentInnerGrad)"
            stroke={isDark ? '#36105E' : '#E7EBF0'}
            strokeWidth="0.8"
          />

          <circle cx="144" cy="94" r="5" fill={isDark ? '#4C1D95' : '#A8C7FA'} />
          <rect
            x="154"
            y="92"
            width="34"
            height="4.5"
            rx="2"
            fill={isDark ? '#581093' : '#A8C7FA'}
            opacity="0.8"
          />
          <rect
            x="193"
            y="92"
            width="24"
            height="4.5"
            rx="2"
            fill={isDark ? '#4C1D95' : '#D3E3FD'}
            opacity="0.6"
          />

          <circle cx="144" cy="112" r="5" fill={isDark ? '#3B0B62' : '#D3E3FD'} />
          <rect
            x="154"
            y="110"
            width="40"
            height="4.5"
            rx="2"
            fill={isDark ? '#4C1D95' : '#A8C7FA'}
            opacity="0.75"
          />
          <rect
            x="199"
            y="110"
            width="16"
            height="4.5"
            rx="2"
            fill={isDark ? '#3B0B62' : '#D3E3FD'}
            opacity="0.6"
          />

          <circle cx="144" cy="130" r="5" fill={isDark ? '#4C1D95' : '#A8C7FA'} />
          <rect
            x="154"
            y="128"
            width="28"
            height="4.5"
            rx="2"
            fill={isDark ? '#4C1D95' : '#A8C7FA'}
            opacity="0.7"
          />
          <rect
            x="187"
            y="128"
            width="26"
            height="4.5"
            rx="2"
            fill={isDark ? '#3B0B62' : '#D3E3FD'}
            opacity="0.7"
          />

          <rect
            x="154"
            y="146"
            width="36"
            height="4"
            rx="2"
            fill={isDark ? '#3B0B62' : '#EAF1FB'}
            opacity="0.8"
          />
        </g>

        {/* Potted plant */}
        <g filter="url(#bezentPotShadow)">
          <path
            d="M 60 144 L 64 167 C 65 173, 83 173, 84 167 L 88 144 Z"
            fill={isDark ? '#281045' : '#FFFFFF'}
            stroke={isDark ? '#441470' : '#D3E3FD'}
            strokeWidth="1"
          />
          <ellipse cx="74" cy="144" rx="14" ry="4" fill={isDark ? '#3D1368' : '#EAF1FB'} />
          <path
            d="M 74 142 C 68 120, 72 104, 74 100 C 76 104, 80 120, 74 142 Z"
            fill="#10B981"
            opacity="0.9"
          />
          <path
            d="M 72 142 C 56 132, 45 120, 44 116 C 54 115, 67 124, 72 142 Z"
            fill="#059669"
            opacity="0.85"
          />
          <path
            d="M 76 142 C 92 130, 102 120, 104 116 C 96 114, 82 124, 76 142 Z"
            fill="#34D399"
            opacity="0.85"
          />
          <path d="M 74 143 C 67 136, 67 129, 71 125 C 76 129, 77 136, 74 143 Z" fill="#6EE7B7" />
        </g>

        {/* Stack of three books */}
        <g>
          <rect
            x="220"
            y="156"
            width="62"
            height="14"
            rx="3"
            fill={isDark ? '#281045' : '#EAF1FB'}
            stroke={isDark ? '#4C1D95' : '#A8C7FA'}
            strokeWidth="0.8"
          />
          <text
            x="251"
            y="166.5"
            fontSize="7"
            fontWeight="600"
            fontFamily="Inter, system-ui, sans-serif"
            fill={isDark ? '#BD74F9' : '#0B57D0'}
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            Achieve
          </text>

          <rect
            x="223"
            y="142"
            width="56"
            height="14"
            rx="3"
            fill={isDark ? '#1E0B36' : '#F1F4F9'}
            stroke={isDark ? '#3D1368' : '#D3E3FD'}
            strokeWidth="0.8"
          />
          <text
            x="251"
            y="152.5"
            fontSize="7"
            fontWeight="600"
            fontFamily="Inter, system-ui, sans-serif"
            fill={isDark ? '#DEB9FC' : '#1A73E8'}
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            Organize
          </text>

          <rect
            x="226"
            y="128"
            width="50"
            height="14"
            rx="3"
            fill={isDark ? '#2E0E54' : '#FFFFFF'}
            stroke={isDark ? '#441470' : '#D3E3FD'}
            strokeWidth="0.8"
          />
          <text
            x="251"
            y="138.5"
            fontSize="7"
            fontWeight="600"
            fontFamily="Inter, system-ui, sans-serif"
            fill={isDark ? '#E9D0FD' : '#0B57D0'}
            textAnchor="middle"
            letterSpacing="0.04em"
          >
            Plan
          </text>
        </g>

        {/* Dotted flight trail */}
        <g className="bezent-empty-path">
          <path
            d="M 198 86 C 214 62, 236 48, 252 60 C 263 69, 262 82, 250 82 C 238 82, 238 65, 256 52 C 270 42, 282 40, 290 42"
            fill="none"
            stroke={isDark ? '#A855F7' : '#A8C7FA'}
            strokeWidth="1.6"
            strokeDasharray="3.5 4"
            strokeLinecap="round"
          />
        </g>

        {/* Paper airplane */}
        <g className="bezent-empty-plane">
          <g transform="translate(288, 38) rotate(6)">
            <polygon points="0,12 24,0 10,18" fill={isDark ? '#C084FC' : '#1A73E8'} />
            <polygon points="0,12 24,0 6,10" fill={isDark ? '#E9D0FD' : '#D3E3FD'} opacity="0.95" />
            <polygon points="10,18 24,0 14,21" fill={isDark ? '#931CF5' : '#0B57D0'} />
            <polygon points="6,14 10,18 14,21" fill={isDark ? '#6B21A8' : '#0842A0'} />
            <line x1="0" y1="12" x2="24" y2="0" stroke="#FFFFFF" strokeWidth="0.75" opacity="0.9" />
          </g>
        </g>

        {/* Floating "+" button */}
        <g className="bezent-empty-plus">
          <line
            x1="230"
            y1="93"
            x2="238"
            y2="85"
            stroke={isDark ? '#C084FC' : '#1A73E8'}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <line
            x1="237"
            y1="103"
            x2="246"
            y2="100"
            stroke={isDark ? '#C084FC' : '#1A73E8'}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.75"
          />
          <line
            x1="221"
            y1="85"
            x2="224"
            y2="77"
            stroke={isDark ? '#C084FC' : '#1A73E8'}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.8"
          />

          <circle
            cx="210"
            cy="108"
            r="23"
            fill="url(#bezentPlusGrad)"
            filter="url(#bezentPlusShadow)"
          />

          <path
            d="M 210 97 L 210 119 M 199 108 L 221 108"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </g>

        {/* Accent sparkle particles */}
        <path
          className="bezent-empty-p1"
          d="M 108 34 Q 108 38 104 38 Q 108 38 108 42 Q 108 38 112 38 Q 108 38 108 34 Z"
          fill={isDark ? '#A855F7' : '#1A73E8'}
        />
        <path
          className="bezent-empty-p2"
          d="M 280 99 Q 280 102 277 102 Q 280 102 280 105 Q 280 102 283 102 Q 280 102 280 99 Z"
          fill={isDark ? '#C084FC' : '#0B57D0'}
        />
      </svg>
    </div>
  );
}

export default EmptyStateIllustration;

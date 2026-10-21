import React from 'react';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

interface HeroSceneIllustrationProps {
  period: TimePeriod;
  className?: string;
}

export const HeroSceneIllustration: React.FC<HeroSceneIllustrationProps> = ({
  period,
  className,
}) => {
  // Morning: Fresh pastel mint, soft sky blue, gentle lavender glow (Strictly zero yellow)
  if (period === 'morning') {
    return (
      <svg
        className={className}
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mor-sky" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f0f5ff" />
            <stop offset="45%" stopColor="#f2eeff" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#e6f8f0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#dcebff" stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id="mor-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#dcebff" stopOpacity="0.6" />
            <stop offset="75%" stopColor="#eee7ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#dcebff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mor-wave-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dcebff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#eee7ff" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="mor-wave-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ddf7e9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f0fdf4" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="mor-city-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <rect width="1200" height="240" fill="url(#mor-sky)" />
        <circle cx="700" cy="160" r="130" fill="url(#mor-glow)" />
        <path
          d="M440 240 Q600 110 780 155 T1100 130 L1200 150 L1200 240 Z"
          fill="url(#mor-wave-1)"
        />
        <path d="M580 240 Q740 135 900 170 T1200 145 L1200 240 Z" fill="url(#mor-wave-2)" />

        {/* Minimal architectural silhouette */}
        <path
          d="M660 240 L660 185 L675 185 L675 170 L695 170 L695 190 L715 190 L715 160 L730 160 L730 145 L740 145 L740 185 L760 185 L760 165 L780 165 L780 240 Z"
          fill="url(#mor-city-back)"
        />
        <path
          d="M820 240 L820 180 L840 180 L840 150 L860 150 L860 165 L885 165 L885 140 L900 140 L900 190 L930 190 L930 160 L955 160 L955 240 Z"
          fill="url(#mor-city-back)"
        />

        {/* Soft botanical accents */}
        <g id="mor-plants" transform="translate(1020, 60)" opacity="0.65">
          <path
            d="M120 180 C125 125 90 85 60 65 C50 90 65 135 115 180 Z"
            fill="#159a68"
            fillOpacity="0.4"
          />
          <path
            d="M150 180 C160 115 130 70 100 45 C90 75 110 130 145 180 Z"
            fill="#3978f6"
            fillOpacity="0.35"
          />
          <path
            d="M85 180 C95 130 60 90 20 75 C15 105 35 145 80 180 Z"
            fill="#8b72e8"
            fillOpacity="0.35"
          />
          <path
            d="M110 180 C130 110 85 60 40 40 C30 75 60 130 105 180 Z"
            fill="#159a68"
            fillOpacity="0.5"
          />
        </g>
      </svg>
    );
  }

  // Evening: Soft lavender, dreamy periwinkle, delicate blush mist (Strictly zero yellow/orange)
  if (period === 'evening') {
    return (
      <svg
        className={className}
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="eve-sky" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f4f0ff" />
            <stop offset="40%" stopColor="#eee7ff" stopOpacity="0.95" />
            <stop offset="75%" stopColor="#ffe5ea" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#dcebff" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="eve-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#eee7ff" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#c4b5fd" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#eee7ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="eve-wave-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="eve-wave-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dcebff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f4f0ff" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <rect width="1200" height="240" fill="url(#eve-sky)" />
        <circle cx="700" cy="165" r="135" fill="url(#eve-glow)" />
        <path
          d="M440 240 Q600 115 780 160 T1100 135 L1200 155 L1200 240 Z"
          fill="url(#eve-wave-1)"
        />
        <path d="M580 240 Q740 140 900 175 T1200 150 L1200 240 Z" fill="url(#eve-wave-2)" />

        {/* Soft evening plants */}
        <g id="eve-plants" transform="translate(1020, 60)" opacity="0.6">
          <path
            d="M120 180 C125 125 90 85 60 65 C50 90 65 135 115 180 Z"
            fill="#8b72e8"
            fillOpacity="0.45"
          />
          <path
            d="M150 180 C160 115 130 70 100 45 C90 75 110 130 145 180 Z"
            fill="#3978f6"
            fillOpacity="0.4"
          />
          <path
            d="M85 180 C95 130 60 90 20 75 C15 105 35 145 80 180 Z"
            fill="#e45163"
            fillOpacity="0.3"
          />
        </g>
      </svg>
    );
  }

  // Night: Deep elegant midnight indigo with celestial silver-pearl moon and stars
  if (period === 'night') {
    return (
      <svg
        className={className}
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="nit-sky" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="40%" stopColor="#1e1b4b" stopOpacity="0.98" />
            <stop offset="75%" stopColor="#2e1065" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.92" />
          </linearGradient>
          <radialGradient id="nit-moon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#e0e7ff" stopOpacity="0.45" />
            <stop offset="80%" stopColor="#818cf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1200" height="240" fill="url(#nit-sky)" />
        {/* Constellation sparkles */}
        <g fill="#ffffff" fillOpacity="0.75">
          <circle cx="510" cy="50" r="1.5" />
          <circle cx="560" cy="80" r="1" />
          <circle cx="620" cy="40" r="2" />
          <circle cx="740" cy="60" r="1.5" />
          <circle cx="790" cy="35" r="1" />
          <circle cx="850" cy="70" r="2" />
          <circle cx="920" cy="45" r="1.5" />
          <circle cx="980" cy="85" r="1" />
          <circle cx="1060" cy="40" r="2" />
          <circle cx="1140" cy="75" r="1.5" />
        </g>
        <circle cx="700" cy="120" r="60" fill="url(#nit-moon-halo)" />
        {/* Pearl-silver moon */}
        <path d="M710 98 A28 28 0 1 0 722 142 A22 22 0 1 1 710 98 Z" fill="#f1f5f9" />
      </svg>
    );
  }

  // Afternoon / Default: Approved enterprise pastel gradient (120deg blue-lavender-mint)
  return (
    <svg
      className={className}
      viewBox="0 0 1200 240"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="aft-sky" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f0f5ff" />
          <stop offset="55%" stopColor="#f2eeff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#e6f8f0" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="aft-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#dcebff" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#eee7ff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#dcebff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="aft-wave-1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dcebff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f0f5ff" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="aft-wave-2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ddf7e9" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f2eeff" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect width="1200" height="240" fill="url(#aft-sky)" />
      <circle cx="700" cy="160" r="140" fill="url(#aft-sun-glow)" />
      <path d="M440 240 Q600 115 780 160 T1100 135 L1200 155 L1200 240 Z" fill="url(#aft-wave-1)" />
      <path d="M580 240 Q740 140 900 175 T1200 150 L1200 240 Z" fill="url(#aft-wave-2)" />

      {/* Modern architectural & botanical accent */}
      <g id="aft-plants" transform="translate(1020, 55)" opacity="0.65">
        <path
          d="M120 185 C125 125 90 85 60 65 C50 90 65 135 115 185 Z"
          fill="#159a68"
          fillOpacity="0.45"
        />
        <path
          d="M155 185 C165 115 135 70 100 45 C90 75 110 130 150 185 Z"
          fill="#3978f6"
          fillOpacity="0.4"
        />
        <path
          d="M85 185 C95 130 60 90 20 75 C15 105 35 145 80 185 Z"
          fill="#8b72e8"
          fillOpacity="0.4"
        />
        <path
          d="M110 185 C130 110 85 60 40 40 C30 75 60 130 105 185 Z"
          fill="#159a68"
          fillOpacity="0.6"
        />
        <path
          d="M135 185 C155 105 110 50 65 25 C55 65 85 125 130 185 Z"
          fill="#3978f6"
          fillOpacity="0.5"
        />
      </g>
    </svg>
  );
};

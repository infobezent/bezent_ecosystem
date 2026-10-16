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
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="35%" stopColor="#fef3c7" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#fde68a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="mor-sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="mor-sun-core" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#fde047" />
          </radialGradient>
          <linearGradient id="mor-mountain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="mor-skyline-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="mor-skyline-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="240" fill="url(#mor-sky)" />
        <path
          d="M480 240 Q620 120 760 160 T1050 135 L1200 155 L1200 240 Z"
          fill="url(#mor-mountain)"
        />
        <circle cx="680" cy="170" r="135" fill="url(#mor-sun-glow)" />
        <circle cx="680" cy="170" r="48" fill="url(#mor-sun-core)" />
        <path
          d="M520 240 L520 185 L535 185 L535 175 L555 175 L555 190 L570 190 L570 165 L585 165 L585 155 L600 155 L600 190 L620 190 L620 140 L630 140 L630 130 L635 110 L640 130 L640 190 L660 190 L660 170 L680 170 L680 240 Z"
          fill="url(#mor-skyline-back)"
        />
        <path
          d="M720 240 L720 175 L740 175 L740 150 L755 150 L755 160 L775 160 L775 135 L785 125 L795 135 L795 180 L820 180 L820 155 L840 155 L840 190 L870 190 L870 160 L890 160 L890 240 Z"
          fill="url(#mor-skyline-back)"
        />
        <path
          d="M640 240 L640 180 L655 180 L655 165 L675 165 L675 190 L695 190 L695 175 L710 175 L710 160 L720 150 L720 130 L723 90 L726 130 L726 150 L735 160 L735 195 L760 195 L760 170 L780 170 L780 240 Z"
          fill="url(#mor-skyline-mid)"
        />
        <path
          d="M840 240 L840 175 L860 175 L860 145 L885 145 L885 165 L910 165 L910 135 L925 135 L925 120 L935 120 L935 180 L960 180 L960 155 L985 155 L985 195 L1020 195 L1020 240 Z"
          fill="url(#mor-skyline-mid)"
        />
        <line
          x1="810"
          y1="0"
          x2="810"
          y2="240"
          stroke="#ffffff"
          strokeWidth="8"
          strokeOpacity="0.5"
        />
        <line
          x1="810"
          y1="0"
          x2="810"
          y2="240"
          stroke="#e2e8f0"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />
        <line
          x1="1080"
          y1="0"
          x2="1080"
          y2="240"
          stroke="#ffffff"
          strokeWidth="8"
          strokeOpacity="0.45"
        />
        <line
          x1="1080"
          y1="0"
          x2="1080"
          y2="240"
          stroke="#e2e8f0"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />
        <g id="mor-plants" transform="translate(1010, 50)">
          <path
            d="M120 190 C125 130 90 90 60 70 C50 95 65 140 115 190 Z"
            fill="#065f46"
            fillOpacity="0.45"
          />
          <path
            d="M160 190 C170 120 140 75 105 50 C95 80 115 135 155 190 Z"
            fill="#047857"
            fillOpacity="0.55"
          />
          <path
            d="M85 190 C95 135 60 95 20 80 C15 110 35 150 80 190 Z"
            fill="#059669"
            fillOpacity="0.75"
          />
          <path
            d="M110 190 C130 115 85 65 40 45 C30 80 60 135 105 190 Z"
            fill="#10b981"
            fillOpacity="0.85"
          />
          <path
            d="M140 190 C165 105 115 50 65 25 C55 65 90 130 135 190 Z"
            fill="#34d399"
            fillOpacity="0.8"
          />
          <path
            d="M60 190 C70 145 40 115 5 105 C0 130 20 160 55 190 Z"
            fill="#6ee7b7"
            fillOpacity="0.9"
          />
          <path
            d="M85 190 C105 130 70 85 25 70 C20 100 45 150 80 190 Z"
            fill="#a7f3d0"
            fillOpacity="0.95"
          />
        </g>
      </svg>
    );
  }

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
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="35%" stopColor="#ffe4e6" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#fbcfe8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="eve-sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fecdd3" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#fb7185" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="eve-sun-core" cx="45%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fb7185" />
          </radialGradient>
          <linearGradient id="eve-mountain" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="eve-skyline-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a5b4fc" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="eve-skyline-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect width="1200" height="240" fill="url(#eve-sky)" />
        <path
          d="M480 240 Q620 125 760 165 T1050 140 L1200 160 L1200 240 Z"
          fill="url(#eve-mountain)"
        />
        <circle cx="680" cy="185" r="140" fill="url(#eve-sun-glow)" />
        <circle cx="680" cy="185" r="50" fill="url(#eve-sun-core)" />
        <path
          d="M520 240 L520 185 L535 185 L535 175 L555 175 L555 190 L570 190 L570 165 L585 165 L585 155 L600 155 L600 190 L620 190 L620 140 L630 140 L630 130 L635 110 L640 130 L640 190 L660 190 L660 170 L680 170 L680 240 Z"
          fill="url(#eve-skyline-back)"
        />
        <path
          d="M720 240 L720 175 L740 175 L740 150 L755 150 L755 160 L775 160 L775 135 L785 125 L795 135 L795 180 L820 180 L820 155 L840 155 L840 190 L870 190 L870 160 L890 160 L890 240 Z"
          fill="url(#eve-skyline-back)"
        />
        <path
          d="M640 240 L640 180 L655 180 L655 165 L675 165 L675 190 L695 190 L695 175 L710 175 L710 160 L720 150 L720 130 L723 90 L726 130 L726 150 L735 160 L735 195 L760 195 L760 170 L780 170 L780 240 Z"
          fill="url(#eve-skyline-mid)"
        />
        <path
          d="M840 240 L840 175 L860 175 L860 145 L885 145 L885 165 L910 165 L910 135 L925 135 L925 120 L935 120 L935 180 L960 180 L960 155 L985 155 L985 195 L1020 195 L1020 240 Z"
          fill="url(#eve-skyline-mid)"
        />
        <line
          x1="810"
          y1="0"
          x2="810"
          y2="240"
          stroke="#ffffff"
          strokeWidth="8"
          strokeOpacity="0.45"
        />
        <line
          x1="810"
          y1="0"
          x2="810"
          y2="240"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeOpacity="0.6"
        />
        <line
          x1="1080"
          y1="0"
          x2="1080"
          y2="240"
          stroke="#ffffff"
          strokeWidth="8"
          strokeOpacity="0.4"
        />
        <line
          x1="1080"
          y1="0"
          x2="1080"
          y2="240"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />
        <g id="eve-plants" transform="translate(1010, 50)">
          <path
            d="M120 190 C125 130 90 90 60 70 C50 95 65 140 115 190 Z"
            fill="#312e81"
            fillOpacity="0.5"
          />
          <path
            d="M160 190 C170 120 140 75 105 50 C95 80 115 135 155 190 Z"
            fill="#4338ca"
            fillOpacity="0.6"
          />
          <path
            d="M85 190 C95 135 60 95 20 80 C15 110 35 150 80 190 Z"
            fill="#1e1b4b"
            fillOpacity="0.75"
          />
          <path
            d="M110 190 C130 115 85 65 40 45 C30 80 60 135 105 190 Z"
            fill="#4f46e5"
            fillOpacity="0.75"
          />
          <path
            d="M140 190 C165 105 115 50 65 25 C55 65 90 130 135 190 Z"
            fill="#6366f1"
            fillOpacity="0.75"
          />
          <path
            d="M60 190 C70 145 40 115 5 105 C0 130 20 160 55 190 Z"
            fill="#818cf8"
            fillOpacity="0.85"
          />
          <path
            d="M85 190 C105 130 70 85 25 70 C20 100 45 150 80 190 Z"
            fill="#c4b5fd"
            fillOpacity="0.9"
          />
        </g>
      </svg>
    );
  }

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
            <stop offset="35%" stopColor="#1e1b4b" stopOpacity="0.98" />
            <stop offset="70%" stopColor="#2e1065" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="nit-moon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#e0e7ff" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#818cf8" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="nit-skyline-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="nit-skyline-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="1200" height="240" fill="url(#nit-sky)" />
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
        <circle cx="680" cy="120" r="70" fill="url(#nit-moon-halo)" />
        <path d="M695 95 A32 32 0 1 0 710 145 A25 25 0 1 1 695 95 Z" fill="#fef08a" />
        <path
          d="M520 240 L520 185 L535 185 L535 175 L555 175 L555 190 L570 190 L570 165 L585 165 L585 155 L600 155 L600 190 L620 190 L620 140 L630 140 L630 130 L635 110 L640 130 L640 190 L660 190 L660 170 L680 170 L680 240 Z"
          fill="url(#nit-skyline-back)"
        />
        <path
          d="M720 240 L720 175 L740 175 L740 150 L755 150 L755 160 L775 160 L775 135 L785 125 L795 135 L795 180 L820 180 L820 155 L840 155 L840 190 L870 190 L870 160 L890 160 L890 240 Z"
          fill="url(#nit-skyline-back)"
        />
        <path
          d="M640 240 L640 180 L655 180 L655 165 L675 165 L675 190 L695 190 L695 175 L710 175 L710 160 L720 150 L720 130 L723 90 L726 130 L726 150 L735 160 L735 195 L760 195 L760 170 L780 170 L780 240 Z"
          fill="url(#nit-skyline-mid)"
        />
        <path
          d="M840 240 L840 175 L860 175 L860 145 L885 145 L885 165 L910 165 L910 135 L925 135 L925 120 L935 120 L935 180 L960 180 L960 155 L985 155 L985 195 L1020 195 L1020 240 Z"
          fill="url(#nit-skyline-mid)"
        />
        <g fill="#fde047" fillOpacity="0.8">
          <rect x="525" y="195" width="2" height="3" />
          <rect x="540" y="180" width="2" height="3" />
          <rect x="575" y="172" width="2" height="3" />
          <rect x="625" y="160" width="2" height="3" />
          <rect x="650" y="185" width="2" height="3" />
          <rect x="665" y="175" width="2" height="3" />
          <rect x="730" y="180" width="2" height="3" />
          <rect x="745" y="160" width="2" height="3" />
          <rect x="780" y="170" width="2" height="3" />
          <rect x="850" y="180" width="2" height="3" />
          <rect x="870" y="165" width="2" height="3" />
          <rect x="915" y="150" width="2" height="3" />
          <rect x="945" y="170" width="2" height="3" />
        </g>
        <line
          x1="810"
          y1="0"
          x2="810"
          y2="240"
          stroke="#334155"
          strokeWidth="8"
          strokeOpacity="0.7"
        />
        <line
          x1="810"
          y1="0"
          x2="810"
          y2="240"
          stroke="#475569"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
        <line
          x1="1080"
          y1="0"
          x2="1080"
          y2="240"
          stroke="#334155"
          strokeWidth="8"
          strokeOpacity="0.6"
        />
        <line
          x1="1080"
          y1="0"
          x2="1080"
          y2="240"
          stroke="#475569"
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
        <g id="nit-plants" transform="translate(1010, 50)">
          <path
            d="M120 190 C125 130 90 90 60 70 C50 95 65 140 115 190 Z"
            fill="#022c22"
            fillOpacity="0.6"
          />
          <path
            d="M160 190 C170 120 140 75 105 50 C95 80 115 135 155 190 Z"
            fill="#064e3b"
            fillOpacity="0.7"
          />
          <path
            d="M85 190 C95 135 60 95 20 80 C15 110 35 150 80 190 Z"
            fill="#022c22"
            fillOpacity="0.85"
          />
          <path
            d="M110 190 C130 115 85 65 40 45 C30 80 60 135 105 190 Z"
            fill="#047857"
            fillOpacity="0.75"
          />
          <path
            d="M140 190 C165 105 115 50 65 25 C55 65 90 130 135 190 Z"
            fill="#0f766e"
            fillOpacity="0.8"
          />
          <path
            d="M60 190 C70 145 40 115 5 105 C0 130 20 160 55 190 Z"
            fill="#14b8a6"
            fillOpacity="0.7"
          />
          <path
            d="M85 190 C105 130 70 85 25 70 C20 100 45 150 80 190 Z"
            fill="#2dd4bf"
            fillOpacity="0.75"
          />
        </g>
      </svg>
    );
  }

  // Default: Afternoon (Exact approved visual design reference)
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
          <stop offset="0%" stopColor="#fff8f0" />
          <stop offset="35%" stopColor="#fff1e0" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#fee2b8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="aft-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#fef08a" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="aft-sun-core" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#fde047" />
        </radialGradient>
        <linearGradient id="aft-mountain" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#fdba74" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="aft-skyline-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="aft-skyline-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect width="1200" height="240" fill="url(#aft-sky)" />
      <path
        d="M480 240 Q620 130 760 170 T1050 140 L1200 160 L1200 240 Z"
        fill="url(#aft-mountain)"
      />
      <circle cx="680" cy="180" r="140" fill="url(#aft-sun-glow)" />
      <circle cx="680" cy="180" r="52" fill="url(#aft-sun-core)" />
      <path
        d="M520 240 L520 185 L535 185 L535 175 L555 175 L555 190 L570 190 L570 165 L585 165 L585 155 L600 155 L600 190 L620 190 L620 140 L630 140 L630 130 L635 110 L640 130 L640 190 L660 190 L660 170 L680 170 L680 240 Z"
        fill="url(#aft-skyline-back)"
      />
      <path
        d="M720 240 L720 175 L740 175 L740 150 L755 150 L755 160 L775 160 L775 135 L785 125 L795 135 L795 180 L820 180 L820 155 L840 155 L840 190 L870 190 L870 160 L890 160 L890 240 Z"
        fill="url(#aft-skyline-back)"
      />
      <path
        d="M640 240 L640 180 L655 180 L655 165 L675 165 L675 190 L695 190 L695 175 L710 175 L710 160 L720 150 L720 130 L723 90 L726 130 L726 150 L735 160 L735 195 L760 195 L760 170 L780 170 L780 240 Z"
        fill="url(#aft-skyline-mid)"
      />
      <path
        d="M840 240 L840 175 L860 175 L860 145 L885 145 L885 165 L910 165 L910 135 L925 135 L925 120 L935 120 L935 180 L960 180 L960 155 L985 155 L985 195 L1020 195 L1020 240 Z"
        fill="url(#aft-skyline-mid)"
      />
      <line
        x1="810"
        y1="0"
        x2="810"
        y2="240"
        stroke="#ffffff"
        strokeWidth="8"
        strokeOpacity="0.45"
      />
      <line
        x1="810"
        y1="0"
        x2="810"
        y2="240"
        stroke="#cbd5e1"
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />
      <line
        x1="1080"
        y1="0"
        x2="1080"
        y2="240"
        stroke="#ffffff"
        strokeWidth="8"
        strokeOpacity="0.4"
      />
      <line
        x1="1080"
        y1="0"
        x2="1080"
        y2="240"
        stroke="#cbd5e1"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <g id="aft-plants" transform="translate(1010, 50)">
        <path
          d="M120 190 C125 130 90 90 60 70 C50 95 65 140 115 190 Z"
          fill="#14532d"
          fillOpacity="0.45"
        />
        <path
          d="M160 190 C170 120 140 75 105 50 C95 80 115 135 155 190 Z"
          fill="#166534"
          fillOpacity="0.55"
        />
        <path
          d="M190 190 C200 110 170 60 130 35 C120 70 145 130 185 190 Z"
          fill="#14532d"
          fillOpacity="0.5"
        />
        <path
          d="M85 190 C95 135 60 95 20 80 C15 110 35 150 80 190 Z"
          fill="#15803d"
          fillOpacity="0.75"
        />
        <path
          d="M110 190 C130 115 85 65 40 45 C30 80 60 135 105 190 Z"
          fill="#16a34a"
          fillOpacity="0.85"
        />
        <path
          d="M140 190 C165 105 115 50 65 25 C55 65 90 130 135 190 Z"
          fill="#22c55e"
          fillOpacity="0.8"
        />
        <path
          d="M165 190 C190 115 145 60 95 30 C85 70 120 135 160 190 Z"
          fill="#16a34a"
          fillOpacity="0.7"
        />
        <path
          d="M60 190 C70 145 40 115 5 105 C0 130 20 160 55 190 Z"
          fill="#4ade80"
          fillOpacity="0.9"
        />
        <path
          d="M85 190 C105 130 70 85 25 70 C20 100 45 150 80 190 Z"
          fill="#86efac"
          fillOpacity="0.95"
        />
        <path
          d="M115 190 C135 120 95 75 50 55 C42 88 72 145 110 190 Z"
          fill="#4ade80"
          fillOpacity="0.85"
        />
        <path
          d="M85 190 Q65 130 25 70"
          stroke="#bbf7d0"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.8"
        />
        <path
          d="M115 190 Q95 120 50 55"
          stroke="#bbf7d0"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.8"
        />
        <path
          d="M140 190 Q115 105 65 25"
          stroke="#86efac"
          strokeWidth="1.5"
          fill="none"
          strokeOpacity="0.7"
        />
      </g>
    </svg>
  );
};

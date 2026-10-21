import React, { useMemo } from 'react';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface HeroSceneIllustrationProps {
  period: TimePeriod;
  now?: Date;
  className?: string;
}

export const HeroSceneIllustration: React.FC<HeroSceneIllustrationProps> = ({
  period,
  now,
  className,
}) => {
  // ── Celestial trajectory: Sun by day (06:00 - 18:30), Moon at remaining (18:30 - 06:00) ──
  const SUNRISE_MIN = 6 * 60; // 360 (6:00 AM)
  const SUNSET_MIN = 18 * 60 + 30; // 1110 (6:30 PM)
  const DAY_MINUTES = SUNSET_MIN - SUNRISE_MIN; // 750 minutes (12.5 hrs)
  const NIGHT_MINUTES = 24 * 60 - DAY_MINUTES; // 690 minutes (11.5 hrs)

  const { isDaylight, sunX, sunY, isDawn, isDusk, isMoonActive, moonX, moonY } = useMemo(() => {
    let daylight = false;
    let sunProg = 0.5;
    let moonActive = false;
    let moonProg = 0.5;

    if (now) {
      const totalMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
      if (totalMinutes >= SUNRISE_MIN && totalMinutes <= SUNSET_MIN) {
        daylight = true;
        sunProg = (totalMinutes - SUNRISE_MIN) / DAY_MINUTES;
        moonActive = false;
      } else {
        daylight = false;
        moonActive = true;
        let nightElapsed = 0;
        if (totalMinutes > SUNSET_MIN) {
          nightElapsed = totalMinutes - SUNSET_MIN;
        } else {
          nightElapsed = totalMinutes + (24 * 60 - SUNSET_MIN);
        }
        moonProg = nightElapsed / NIGHT_MINUTES;
      }
    } else {
      // Fallback based on period if `now` is omitted
      if (period === 'morning') {
        daylight = true;
        sunProg = 0.25; // ~9:07 AM
        moonActive = false;
      } else if (period === 'afternoon') {
        daylight = true;
        sunProg = 0.5; // ~12:15 PM
        moonActive = false;
      } else if (period === 'evening') {
        daylight = true;
        sunProg = 0.88; // ~5:00 PM
        moonActive = false;
      } else {
        daylight = false;
        moonActive = true;
        moonProg = 0.5; // midnight zenith
      }
    }

    // Sun trajectory arc across the sky:
    // Starts at East horizon (x: 480, y: 185) at 6:00 AM,
    // Peaks at zenith (x: 700, y: 60) at 12:15 PM,
    // Reaches West horizon (x: 920, y: 185) at 6:30 PM.
    const sx = Math.round((480 + sunProg * 440) * 10) / 10;
    const salt = Math.sin(sunProg * Math.PI) * 125;
    const sy = Math.round((185 - salt) * 10) / 10;

    // Moon trajectory arc across the sky for the remaining hours:
    // Starts at East horizon (x: 480, y: 185) at 6:30 PM (18:30),
    // Peaks at zenith (x: 700, y: 70) at midnight (00:15 AM),
    // Sets at West horizon (x: 920, y: 185) at 6:00 AM (06:00).
    const mx = Math.round((480 + moonProg * 440) * 10) / 10;
    const malt = Math.sin(moonProg * Math.PI) * 115;
    const my = Math.round((185 - malt) * 10) / 10;

    return {
      isDaylight: daylight,
      sunX: sx,
      sunY: sy,
      isDawn: sunProg < 0.15,
      isDusk: sunProg > 0.85,
      isMoonActive: moonActive,
      moonX: mx,
      moonY: my,
    };
  }, [now, period]);

  // Shared Mild Mountain ("mount") horizon paths for the landscape
  const DISTANT_MOUNT_PATH =
    'M320 240 L320 196 C420 190, 480 174, 550 175 C620 176, 670 188, 730 184 C790 180, 840 168, 900 170 C960 172, 1020 186, 1100 182 C1150 179, 1180 184, 1200 186 L1200 240 Z';

  const MID_MOUNT_PATH =
    'M400 240 L400 204 C470 198, 540 182, 610 181 C680 180, 750 194, 820 190 C890 186, 960 178, 1030 183 C1100 188, 1160 195, 1200 193 L1200 240 Z';

  const FRONT_MOUNT_PATH =
    'M480 240 L480 216 C570 210, 650 196, 740 194 C820 192, 900 204, 990 200 C1080 196, 1150 206, 1200 204 L1200 240 Z';

  // Shared Celestial Gradients (Sun & Moon)
  const celestialDefs = (
    <>
      {/* ── Sun Gradients (Warm golden cream & pearl white, strictly non-red) ── */}
      <radialGradient id="bezent-sun-core" cx="38%" cy="38%" r="62%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="35%" stopColor="#fffdf0" />
        <stop offset="70%" stopColor={isDusk ? '#fde68a' : isDawn ? '#fef08a' : '#fef08a'} />
        <stop
          offset="100%"
          stopColor={isDusk ? '#fcd34d' : isDawn ? '#fcd34d' : '#facc15'}
          stopOpacity="0.85"
        />
      </radialGradient>

      <radialGradient id="bezent-sun-mid" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
        <stop offset="40%" stopColor="#fef3c7" stopOpacity="0.4" />
        <stop
          offset="80%"
          stopColor={isDusk ? '#fed7aa' : isDawn ? '#fed7aa' : '#fef9c3'}
          stopOpacity="0.15"
        />
        <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
      </radialGradient>

      <radialGradient id="bezent-sun-outer" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fffbeb" stopOpacity="0.45" />
        <stop
          offset="55%"
          stopColor={isDusk ? '#fde68a' : isDawn ? '#fed7aa' : '#fef08a'}
          stopOpacity="0.18"
        />
        <stop offset="100%" stopColor="#f0f5ff" stopOpacity="0" />
      </radialGradient>

      {/* ── Moon Gradients (Silvery pearl glow & crisp celestial halo) ── */}
      <radialGradient id="bezent-moon-halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
        <stop offset="35%" stopColor="#e0e7ff" stopOpacity="0.45" />
        <stop offset="70%" stopColor="#c7d2fe" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
      </radialGradient>

      <radialGradient id="bezent-moon-outer" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.38" />
        <stop offset="55%" stopColor="#c7d2fe" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#312e81" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="bezent-moon-core" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#f8fafc" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
    </>
  );

  const renderSun = () => {
    if (!isDaylight) return null;

    return (
      <g id="bezent-dynamic-sun" transform={`translate(${sunX}, ${sunY})`}>
        {/* 1. Broad outer atmospheric glow (gentle translucent warmth) */}
        <circle cx="0" cy="0" r="58" fill="url(#bezent-sun-outer)" />

        {/* 2. Middle radiant halo */}
        <circle cx="0" cy="0" r="34" fill="url(#bezent-sun-mid)" />

        {/* 3. Delicate celestial dashed ray ring */}
        <circle
          cx="0"
          cy="0"
          r="24"
          fill="none"
          stroke={isDusk ? '#fed7aa' : '#fef08a'}
          strokeWidth="1.2"
          strokeDasharray="4 3"
          opacity="0.45"
        />

        {/* 4. Soft inner halo */}
        <circle cx="0" cy="0" r="18" fill="#fffdf0" opacity="0.5" />

        {/* 5. Core Sun disc (warm golden cream & pearl, strictly non-red) */}
        <circle cx="0" cy="0" r="15" fill="url(#bezent-sun-core)" />

        {/* 6. Specular pearl reflection */}
        <ellipse cx="-4" cy="-4" rx="5" ry="3.5" fill="#ffffff" opacity="0.8" />
      </g>
    );
  };

  const renderMoon = () => {
    if (!isMoonActive) return null;

    return (
      <g id="bezent-dynamic-moon" transform={`translate(${moonX}, ${moonY})`}>
        {/* Outer ambient lunar glow */}
        <circle cx="0" cy="0" r="48" fill="url(#bezent-moon-outer)" />

        {/* Radiant inner halo */}
        <circle cx="0" cy="0" r="28" fill="url(#bezent-moon-halo)" />

        {/* Delicate lunar dashed orbit ring */}
        <circle
          cx="0"
          cy="0"
          r="22"
          fill="none"
          stroke="#c7d2fe"
          strokeWidth="0.8"
          strokeDasharray="3 3"
          opacity="0.4"
        />

        {/* Pearl-silver crescent moon */}
        <path
          id="bezent-night-moon"
          d="M7 -17 A20 20 0 1 0 16 16 A15 15 0 1 1 7 -17 Z"
          fill="url(#bezent-moon-core)"
        />

        {/* Specular soft highlight */}
        <ellipse cx="-4" cy="-4" rx="4" ry="2.5" fill="#ffffff" opacity="0.75" />
      </g>
    );
  };

  // Morning: Fresh pastel mint, soft sky blue, gentle lavender glow
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
          <linearGradient id="mor-mount-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="mor-mount-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#dcfce7" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="mor-mount-front" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.05" />
          </linearGradient>
          {celestialDefs}
        </defs>

        {/* Sky Background */}
        <rect width="1200" height="240" fill="url(#mor-sky)" />

        {/* Pre-dawn stars if before 6:00 AM */}
        {isMoonActive && (
          <g fill="#ffffff" fillOpacity="0.55">
            <circle cx="580" cy="50" r="1.5" />
            <circle cx="720" cy="40" r="1.5" />
            <circle cx="860" cy="65" r="1.5" />
          </g>
        )}

        {/* 1. Distant Mild Mountain Ridge */}
        <path d={DISTANT_MOUNT_PATH} fill="url(#mor-mount-back)" />

        {/* 2. Celestial Body: Sun by day (06:00 - 18:30) / Moon at remaining */}
        {renderSun()}
        {renderMoon()}

        {/* 3. Mid Mild Foothill Mound */}
        <path d={MID_MOUNT_PATH} fill="url(#mor-mount-mid)" />

        {/* 4. Foreground Gentle Slope */}
        <path d={FRONT_MOUNT_PATH} fill="url(#mor-mount-front)" />

        {/* Soft botanical accents */}
        <g id="mor-plants" transform="translate(1020, 60)" opacity="0.6">
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

  // Evening: Soft lavender, dreamy periwinkle, delicate blush mist
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
          <linearGradient id="eve-mount-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="eve-mount-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#fef3c7" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="eve-mount-front" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#f5f3ff" stopOpacity="0.06" />
          </linearGradient>
          {celestialDefs}
        </defs>

        {/* Sky Background */}
        <rect width="1200" height="240" fill="url(#eve-sky)" />

        {/* Twilight stars if after 6:30 PM */}
        {isMoonActive && (
          <g fill="#ffffff" fillOpacity="0.6">
            <circle cx="530" cy="55" r="1.5" />
            <circle cx="680" cy="45" r="1.5" />
            <circle cx="820" cy="60" r="1.5" />
            <circle cx="950" cy="40" r="1.5" />
          </g>
        )}

        {/* 1. Distant Mild Mountain Ridge */}
        <path d={DISTANT_MOUNT_PATH} fill="url(#eve-mount-back)" />

        {/* 2. Celestial Body: Sun by day (06:00 - 18:30) / Moon at remaining */}
        {renderSun()}
        {renderMoon()}

        {/* 3. Mid Mild Foothill Mound */}
        <path d={MID_MOUNT_PATH} fill="url(#eve-mount-mid)" />

        {/* 4. Foreground Gentle Slope */}
        <path d={FRONT_MOUNT_PATH} fill="url(#eve-mount-front)" />

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
            fill="#f472b6"
            fillOpacity="0.35"
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
          <linearGradient id="nit-mount-back" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#312e81" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="nit-mount-mid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="nit-mount-front" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.3" />
          </linearGradient>
          {celestialDefs}
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

        {/* 1. Distant Mountain Silhouette under Moonlight */}
        <path d={DISTANT_MOUNT_PATH} fill="url(#nit-mount-back)" />

        {/* 2. Celestial Moon (Trajectories across midnight sky over mild mount) */}
        {renderMoon()}

        {/* 3. Mid Mountain Mound in Night Slate */}
        <path d={MID_MOUNT_PATH} fill="url(#nit-mount-mid)" />

        {/* 4. Foreground Mountain Silhouette */}
        <path d={FRONT_MOUNT_PATH} fill="url(#nit-mount-front)" />
      </svg>
    );
  }

  // Afternoon / Default: Approved enterprise pastel gradient with mild mountains
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
        <linearGradient id="aft-mount-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="aft-mount-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ddf7e9" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="aft-mount-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#f0f5ff" stopOpacity="0.05" />
        </linearGradient>
        {celestialDefs}
      </defs>

      {/* Sky Background */}
      <rect width="1200" height="240" fill="url(#aft-sky)" />

      {/* 1. Distant Mild Mountain Ridge */}
      <path d={DISTANT_MOUNT_PATH} fill="url(#aft-mount-back)" />

      {/* 2. Celestial Body: Sun by day (06:00 - 18:30) / Moon at remaining */}
      {renderSun()}
      {renderMoon()}

      {/* 3. Mid Mild Foothill Mound */}
      <path d={MID_MOUNT_PATH} fill="url(#aft-mount-mid)" />

      {/* 4. Foreground Gentle Slope */}
      <path d={FRONT_MOUNT_PATH} fill="url(#aft-mount-front)" />

      {/* Modern botanical accent */}
      <g id="aft-plants" transform="translate(1020, 55)" opacity="0.6">
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

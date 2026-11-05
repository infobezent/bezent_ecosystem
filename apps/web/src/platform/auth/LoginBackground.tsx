import React from 'react';

const BEZENT_WORDMARK_PATH =
  'M263 723C420 723 530 615 530 460C530 296 408 203 279 203C199 203 131 239 95 303V0H0V459C0 620 110 723 263 723ZM264 635C163 635 95 563 95 463C95 363 163 291 264 291C366 291 434 363 434 463C434 563 366 635 264 635Z M854 723C969 723 1059 664 1097 572H992C963 615 918 635 854 635C768 635 702 586 688 498H1118V463C1118 313 1010 203 854 203C698 203 588 313 588 463C588 613 698 723 854 723ZM691 413C710 335 772 291 854 291C934 291 999 334 1018 413Z M1173 710H1628V625H1300L1618 294V216H1188V301H1491L1173 632Z M1954 723C2069 723 2159 664 2197 572H2092C2063 615 2018 635 1954 635C1868 635 1802 586 1788 498H2218V463C2218 313 2110 203 1954 203C1798 203 1688 313 1688 463C1688 613 1798 723 1954 723ZM1791 413C1810 335 1872 291 1954 291C2034 291 2099 334 2118 413Z M2296 710H2391V453C2391 346 2450 291 2540 291C2630 291 2689 346 2689 453V710H2784V453C2784 287 2686 203 2540 203C2394 203 2296 288 2296 453Z M3080 723C3198 723 3278 657 3278 523V512H3184V523C3184 602 3142 635 3080 635C3018 635 2977 601 2977 523V303H3249V216H2977V41H2882V523C2882 657 2962 723 3080 723Z';

/**
 * Environmental Blue Atmosphere with complete, recognizable "BEZENT" watermark typography.
 * The complete 6-letter wordmark spans 75-85% of the viewport width, sitting in the
 * environmental depth layer behind the translucent glass login card.
 */
export const LoginBackground: React.FC = () => {
  return (
    <div className="bezent-login-bg" aria-hidden="true">
      {/* 1. Volumetric Ambient Lighting Layers */}
      <div className="bezent-login-bg__ambient-glow bezent-login-bg__ambient-glow--top-left" />
      <div className="bezent-login-bg__ambient-glow bezent-login-bg__ambient-glow--bottom-right" />
      <div className="bezent-login-bg__ambient-glow bezent-login-bg__ambient-glow--center" />

      {/* 2. Large Architectural "BEZENT" Wordmark: Top Half Glow + Bottom Half Faded */}
      <div className="bezent-login-bg__wordmark-wrap">
        <svg
          className="bezent-login-bg__wordmark-svg"
          viewBox="0 0 1600 440"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Primary vertical outline gradient: upper half luminous cyan/white, lower half fading to 0% opacity */}
            <linearGradient id="bezentOutlineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
              <stop offset="20%" stopColor="#38bdf8" stopOpacity="0.82" />
              <stop offset="42%" stopColor="#0284c7" stopOpacity="0.55" />
              <stop offset="65%" stopColor="#0369a1" stopOpacity="0.2" />
              <stop offset="85%" stopColor="#075985" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#082f49" stopOpacity="0" />
            </linearGradient>

            {/* Light Mode Outline Gradient: crisp azure / brand blue upper half fading to 0% */}
            <linearGradient id="bezentOutlineGradLight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="22%" stopColor="#0369a1" stopOpacity="0.65" />
              <stop offset="45%" stopColor="#0284c7" stopOpacity="0.4" />
              <stop offset="68%" stopColor="#38bdf8" stopOpacity="0.15" />
              <stop offset="85%" stopColor="#bae6fd" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
            </linearGradient>

            {/* Top-half specular gleam: luminous white/cyan rim reflections on upper edges */}
            <linearGradient id="bezentTopSpecularGleam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="14%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="28%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="48%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="65%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="82%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
            </linearGradient>

            {/* Light Mode Top Specular Gleam */}
            <linearGradient id="bezentTopSpecularGleamLight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
              <stop offset="14%" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="28%" stopColor="#0284c7" stopOpacity="0.35" />
              <stop offset="48%" stopColor="#003566" stopOpacity="0.95" />
              <stop offset="65%" stopColor="#0284c7" stopOpacity="0.3" />
              <stop offset="82%" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
            </linearGradient>

            {/* Vertical mask strictly restricting specular glow to the upper half */}
            <linearGradient id="topHalfFadeMask" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="38%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#000000" />
              <stop offset="100%" stopColor="#000000" />
            </linearGradient>

            <mask id="bezentTopGleamMask">
              <rect x="0" y="0" width="1600" height="440" fill="url(#topHalfFadeMask)" />
            </mask>

            <filter id="atmosphericTopGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blurGlow" />
              <feMerge>
                <feMergeNode in="blurGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Base outlined letterforms with top glow & bottom fade */}
          <g transform="translate(125, 71) scale(0.411836)">
            <path
              d={BEZENT_WORDMARK_PATH}
              className="bezent-login-bg__wordmark-text"
              stroke="url(#bezentOutlineGrad)"
              strokeWidth="4"
              fill="none"
            />
          </g>

          {/* 2. Upper half specular edge glow overlay */}
          <g transform="translate(125, 71) scale(0.411836)">
            <path
              d={BEZENT_WORDMARK_PATH}
              className="bezent-login-bg__wordmark-text bezent-login-bg__wordmark-text--gleam"
              stroke="url(#bezentTopSpecularGleam)"
              strokeWidth="3.2"
              fill="none"
              mask="url(#bezentTopGleamMask)"
              filter="url(#atmosphericTopGlow)"
            />
          </g>
        </svg>
      </div>

      {/* 3. Atmospheric depth vignette */}
      <div className="bezent-login-bg__overlay" />
    </div>
  );
};

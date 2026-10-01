import React from 'react';

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
          <text
            x="50%"
            y="52%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="bezent-login-bg__wordmark-text"
            stroke="url(#bezentOutlineGrad)"
            strokeWidth="1.4"
            fill="none"
          >
            BEZENT
          </text>

          {/* 2. Upper half specular edge glow overlay */}
          <text
            x="50%"
            y="52%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="bezent-login-bg__wordmark-text bezent-login-bg__wordmark-text--gleam"
            stroke="url(#bezentTopSpecularGleam)"
            strokeWidth="1.1"
            fill="none"
            mask="url(#bezentTopGleamMask)"
            filter="url(#atmosphericTopGlow)"
          >
            BEZENT
          </text>
        </svg>
      </div>

      {/* 3. Atmospheric depth vignette */}
      <div className="bezent-login-bg__overlay" />
    </div>
  );
};

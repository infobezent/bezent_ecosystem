import type { JSX } from 'react';

/**
 * BEZENT Icon System — Punch Logs KPI Card Infographic Illustrations
 *
 * Custom, domain-relevant graphical icon illustrations specifically crafted
 * for Attendance Punch Logs KPI cards:
 * 1. Total Punches — Biometric Fingerprint Scanner with Luminous Beam
 * 2. Accepted — Verification Badge with Dimensional Checkmark
 * 3. Flagged — Warning Alert & Investigation Triangle with Radar Pulses
 * 4. Rejected — Rejection Circular Shield with Bold Cancellation Cross
 * 5. Failed to Process — Enterprise Server Rack with Offline Alert Beacon
 *
 * Governed by ADR-015 and AGENTS.md Article 10.
 */

export interface GraphicIconProps {
  size?: number;
  className?: string;
}

/**
 * 1. Total Punches — Biometric Fingerprint Scanner Illustration
 * Features concentric biometric ridges, viewfinder corner brackets, and a luminous scanning beam.
 */
export function FingerprintGraphic({ size = 54, className }: GraphicIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`bezent-kpi-svg-graphic bezent-kpi-svg-graphic--total bezent-infographic-icon--fingerprint ${className || ''}`}
    >
      <defs>
        <linearGradient id="bzt-fp-ridge-grad" x1="12" y1="12" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="bzt-fp-bracket-grad" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="bzt-fp-laser-beam" x1="8" y1="0" x2="52" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="25%" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="75%" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Viewfinder Corner Brackets */}
      <path
        d="M 12 18 L 12 13 C 12 11.5, 12.5 11, 14 11 L 19 11"
        stroke="url(#bzt-fp-bracket-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M 41 11 L 46 11 C 47.5 11, 48 11.5, 48 13 L 48 18"
        stroke="url(#bzt-fp-bracket-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M 12 42 L 12 47 C 12 48.5, 12.5 49, 14 49 L 19 49"
        stroke="url(#bzt-fp-bracket-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M 41 49 L 46 49 C 47.5 49, 48 48.5, 48 47 L 48 42"
        stroke="url(#bzt-fp-bracket-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Biometric Fingerprint Ridges */}
      <g stroke="url(#bzt-fp-ridge-grad)" strokeLinecap="round" fill="none">
        {/* Core loop */}
        <path d="M 30 26 C 28.5 26, 27 27.2, 27 29 L 27 33" strokeWidth="2.4" />
        <path d="M 30 22 C 26 22, 23.5 25, 23.5 29 L 23.5 35 C 23.5 36.5, 24.5 37.5, 26 38" strokeWidth="2.4" />
        <path d="M 30 18 C 23 18, 19.5 22.5, 19.5 29 L 19.5 36 C 19.5 38.5, 21 40.5, 23.5 41.5" strokeWidth="2.4" />
        <path d="M 30 26 C 31.5 26, 33 27.5, 33 29 L 33 36 C 33 38.5, 31.5 40.5, 29 42" strokeWidth="2.4" />
        <path d="M 34 22 C 35.8 23.8, 36.5 26.2, 36.5 29 L 36.5 37" strokeWidth="2.4" />
        <path d="M 37.5 19 C 39.5 21.5, 40.5 25, 40.5 29 L 40.5 35 C 40.5 37, 39.5 39, 38 40.5" strokeWidth="2.4" />
      </g>

      {/* Glowing Laser Scan Beam */}
      <line x1="8" y1="30" x2="52" y2="30" stroke="url(#bzt-fp-laser-beam)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="30" cy="30" r="2.5" fill="#ffffff" />
    </svg>
  );
}

/**
 * 2. Accepted — Verification Success Badge Illustration
 * Features layered verification ring, prominent dimensional checkmark, and victory sparkles.
 */
export function AcceptedGraphic({ size = 54, className }: GraphicIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`bezent-kpi-svg-graphic bezent-kpi-svg-graphic--accepted bezent-infographic-icon--accepted ${className || ''}`}
    >
      <defs>
        <linearGradient id="bzt-acc-ring-grad" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="bzt-acc-check-grad" x1="16" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Soft Tinted Circular Backdrop */}
      <circle cx="30" cy="30" r="21" fill="#ecfdf5" fillOpacity="0.75" />

      {/* Outer Verification Ring with Breathing Notch */}
      <circle
        cx="30"
        cy="30"
        r="21"
        stroke="url(#bzt-acc-ring-grad)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray="95 12"
      />

      {/* Inner Accent Arc */}
      <path
        d="M 17 20 A 16 16 0 0 1 38 15"
        stroke="#34d399"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Bold Dimensional Checkmark */}
      <path
        d="M 18 31 L 26 39 L 43 20"
        stroke="url(#bzt-acc-check-grad)"
        strokeWidth="4.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Verification Sparkle Dots */}
      <circle cx="46" cy="15" r="2.2" fill="#10b981" />
      <circle cx="14" cy="43" r="1.6" fill="#34d399" />
    </svg>
  );
}

/**
 * 3. Flagged — Warning Alert & Investigation Illustration
 * Features dimensional alert triangle, prominent exclamation mark, and radar pulse waves.
 */
export function FlaggedGraphic({ size = 54, className }: GraphicIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`bezent-kpi-svg-graphic bezent-kpi-svg-graphic--flagged bezent-infographic-icon--flagged ${className || ''}`}
    >
      <defs>
        <linearGradient id="bzt-flag-tri-grad" x1="12" y1="12" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Soft Tinted Triangular Backdrop */}
      <path
        d="M 30 11 C 31.8 11, 33 12.2, 33.8 13.6 L 47.8 38.6 C 48.8 40.4, 47.6 43, 45.4 43 L 14.6 43 C 12.4 43, 11.2 40.4, 12.2 38.6 L 26.2 13.6 C 27 12.2, 28.2 11, 30 11 Z"
        fill="#fffbeb"
        fillOpacity="0.8"
      />

      {/* Dimensional Warning Triangle Frame */}
      <path
        d="M 30 11 C 31.8 11, 33 12.2, 33.8 13.6 L 47.8 38.6 C 48.8 40.4, 47.6 43, 45.4 43 L 14.6 43 C 12.4 43, 11.2 40.4, 12.2 38.6 L 26.2 13.6 C 27 12.2, 28.2 11, 30 11 Z"
        stroke="url(#bzt-flag-tri-grad)"
        strokeWidth="3.6"
        strokeLinejoin="round"
      />

      {/* Exclamation Mark */}
      <line x1="30" y1="21" x2="30" y2="31.5" stroke="#d97706" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="30" cy="37.5" r="2.2" fill="#d97706" />

      {/* Radar Attention Pulses */}
      <path
        d="M 9 26 A 23 23 0 0 0 13 41"
        stroke="#f59e0b"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M 51 26 A 23 23 0 0 1 47 41"
        stroke="#f59e0b"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * 4. Rejected — Rejection / Disallowed Punch Illustration
 * Features dynamic circular denial ring, bold dimensional cross, and stopping accents.
 */
export function RejectedGraphic({ size = 54, className }: GraphicIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`bezent-kpi-svg-graphic bezent-kpi-svg-graphic--rejected bezent-infographic-icon--rejected ${className || ''}`}
    >
      <defs>
        <linearGradient id="bzt-rej-ring-grad" x1="10" y1="10" x2="50" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="bzt-rej-cross-grad" x1="18" y1="18" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
      </defs>

      {/* Soft Tinted Circular Backdrop */}
      <circle cx="30" cy="30" r="21" fill="#fff1f2" fillOpacity="0.8" />

      {/* Outer Denial Ring with Dynamic Gap */}
      <circle
        cx="30"
        cy="30"
        r="21"
        stroke="url(#bzt-rej-ring-grad)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray="95 12"
      />

      {/* Inner Accent Arc */}
      <path
        d="M 43 20 A 16 16 0 0 1 38 43"
        stroke="#fb7185"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Bold Dimensional Cancellation Cross (X) */}
      <line x1="20" y1="20" x2="40" y2="40" stroke="url(#bzt-rej-cross-grad)" strokeWidth="4.8" strokeLinecap="round" />
      <line x1="40" y1="20" x2="20" y2="40" stroke="url(#bzt-rej-cross-grad)" strokeWidth="4.8" strokeLinecap="round" />

      {/* Accent Indicator Dots */}
      <circle cx="15" cy="15" r="2" fill="#f43f5e" />
      <circle cx="45" cy="45" r="1.6" fill="#fb7185" />
    </svg>
  );
}

/**
 * 5. Failed to Process — Enterprise Server Rack & Terminal Failure Illustration
 * Features stacked enterprise server blades, disk slots, status LEDs, and a floating alert beacon.
 */
export function FailedToProcessGraphic({ size = 54, className }: GraphicIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`bezent-kpi-svg-graphic bezent-kpi-svg-graphic--failed bezent-infographic-icon--failed ${className || ''}`}
    >
      <defs>
        <linearGradient id="bzt-fail-blade1" x1="11" y1="13" x2="49" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ede9fe" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </linearGradient>
        <linearGradient id="bzt-fail-blade2" x1="11" y1="31" x2="49" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="100%" stopColor="#ede9fe" />
        </linearGradient>
        <linearGradient id="bzt-fail-srv-stroke" x1="11" y1="13" x2="49" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="bzt-fail-alert-grad" x1="39" y1="7" x2="49" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Subtle Background Sync Processing Orbit */}
      <path
        d="M 8 32 A 23 23 0 0 1 40 8"
        stroke="#c4b5fd"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />

      {/* Upper Server Blade Tier */}
      <rect
        x="11"
        y="14"
        width="38"
        height="13"
        rx="3.5"
        fill="url(#bzt-fail-blade1)"
        stroke="url(#bzt-fail-srv-stroke)"
        strokeWidth="2.2"
      />
      {/* Upper Blade Drive Slots */}
      <line x1="16" y1="20.5" x2="33" y2="20.5" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
      {/* Upper Blade Normal LED */}
      <circle cx="42" cy="20.5" r="2" fill="#38bdf8" />

      {/* Lower Server Blade Tier */}
      <rect
        x="11"
        y="32"
        width="38"
        height="13"
        rx="3.5"
        fill="url(#bzt-fail-blade2)"
        stroke="url(#bzt-fail-srv-stroke)"
        strokeWidth="2.2"
      />
      {/* Lower Blade Drive Slots */}
      <line x1="16" y1="38.5" x2="33" y2="38.5" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
      {/* Lower Blade Error LED */}
      <circle cx="42" cy="38.5" r="2" fill="#ef4444" />

      {/* Floating Alert Beacon Badge at Top-Right */}
      <circle cx="44" cy="13" r="6" fill="url(#bzt-fail-alert-grad)" stroke="#ffffff" strokeWidth="1.8" />
      <line x1="44" y1="10.2" x2="44" y2="13.2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="44" cy="15.8" r="0.75" fill="#ffffff" />
    </svg>
  );
}

// Canonical aliases for convenient importing
export const PunchTotalGraphic = FingerprintGraphic;
export const PunchAcceptedGraphic = AcceptedGraphic;
export const PunchFlaggedGraphic = FlaggedGraphic;
export const PunchRejectedGraphic = RejectedGraphic;
export const PunchFailedGraphic = FailedToProcessGraphic;

/**
 * Registry of graphic illustrations for BezentIcon variant="graphic".
 */
export const GRAPHIC_ICON_DEFINITIONS: Record<string, (props: { size?: number }) => JSX.Element> = {
  fingerprint: FingerprintGraphic,
  scanner: FingerprintGraphic,
  check_circle: AcceptedGraphic,
  checkCircle: AcceptedGraphic,
  warning: FlaggedGraphic,
  alertTriangle: FlaggedGraphic,
  cancel: RejectedGraphic,
  x_circle: RejectedGraphic,
  error: FailedToProcessGraphic,
  circleAlert: FailedToProcessGraphic,
  serverError: FailedToProcessGraphic,
};

export const GRAPHIC_ICON_MAP = GRAPHIC_ICON_DEFINITIONS;

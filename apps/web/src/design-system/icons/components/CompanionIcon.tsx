import type { BezentIconName } from '../definitions';
import { BezentIcon } from './BezentIcon';

export interface CompanionIconProps {
  name: BezentIconName | string;
  size?: number;
  active?: boolean;
  className?: string;
}

/**
 * Renders the Google Workspace side panel companion iconography
 * (Calendar [31], Keep [Lightbulb], Tasks [Checkmark badge], Approvals [Avatar]).
 * Falls back to canonical BezentIcon for other icon concepts.
 */
export function CompanionIcon({ name, size = 20, active, className }: CompanionIconProps) {
  const normalized = (name || '').toLowerCase().trim();

  switch (normalized) {
    case 'calendar':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <defs>
            <linearGradient id="bezent-cal-header" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="bezent-cal-card" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
            <filter id="bezent-cal-shadow" x="-10%" y="-10%" width="120%" height="125%">
              <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodOpacity="0.15" />
            </filter>
          </defs>
          <g filter="url(#bezent-cal-shadow)">
            {/* Card base with soft rounded corners */}
            <rect
              x="3"
              y="3.5"
              width="18"
              height="17.5"
              rx="3.5"
              fill="url(#bezent-cal-card)"
              stroke="#cbd5e1"
              strokeWidth="0.75"
            />
            {/* Sleek top header band */}
            <path
              d="M3 7a3.5 3.5 0 0 1 3.5-3.5h11A3.5 3.5 0 0 1 21 7v2H3V7z"
              fill="url(#bezent-cal-header)"
            />
            {/* Header eyelet pins */}
            <circle cx="7.5" cy="6.2" r="0.9" fill="#ffffff" opacity="0.85" />
            <circle cx="16.5" cy="6.2" r="0.9" fill="#ffffff" opacity="0.85" />
            {/* 3x3 Schedule Grid */}
            {/* Row 1 */}
            <rect x="6" y="11" width="3" height="2" rx="1" fill="#94a3b8" />
            <rect x="10.5" y="11" width="3" height="2" rx="1" fill="#94a3b8" />
            <rect x="15" y="11" width="3" height="2" rx="1" fill="#94a3b8" />
            {/* Row 2 (with active event) */}
            <rect x="6" y="14.2" width="3" height="2" rx="1" fill="#94a3b8" />
            <rect x="10.5" y="14.2" width="3" height="2" rx="1" fill="#2563eb" />
            <rect x="15" y="14.2" width="3" height="2" rx="1" fill="#94a3b8" />
            {/* Row 3 */}
            <rect x="6" y="17.4" width="3" height="2" rx="1" fill="#cbd5e1" />
            <rect x="10.5" y="17.4" width="3" height="2" rx="1" fill="#cbd5e1" />
            <rect x="15" y="17.4" width="3" height="2" rx="1" fill="#cbd5e1" />
          </g>
        </svg>
      );

    case 'notes':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <defs>
            <linearGradient id="bezent-notes-sheet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd54f" />
              <stop offset="50%" stopColor="#ffb300" />
              <stop offset="100%" stopColor="#f57c00" />
            </linearGradient>
            <linearGradient id="bezent-notes-fold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff8e1" />
              <stop offset="100%" stopColor="#ffe082" />
            </linearGradient>
            <filter id="bezent-notes-shadow" x="-10%" y="-10%" width="120%" height="125%">
              <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodOpacity="0.15" />
            </filter>
          </defs>
          <g filter="url(#bezent-notes-shadow)">
            {/* Note body with folded bottom-right corner */}
            <path
              d="M5 3.5h14a2 2 0 0 1 2 2v9.5a1 1 0 0 1-.29.71l-5.5 5.5a1 1 0 0 1-.71.29H5a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2z"
              fill="url(#bezent-notes-sheet)"
            />
            {/* Folded flap */}
            <path
              d="M14.5 15.5v4.79a.5.5 0 0 0 .85.35l4.79-4.79a.5.5 0 0 0-.35-.85H15.5a1 1 0 0 0-1 1z"
              fill="url(#bezent-notes-fold)"
            />
            {/* Note text lines */}
            <rect x="6.5" y="7.5" width="11" height="1.8" rx="0.9" fill="#ffffff" opacity="0.95" />
            <rect x="6.5" y="11" width="8" height="1.8" rx="0.9" fill="#ffffff" opacity="0.8" />
            <rect x="6.5" y="14.5" width="5.5" height="1.8" rx="0.9" fill="#ffffff" opacity="0.8" />
          </g>
        </svg>
      );

    case 'tasks':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <defs>
            <linearGradient id="bezent-tasks-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4285f4" />
              <stop offset="100%" stopColor="#1a73e8" />
            </linearGradient>
            <filter id="bezent-tasks-shadow" x="-10%" y="-10%" width="120%" height="125%">
              <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodOpacity="0.18" />
            </filter>
          </defs>
          <g filter="url(#bezent-tasks-shadow)">
            {/* Smooth rounded square task box — simple box feel */}
            <rect
              x="3.5"
              y="3.5"
              width="17"
              height="17"
              rx="4"
              fill="url(#bezent-tasks-grad)"
            />
            {/* Bold energetic white checkmark */}
            <path
              d="M7.8 12.2l2.9 3 5.8-6.2"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      );

    case 'approvals':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={className}
        >
          <defs>
            <linearGradient id="bezent-approvals-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4285f4" />
              <stop offset="100%" stopColor="#1a73e8" />
            </linearGradient>
            <filter id="bezent-approvals-shadow" x="-10%" y="-10%" width="120%" height="125%">
              <feDropShadow dx="0" dy="0.8" stdDeviation="0.8" floodOpacity="0.18" />
            </filter>
          </defs>
          <g filter="url(#bezent-approvals-shadow)">
            {/* Head circle */}
            <circle cx="12" cy="7.2" r="3.6" fill="url(#bezent-approvals-grad)" />
            {/* Soft shoulders base */}
            <path
              d="M5.5 19.2a6.5 6.5 0 0 1 13 0v.3a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-.3z"
              fill="#8ab4f8"
              opacity="0.65"
            />
            {/* Upper torso */}
            <path
              d="M7.5 18.2a4.5 4.5 0 0 1 9 0v1.3a.8.8 0 0 1-.8.8H8.3a.8.8 0 0 1-.8-.8v-1.3z"
              fill="url(#bezent-approvals-grad)"
            />
          </g>
        </svg>
      );

    default:
      return (
        <BezentIcon
          name={name as BezentIconName}
          size={size}
          active={active}
          className={className}
        />
      );
  }
}

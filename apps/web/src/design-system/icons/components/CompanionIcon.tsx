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
            <linearGradient id="bezent-cal-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4c8df5" />
              <stop offset="100%" stopColor="#1a73e8" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#bezent-cal-grad)" />
          <text
            x="12"
            y="16.5"
            fill="#ffffff"
            fontSize="12"
            fontWeight="700"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Google Sans', Roboto, sans-serif"
            textAnchor="middle"
            letterSpacing="-0.5px"
          >
            31
          </text>
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
            <radialGradient id="bezent-bulb-grad" cx="50%" cy="38%" r="62%">
              <stop offset="0%" stopColor="#ffea00" />
              <stop offset="65%" stopColor="#fbbc04" />
              <stop offset="100%" stopColor="#f57f17" />
            </radialGradient>
          </defs>
          <path
            d="M12 2.5a6.5 6.5 0 0 0-4.6 11.1c.9.9 1.6 2.1 1.6 3.4h6c0-1.3.7-2.5 1.6-3.4A6.5 6.5 0 0 0 12 2.5z"
            fill="url(#bezent-bulb-grad)"
          />
          <path d="M10.2 10.5a1.8 1.8 0 0 1 3.6 0v2.2h-3.6v-2.2z" fill="#ffffff" opacity="0.85" />
          <path
            d="M9.5 17.5h5a1 1 0 0 1 1 1v.3a1.7 1.7 0 0 1-1.7 1.7h-3.6a1.7 1.7 0 0 1-1.7-1.7v-.3a1 1 0 0 1 1-1z"
            fill="#ea8600"
          />
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
          </defs>
          <circle cx="12" cy="12" r="9.5" fill="url(#bezent-tasks-grad)" />
          <path
            d="M7.8 12.2l2.9 3 5.8-6.2"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
          <circle cx="12" cy="7.5" r="3.6" fill="#1a73e8" />
          <path
            d="M5.5 19a6.5 6.5 0 0 1 13 0v.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V19z"
            fill="#8ab4f8"
            opacity="0.65"
          />
          <path
            d="M7.5 18a4.5 4.5 0 0 1 9 0v1.5a.8.8 0 0 1-.8.8H8.3a.8.8 0 0 1-.8-.8V18z"
            fill="#1a73e8"
          />
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

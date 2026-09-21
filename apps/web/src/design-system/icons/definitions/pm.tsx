import type { IconDefinition } from '../types';
import { strokeProps as S } from './shared';

/**
 * Project Management-flavored BEZENT icons (future business application —
 * see docs/architecture/README.md). Live in the global icon system today
 * since icons are a design-system asset, not owned by any one
 * application. Faithfully extracted from the old approved UI's
 * `iconDefinitions.tsx` (category: "pm").
 */
export const PM_ICON_DEFINITIONS: Record<string, IconDefinition> = {
  projects: {
    name: 'projects',
    label: 'Projects',
    category: 'pm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor, accentColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
          {...S(color, strokeWidth)}
        />
        <rect
          x="8"
          y="11"
          width="8"
          height="6"
          rx="1.5"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <path
          d="M12 12.5v3M10.5 14h3"
          stroke={accentColor}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <rect x="8" y="11" width="8" height="6" rx="1.5" fill={structuralColor} />
        <path d="M12 12.5v3M10.5 14h3" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </svg>
    ),
  },
  planning: {
    name: 'planning',
    label: 'Planning',
    category: 'pm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect width="18" height="18" x="3" y="3" rx="3" {...S(color, strokeWidth)} />
        <path d="M3 9h18M9 21V9" {...S(color, strokeWidth)} />
        <rect
          x="12"
          y="12"
          width="6.5"
          height="5"
          rx="1.2"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          width="18"
          height="18"
          x="3"
          y="3"
          rx="3"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <path d="M3 9h18M9 21V9" stroke={structuralColor} strokeWidth={1.5} />
        <rect x="12" y="12" width="6.5" height="5" rx="1.2" fill={structuralColor} />
      </svg>
    ),
  },
  milestones: {
    name: 'milestones',
    label: 'Milestones',
    category: 'pm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor, accentColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <line x1="4" y1="2" x2="4" y2="22" {...S(color, strokeWidth)} />
        <path
          d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <circle cx="11" cy="8.5" r="1.3" fill={accentColor} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <line
          x1="4"
          y1="2"
          x2="4"
          y2="22"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <circle cx="11" cy="8.5" r="1.6" fill={structuralColor} />
      </svg>
    ),
  },
  risks: {
    name: 'risks',
    label: 'Risks',
    category: 'pm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
          {...S(color, strokeWidth)}
        />
        <line
          x1="12"
          y1="9"
          x2="12"
          y2="13"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="17"
          r="1.5"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <line
          x1="12"
          y1="9"
          x2="12"
          y2="13"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1.5" fill={structuralColor} />
      </svg>
    ),
  },
  issues: {
    name: 'issues',
    label: 'Issues',
    category: 'pm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" {...S(color, strokeWidth)} />
        <line
          x1="12"
          y1="7.5"
          x2="12"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx="12"
          cy="16"
          r="1.8"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill={color} stroke={structuralColor} strokeWidth={1} />
        <line
          x1="12"
          y1="7.5"
          x2="12"
          y2="12"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="1.8" fill={structuralColor} />
      </svg>
    ),
  },
  changes: {
    name: 'changes',
    label: 'Change Requests',
    category: 'pm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="18" cy="18" r="3" {...S(color, strokeWidth)} />
        <path d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12" {...S(color, strokeWidth)} />
        <circle
          cx="6"
          cy="6"
          r="3"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="18" cy="18" r="3" fill={color} stroke={structuralColor} strokeWidth={1} />
        <path
          d="M13 6h3a2 2 0 0 1 2 2v7M6 9v12"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6" cy="6" r="3" fill={color} stroke={structuralColor} strokeWidth={1} />
      </svg>
    ),
  },
  delivery: {
    name: 'delivery',
    label: 'Delivery',
    category: 'pm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 8h4l3 3v5h-7V8z" {...S(color, strokeWidth)} />
        <circle cx="5.5" cy="18.5" r="2.5" {...S(color, strokeWidth)} />
        <circle cx="18.5" cy="18.5" r="2.5" {...S(color, strokeWidth)} />
        <rect
          width="14"
          height="11"
          x="2"
          y="6"
          rx="2"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M16 8h4l3 3v5h-7V8z" fill={structuralColor} stroke={color} strokeWidth={1} />
        <rect
          width="14"
          height="11"
          x="2"
          y="6"
          rx="2"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <circle cx="5.5" cy="18.5" r="2.5" fill={structuralColor} stroke={color} strokeWidth={1} />
        <circle cx="18.5" cy="18.5" r="2.5" fill={structuralColor} stroke={color} strokeWidth={1} />
      </svg>
    ),
  },
};

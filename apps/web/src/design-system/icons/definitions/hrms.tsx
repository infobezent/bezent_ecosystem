import type { IconDefinition } from '../types';
import { strokeProps as S } from './shared';

/**
 * HRMS-flavored BEZENT icons. These live in the global icon system (icons
 * are a design-system asset, not an application asset — see
 * docs/architecture/ICON-SYSTEM.md) even though today only HRMS uses them.
 * Faithfully extracted from the old approved UI's `iconDefinitions.tsx`
 * (category: "hrms").
 *
 * Duplicate-key resolution (payroll, candidates, reports — reports lives
 * in global.tsx): the old source defined each of these twice under the
 * same object key. Only the LAST definition of each pair was ever
 * reachable at runtime (later keys overwrite earlier ones in a JS object
 * literal) — the first definition of each pair was dead, unreachable code
 * that never rendered. This file keeps the definition that was actually
 * live, preserving exactly what users have always seen. See
 * docs/architecture/ICON-SYSTEM.md for the full resolution record.
 */
export const HRMS_ICON_DEFINITIONS: Record<string, IconDefinition> = {
  employees: {
    name: 'employees',
    label: 'Employees',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M22 21v-2a4 4 0 0 0-3-3.87"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="16" cy="7" r="3.5" fill={color} />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87h-3v5.87z" fill={color} />
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2z"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth={1.8}
        />
        <circle cx="9" cy="7" r="4" fill={color} stroke="#FFFFFF" strokeWidth={1.8} />
      </svg>
    ),
  },
  workforce: {
    name: 'workforce',
    label: 'Workforce Hub',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11" r="3.5" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M8 18c.8-1.5 2.2-2.5 4-2.5s3.2 1 4 2.5"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    ),
    solid: ({ size, color, cutoutColor = '#FFFFFF' }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          fill={color}
        />
        <circle cx="12" cy="10.5" r="3.2" fill={cutoutColor} />
        <path
          d="M8 17.5c.8-1.8 2.2-2.5 4-2.5s3.2.7 4 2.5"
          stroke={cutoutColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  onboarding: {
    name: 'onboarding',
    label: 'Onboarding',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="7.5" r="4" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M2.5 20.5a6.5 6.5 0 0 1 13 0"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path d="M19 8v6 M16 11h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="7.5" r="4" fill={color} />
        <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" fill={color} />
        <path d="M19 8v6 M16 11h6" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      </svg>
    ),
  },
  leave: {
    name: 'leave',
    label: 'Leave Tracker',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="18" height="18" x="3" y="4" rx="2" stroke={color} strokeWidth={strokeWidth} />
        <line
          x1="16"
          x2="16"
          y1="2"
          y2="6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1="8"
          x2="8"
          y1="2"
          y2="6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line x1="3" x2="21" y1="10" y2="10" stroke={color} strokeWidth={strokeWidth} />
        <line
          x1="10"
          x2="14"
          y1="14"
          y2="18"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1="14"
          x2="10"
          y1="14"
          y2="18"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    ),
    solid: ({ size, color, cutoutColor = '#FFFFFF' }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <line
          x1="16"
          x2="16"
          y1="2"
          y2="6"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <line x1="8" x2="8" y1="2" y2="6" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
        <rect width="18" height="18" x="3" y="4" rx="2" fill={color} />
        <line x1="3" x2="21" y1="10" y2="10" stroke={cutoutColor} strokeWidth={1.8} />
        <line
          x1="10"
          x2="14"
          y1="14"
          y2="18"
          stroke={cutoutColor}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <line
          x1="14"
          x2="10"
          y1="14"
          y2="18"
          stroke={cutoutColor}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  attendance: {
    name: 'attendance',
    label: 'Attendance',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} />
        <polyline
          points="16 11 18 13 22 9"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color, cutoutColor = '#FFFFFF' }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="7" r="4" fill={color} />
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2z" fill={color} />
        <circle cx="18.5" cy="11.5" r="4.5" fill={color} />
        <polyline
          points="16.5 11.5 18 13 21 10"
          stroke={cutoutColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  timeTracker: {
    name: 'timeTracker',
    label: 'Time Tracker',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <line
          x1="10"
          x2="14"
          y1="2"
          y2="2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1="12"
          x2="12"
          y1="2"
          y2="6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle cx="12" cy="14" r="8" stroke={color} strokeWidth={strokeWidth} />
        <line
          x1="12"
          x2="12"
          y1="14"
          y2="9.5"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1="12"
          x2="15.2"
          y1="14"
          y2="11.8"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle cx="12" cy="14" r="1.2" fill={color} />
      </svg>
    ),
    solid: ({ size, color, cutoutColor = '#FFFFFF' }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <line
          x1="10"
          x2="14"
          y1="2"
          y2="2"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <line
          x1="12"
          x2="12"
          y1="2"
          y2="6"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <circle cx="12" cy="14" r="8" fill={color} />
        <line
          x1="12"
          x2="12"
          y1="14"
          y2="9.5"
          stroke={cutoutColor}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <line
          x1="12"
          x2="15.2"
          y1="14"
          y2="11.8"
          stroke={cutoutColor}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <circle cx="12" cy="14" r="1.5" fill={cutoutColor} />
      </svg>
    ),
  },
  shifts: {
    name: 'shifts',
    label: 'Shift Management',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M12 7.5V12h4"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color, cutoutColor = '#FFFFFF' }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill={color} />
        <path
          d="M12 7.5V12h4"
          stroke={cutoutColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  timesheets: {
    name: 'timesheets',
    label: 'Timesheets',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="4"
          width="16"
          height="17"
          rx="2.5"
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <path
          d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle cx="14" cy="14" r="4.5" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M14 12V14l1.5 1"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color, cutoutColor = '#FFFFFF' }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="16" height="17" rx="2.5" fill={color} />
        <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" fill={color} />
        <circle cx="14" cy="14" r="4.5" fill={cutoutColor} />
        <path
          d="M14 11.8V14l1.5 1"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  performance: {
    name: 'performance',
    label: 'Performance',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2 12h4l3-7 4 14 3-7h6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M2 12h4l3-7 4 14 3-7h6"
          stroke={color}
          strokeWidth={3.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  goals: {
    name: 'goals',
    label: 'Goals & OKRs',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" {...S(color, strokeWidth)} />
        <circle cx="12" cy="12" r="6" {...S(color, strokeWidth)} />
        <circle
          cx="12"
          cy="12"
          r="2"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill={color} stroke={structuralColor} strokeWidth={1} />
        <circle cx="12" cy="12" r="7" fill={structuralColor} />
        <circle cx="12" cy="12" r="4.5" fill={color} />
        <circle cx="12" cy="12" r="1.8" fill={structuralColor} />
      </svg>
    ),
  },
  reviews: {
    name: 'reviews',
    label: 'Appraisals',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  learning: {
    name: 'learning',
    label: 'Learning',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m10.852 14.772-.383.923" {...S(color, strokeWidth)} />
        <path d="m10.852 9.228-.383-.923" {...S(color, strokeWidth)} />
        <path d="m13.148 14.772.382.924" {...S(color, strokeWidth)} />
        <path d="m13.531 8.305-.383.923" {...S(color, strokeWidth)} />
        <path d="m14.772 10.852.923-.383" {...S(color, strokeWidth)} />
        <path d="m14.772 13.148.923.383" {...S(color, strokeWidth)} />
        <path
          d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 0 0-5.63-1.446 3 3 0 0 0-.368 1.571 4 4 0 0 0-2.525 5.771"
          {...S(color, strokeWidth)}
        />
        <path d="M17.998 5.125a4 4 0 0 1 2.525 5.771" {...S(color, strokeWidth)} />
        <path d="M19.505 10.294a4 4 0 0 1-1.5 7.706" {...S(color, strokeWidth)} />
        <path
          d="M4.032 17.483A4 4 0 0 0 11.464 20c.18-.311.892-.311 1.072 0a4 4 0 0 0 7.432-2.516"
          {...S(color, strokeWidth)}
        />
        <path d="M4.5 10.291A4 4 0 0 0 6 18" {...S(color, strokeWidth)} />
        <path d="M6.002 5.125a3 3 0 0 0 .4 1.375" {...S(color, strokeWidth)} />
        <path d="m9.228 10.852-.923-.383" {...S(color, strokeWidth)} />
        <path d="m9.228 13.148-.923.383" {...S(color, strokeWidth)} />
        <circle
          cx="12"
          cy="12"
          r="3"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m10.852 14.772-.383.923"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="m10.852 9.228-.383-.923"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="m13.148 14.772.382.924"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="m13.531 8.305-.383.923"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="m14.772 10.852.923-.383"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="m14.772 13.148.923.383"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="m9.228 10.852-.923-.383"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="m9.228 13.148-.923.383"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 0 0-5.63-1.446 3 3 0 0 0-.368 1.571 4 4 0 0 0-2.525 5.771"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M17.998 5.125a4 4 0 0 1 2.525 5.771"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M19.505 10.294a4 4 0 0 1-1.5 7.706"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M4.032 17.483A4 4 0 0 0 11.464 20c.18-.311.892-.311 1.072 0a4 4 0 0 0 7.432-2.516"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M4.5 10.291A4 4 0 0 0 6 18"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M6.002 5.125a3 3 0 0 0 .4 1.375"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="12" cy="12" r="3.5" fill={color} stroke={structuralColor} strokeWidth={1} />
        <circle cx="12" cy="12" r="1.4" fill={structuralColor} />
      </svg>
    ),
  },
  career: {
    name: 'career',
    label: 'Career Paths',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 13v8" {...S(color, strokeWidth)} />
        <path d="M12 3v3" {...S(color, strokeWidth)} />
        <path
          d="M18.172 6a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 13v8" stroke={structuralColor} strokeWidth={2.2} strokeLinecap="round" />
        <path d="M12 3v3" stroke={structuralColor} strokeWidth={2.2} strokeLinecap="round" />
        <path
          d="M18.172 6a2 2 0 0 1 1.414.586l2.06 2.06a1.207 1.207 0 0 1 0 1.708l-2.06 2.06a2 2 0 0 1-1.414.586H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="3" r="1.8" fill={structuralColor} />
        <circle cx="12" cy="21" r="1.8" fill={structuralColor} />
      </svg>
    ),
  },
  payroll: {
    name: 'payroll',
    label: 'Payroll',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="20" height="14" x="2" y="5" rx="2" stroke={color} strokeWidth={strokeWidth} />
        <line x1="2" x2="22" y1="10" y2="10" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="20" height="14" x="2" y="5" rx="2.5" fill={color} />
        <line x1="2" x2="22" y1="10" y2="10" stroke="#FFFFFF" strokeWidth={2} />
        <rect x="5" y="13.5" width="4" height="2.5" rx="0.5" fill="#FFFFFF" />
      </svg>
    ),
  },
  compensation: {
    name: 'compensation',
    label: 'Compensation',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" {...S(color, strokeWidth)} />
        <path
          d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"
          {...S(color, strokeWidth)}
        />
        <path d="m2 16 6 6" {...S(color, strokeWidth)} />
        <circle
          cx="16"
          cy="9"
          r="2.9"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <circle cx="6" cy="5" r="3" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m2 16 6 6" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <circle cx="16" cy="9" r="2.9" fill={color} stroke={structuralColor} strokeWidth={1} />
        <circle cx="6" cy="5" r="3" fill={structuralColor} stroke={color} strokeWidth={1} />
      </svg>
    ),
  },
  benefits: {
    name: 'benefits',
    label: 'Benefits',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762"
          {...S(color, strokeWidth)}
        />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  recruitment: {
    name: 'recruitment',
    label: 'Recruitment',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="7" r="4" {...S(color, strokeWidth)} />
        <path d="M10.3 15H7a4 4 0 0 0-4 4v2" {...S(color, strokeWidth)} />
        <circle
          cx="17"
          cy="17"
          r="3"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <path d="m21 21-1.9-1.9" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="10" cy="7" r="4" fill={color} />
        <path
          d="M3.5 21v-2a4 4 0 0 1 4-4h3.5"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
        />
        <circle cx="17" cy="17" r="3" fill={structuralColor} stroke={color} strokeWidth={1} />
        <path d="m21 21-1.9-1.9" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </svg>
    ),
  },
  candidates: {
    name: 'candidates',
    label: 'Candidates',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="18" height="18" x="3" y="3" rx="2" stroke={color} strokeWidth={strokeWidth} />
        <circle cx="12" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} />
        <path
          d="M7 18a5 5 0 0 1 10 0"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect width="18" height="18" x="3" y="3" rx="2.5" fill={color} />
        <circle cx="12" cy="10" r="3" fill="#FFFFFF" />
        <path d="M7 18a5 5 0 0 1 10 0" fill="#FFFFFF" />
      </svg>
    ),
  },
  interviews: {
    name: 'interviews',
    label: 'Interviews',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
          {...S(color, strokeWidth)}
        />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" {...S(color, strokeWidth)} />
        <path d="M12 17h.01" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2a10 10 0 1 1-5.6 18.4l-3.4 1 1-3.3A10 10 0 0 1 12 2Z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <path
          d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="17" r="1.2" fill={structuralColor} />
      </svg>
    ),
  },
  jobOpenings: {
    name: 'jobOpenings',
    label: 'Job Openings',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect width="20" height="14" x="2" y="6" rx="2" stroke={color} strokeWidth={strokeWidth} />
        <line x1="2" x2="22" y1="12" y2="12" stroke={color} strokeWidth={strokeWidth} />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect width="20" height="14" x="2" y="6" rx="2.5" fill={color} />
        <line x1="2" x2="22" y1="12" y2="12" stroke="#FFFFFF" strokeWidth={1.8} />
        <rect x="10.5" y="10.5" width="3" height="3" rx="0.75" fill="#FFFFFF" />
      </svg>
    ),
  },
  offers: {
    name: 'offers',
    label: 'Offers',
    category: 'hrms',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" {...S(color, strokeWidth)} />
        <path d="m16 19 2 2 4-4" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <path
          d="m16 19 2 2 4-4"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

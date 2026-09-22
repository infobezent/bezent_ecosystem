import type { JSX } from 'react';
import type { BezentIconRenderProps, IconDefinition } from '../types';
import { strokeProps as S } from './shared';

/**
 * Global BEZENT icons — not tied to any one business application.
 * Faithfully extracted from the old approved UI's `iconDefinitions.tsx`
 * (category: "global"). See docs/architecture/ICON-SYSTEM.md.
 */
/**
 * Single-glyph stroke icon: the same geometry serves outline and solid
 * (these are utility glyphs with no duotone fill). Geometry matches the
 * lucide glyphs the old approved shell used for these controls, brought
 * into the BEZENT registry so no second icon library is needed.
 */
function glyph(
  name: string,
  label: string,
  draw: (color: string, strokeWidth: number) => JSX.Element,
): IconDefinition {
  const render = ({ size, color, strokeWidth = 1.8 }: BezentIconRenderProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {draw(color, strokeWidth)}
    </svg>
  );
  return { name, label, category: 'global', outline: render, solid: render };
}

export const GLOBAL_ICON_DEFINITIONS: Record<string, IconDefinition> = {
  dashboard: {
    name: 'dashboard',
    label: 'Dashboard',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="7.5"
          height="7.5"
          rx="1"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <rect
          x="13.5"
          y="3"
          width="7.5"
          height="7.5"
          rx="1"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <rect
          x="3"
          y="13.5"
          width="7.5"
          height="7.5"
          rx="1"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <rect
          x="13.5"
          y="13.5"
          width="7.5"
          height="7.5"
          rx="1"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill={color} />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill={color} />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill={color} />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill={color} />
      </svg>
    ),
  },
  organization: {
    name: 'organization',
    label: 'Organization',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="9" y="3" width="6" height="5" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
        <rect x="3" y="16" width="6" height="5" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
        <rect
          x="15"
          y="16"
          width="6"
          height="5"
          rx="1.5"
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <path
          d="M12 8v4 M6 12h12 M6 12v4 M18 12v4"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="9" y="3" width="6" height="5" rx="1.5" fill={color} />
        <rect x="3" y="16" width="6" height="5" rx="1.5" fill={color} />
        <rect x="15" y="16" width="6" height="5" rx="1.5" fill={color} />
        <path
          d="M12 8v4 M6 12h12 M6 12v4 M18 12v4"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  documents: {
    name: 'documents',
    label: 'Documents',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 19h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color, cutoutColor = '#FFFFFF' }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 19h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2z"
          fill={color}
        />
        <path d="M2 9.5h20" stroke={cutoutColor} strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    ),
  },
  sop: {
    name: 'sop',
    label: 'SOPs',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 5h8" {...S(color, strokeWidth)} />
        <path d="M13 12h8" {...S(color, strokeWidth)} />
        <path d="M13 19h8" {...S(color, strokeWidth)} />
        <path d="m3 17 2 2 4-4" {...S(color, strokeWidth)} />
        <path d="m3 7 2 2 4-4" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13 5h8 M13 12h8 M13 19h8"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <path
          d="m3 17 2 2 4-4 M3 7l2 2 4-4"
          stroke={structuralColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  assets: {
    name: 'assets',
    label: 'Assets',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2.5 L20 7 L20 16.5 L12 21 L4 16.5 L4 7 Z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 11.5 L12 21 M12 11.5 L4 7 M12 11.5 L20 7"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 4.8 L16.5 9.8"
          stroke={color}
          strokeWidth={1.3}
          strokeLinecap="round"
          opacity={0.7}
        />
      </svg>
    ),
    /**
     * This is the one icon in the whole set with genuine per-theme
     * branching baked into the illustration itself (its 3D cube-edge
     * shading), not just a color prop. Preserved exactly as the approved
     * old UI has it — see docs/architecture/ICON-SYSTEM.md.
     */
    solid: ({ size, color, structuralColor, isDark }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2.8 L19.4 7 L12 11.2 L4.6 7 Z"
          fill={structuralColor}
          stroke={structuralColor}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        <path
          d="M4.6 7 L12 11.2 L12 20.4 L4.6 16.2 Z"
          fill={color}
          stroke={isDark ? '#35104F' : structuralColor}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        <path
          d="M12 11.2 L19.4 7 L19.4 16.2 L12 20.4 Z"
          fill={color}
          stroke={isDark ? '#35104F' : structuralColor}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />
        <path
          d="M12 11.2 L12 20.4 M12 11.2 L4.6 7 M12 11.2 L19.4 7"
          stroke={isDark ? '#35104F' : '#4A0B78'}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.8 5 L16.2 9.4"
          stroke={isDark ? '#FFFFFF' : '#E9D0FD'}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  requests: {
    name: 'requests',
    label: 'Employee Requests',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" {...S(color, strokeWidth)} />
        <path
          d="M18 15.28c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2"
          {...S(color, strokeWidth)}
        />
        <path d="M20 22v.01" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M22 10.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12.5"
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
          d="M18 15.28c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path d="M20 22v.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      </svg>
    ),
  },
  operations: {
    name: 'operations',
    label: 'Operations',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 17v4" {...S(color, strokeWidth)} />
        <path d="m14.305 7.53.923-.382" {...S(color, strokeWidth)} />
        <path d="m15.228 4.852-.923-.383" {...S(color, strokeWidth)} />
        <path d="m16.852 3.228-.383-.924" {...S(color, strokeWidth)} />
        <path d="m16.852 8.772-.383.923" {...S(color, strokeWidth)} />
        <path d="m19.148 3.228.383-.924" {...S(color, strokeWidth)} />
        <path d="m19.53 9.696-.382-.924" {...S(color, strokeWidth)} />
        <path d="m20.772 4.852.924-.383" {...S(color, strokeWidth)} />
        <path d="m20.772 7.148.924.383" {...S(color, strokeWidth)} />
        <path
          d="M22 13v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"
          {...S(color, strokeWidth)}
        />
        <path d="M8 21h8" {...S(color, strokeWidth)} />
        <circle
          cx="18"
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
        <rect
          x="2"
          y="3"
          width="13"
          height="14"
          rx="2"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <path d="M12 17v4 M8 21h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
        <path
          d="m14.305 7.53.923-.382 M15.228 4.852l-.923-.383 M16.852 3.228l-.383-.924 M16.852 8.772l-.383.923 M19.148 3.228l.383-.924 M19.53 9.696l-.382-.924 M20.772 4.852l.924-.383 M20.772 7.148l.924.383"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <circle cx="18" cy="6" r="3" fill={structuralColor} stroke={color} strokeWidth={1} />
        <circle cx="18" cy="6" r="1.3" fill={color} />
      </svg>
    ),
  },
  reports: {
    name: 'reports',
    label: 'Reports',
    category: 'global',
    outline: ({ size, color, strokeWidth = 2 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21.21 15.89A10 10 0 1 1 8 2.83"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22 12A10 10 0 0 0 12 2v10z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83L12 12z" fill={color} />
        <path d="M22 12A10 10 0 0 0 12 2v10z" fill={color} stroke="#FFFFFF" strokeWidth={1.8} />
      </svg>
    ),
  },
  settings: {
    name: 'settings',
    label: 'Settings',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
          {...S(color, strokeWidth)}
        />
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
          d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" fill={structuralColor} />
        <circle cx="12" cy="12" r="1.4" fill={color} />
      </svg>
    ),
  },
  hrSettings: {
    name: 'hrSettings',
    label: 'HR Settings',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
          {...S(color, strokeWidth)}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  more: {
    name: 'more',
    label: 'More',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.8 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="5" cy="12" r="2.2" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <circle cx="12" cy="12" r="2.2" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <circle cx="19" cy="12" r="2.2" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="5" cy="12" r="2.5" fill={color} />
        <circle cx="12" cy="12" r="2.5" fill={color} />
        <circle cx="19" cy="12" r="2.5" fill={color} />
      </svg>
    ),
  },
  tasks: {
    name: 'tasks',
    label: 'My Tasks',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" {...S(color, strokeWidth)} />
        <path
          d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m9 14 2 2 4-4" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" fill={structuralColor} />
        <path
          d="m9 14 2 2 4-4"
          stroke="#FAF5FE"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  approvals: {
    name: 'approvals',
    label: 'Approvals',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="m16 9-5.5 5.5L8 12" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m16 9-5.5 5.5L8 12"
          stroke="#FAF5FE"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  calendar: {
    name: 'calendar',
    label: 'Calendar',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12.127 21H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v5.125"
          {...S(color, strokeWidth)}
        />
        <path
          d="M14.62 17.8A2.25 2.25 0 1118 14.836a2.25 2.25 0 113.38 2.966l-2.626 2.856a.998.998 0 01-1.507 0z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M16 2v3" {...S(color, strokeWidth)} />
        <path d="M3 9h18" {...S(color, strokeWidth)} />
        <path d="M8 2v3" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4H3Z" fill={structuralColor} />
        <path
          d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <path d="M16 2v3 M8 2v3" stroke="#FAF5FE" strokeWidth={2} strokeLinecap="round" />
        <path
          d="M14.62 17.8A2.25 2.25 0 1118 14.836a2.25 2.25 0 113.38 2.966l-2.626 2.856a.998.998 0 01-1.507 0z"
          fill={structuralColor}
          stroke={color}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  notes: {
    name: 'notes',
    label: 'Notes',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M2 6h4" {...S(color, strokeWidth)} />
        <path d="M2 10h4" {...S(color, strokeWidth)} />
        <path d="M2 14h4" {...S(color, strokeWidth)} />
        <path d="M2 18h4" {...S(color, strokeWidth)} />
        <path
          d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
          {...S(color, strokeWidth)}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2 6h4 M2 10h4 M2 14h4 M2 18h4"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <path
          d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"
          fill={structuralColor}
          stroke={color}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  notifications: {
    name: 'notifications',
    label: 'Notifications',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.268 21a2 2 0 0 0 3.464 0" {...S(color, strokeWidth)} />
        <path
          d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
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
          d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.268 21a2 2 0 0 0 3.464 0"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  search: {
    name: 'search',
    label: 'Search',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m21 21-4.34-4.34" {...S(color, strokeWidth)} />
        <circle
          cx="11"
          cy="11"
          r="8"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="8" fill={color} stroke={structuralColor} strokeWidth={1} />
        <path
          d="m21 21-4.34-4.34"
          stroke={structuralColor}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <circle
          cx="9.5"
          cy="9.5"
          r="2.5"
          fill="none"
          stroke="#FAF5FE"
          strokeWidth={1.2}
          opacity={0.5}
        />
      </svg>
    ),
  },
  filter: {
    name: 'filter',
    label: 'Filter',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 5H3" {...S(color, strokeWidth)} />
        <path d="M12 19H3" {...S(color, strokeWidth)} />
        <path d="M14 3v4" {...S(color, strokeWidth)} />
        <path d="M16 17v4" {...S(color, strokeWidth)} />
        <path d="M21 12h-9" {...S(color, strokeWidth)} />
        <path d="M21 19h-5" {...S(color, strokeWidth)} />
        <path d="M21 5h-7" {...S(color, strokeWidth)} />
        <path d="M8 10v4" {...S(color, strokeWidth)} />
        <path d="M8 12H3" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10 5H3 M12 19H3 M21 12h-9 M21 19h-5 M21 5h-7"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <path
          d="M14 3v4 M16 17v4 M8 10v4"
          stroke={structuralColor}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <path d="M8 12H3" stroke={structuralColor} strokeWidth={2.2} strokeLinecap="round" />
        <circle cx="14" cy="5" r="2.2" fill={structuralColor} />
        <circle cx="16" cy="19" r="2.2" fill={structuralColor} />
        <circle cx="8" cy="12" r="2.2" fill={structuralColor} />
      </svg>
    ),
  },
  announcements: {
    name: 'announcements',
    label: 'Announcements',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"
          {...S(color, strokeWidth)}
        />
        <path d="M8 6v8" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 6v8" stroke={structuralColor} strokeWidth={2.2} strokeLinecap="round" />
        <path
          d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  help: {
    name: 'help',
    label: 'Help',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"
          {...S(color, strokeWidth)}
        />
        <path d="M21 16v2a4 4 0 0 1-4 4h-5" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 11a9 9 0 1 1 18 0"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        <rect
          x="2"
          y="11"
          width="5"
          height="7"
          rx="1.5"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <rect
          x="17"
          y="11"
          width="5"
          height="7"
          rx="1.5"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <path
          d="M21 16v2a4 4 0 0 1-4 4h-5"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
  },
  whatsNew: {
    name: 'whatsNew',
    label: "What's New",
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.8 11.3 2 22l10.7-3.79" {...S(color, strokeWidth)} />
        <path d="M4 3h.01" {...S(color, strokeWidth)} />
        <path d="M22 8h.01" {...S(color, strokeWidth)} />
        <path d="M15 2h.01" {...S(color, strokeWidth)} />
        <path d="M22 20h.01" {...S(color, strokeWidth)} />
        <path
          d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"
          {...S(color, strokeWidth)}
        />
        <path
          d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"
          {...S(color, strokeWidth)}
        />
        <path
          d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"
          {...S(color, strokeWidth)}
        />
        <path
          d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"
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
          d="M5.8 11.3 2 22l10.7-3.79"
          stroke={structuralColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <path
          d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"
          stroke={structuralColor}
          strokeWidth={1.5}
        />
        <path
          d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
      </svg>
    ),
  },
  explore: {
    name: 'explore',
    label: 'Explore',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" {...S(color, strokeWidth)} />
        <path
          d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"
          {...S(color, strokeWidth)}
        />
        <path
          d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <path
          d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <path
          d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  apps: {
    name: 'apps',
    label: 'Apps',
    category: 'global',
    outline: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="2" fill={color} />
        <circle cx="12" cy="6" r="2" fill={color} />
        <circle cx="18" cy="6" r="2" fill={color} />
        <circle cx="6" cy="12" r="2" fill={color} />
        <circle cx="12" cy="12" r="2" fill={color} />
        <circle cx="18" cy="12" r="2" fill={color} />
        <circle cx="6" cy="18" r="2" fill={color} />
        <circle cx="12" cy="18" r="2" fill={color} />
        <circle cx="18" cy="18" r="2" fill={color} />
      </svg>
    ),
    solid: ({ size, color }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="2" fill={color} />
        <circle cx="12" cy="6" r="2" fill={color} />
        <circle cx="18" cy="6" r="2" fill={color} />
        <circle cx="6" cy="12" r="2" fill={color} />
        <circle cx="12" cy="12" r="2" fill={color} />
        <circle cx="18" cy="12" r="2" fill={color} />
        <circle cx="6" cy="18" r="2" fill={color} />
        <circle cx="12" cy="18" r="2" fill={color} />
        <circle cx="18" cy="18" r="2" fill={color} />
      </svg>
    ),
  },
  sparkles: {
    name: 'sparkles',
    label: 'BEZENT AI',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12.983 21.186a1 1 0 0 1-1.966 0 10 10 0 0 0-8.203-8.203 1 1 0 0 1 0-1.966 10 10 0 0 0 8.203-8.203 1 1 0 0 1 1.966 0 10 10 0 0 0 8.203 8.203 1 1 0 0 1 0 1.966 10 10 0 0 0-8.203 8.203"
          {...S(color, strokeWidth)}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12.983 21.186a1 1 0 0 1-1.966 0 10 10 0 0 0-8.203-8.203 1 1 0 0 1 0-1.966 10 10 0 0 0 8.203-8.203 1 1 0 0 1 1.966 0 10 10 0 0 0 8.203 8.203 1 1 0 0 1 0 1.966 10 10 0 0 0-8.203 8.203"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <circle cx="12" cy="12" r="3" fill={structuralColor} />
      </svg>
    ),
  },
  home: {
    name: 'home',
    label: 'Home',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...S(color, strokeWidth)} />
        <rect
          x="9"
          y="14"
          width="6"
          height="7"
          rx="1"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <rect x="9" y="14" width="6" height="7" rx="1" fill={structuralColor} />
      </svg>
    ),
  },
  add: {
    name: 'add',
    label: 'Add',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor, accentColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <line
          x1="12"
          y1="7.5"
          x2="12"
          y2="16.5"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <line
          x1="7.5"
          y1="12"
          x2="16.5"
          y2="12"
          stroke={accentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
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
          y2="16.5"
          stroke={structuralColor}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <line
          x1="7.5"
          y1="12"
          x2="16.5"
          y2="12"
          stroke={structuralColor}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  edit: {
    name: 'edit',
    label: 'Edit',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" {...S(color, strokeWidth)} />
        <polygon
          points="2,22 7.5,20.5 3.5,16.5"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <polygon points="2,22 7.5,20.5 3.5,16.5" fill={structuralColor} />
      </svg>
    ),
  },
  delete: {
    name: 'delete',
    label: 'Delete',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
          {...S(color, strokeWidth)}
        />
        <rect
          x="9.5"
          y="10"
          width="5"
          height="7"
          rx="1"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="9.5" y="10" width="5" height="7" rx="1" fill={structuralColor} />
      </svg>
    ),
  },
  security: {
    name: 'security',
    label: 'Security',
    category: 'global',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor, accentColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...S(color, strokeWidth)} />
        <circle
          cx="12"
          cy="11.5"
          r="3.5"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <path
          d="m10.2 11.5 1.3 1.3 2.5-2.5"
          stroke={accentColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11.5" r="3.5" fill={structuralColor} stroke={color} strokeWidth={1} />
        <path
          d="m10.2 11.5 1.3 1.3 2.5-2.5"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
  },

  // ── Shell glyphs (Phase 0B.5) ──
  menu: glyph('menu', 'Main menu', (c, sw) => (
    <path d="M4 6h16M4 12h16M4 18h16" {...S(c, sw)} strokeLinecap="round" />
  )),
  helpCircle: glyph('helpCircle', 'Support', (c, sw) => (
    <g {...S(c, sw)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeLinecap="round" />
      <path d="M12 17h.01" strokeLinecap="round" strokeWidth={sw + 0.5} />
    </g>
  )),
  gemini: {
    name: 'gemini',
    label: 'Gemini',
    category: 'global',
    outline: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="bezent-gemini-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285f4" />
            <stop offset="35%" stopColor="#9b51e0" />
            <stop offset="70%" stopColor="#ea4335" />
            <stop offset="100%" stopColor="#fbbc05" />
          </linearGradient>
        </defs>
        <path
          d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
          fill="url(#bezent-gemini-grad)"
        />
      </svg>
    ),
    solid: ({ size }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="bezent-gemini-grad-s" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4285f4" />
            <stop offset="35%" stopColor="#9b51e0" />
            <stop offset="70%" stopColor="#ea4335" />
            <stop offset="100%" stopColor="#fbbc05" />
          </linearGradient>
        </defs>
        <path
          d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
          fill="url(#bezent-gemini-grad-s)"
        />
      </svg>
    ),
  },
  plusSign: glyph('plusSign', 'Plus sign', (c, sw) => <path d="M5 12h14M12 5v14" {...S(c, sw)} />),
  chevronLeft: glyph('chevronLeft', 'Chevron left', (c, sw) => (
    <path d="m15 18-6-6 6-6" {...S(c, sw)} />
  )),
  chevronRight: glyph('chevronRight', 'Chevron right', (c, sw) => (
    <path d="m9 18 6-6-6-6" {...S(c, sw)} />
  )),
  moon: glyph('moon', 'Moon', (c, sw) => (
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" {...S(c, sw)} />
  )),
  sun: glyph('sun', 'Sun', (c, sw) => (
    <g {...S(c, sw)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2m-7.07-15.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </g>
  )),

  // ── Search glyphs (Phase 0B.6) ──
  close: glyph('close', 'Close', (c, sw) => <path d="M18 6 6 18M6 6l12 12" {...S(c, sw)} />),
  chevronDown: glyph('chevronDown', 'Chevron down', (c, sw) => (
    <path d="m6 9 6 6 6-6" {...S(c, sw)} />
  )),
  check: glyph('check', 'Check', (c, sw) => <path d="M20 6 9 17l-5-5" {...S(c, sw)} />),
  arrowRight: glyph('arrowRight', 'Arrow right', (c, sw) => (
    <path d="M5 12h14m-7-7 7 7-7 7" {...S(c, sw)} />
  )),
  clock: glyph('clock', 'Clock', (c, sw) => (
    <g {...S(c, sw)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </g>
  )),

  // ── Utility glyphs (Phase 0B.7) ──
  arrowLeft: glyph('arrowLeft', 'Arrow left', (c, sw) => (
    <path d="m12 19-7-7 7-7M19 12H5" {...S(c, sw)} />
  )),
  warning: glyph('warning', 'Warning', (c, sw) => (
    <g {...S(c, sw)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4M12 17h.01" />
    </g>
  )),
  pin: glyph('pin', 'Pin', (c, sw) => (
    <g {...S(c, sw)}>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </g>
  )),
  user: glyph('user', 'User', (c, sw) => (
    <g {...S(c, sw)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </g>
  )),
  logOut: glyph('logOut', 'Log out', (c, sw) => (
    <g {...S(c, sw)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </g>
  )),
  switchAccount: glyph('switchAccount', 'Switch account', (c, sw) => (
    <g {...S(c, sw)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </g>
  )),
};

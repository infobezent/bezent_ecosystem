import type { IconDefinition } from '../types';
import { strokeProps as S } from './shared';

/**
 * CRM-flavored BEZENT icons (future business application — see
 * docs/architecture/README.md). Live in the global icon system today
 * since icons are a design-system asset, not owned by any one
 * application. Faithfully extracted from the old approved UI's
 * `iconDefinitions.tsx` (category: "crm").
 */
export const CRM_ICON_DEFINITIONS: Record<string, IconDefinition> = {
  leads: {
    name: 'leads',
    label: 'Leads',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor, accentColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 14v-4a8 8 0 0 1 16 0v4M4 10h4M16 10h4" {...S(color, strokeWidth)} />
        <circle
          cx="12"
          cy="16"
          r="3.2"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <circle cx="12" cy="16" r="1.1" fill={accentColor} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 14v-4a8 8 0 0 1 16 0v4M4 10h4M16 10h4"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx="12" cy="16" r="3.2" fill={color} stroke={structuralColor} strokeWidth={1} />
        <circle cx="12" cy="16" r="1.3" fill={structuralColor} />
      </svg>
    ),
  },
  contacts: {
    name: 'contacts',
    label: 'Contacts',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="3" {...S(color, strokeWidth)} />
        <path d="M2 8h2M2 12h2M2 16h2" {...S(color, strokeWidth)} />
        <circle
          cx="12"
          cy="10"
          r="2.8"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <path d="M8.5 16a3.5 3.5 0 0 1 7 0" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="3"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <path
          d="M2 8h2M2 12h2M2 16h2"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <circle cx="12" cy="10" r="2.8" fill={structuralColor} />
        <path
          d="M8.5 16a3.5 3.5 0 0 1 7 0"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  accounts: {
    name: 'accounts',
    label: 'Accounts',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2" {...S(color, strokeWidth)} />
        <path d="M8 7h2M14 7h2M8 11h2M14 11h2" {...S(color, strokeWidth)} />
        <rect
          x="10"
          y="15"
          width="4"
          height="6"
          rx="1"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="3"
          width="16"
          height="18"
          rx="2"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <path
          d="M8 7h2M14 7h2M8 11h2M14 11h2"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <rect x="10" y="15" width="4" height="6" rx="1" fill={structuralColor} />
      </svg>
    ),
  },
  deals: {
    name: 'deals',
    label: 'Deals',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-3-3a1 1 0 0 0-1.4 0l-1.3 1.3"
          {...S(color, strokeWidth)}
        />
        <path
          d="m13 7-2-2a1 1 0 0 0-1.4 0L5.3 9.3a1 1 0 0 0 0 1.4l3 3a1 1 0 0 0 1.4 0l1.3-1.3"
          {...S(color, strokeWidth)}
        />
        <circle
          cx="12"
          cy="12"
          r="2.6"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-3-3a1 1 0 0 0-1.4 0l-1.3 1.3"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m13 7-2-2a1 1 0 0 0-1.4 0L5.3 9.3a1 1 0 0 0 0 1.4l3 3a1 1 0 0 0 1.4 0l1.3-1.3"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.6" fill={color} stroke={structuralColor} strokeWidth={1} />
        <circle cx="12" cy="12" r="1.1" fill={structuralColor} />
      </svg>
    ),
  },
  pipeline: {
    name: 'pipeline',
    label: 'Pipeline',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 5h18l-3 4H6z" {...S(color, strokeWidth)} />
        <path
          d="M6 10h12l-3 4H9z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <path d="M9 15h6v4H9z" {...S(color, strokeWidth)} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 5h18l-3 4H6z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <path
          d="M6 10h12l-3 4H9z"
          fill={structuralColor}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <path
          d="M9 15h6v4H9z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  campaigns: {
    name: 'campaigns',
    label: 'Campaigns',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor, accentColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
          {...S(color, strokeWidth)}
        />
        <path
          d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
          {...S(color, strokeWidth)}
        />
        <circle
          cx="15.5"
          cy="8.5"
          r="2.2"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <circle cx="15.5" cy="8.5" r="0.9" fill={accentColor} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
          fill={structuralColor}
          stroke={color}
          strokeWidth={1}
        />
        <path
          d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <circle cx="15.5" cy="8.5" r="2.2" fill={structuralColor} />
      </svg>
    ),
  },
  products: {
    name: 'products',
    label: 'Products',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
          {...S(color, strokeWidth)}
        />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" {...S(color, strokeWidth)} />
        <rect
          x="9.5"
          y="13.5"
          width="5"
          height="4"
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
          d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <path
          d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"
          stroke={structuralColor}
          strokeWidth={1.5}
        />
        <rect x="9.5" y="13.5" width="5" height="4" rx="1" fill={structuralColor} />
      </svg>
    ),
  },
  quotes: {
    name: 'quotes',
    label: 'Quotes',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" {...S(color, strokeWidth)} />
        <line x1="7" y1="16" x2="17" y2="16" {...S(color, strokeWidth)} />
        <path
          d="M8 8.5c0-1.4 1.1-2.5 2.5-2.5v1.5c-.6 0-1 .4-1 1h2v3H8v-3z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={1.2}
        />
        <path
          d="M13 8.5c0-1.4 1.1-2.5 2.5-2.5v1.5c-.6 0-1 .4-1 1h2v3h-3.5v-3z"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={1.2}
        />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="3"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <line
          x1="7"
          y1="16"
          x2="17"
          y2="16"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <path
          d="M8 8.5c0-1.4 1.1-2.5 2.5-2.5v1.5c-.6 0-1 .4-1 1h2v3H8v-3z"
          fill={structuralColor}
        />
        <path
          d="M13 8.5c0-1.4 1.1-2.5 2.5-2.5v1.5c-.6 0-1 .4-1 1h2v3h-3.5v-3z"
          fill={structuralColor}
        />
      </svg>
    ),
  },
  invoices: {
    name: 'invoices',
    label: 'Invoices',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 2v20l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5V2H4z" {...S(color, strokeWidth)} />
        <line x1="8" y1="7" x2="16" y2="7" {...S(color, strokeWidth)} />
        <line x1="8" y1="11" x2="14" y2="11" {...S(color, strokeWidth)} />
        <rect
          x="8"
          y="14"
          width="8"
          height="3"
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
          d="M4 2v20l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 3 1.5V2H4z"
          fill={color}
          stroke={structuralColor}
          strokeWidth={1}
        />
        <line
          x1="8"
          y1="7"
          x2="16"
          y2="7"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="11"
          x2="14"
          y2="11"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <rect x="8" y="14" width="8" height="3" rx="1" fill={structuralColor} />
      </svg>
    ),
  },
  support: {
    name: 'support',
    label: 'Support',
    category: 'crm',
    outline: ({ size, color, strokeWidth = 1.75, secondaryColor, accentColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" {...S(color, strokeWidth)} />
        <line x1="4.93" y1="4.93" x2="8.5" y2="8.5" {...S(color, strokeWidth)} />
        <line x1="15.5" y1="15.5" x2="19.07" y2="19.07" {...S(color, strokeWidth)} />
        <line x1="15.5" y1="8.5" x2="19.07" y2="4.93" {...S(color, strokeWidth)} />
        <line x1="4.93" y1="19.07" x2="8.5" y2="15.5" {...S(color, strokeWidth)} />
        <circle
          cx="12"
          cy="12"
          r="4"
          fill={secondaryColor}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <circle cx="12" cy="12" r="1.3" fill={accentColor} />
      </svg>
    ),
    solid: ({ size, color, structuralColor }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill={color} stroke={structuralColor} strokeWidth={1} />
        <line
          x1="4.93"
          y1="4.93"
          x2="8.5"
          y2="8.5"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <line
          x1="15.5"
          y1="15.5"
          x2="19.07"
          y2="19.07"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <line
          x1="15.5"
          y1="8.5"
          x2="19.07"
          y2="4.93"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <line
          x1="4.93"
          y1="19.07"
          x2="8.5"
          y2="15.5"
          stroke={structuralColor}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="4" fill={structuralColor} stroke={color} strokeWidth={1} />
        <circle cx="12" cy="12" r="1.5" fill={color} />
      </svg>
    ),
  },
};

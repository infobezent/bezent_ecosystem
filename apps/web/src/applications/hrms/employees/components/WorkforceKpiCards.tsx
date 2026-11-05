import { useId, useMemo } from 'react';
import { Grid } from '../../../../design-system/components';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import type { EmployeeRecord } from '../api/employeesApi';

export interface WorkforceKpiSummary {
  total: number | null;
  active: number | null;
  pendingActivation: number | null;
  inactive: number | null;
  loading?: boolean;
  error?: boolean;
}

export interface WorkforceKpiCardsProps {
  kpis: WorkforceKpiSummary;
  employees?: EmployeeRecord[];
  activeStatusTab?: string;
  onSelectStatusTab?: (tabId: string) => void;
  referenceDate?: Date;
}

export interface TrendCalculationResult {
  trendData: number[] | null;
  trendChange: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  } | null;
}

/**
 * Computes genuine monthly historical trends from real employee records.
 * Returns null when insufficient historical date data is present (never fakes data).
 */
export function computeWorkforceMonthlyTrends(
  employees: EmployeeRecord[] = [],
  referenceDate: Date = new Date(),
): {
  total: TrendCalculationResult;
  active: TrendCalculationResult;
  pendingActivation: TrendCalculationResult;
  inactive: TrendCalculationResult;
} {
  const emptyResult: TrendCalculationResult = { trendData: null, trendChange: null };

  if (!employees || employees.length === 0) {
    return {
      total: emptyResult,
      active: emptyResult,
      pendingActivation: emptyResult,
      inactive: emptyResult,
    };
  }

  // Filter employees with valid joiningDate (YYYY-MM-DD)
  const validDatedEmployees = employees.filter(
    (e) => typeof e.joiningDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.joiningDate),
  );

  if (validDatedEmployees.length === 0) {
    return {
      total: emptyResult,
      active: emptyResult,
      pendingActivation: emptyResult,
      inactive: emptyResult,
    };
  }

  // Build the last 6 calendar month cutoff points (YYYY-MM)
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth(); // 0-based
  const monthKeys: string[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(refYear, refMonth - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    monthKeys.push(`${y}-${m}`);
  }

  // Compute metric snapshots for each of the 6 months
  const totalSeries: number[] = [];
  const activeSeries: number[] = [];
  const pendingSeries: number[] = [];
  const inactiveSeries: number[] = [];

  for (const monthKey of monthKeys) {
    // Count records joined on or before the end of this month
    const countTotal = validDatedEmployees.filter(
      (e) => e.joiningDate.slice(0, 7) <= monthKey,
    ).length;
    const countActive = validDatedEmployees.filter(
      (e) =>
        e.joiningDate.slice(0, 7) <= monthKey &&
        (e.employmentStatus === 'active' || e.employmentStatus === 'probation'),
    ).length;
    const countPending = validDatedEmployees.filter(
      (e) => e.joiningDate.slice(0, 7) <= monthKey && e.employmentStatus === 'pending_activation',
    ).length;
    const countInactive = validDatedEmployees.filter(
      (e) =>
        e.joiningDate.slice(0, 7) <= monthKey &&
        (e.employmentStatus === 'terminated' ||
          e.employmentStatus === 'suspended' ||
          e.employmentStatus === 'resigned'),
    ).length;

    totalSeries.push(countTotal);
    activeSeries.push(countActive);
    pendingSeries.push(countPending);
    inactiveSeries.push(countInactive);
  }

  function resolveSeriesResult(series: number[]): TrendCalculationResult {
    // Check if there is actual historical data with records
    const maxVal = Math.max(...series);
    if (maxVal === 0 && series.every((v) => v === 0)) {
      return emptyResult;
    }

    const current = series[series.length - 1] ?? 0;
    const previous = series[series.length - 2] ?? 0;
    const delta = current - previous;

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    let label = 'Stable this month';

    if (delta > 0) {
      direction = 'up';
      label = `+${delta} this month`;
    } else if (delta < 0) {
      direction = 'down';
      label = `${delta} this month`;
    }

    return {
      trendData: series,
      trendChange: {
        direction,
        label,
      },
    };
  }

  return {
    total: resolveSeriesResult(totalSeries),
    active: resolveSeriesResult(activeSeries),
    pendingActivation: resolveSeriesResult(pendingSeries),
    inactive: resolveSeriesResult(inactiveSeries),
  };
}

interface MiniChartProps {
  data: number[] | null;
  accent: 'blue' | 'green' | 'amber' | 'coral';
  type: 'smooth-area' | 'vertical-bars' | 'mini-area' | 'subtle-line';
  chartId: string;
}

export type KpiChartType =
  | 'smooth-area'
  | 'vertical-bars'
  | 'mini-area'
  | 'subtle-line'
  | 'workforce-ring'
  | 'workforce-skyline'
  | 'workforce-network'
  | 'onboarding-pathway'
  | 'archive-vault';

/**
 * Workforce Skyline & Silhouette Visualization
 *
 * Implements a modern corporate city skyline in gradient cyan/blue with
 * walking workforce silhouettes in perspective and a central highlighted hero figure,
 * reflecting enterprise momentum and human capital.
 */
export function WorkforceSkyline() {
  return (
    <div className="bezent-workforce-skyline" aria-hidden="true">
      <svg
        className="bezent-workforce-skyline__svg"
        viewBox="0 0 96 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="skyline-main-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="skyline-mid-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="skyline-ground-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#eff6ff" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 1. Distant Architectural Skyline (Far layer) */}
        <rect x="3" y="10" width="1.5" height="18" fill="#bfdbfe" opacity="0.6" />
        <rect x="1" y="14" width="5.5" height="14" fill="#bfdbfe" opacity="0.5" />
        <rect x="9" y="12" width="6" height="16" fill="#bfdbfe" opacity="0.5" />
        <rect x="47" y="2" width="2" height="26" fill="#93c5fd" opacity="0.7" />
        <rect x="45.5" y="6" width="5" height="22" fill="#bfdbfe" opacity="0.5" />
        <rect x="85" y="8" width="1.5" height="20" fill="#bfdbfe" opacity="0.6" />
        <rect x="83.5" y="12" width="5.5" height="16" fill="#bfdbfe" opacity="0.5" />
        <rect x="91" y="15" width="4" height="13" fill="#bfdbfe" opacity="0.4" />

        {/* 2. Geometric hexagon architectural watermark behind center */}
        <polygon
          points="48,4 62,11 62,25 48,32 34,25 34,11"
          stroke="#93c5fd"
          strokeWidth="0.8"
          strokeDasharray="2 2"
          fill="none"
          opacity="0.35"
        />

        {/* 3. Midground Corporate Buildings (Main Skyline Layer) */}
        <rect x="8" y="16" width="8" height="12" fill="url(#skyline-mid-grad)" rx="0.5" />
        <polygon points="17,13 23,13 25,17 17,17" fill="url(#skyline-mid-grad)" />
        <rect x="17" y="16" width="8" height="12" fill="url(#skyline-main-grad)" rx="0.5" />
        <rect x="27" y="12" width="9" height="16" fill="url(#skyline-mid-grad)" rx="0.5" />
        <rect x="38" y="9" width="11" height="19" fill="url(#skyline-main-grad)" rx="0.5" />
        <polygon points="51,5 57,10 57,28 51,28" fill="url(#skyline-main-grad)" />
        <rect x="58" y="11" width="10" height="17" fill="url(#skyline-mid-grad)" rx="0.5" />
        <polygon points="70,12 77,15 77,28 70,28" fill="url(#skyline-main-grad)" />
        <rect x="78" y="15" width="8" height="13" fill="url(#skyline-mid-grad)" rx="0.5" />

        {/* 4. Perspective Walking Plane Gradient */}
        <rect x="0" y="24" width="96" height="22" fill="url(#skyline-ground-grad)" />

        {/* 5. Walking Ground Perspective Shadows */}
        <ellipse cx="48" cy="43.5" rx="4.5" ry="1.2" fill="#2563eb" opacity="0.16" />
        <ellipse cx="34" cy="41.5" rx="3.5" ry="1" fill="#2563eb" opacity="0.12" />
        <ellipse cx="62" cy="40.5" rx="3.5" ry="1" fill="#2563eb" opacity="0.12" />
        <ellipse cx="22" cy="37.5" rx="2.8" ry="0.8" fill="#2563eb" opacity="0.1" />
        <ellipse cx="74" cy="36.5" rx="2.8" ry="0.8" fill="#2563eb" opacity="0.1" />
        <ellipse cx="14" cy="33.5" rx="2.2" ry="0.6" fill="#2563eb" opacity="0.08" />
        <ellipse cx="82" cy="32.5" rx="2.2" ry="0.6" fill="#2563eb" opacity="0.08" />

        {/* 6. Distant Background People (Small Silhouettes) */}
        <g fill="#60a5fa" opacity="0.6">
          <circle cx="14" cy="27" r="1.1" />
          <path d="M12.8 33 L13.5 29 A1 1 0 0 1 14.5 29 L15.2 33 Z" />
          <circle cx="28" cy="26" r="1.1" />
          <path d="M26.8 32 L27.5 28 A1 1 0 0 1 28.5 28 L29.2 32 Z" />
          <circle cx="53" cy="25" r="1.1" />
          <path d="M51.8 31 L52.5 27 A1 1 0 0 1 53.5 27 L54.2 31 Z" />
          <circle cx="68" cy="26" r="1.1" />
          <path d="M66.8 32 L67.5 28 A1 1 0 0 1 68.5 28 L69.2 32 Z" />
          <circle cx="82" cy="27" r="1.1" />
          <path d="M80.8 33 L81.5 29 A1 1 0 0 1 82.5 29 L83.2 33 Z" />
        </g>

        {/* 7. Midground Walking People */}
        <g fill="#2563eb" opacity="0.85">
          <circle cx="22" cy="30" r="1.5" />
          <path d="M20.5 37 L21.2 32.5 A1.3 1.3 0 0 1 22.8 32.5 L23.5 37 L22.8 37 L22.4 34.5 L22 37 Z" />
          <circle cx="41" cy="29" r="1.5" />
          <path d="M39.5 36 L40.2 31.5 A1.3 1.3 0 0 1 41.8 31.5 L42.5 36 L41.8 36 L41.4 33.5 L41 36 Z" />
          <circle cx="55" cy="28.5" r="1.5" />
          <path d="M53.5 35.5 L54.2 31 A1.3 1.3 0 0 1 55.8 31 L56.5 35.5 L55.8 35.5 L55.4 33 L55 35.5 Z" />
          <circle cx="74" cy="29.5" r="1.5" />
          <path d="M72.5 36.5 L73.2 32 A1.3 1.3 0 0 1 74.8 32 L75.5 36.5 L74.8 36.5 L74.4 34 L74 36.5 Z" />
        </g>

        {/* 8. Foreground Walking Professionals (Strong Silhouettes) */}
        <g fill="#1d4ed8">
          <circle cx="34" cy="33" r="1.8" />
          <path d="M32 41 L32.8 36 C33 35.3 33.7 35 34.4 35 C35.1 35 35.8 35.3 36 36 L36.8 41 L35.8 41 L35.2 38 L34.6 41 Z" />
          <circle cx="62" cy="32" r="1.8" />
          <path d="M60 40 L60.8 35 C61 34.3 61.7 34 62.4 34 C63.1 34 63.8 34.3 64 35 L64.8 40 L63.8 40 L63.2 37 L62.6 40 Z" />
        </g>

        {/* 9. Standout Foreground Hero Figure (White Highlight in Center) */}
        <g className="bezent-workforce-skyline__person--hero">
          <circle cx="48" cy="32" r="2.2" />
          <path d="M45.5 43.5 L46.4 36.8 C46.7 35.8 47.4 35.2 48.3 35.2 C49.2 35.2 49.9 35.8 50.2 36.8 L51.1 43.5 L49.9 43.5 L49.3 39.5 L48.7 43.5 Z" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Workforce Ring Visualization
 *
 * Implements a clean circular ring using segmented arcs, BEZENT emerald green (#168653)
 * and soft mint (#B7E8CF) palette with a central UsersRound employee-group icon.
 */
export function WorkforceRing() {
  return (
    <div className="bezent-workforce-ring" aria-hidden="true">
      <svg
        className="bezent-workforce-ring__svg"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft mint circular backdrop */}
        <circle cx="24" cy="24" r="22" className="bezent-workforce-ring__bg" />

        {/* Subtle background track */}
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="var(--bezent-ring-track, #b7e8cf)"
          strokeWidth="3"
          strokeOpacity="0.4"
        />

        {/* Segment 1: Primary Emerald arc (Top-right) */}
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="var(--bezent-ring-primary, #168653)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="28 85.1"
          strokeDashoffset="0"
          className="bezent-workforce-ring__segment"
        />

        {/* Segment 2: Primary Emerald arc (Bottom-right) */}
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="var(--bezent-ring-primary, #168653)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="24 89.1"
          strokeDashoffset="-34"
          className="bezent-workforce-ring__segment"
        />

        {/* Segment 3: Soft Mint arc (Bottom-left) */}
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="var(--bezent-ring-mint, #b7e8cf)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray="22 91.1"
          strokeDashoffset="-64"
          className="bezent-workforce-ring__segment"
        />

        {/* Segment 4: Accent dot / subtle cap segment (Top-left) */}
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="var(--bezent-ring-primary, #168653)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="2 111.1"
          strokeDashoffset="-92"
          className="bezent-workforce-ring__segment"
        />

        {/* Central UsersRound Employee-Group Icon */}
        <g
          className="bezent-workforce-ring__icon"
          transform="translate(16, 16)"
          stroke="var(--bezent-ring-primary, #168653)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Main User in front */}
          <path d="M12.5 13.5a4.5 4.5 0 0 0-9 0" />
          <circle cx="8" cy="5.5" r="2.75" />
          {/* Secondary User behind */}
          <path d="M13.5 13.5a4 4 0 0 0-3.5-3.5" />
          <path d="M11.5 3.5a2.25 2.25 0 0 1 0 4" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Workforce Network Visualization
 *
 * Implements a connected team network in emerald green & soft mint,
 * featuring an active central pulsing hub linked to surrounding team nodes,
 * representing synchronized, real-time workforce collaboration.
 */
export function WorkforceNetwork() {
  return (
    <div className="bezent-workforce-network" aria-hidden="true">
      <svg
        className="bezent-workforce-network__svg"
        viewBox="0 0 94 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="network-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="1" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="network-line-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="0.5" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="1" stopColor="#34d399" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* 1. Ambient Emerald Radial Glow */}
        <ellipse cx="47" cy="23" rx="44" ry="20" fill="url(#network-glow-grad)" />

        {/* 2. Geometric Hexagonal / Orbital Grid Boundary */}
        <polygon
          points="47,4 72,13 72,33 47,42 22,33 22,13"
          stroke="#10b981"
          strokeWidth="0.75"
          strokeDasharray="2 3"
          fill="none"
          opacity="0.35"
        />

        {/* 3. Interconnecting Mesh Link Lines */}
        <g stroke="#10b981" strokeWidth="1" opacity="0.6">
          <line x1="47" y1="23" x2="22" y2="13" />
          <line x1="47" y1="23" x2="72" y2="13" />
          <line x1="47" y1="23" x2="22" y2="33" />
          <line x1="47" y1="23" x2="72" y2="33" />
          <line x1="47" y1="23" x2="10" y2="23" strokeDasharray="2 2" opacity="0.5" />
          <line x1="47" y1="23" x2="84" y2="23" strokeDasharray="2 2" opacity="0.5" />
          <line
            x1="22"
            y1="13"
            x2="72"
            y2="13"
            stroke="url(#network-line-grad)"
            strokeWidth="0.8"
          />
          <line
            x1="22"
            y1="33"
            x2="72"
            y2="33"
            stroke="url(#network-line-grad)"
            strokeWidth="0.8"
          />
          <line x1="22" y1="13" x2="22" y2="33" opacity="0.4" />
          <line x1="72" y1="13" x2="72" y2="33" opacity="0.4" />
        </g>

        {/* 4. Peripheral Connected Employee Avatar Nodes */}
        {/* West Employee Node */}
        <g className="bezent-workforce-network__employee-node">
          <circle cx="10" cy="23" r="3.8" fill="#ecfdf5" stroke="#10b981" strokeWidth="0.9" />
          <circle cx="10" cy="21.9" r="1.1" fill="#059669" />
          <path d="M 8 25.6 C 8 23.9, 12 23.9, 12 25.6 Z" fill="#059669" />
        </g>

        {/* East Employee Node */}
        <g className="bezent-workforce-network__employee-node">
          <circle cx="84" cy="23" r="3.8" fill="#ecfdf5" stroke="#10b981" strokeWidth="0.9" />
          <circle cx="84" cy="21.9" r="1.1" fill="#059669" />
          <path d="M 82 25.6 C 82 23.9, 86 23.9, 86 25.6 Z" fill="#059669" />
        </g>

        {/* North-West Employee Node */}
        <g className="bezent-workforce-network__employee-node">
          <circle cx="22" cy="13" r="4.6" fill="#e6f7ee" stroke="#10b981" strokeWidth="1" />
          <circle cx="22" cy="11.7" r="1.3" fill="#059669" />
          <path d="M 19.6 16.2 C 19.6 14.2, 24.4 14.2, 24.4 16.2 Z" fill="#059669" />
        </g>

        {/* North-East Employee Node */}
        <g className="bezent-workforce-network__employee-node">
          <circle cx="72" cy="13" r="4.6" fill="#e6f7ee" stroke="#10b981" strokeWidth="1" />
          <circle cx="72" cy="11.7" r="1.3" fill="#059669" />
          <path d="M 69.6 16.2 C 69.6 14.2, 74.4 14.2, 74.4 16.2 Z" fill="#059669" />
        </g>

        {/* South-West Employee Node */}
        <g className="bezent-workforce-network__employee-node">
          <circle cx="22" cy="33" r="4.6" fill="#e6f7ee" stroke="#10b981" strokeWidth="1" />
          <circle cx="22" cy="31.7" r="1.3" fill="#059669" />
          <path d="M 19.6 36.2 C 19.6 34.2, 24.4 34.2, 24.4 36.2 Z" fill="#059669" />
        </g>

        {/* South-East Employee Node */}
        <g className="bezent-workforce-network__employee-node">
          <circle cx="72" cy="33" r="4.6" fill="#e6f7ee" stroke="#10b981" strokeWidth="1" />
          <circle cx="72" cy="31.7" r="1.3" fill="#059669" />
          <path d="M 69.6 36.2 C 69.6 34.2, 74.4 34.2, 74.4 36.2 Z" fill="#059669" />
        </g>

        {/* 5. Center Active Pulse Hub (Concentric energetic ripples) */}
        <circle cx="47" cy="23" r="11" fill="#10b981" fillOpacity="0.1" />
        <circle cx="47" cy="23" r="8" fill="#10b981" fillOpacity="0.2" />
        <circle cx="47" cy="23" r="5.2" fill="#059669" stroke="#ffffff" strokeWidth="1" />
        {/* Active checkmark inside center */}
        <path
          d="M45 23 L46.5 24.5 L49 21.5"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

/**
 * Onboarding Access Pass & Activation Timer Visualization
 *
 * Implements a modern corporate New Hire Smart ID Access Pass paired with
 * an orbital activation countdown ring and clock, symbolizing newly hired
 * employees awaiting account activation and first sign-in.
 */
export function OnboardingPathway() {
  return (
    <div className="bezent-onboarding-pathway" aria-hidden="true">
      <svg
        className="bezent-onboarding-pathway__svg"
        viewBox="0 0 94 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pass-card-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fffdf5" />
            <stop offset="1" stopColor="#fef3c7" />
          </linearGradient>
          <radialGradient id="activation-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Ambient Activation Glow behind timer */}
        <ellipse cx="76" cy="23" rx="16" ry="16" fill="url(#activation-glow-grad)" />

        {/* 2. Perspective Ground Shadow under ID Badge */}
        <ellipse cx="32" cy="41" rx="20" ry="2" fill="#d97706" opacity="0.12" />

        {/* 3. New Hire Corporate Smart ID Card */}
        {/* Lanyard Clip Slot */}
        <rect
          x="28"
          y="4"
          width="8"
          height="4"
          rx="1.5"
          fill="#fde68a"
          stroke="#d97706"
          strokeWidth="0.8"
        />
        <circle cx="32" cy="6" r="0.9" fill="#92400e" />

        {/* Card Body */}
        <rect
          x="8"
          y="7"
          width="48"
          height="32"
          rx="4"
          fill="url(#pass-card-grad)"
          stroke="#f59e0b"
          strokeWidth="1.2"
        />

        {/* Avatar Photo Frame on Card */}
        <rect
          x="13"
          y="12"
          width="14"
          height="16"
          rx="2.5"
          fill="#fef3c7"
          stroke="#fcd34d"
          strokeWidth="0.8"
        />
        {/* New Hire Silhouette inside Photo Frame */}
        <circle cx="20" cy="17" r="2.2" fill="#d97706" />
        <path d="M 15.8 26 C 15.8 22.2, 24.2 22.2, 24.2 26 Z" fill="#d97706" />

        {/* Identity Details lines */}
        <rect x="30" y="13" width="20" height="2.5" rx="1.25" fill="#d97706" />
        <rect x="30" y="18" width="15" height="2" rx="1" fill="#f59e0b" opacity="0.85" />
        <rect x="30" y="22.5" width="11" height="1.8" rx="0.9" fill="#fcd34d" />

        {/* Micro Smart Chip */}
        <rect
          x="30"
          y="26.5"
          width="6"
          height="5"
          rx="1"
          fill="#fef3c7"
          stroke="#f59e0b"
          strokeWidth="0.6"
        />
        <line x1="33" y1="26.5" x2="33" y2="31.5" stroke="#f59e0b" strokeWidth="0.5" />
        <line x1="30" y1="29" x2="36" y2="29" stroke="#f59e0b" strokeWidth="0.5" />

        {/* Pending Activation Status Tag */}
        <rect
          x="13"
          y="31"
          width="21"
          height="4.5"
          rx="2"
          fill="#fffbeb"
          stroke="#f59e0b"
          strokeWidth="0.6"
        />
        <circle cx="16" cy="33.25" r="1.1" fill="#f59e0b" />
        <rect x="18.5" y="32.4" width="12" height="1.7" rx="0.8" fill="#b45309" />

        {/* 4. Connecting Trajectory between Badge and Activation Ring */}
        <path
          d="M 56 23 L 64 23"
          stroke="#f59e0b"
          strokeWidth="1.2"
          strokeDasharray="2 2"
          opacity="0.75"
        />
        <circle cx="60" cy="23" r="1.3" fill="#d97706" />

        {/* 5. Orbital Activation Countdown Timer */}
        {/* Background Track */}
        <circle
          cx="76"
          cy="23"
          r="14"
          stroke="#fde68a"
          strokeWidth="2.5"
          strokeOpacity="0.5"
          fill="none"
        />
        {/* Progress Arc */}
        <circle
          cx="76"
          cy="23"
          r="14"
          stroke="#f59e0b"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeDasharray="64 88"
          strokeDashoffset="0"
          fill="none"
        />
        <circle cx="76" cy="9" r="2.2" fill="#d97706" stroke="#ffffff" strokeWidth="0.8" />

        {/* Inner Clock Disc */}
        <circle cx="76" cy="23" r="9" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1" />
        <path
          d="M 76 18 V 23 L 79.5 24.5"
          stroke="#b45309"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 6. Micro Welcome Star Accent */}
        <polygon
          points="88,11 89,13 91,14 89,15 88,17 87,15 85,14 87,13"
          fill="#f59e0b"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

/**
 * Offboarded Employee Pass & Exit Transition Visualization (Inactive Employees Card)
 *
 * Implements a dignified Offboarded Employee Smart ID Pass paired with an exit
 * transition trajectory and outbound completion seal, symbolizing employees who
 * have successfully transitioned, separated, or graduated to alumni status.
 */
export function ArchiveVault() {
  return (
    <div className="bezent-archive-vault" aria-hidden="true">
      <svg
        className="bezent-archive-vault__svg"
        viewBox="0 0 94 46"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="offboard-card-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffafa" />
            <stop offset="100%" stopColor="#ffe4e6" />
          </linearGradient>
          <radialGradient id="offboard-glow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
            <stop offset="1" stopColor="#f43f5e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Ambient Sunset Glow behind exit seal */}
        <ellipse cx="76" cy="23" rx="16" ry="16" fill="url(#offboard-glow-grad)" />

        {/* 2. Ground Shadow under Offboarded ID Badge */}
        <ellipse cx="32" cy="41" rx="20" ry="2" fill="#e11d48" opacity="0.10" />

        {/* 3. Offboarded Employee Smart ID Card */}
        {/* Lanyard Clip Slot */}
        <rect
          x="28"
          y="4"
          width="8"
          height="4"
          rx="1.5"
          fill="#fecdd3"
          stroke="#f43f5e"
          strokeWidth="0.8"
        />
        <circle cx="32" cy="6" r="0.9" fill="#9f1239" />

        {/* Card Body */}
        <rect
          className="bezent-archive-vault__badge"
          x="8"
          y="7"
          width="48"
          height="32"
          rx="4"
          fill="url(#offboard-card-grad)"
          stroke="#f43f5e"
          strokeWidth="1.2"
        />

        {/* Avatar Photo Frame on Card */}
        <rect
          className="bezent-archive-vault__photo"
          x="13"
          y="12"
          width="14"
          height="16"
          rx="2.5"
          fill="#ffe4e6"
          stroke="#fda4af"
          strokeWidth="0.8"
        />
        {/* Offboarded Employee Silhouette inside Photo Frame */}
        <circle cx="20" cy="17" r="2.2" fill="#e11d48" />
        <path d="M 15.8 26 C 15.8 22.2, 24.2 22.2, 24.2 26 Z" fill="#e11d48" />

        {/* Identity Details lines */}
        <rect x="30" y="13" width="20" height="2.5" rx="1.25" fill="#e11d48" />
        <rect x="30" y="18" width="15" height="2" rx="1" fill="#f43f5e" opacity="0.85" />
        <rect x="30" y="22.5" width="11" height="1.8" rx="0.9" fill="#fda4af" />

        {/* Offboarding / Alumni Archive Tag */}
        <rect
          x="30"
          y="26.5"
          width="7"
          height="4"
          rx="1"
          fill="#ffe4e6"
          stroke="#f43f5e"
          strokeWidth="0.6"
        />
        <line x1="32" y1="28.5" x2="35" y2="28.5" stroke="#f43f5e" strokeWidth="0.6" />

        {/* Inactive / Separated Status Tag at bottom */}
        <rect
          x="13"
          y="31"
          width="23"
          height="4.5"
          rx="2"
          fill="#fff1f2"
          stroke="#f43f5e"
          strokeWidth="0.6"
        />
        <circle cx="16" cy="33.25" r="1.1" fill="#f43f5e" />
        <rect x="18.5" y="32.4" width="14" height="1.7" rx="0.8" fill="#9f1239" />

        {/* 4. Exit Directional Transition Arrow (➡) */}
        <g className="bezent-archive-vault__transition">
          <line
            x1="55"
            y1="23"
            x2="64"
            y2="23"
            stroke="#f43f5e"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.8"
          />
          <path
            d="M 61.5 20.8 L 64.5 23 L 61.5 25.2"
            stroke="#e11d48"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        {/* 5. Offboarded Completion Halo & Exit Portal Seal */}
        {/* Background Track */}
        <circle
          cx="76"
          cy="23"
          r="14"
          stroke="#fecdd3"
          strokeWidth="2.5"
          strokeOpacity="0.5"
          fill="none"
        />
        {/* Progress / Completion Arc */}
        <circle
          cx="76"
          cy="23"
          r="14"
          stroke="#f43f5e"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeDasharray="64 88"
          strokeDashoffset="0"
          fill="none"
        />
        <circle cx="76" cy="9" r="2.2" fill="#e11d48" stroke="#ffffff" strokeWidth="0.8" />

        {/* Inner Exit Seal Disc */}
        <circle
          className="bezent-archive-vault__exit-seal"
          cx="76"
          cy="23"
          r="9"
          fill="#fff1f2"
          stroke="#f43f5e"
          strokeWidth="1"
        />

        {/* Outbound Transition Portal / Logout Exit Icon inside disc */}
        <path
          d="M 74 19.5 H 72 C 71.4 19.5, 71 19.9, 71 20.5 V 25.5 C 71 26.1, 71.4 26.5, 72 26.5 H 74"
          stroke="#9f1239"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line
          x1="73"
          y1="23"
          x2="79.5"
          y2="23"
          stroke="#9f1239"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 77.5 20.8 L 80 23 L 77.5 25.2"
          stroke="#9f1239"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 6. Career Milestone Star Accent */}
        <polygon
          points="88,11 89,13 91,14 89,15 88,17 87,15 85,14 87,13"
          fill="#f43f5e"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

function generateSmoothCurve(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i]!;
    const p1 = pts[i + 1]!;
    const cpx = (p0.x + p1.x) / 2;
    d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

/**
 * Minimalist Executive Sparkline Wave (Idea 1)
 *
 * Implements clean, crisp translucent white sparkline curves and stepped bars
 * designed to overlay seamlessly on vibrant solid background KPI cards.
 */
function MiniChart({ data, accent = 'blue', type, chartId }: MiniChartProps) {
  const gradId = `spark-grad-${chartId}`;

  const themeColors: Record<
    'blue' | 'green' | 'amber' | 'coral',
    {
      primary: string;
      halo: string;
      fillOpacity: number;
    }
  > = {
    blue: {
      primary: '#2563eb',
      halo: 'rgba(37, 99, 235, 0.15)',
      fillOpacity: 0.16,
    },
    green: {
      primary: '#059669',
      halo: 'rgba(5, 150, 105, 0.15)',
      fillOpacity: 0.16,
    },
    amber: {
      primary: '#d97706',
      halo: 'rgba(217, 119, 6, 0.15)',
      fillOpacity: 0.18,
    },
    coral: {
      primary: '#e11d48',
      halo: 'rgba(225, 29, 72, 0.15)',
      fillOpacity: 0.14,
    },
  };

  const theme = themeColors[accent] || themeColors.blue;

  // 1. Stepped Queue Bars (Pending Activation / In-Progress queue)
  if (type === 'vertical-bars') {
    const barConfigs = [
      { x: 30, y: 30, height: 6, opacity: 0.25 },
      { x: 40, y: 26, height: 10, opacity: 0.4 },
      { x: 50, y: 22, height: 14, opacity: 0.6 },
      { x: 60, y: 18, height: 18, opacity: 0.8 },
      { x: 70, y: 14, height: 22, opacity: 0.95 },
    ];
    const peakPt = { x: 73.5, y: 14 };

    return (
      <svg
        className="bezent-trend-kpi-card__chart-svg"
        viewBox="0 0 88 40"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        {/* Subtle Horizon Baseline */}
        <line
          x1="22"
          y1="36"
          x2="80"
          y2="36"
          stroke={theme.primary}
          strokeOpacity="0.2"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Stepped Queue Micro-Bars */}
        {barConfigs.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={7}
            height={b.height}
            rx={2}
            fill={theme.primary}
            fillOpacity={b.opacity}
          />
        ))}

        {/* Micro Frosted Person Pin Badge (Floating above tallest bar) */}
        <g className="bezent-trend-kpi-card__chart-badge" aria-hidden="true">
          <circle cx={peakPt.x} cy={peakPt.y - 6} r={7.5} fill={theme.halo} />
          <circle
            cx={peakPt.x}
            cy={peakPt.y - 6}
            r={5.5}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="0.8"
          />
          <circle cx={peakPt.x} cy={peakPt.y - 7.6} r={1.5} fill="#64748b" />
          <path
            d={`M ${peakPt.x - 2.4} ${peakPt.y - 2.8} C ${peakPt.x - 2.4} ${peakPt.y - 4.8}, ${peakPt.x + 2.4} ${peakPt.y - 4.8}, ${peakPt.x + 2.4} ${peakPt.y - 2.8} Z`}
            fill="#64748b"
          />
          <circle cx={peakPt.x} cy={peakPt.y} r={2} fill={theme.primary} />
        </g>
      </svg>
    );
  }

  // 2. Inactive Employees: Clean Sleek Horizontal Baseline (Matching Mockup)
  if (type === 'subtle-line') {
    return (
      <svg
        className="bezent-trend-kpi-card__chart-svg"
        viewBox="0 0 88 40"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <line
          x1="16"
          y1="26"
          x2="80"
          y2="26"
          stroke={theme.primary}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // 3. Smooth Wave Curves (Total = smooth-area, Active = mini-area)
  let points: { x: number; y: number }[] = [];
  let peakIndex = 5;

  if (type === 'mini-area') {
    // Active Employees: Vibrant operational pulse wave (Peak at center)
    points = [
      { x: 4, y: 26 },
      { x: 18, y: 26 },
      { x: 28, y: 21 },
      { x: 38, y: 28 },
      { x: 50, y: 12 }, // High Peak
      { x: 62, y: 31 },
      { x: 72, y: 21 },
      { x: 80, y: 26 },
    ];
    peakIndex = 4;
  } else {
    // Total Employees: Steady upward growth sparkline wave (Peak at x=68)
    points = [
      { x: 4, y: 28 },
      { x: 18, y: 22 },
      { x: 32, y: 18 },
      { x: 44, y: 24 },
      { x: 56, y: 19 },
      { x: 68, y: 12 }, // Peak
      { x: 80, y: 20 },
    ];
    peakIndex = 5;
  }

  const linePath = generateSmoothCurve(points);
  const firstPt = points[0]!;
  const lastPt = points[points.length - 1]!;
  const peakPt = points[peakIndex] || lastPt;
  const areaPath = `${linePath} L ${lastPt.x} 40 L ${firstPt.x} 40 Z`;

  return (
    <svg
      className="bezent-trend-kpi-card__chart-svg"
      viewBox="0 0 88 40"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.primary} stopOpacity={theme.fillOpacity} />
          <stop offset="100%" stopColor={theme.primary} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Translucent Soft Glow Fill under Curve */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Crisp Semantic Wave Stroke */}
      <path
        d={linePath}
        fill="none"
        stroke={theme.primary}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Micro Frosted Person Pin Badge sitting right at the curve peak */}
      <g className="bezent-trend-kpi-card__chart-badge" aria-hidden="true">
        {/* Soft Drop Halo */}
        <circle cx={peakPt.x} cy={peakPt.y - 6} r={7.5} fill={theme.halo} />
        {/* Frosted White Disc */}
        <circle
          cx={peakPt.x}
          cy={peakPt.y - 6}
          r={5.5}
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="0.8"
        />
        {/* Miniature Person Silhouette (Head & Shoulders) */}
        <circle cx={peakPt.x} cy={peakPt.y - 7.6} r={1.5} fill="#64748b" />
        <path
          d={`M ${peakPt.x - 2.4} ${peakPt.y - 2.8} C ${peakPt.x - 2.4} ${peakPt.y - 4.8}, ${peakPt.x + 2.4} ${peakPt.y - 4.8}, ${peakPt.x + 2.4} ${peakPt.y - 2.8} Z`}
          fill="#64748b"
        />
        {/* Bright Highlight Dot on the curve line */}
        <circle cx={peakPt.x} cy={peakPt.y} r={2} fill={theme.primary} />
      </g>
    </svg>
  );
}

interface SingleKpiCardProps {
  id: string;
  title: string;
  value: number | null;
  subtitle: string;
  accent: 'blue' | 'green' | 'amber' | 'coral';
  icon: BezentIconName;
  tooltip: string;
  chartType?: KpiChartType | null;
  trendResult: TrendCalculationResult;
  loading: boolean;
  isActive: boolean;
  onClick?: () => void;
}

function SingleKpiCard({
  id,
  title,
  value,
  subtitle,
  accent,
  icon,
  tooltip,
  chartType,
  trendResult,
  loading,
  isActive,
  onClick,
}: SingleKpiCardProps) {
  const chartId = useId().replace(/:/g, '');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="region"
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${title}: ${value !== null ? value : 'Loading'}`}
      className={`bezent-trend-kpi-card bezent-trend-kpi-card--${accent} ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Top Header: Icon + Title (Left) and Tooltip Info (Right) */}
      <div className="bezent-trend-kpi-card__header">
        <div className="bezent-trend-kpi-card__title-group">
          <div
            className={`bezent-trend-kpi-card__icon-badge bezent-trend-kpi-card__icon-badge--${accent}`}
            aria-hidden="true"
          >
            <BezentIcon name={icon} size={16} />
          </div>
          <span className="bezent-trend-kpi-card__title">{title}</span>
        </div>

        <button
          type="button"
          className="bezent-trend-kpi-card__info-btn"
          title={tooltip}
          aria-label={`Information: ${tooltip}`}
          onClick={(e) => e.stopPropagation()}
        >
          <BezentIcon name="help" size={14} />
        </button>
      </div>

      {/* Middle/Bottom: Prominent Value + Trend/Subtitle (Left) & Mini Chart (Right) */}
      <div className="bezent-trend-kpi-card__body">
        <div className="bezent-trend-kpi-card__metrics">
          <div className="bezent-trend-kpi-card__value">
            {loading ? (
              <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
            ) : value !== null ? (
              value
            ) : (
              '—'
            )}
          </div>

          {trendResult.trendChange ? (
            <div
              className={`bezent-trend-kpi-card__trend bezent-trend-kpi-card__trend--${trendResult.trendChange.direction}`}
            >
              {trendResult.trendChange.direction === 'up' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 9.5V2.5M6 2.5L2.5 6M6 2.5L9.5 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {trendResult.trendChange.direction === 'down' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 2.5V9.5M6 9.5L2.5 6M6 9.5L9.5 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              <span>{trendResult.trendChange.label}</span>
            </div>
          ) : (
            <span className="bezent-trend-kpi-card__caption">{subtitle}</span>
          )}
        </div>

        {chartType && (
          <div className="bezent-trend-kpi-card__chart">
            {chartType === 'workforce-skyline' ? (
              <WorkforceSkyline />
            ) : chartType === 'workforce-network' ? (
              <WorkforceNetwork />
            ) : chartType === 'onboarding-pathway' ? (
              <OnboardingPathway />
            ) : chartType === 'archive-vault' ? (
              <ArchiveVault />
            ) : chartType === 'workforce-ring' ? (
              <WorkforceRing />
            ) : (
              <MiniChart
                data={trendResult.trendData}
                accent={accent}
                type={chartType}
                chartId={`${id}-${chartId}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Workforce KPI Cards Redesign
 * Number + Mini Trend Chart (Premium Enterprise UI)
 *
 * Implements the 4 canonical workforce KPI cards:
 * 1. Total Employees (Blue #3B82F6, Workforce Skyline & silhouettes)
 * 2. Active Employees (Green #10B981, Connected Team Network & Pulse)
 * 3. Pending Activation (Amber #F59E0B, Onboarding Pathway & Portal)
 * 4. Inactive Employees (Coral #F97373, Secure Compliance Archive Vault)
 */
export function WorkforceKpiCards({
  kpis,
  employees = [],
  activeStatusTab,
  onSelectStatusTab,
  referenceDate,
}: WorkforceKpiCardsProps) {
  const trends = useMemo(
    () => computeWorkforceMonthlyTrends(employees, referenceDate),
    [employees, referenceDate],
  );

  const cards = [
    {
      id: 'total',
      title: 'Total Employees',
      value: kpis.total,
      subtitle: 'Total recorded workforce',
      accent: 'blue' as const,
      icon: 'employees' as BezentIconName,
      tooltip: 'Total count of all recorded employees across all statuses.',
      chartType: 'smooth-area' as const,
      trendResult: trends.total,
      statusTab: 'all',
    },
    {
      id: 'active',
      title: 'Active Employees',
      value: kpis.active,
      subtitle: 'Confirmed active employees',
      accent: 'green' as const,
      icon: 'userCheck' as BezentIconName,
      tooltip: 'Employees with confirmed active or probation status eligible for daily operations.',
      chartType: 'mini-area' as const,
      trendResult: trends.active,
      statusTab: 'active',
    },
    {
      id: 'pendingActivation',
      title: 'Pending Activation',
      value: kpis.pendingActivation,
      subtitle: 'Employees awaiting activation',
      accent: 'amber' as const,
      icon: 'onboarding' as BezentIconName,
      tooltip: 'Pre-boarded employees awaiting account activation and first sign-in.',
      chartType: 'vertical-bars' as const,
      trendResult: trends.pendingActivation,
      statusTab: 'pending_activation',
    },
    {
      id: 'inactive',
      title: 'Inactive Employees',
      value: kpis.inactive,
      subtitle: 'Terminated or separated',
      accent: 'coral' as const,
      icon: 'userX' as BezentIconName,
      tooltip: 'Separated employees (terminated, suspended, or resigned) preserved for compliance.',
      chartType: 'subtle-line' as const,
      trendResult: trends.inactive,
      statusTab: 'inactive',
    },
  ];

  return (
    <Grid columns={4} gap="md" role="region" aria-label="Workforce key metrics">
      {cards.map((c) => (
        <SingleKpiCard
          key={c.id}
          id={c.id}
          title={c.title}
          value={c.value}
          subtitle={c.subtitle}
          accent={c.accent}
          icon={c.icon}
          tooltip={c.tooltip}
          chartType={c.chartType}
          trendResult={c.trendResult}
          loading={Boolean(kpis.loading)}
          isActive={activeStatusTab === c.statusTab}
          onClick={onSelectStatusTab ? () => onSelectStatusTab(c.statusTab) : undefined}
        />
      ))}
    </Grid>
  );
}

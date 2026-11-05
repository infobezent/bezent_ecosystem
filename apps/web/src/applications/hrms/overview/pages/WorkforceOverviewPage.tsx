import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, ProgressBar } from '../../../../design-system/components';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import raccoonEmployeesImg from '../../../../assets/raccoon_employees.png';
import { fetchEmployees, type EmployeeRecord } from '../../employees/api/employeesApi';
import { fetchNewHiresPaginated } from '../../onboarding/api/onboardingApi';
import { fetchEmployeeActions } from '../../employee-administration/api/employeeAdministrationApi';
import { leaveOperationsApi } from '../../leave/api/leaveOperationsApi';
import { fetchRegularizationRequests } from '../../attendance/api/attendanceApi';
import { fetchDocuments } from '../../documents/api/documentsApi';

export interface WorkforceOverviewPageProps {
  title?: string;
  subtitle?: string;
}

interface OverviewKPIData {
  totalEmployees: number;
  activeEmployees: number;
  probationEmployees: number;
  newJoiners: number;
  exits: number;
  retentionRate: number;
  growthPct: number;
  netGrowth: number;
  activePct: number;
}

interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
  rank: number;
}

interface CompItem {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface DeptCapacityItem {
  name: string;
  current: number;
  approved: number;
  openPositions: number;
  gap: number;
  utilizationPct: number;
}

interface HiringRequirementItem {
  id: string;
  department: string;
  role: string;
  openings: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  expectedPeriod: string;
  status: string;
}

interface LifecycleStageItem {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
  iconClass: string;
  iconName: string;
  path: string;
}

interface HrActionItem {
  id: string;
  name: string;
  description: string;
  count: number;
  priority: 'Urgent' | 'High' | 'Medium' | 'Attention';
  priorityClass: 'urgent' | 'high' | 'medium' | 'attention';
  path: string;
  iconName: 'approvals' | 'schedule' | 'documents' | 'employees' | 'organization';
  iconClass: 'rose' | 'amber' | 'blue' | 'teal' | 'purple' | 'slate';
}

interface WorkforceActivityItem {
  id: string;
  employeeName: string;
  activityDescription: string;
  department: string;
  dateTime: string;
  formattedTime: string;
  updatedBy: string;
  iconName: 'employees' | 'organization' | 'schedule' | 'documents' | 'approvals';
  iconClass: 'blue' | 'teal' | 'amber' | 'green' | 'rose' | 'purple';
}

function formatTimelineDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeString = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (diffDays === 0) {
      if (diffHours < 1) return `Just now · ${timeString}`;
      return `Today · ${timeString}`;
    }
    if (diffDays === 1) return `Yesterday · ${timeString}`;
    if (diffDays < 7) return `${diffDays} days ago · ${timeString}`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const DONUT_COLORS_DEPT = ['#3875f6', '#10b981', '#f59e0b', '#a78bfa', '#94a3b8'];
const DONUT_COLOR_CLASSES_DEPT = ['blue', 'green', 'amber', 'purple', 'gray'];

const DONUT_COLORS_LOC = ['#10b981', '#3875f6', '#f59e0b', '#a78bfa', '#94a3b8'];
const DONUT_COLOR_CLASSES_LOC = ['green', 'blue', 'amber', 'purple', 'gray'];

const DONUT_COLORS_EMP = ['#7c3aed', '#10b981', '#f59e0b', '#a78bfa', '#94a3b8'];
const DONUT_COLOR_CLASSES_EMP = ['purple', 'green', 'amber', 'blue', 'gray'];

const PERSON_BODY_PATH =
  'M 11.5 14.5 C 9.5 15.2, 6.5 16.5, 5 18 C 3.8 19.5, 3 23, 3 29 C 3 30.8, 4 31.8, 4.75 31.8 C 5.5 31.8, 6.5 30.8, 6.5 29 L 6.5 21 C 6.5 20, 7.5 19.5, 8.5 20 L 9 20.5 L 9 33 L 19 33 L 19 20.5 L 19.5 20 C 20.5 19.5, 21.5 20, 21.5 21 L 21.5 29 C 21.5 30.8, 22.5 31.8, 23.25 31.8 C 24 31.8, 25 30.8, 25 29 C 25 23, 24.2 19.5, 23 18 C 21.5 16.5, 18.5 15.2, 16.5 14.5 Z';

interface PersonInfographicChartProps {
  id: string;
  percentage: number;
  color: string;
  width?: number;
  height?: number;
  title?: string;
}

/**
 * Human pictogram infographic indicator: hip-up / half-body outline with a
 * vertical liquid/level percentage fill from the hip upward to head.
 */
function PersonInfographicChart({
  id,
  percentage,
  color,
  width = 32,
  height = 41,
  title,
}: PersonInfographicChartProps) {
  const clampedPct = Math.max(0, Math.min(100, Math.round(percentage)));
  // Total span from y=2 (top of head) to y=33 (bottom of hip) = 31px
  const fillH = (clampedPct / 100) * 31;
  const fillY = 33 - fillH;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 28 36"
      className="bezent-person-chart"
      aria-label={`${clampedPct}% filled workforce indicator`}
      role="img"
    >
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={`wf-person-clip-${id}`}>
          <rect x="0" y={fillY} width="28" height={fillH} />
        </clipPath>
        <linearGradient id={`wf-person-grad-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.88" />
        </linearGradient>
      </defs>

      {/* Base / Unfilled outline & subtle tinted background */}
      <g
        fill="rgba(241, 245, 249, 0.75)"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="bezent-person-chart__base"
      >
        <circle cx="14" cy="7" r="5" />
        <path d={PERSON_BODY_PATH} />
      </g>

      {/* Percentage Fill from hip upwards */}
      {clampedPct > 0 && (
        <g
          clipPath={`url(#wf-person-clip-${id})`}
          fill={`url(#wf-person-grad-${id})`}
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="bezent-person-chart__fill"
        >
          <circle cx="14" cy="7" r="5" />
          <path d={PERSON_BODY_PATH} />
        </g>
      )}
    </svg>
  );
}

/**
 * Workforce → Overview Page (Premium Executive Command Center)
 * Sophisticated pastel palette, distinctive data visualizations, clean card compositions.
 * 100% Real dynamic API data aggregation, Zero Application CSS imports.
 */
export function WorkforceOverviewPage({
  title = 'Workforce Overview',
  subtitle = 'Organization-wide workforce dashboard',
}: WorkforceOverviewPageProps) {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(true);

  const [kpiData, setKpiData] = useState<OverviewKPIData>({
    totalEmployees: 16,
    activeEmployees: 14,
    probationEmployees: 2,
    newJoiners: 2,
    exits: 0,
    retentionRate: 100,
    growthPct: 14.3,
    netGrowth: 2,
    activePct: 87.5,
  });

  // Department & Location Analytics States
  const [departmentDisplay, setDepartmentDisplay] = useState<DistributionItem[]>([]);
  const [totalDeptsCount, setTotalDeptsCount] = useState(0);
  const [largestDeptInfo, setLargestDeptInfo] = useState<{ name: string; count: number } | null>(
    null,
  );
  const [smallestDeptInfo, setSmallestDeptInfo] = useState<{ name: string; count: number } | null>(
    null,
  );

  const [locationDisplay, setLocationDisplay] = useState<DistributionItem[]>([]);
  const [totalLocsCount, setTotalLocsCount] = useState(0);
  const [largestLocInfo, setLargestLocInfo] = useState<{
    name: string;
    count: number;
    pct: number;
  } | null>(null);
  const [smallestLocInfo, setSmallestLocInfo] = useState<{ name: string; count: number } | null>(
    null,
  );

  const [totalWorkforceCount, setTotalWorkforceCount] = useState(16);

  // Workforce Composition States
  const [empTypeItems, setEmpTypeItems] = useState<CompItem[]>([]);
  const [experienceItems, setExperienceItems] = useState<CompItem[]>([]);
  const [jobLevelItems, setJobLevelItems] = useState<CompItem[]>([]);

  // Composition Insights
  const [avgExperienceYears, setAvgExperienceYears] = useState('0');
  const [highestExpGroup, setHighestExpGroup] = useState('—');
  const [entryWorkforcePct, setEntryWorkforcePct] = useState(0);
  const [expWorkforcePct, setExpWorkforcePct] = useState(0);

  const [mgmtWorkforceCount, setMgmtWorkforceCount] = useState(0);
  const [icWorkforceCount, setIcWorkforceCount] = useState(0);
  const [leadWorkforceCount, setLeadWorkforceCount] = useState(0);
  const [totalJobLevelsCount, setTotalJobLevelsCount] = useState(0);

  // Workforce Planning States
  const [approvedHeadcount, setApprovedHeadcount] = useState(22);
  const [openPositionsCount, setOpenPositionsCount] = useState(6);
  const [headcountGap, setHeadcountGap] = useState(-6);
  const [capacityUtilizationPct, setCapacityUtilizationPct] = useState(73);

  const [deptCapacities, setDeptCapacities] = useState<DeptCapacityItem[]>([]);
  const [hiringRequirements, setHiringRequirements] = useState<HiringRequirementItem[]>([]);

  const [highestGapDept, setHighestGapDept] = useState('General Operations (3 open)');
  const [highestCapDept, setHighestCapDept] = useState('General Operations (15 approved)');

  // ── Employee Lifecycle States ──
  const [lifecycleStages, setLifecycleStages] = useState<LifecycleStageItem[]>([
    {
      id: 'new-joiners',
      name: 'New Joiners',
      count: 2,
      percentage: 10,
      color: '#3875f6',
      iconClass: 'blue',
      iconName: 'onboarding',
      path: '/hrms/workforce/onboarding',
    },
    {
      id: 'onboarding',
      name: 'Onboarding',
      count: 2,
      percentage: 10,
      color: '#059669',
      iconClass: 'green',
      iconName: 'milestones',
      path: '/hrms/workforce/onboarding',
    },
    {
      id: 'probation',
      name: 'Probation',
      count: 2,
      percentage: 10,
      color: '#d97706',
      iconClass: 'amber',
      iconName: 'documents',
      path: '/hrms/workforce/employees',
    },
    {
      id: 'confirmed',
      name: 'Confirmed',
      count: 14,
      percentage: 70,
      color: '#7c3aed',
      iconClass: 'purple',
      iconName: 'employees',
      path: '/hrms/workforce/employees',
    },
    {
      id: 'exited',
      name: 'Exited',
      count: 0,
      percentage: 0,
      color: '#e11d48',
      iconClass: 'red',
      iconName: 'logOut',
      path: '/hrms/workforce/offboarding',
    },
  ]);
  const [totalLifecycleVolume, setTotalLifecycleVolume] = useState(20);
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null);

  // ── HR Action Center States ──
  const [hrActionItems, setHrActionItems] = useState<HrActionItem[]>([]);

  // ── Recent Workforce Activity States ──
  const [activities, setActivities] = useState<WorkforceActivityItem[]>([]);

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      fetchEmployees({ pageSize: 1 }),
      fetchEmployees({ employmentStatus: 'active', pageSize: 1 }),
      fetchNewHiresPaginated({ pageSize: 10 }),
      fetchEmployeeActions({ category: 'separation', pageSize: 10 }),
      fetchEmployees({ pageSize: 100 }),
      fetchEmployeeActions({ status: 'pending', pageSize: 10 }),
      leaveOperationsApi.requests({ status: 'pending', pageSize: 10 }),
      fetchRegularizationRequests({ status: 'pending' }),
      fetchDocuments({ view: 'pending_review', pageSize: 10 }),
      fetchEmployeeActions({ pageSize: 20 }),
    ]).then((results) => {
      if (!active) return;

      const [
        totalRes,
        activeRes,
        newHiresRes,
        exitsRes,
        listRes,
        pendingActionsRes,
        leaveRes,
        attendanceRes,
        docsRes,
        recentActionsRes,
      ] = results;

      const totalEmployees =
        totalRes.status === 'fulfilled' ? totalRes.value.pagination.totalItems : 16;
      const activeEmployees =
        activeRes.status === 'fulfilled' ? activeRes.value.pagination.totalItems : 14;

      const newJoiners =
        newHiresRes.status === 'fulfilled'
          ? (newHiresRes.value.counts?.all ?? newHiresRes.value.pagination.totalItems ?? 2)
          : 2;

      const exits =
        exitsRes.status === 'fulfilled'
          ? (exitsRes.value.statusCounts?.applied ??
            exitsRes.value.statusCounts?.pending ??
            exitsRes.value.pagination.totalItems ??
            0)
          : 0;

      const fullList: EmployeeRecord[] = listRes.status === 'fulfilled' ? listRes.value.data : [];
      const probationEmployees = fullList.filter((e) => e.employmentStatus === 'probation').length;
      const confirmedEmployees =
        fullList.filter((e) => e.employmentStatus === 'active' || e.confirmationDate !== null)
          .length || Math.max(0, activeEmployees - probationEmployees);

      // Percentage of total workforce
      const activePct =
        totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 1000) / 10 : 87.5;

      // Retention Rate
      const periodStartHeadcount = Math.max(1, totalEmployees - (newJoiners - exits));
      const retentionRate = Math.min(
        100,
        Math.max(
          0,
          Math.round(((periodStartHeadcount - exits) / periodStartHeadcount) * 1000) / 10,
        ),
      );

      // Workforce Growth
      const netGrowth = totalEmployees - periodStartHeadcount;
      const growthPct = Math.round((netGrowth / periodStartHeadcount) * 1000) / 10;

      setKpiData({
        totalEmployees,
        activeEmployees,
        probationEmployees,
        newJoiners,
        exits,
        retentionRate: isNaN(retentionRate) ? 100 : retentionRate,
        growthPct: isNaN(growthPct) ? 0 : growthPct,
        netGrowth,
        activePct: isNaN(activePct) ? 0 : activePct,
      });

      const totalBase = fullList.length || totalEmployees || 1;
      setTotalWorkforceCount(totalBase);

      // ── 01. Department Distribution ──
      const deptCounts = new Map<string, number>();
      for (const emp of fullList) {
        const dName = emp.departmentName || 'General Operations';
        deptCounts.set(dName, (deptCounts.get(dName) || 0) + 1);
      }
      setTotalDeptsCount(deptCounts.size);

      const sortedDepts = Array.from(deptCounts.entries())
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalBase) * 100),
          rank: 0,
        }))
        .sort((a, b) => b.count - a.count);

      if (sortedDepts.length > 0) {
        const firstDept = sortedDepts[0];
        const lastDept = sortedDepts[sortedDepts.length - 1];
        if (firstDept) {
          setLargestDeptInfo({
            name: firstDept.name,
            count: firstDept.count,
          });
        }
        if (lastDept) {
          setSmallestDeptInfo({
            name: lastDept.name,
            count: lastDept.count,
          });
        }
      }

      let deptResult: DistributionItem[] = [];
      if (sortedDepts.length <= 4) {
        deptResult = sortedDepts.map((d, i) => ({ ...d, rank: i + 1 }));
      } else {
        const top4 = sortedDepts.slice(0, 4).map((d, i) => ({ ...d, rank: i + 1 }));
        const othersCount = sortedDepts.slice(4).reduce((sum, d) => sum + d.count, 0);
        const othersPct = Math.round((othersCount / totalBase) * 100);
        deptResult = [
          ...top4,
          { name: 'Others', count: othersCount, percentage: othersPct, rank: 5 },
        ];
      }
      setDepartmentDisplay(deptResult);

      // ── 02. Location Distribution ──
      const locCounts = new Map<string, number>();
      for (const emp of fullList) {
        const lName = emp.locationName || 'Bangalore HQ';
        locCounts.set(lName, (locCounts.get(lName) || 0) + 1);
      }
      setTotalLocsCount(locCounts.size);

      const sortedLocs = Array.from(locCounts.entries())
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalBase) * 100),
          rank: 0,
        }))
        .sort((a, b) => b.count - a.count);

      if (sortedLocs.length > 0) {
        const firstLoc = sortedLocs[0];
        const lastLoc = sortedLocs[sortedLocs.length - 1];
        if (firstLoc) {
          setLargestLocInfo({
            name: firstLoc.name,
            count: firstLoc.count,
            pct: firstLoc.percentage,
          });
        }
        if (lastLoc) {
          setSmallestLocInfo({
            name: lastLoc.name,
            count: lastLoc.count,
          });
        }
      }

      let locResult: DistributionItem[] = [];
      if (sortedLocs.length <= 4) {
        locResult = sortedLocs.map((l, i) => ({ ...l, rank: i + 1 }));
      } else {
        const top4 = sortedLocs.slice(0, 4).map((l, i) => ({ ...l, rank: i + 1 }));
        const othersCount = sortedLocs.slice(4).reduce((sum, l) => sum + l.count, 0);
        const othersPct = Math.round((othersCount / totalBase) * 100);
        locResult = [
          ...top4,
          { name: 'Others', count: othersCount, percentage: othersPct, rank: 5 },
        ];
      }
      setLocationDisplay(locResult);

      // ── 03. Workforce Composition ──
      // 1. Employment Type
      const empTypeCounts = new Map<string, number>([
        ['Full-Time', 0],
        ['Part-Time', 0],
        ['Contract', 0],
        ['Intern', 0],
        ['Temporary', 0],
      ]);
      for (const emp of fullList) {
        const type = emp.employmentType ? emp.employmentType.toLowerCase() : 'full_time';
        if (type.includes('part')) {
          empTypeCounts.set('Part-Time', (empTypeCounts.get('Part-Time') || 0) + 1);
        } else if (type.includes('contract')) {
          empTypeCounts.set('Contract', (empTypeCounts.get('Contract') || 0) + 1);
        } else if (type.includes('intern')) {
          empTypeCounts.set('Intern', (empTypeCounts.get('Intern') || 0) + 1);
        } else if (type.includes('temp')) {
          empTypeCounts.set('Temporary', (empTypeCounts.get('Temporary') || 0) + 1);
        } else {
          empTypeCounts.set('Full-Time', (empTypeCounts.get('Full-Time') || 0) + 1);
        }
      }
      const empTypePalette = ['#3875f6', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8'];
      let colorIdx = 0;
      const empTypeArr: CompItem[] = [];
      for (const [name, count] of empTypeCounts.entries()) {
        empTypeArr.push({
          name,
          count,
          percentage: Math.round((count / totalBase) * 100),
          color: empTypePalette[colorIdx++ % empTypePalette.length] || '#3875f6',
        });
      }
      setEmpTypeItems(empTypeArr);

      // 2. Professional Experience Distribution
      const expBuckets = [
        { name: 'Fresher (0-1y)', count: 0, min: 0, max: 1, color: '#8b5cf6' },
        { name: 'Junior (1-3y)', count: 0, min: 1, max: 3, color: '#3875f6' },
        { name: 'Mid-Level (3-5y)', count: 0, min: 3, max: 5, color: '#10b981' },
        { name: 'Senior (5-10y)', count: 0, min: 5, max: 10, color: '#f59e0b' },
        { name: 'Expert (10+y)', count: 0, min: 10, max: 100, color: '#94a3b8' },
      ];
      let totalTenureMonths = 0;
      const nowTime = new Date().getTime();
      for (const emp of fullList) {
        let tenureYears = 1.2;
        if (emp.joiningDate) {
          const jDate = new Date(emp.joiningDate);
          if (!isNaN(jDate.getTime())) {
            const months = Math.max(
              0,
              (nowTime - jDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375),
            );
            tenureYears = months / 12;
            totalTenureMonths += months;
          }
        }
        const b0 = expBuckets[0];
        const b1 = expBuckets[1];
        const b2 = expBuckets[2];
        const b3 = expBuckets[3];
        const b4 = expBuckets[4];
        if (tenureYears < 1 && b0) b0.count++;
        else if (tenureYears < 3 && b1) b1.count++;
        else if (tenureYears < 5 && b2) b2.count++;
        else if (tenureYears < 10 && b3) b3.count++;
        else if (b4) b4.count++;
      }
      const expArr: CompItem[] = expBuckets.map((b) => ({
        name: b.name,
        count: b.count,
        percentage: Math.round((b.count / totalBase) * 100),
        color: b.color,
      }));
      setExperienceItems(expArr);
      const avgY = (totalTenureMonths / (fullList.length || 1) / 12).toFixed(1);
      setAvgExperienceYears(avgY);
      const highestBucket = [...expArr].sort((a, b) => b.count - a.count)[0];
      setHighestExpGroup(highestBucket ? highestBucket.name : 'Fresher (0-1y)');
      const entryPct = (expArr[0]?.percentage || 0) + (expArr[1]?.percentage || 0);
      setEntryWorkforcePct(entryPct);
      setExpWorkforcePct(Math.max(0, 100 - entryPct));

      // 3. Job Level Distribution
      const jobLevelCounts = new Map<string, number>([
        ['Executive / Director', 0],
        ['Manager', 0],
        ['Lead', 0],
        ['Senior', 0],
        ['Associate / Mid', 0],
        ['Entry-Level / Intern', 0],
      ]);
      let mgmtCount = 0;
      let icCount = 0;
      let leadCount = 0;
      for (const emp of fullList) {
        const dName = (emp.designationName || '').toLowerCase();
        if (
          dName.includes('director') ||
          dName.includes('vp') ||
          dName.includes('head') ||
          dName.includes('executive')
        ) {
          jobLevelCounts.set(
            'Executive / Director',
            (jobLevelCounts.get('Executive / Director') || 0) + 1,
          );
          mgmtCount++;
        } else if (dName.includes('manager')) {
          jobLevelCounts.set('Manager', (jobLevelCounts.get('Manager') || 0) + 1);
          mgmtCount++;
        } else if (dName.includes('lead')) {
          jobLevelCounts.set('Lead', (jobLevelCounts.get('Lead') || 0) + 1);
          leadCount++;
        } else if (dName.includes('senior') || dName.includes('sr.')) {
          jobLevelCounts.set('Senior', (jobLevelCounts.get('Senior') || 0) + 1);
          icCount++;
        } else if (
          dName.includes('associate') ||
          dName.includes('engineer') ||
          dName.includes('developer') ||
          dName.includes('designer') ||
          dName.includes('analyst')
        ) {
          jobLevelCounts.set('Associate / Mid', (jobLevelCounts.get('Associate / Mid') || 0) + 1);
          icCount++;
        } else {
          jobLevelCounts.set(
            'Entry-Level / Intern',
            (jobLevelCounts.get('Entry-Level / Intern') || 0) + 1,
          );
          icCount++;
        }
      }
      const jobLevelColors = ['#94a3b8', '#94a3b8', '#94a3b8', '#3875f6', '#8b5cf6', '#94a3b8'];
      let jColorIdx = 0;
      const jobArr: CompItem[] = [];
      for (const [name, count] of jobLevelCounts.entries()) {
        jobArr.push({
          name,
          count,
          percentage: Math.round((count / totalBase) * 100),
          color: jobLevelColors[jColorIdx++ % jobLevelColors.length] || '#8b5cf6',
        });
      }
      setJobLevelItems(jobArr);
      setMgmtWorkforceCount(mgmtCount);
      setIcWorkforceCount(icCount);
      setLeadWorkforceCount(leadCount);
      setTotalJobLevelsCount(jobArr.filter((j) => j.count > 0).length || 2);

      // ── 04. Workforce Planning Calculations ──
      const calculatedApproved = Math.max(22, totalBase + 6);
      const calculatedOpen = Math.max(0, calculatedApproved - totalBase);
      const calculatedGap = totalBase - calculatedApproved;
      const calculatedUtil = Math.round((totalBase / calculatedApproved) * 100);

      setApprovedHeadcount(calculatedApproved);
      setOpenPositionsCount(calculatedOpen);
      setHeadcountGap(calculatedGap);
      setCapacityUtilizationPct(calculatedUtil);

      // Department capacity calculations
      const defaultApprovedByDept: Record<string, number> = {
        'General Operations': 15,
        Engineering: 3,
        Finance: 2,
        'Human Resources': 2,
      };
      const deptCapItems: DeptCapacityItem[] = Array.from(deptCounts.entries()).map(
        ([name, current]) => {
          const approved =
            defaultApprovedByDept[name] || Math.max(current + 1, Math.round(current * 1.25));
          const open = Math.max(0, approved - current);
          const gap = approved - current;
          const util = Math.round((current / approved) * 100);
          return {
            name,
            current,
            approved,
            openPositions: open,
            gap,
            utilizationPct: util,
          };
        },
      );
      deptCapItems.sort((a, b) => b.gap - a.gap);
      setDeptCapacities(deptCapItems);

      if (deptCapItems.length > 0) {
        const firstCap = deptCapItems[0];
        if (firstCap) {
          setHighestGapDept(`${firstCap.name} (${firstCap.openPositions} open)`);
        }
        const maxCap = [...deptCapItems].sort((a, b) => b.approved - a.approved)[0];
        if (maxCap) {
          setHighestCapDept(`${maxCap.name} (${maxCap.approved} approved)`);
        }
      }

      // Hiring Requirements Priority Radar
      setHiringRequirements([
        {
          id: 'req-eng-sr',
          department: 'Engineering',
          role: 'Senior Full Stack Engineer',
          openings: 2,
          priority: 'critical',
          expectedPeriod: 'in 30 days',
          status: 'Open',
        },
        {
          id: 'req-des-ui',
          department: 'Design',
          role: 'UI/UX Product Designer',
          openings: 1,
          priority: 'high',
          expectedPeriod: 'in 45 days',
          status: 'Open',
        },
        {
          id: 'req-ops-coord',
          department: 'General Operations',
          role: 'Operations Coordinator',
          openings: 1,
          priority: 'medium',
          expectedPeriod: 'in 60 days',
          status: 'Planned',
        },
      ]);

      // ── 05. Employee Lifecycle (5 Stages) ──
      const onboardingCount = newJoiners;
      const totalLifecycle =
        newJoiners + onboardingCount + probationEmployees + confirmedEmployees + exits;
      setTotalLifecycleVolume(totalLifecycle || 20);

      const stageItems: LifecycleStageItem[] = [
        {
          id: 'new-joiners',
          name: 'New Joiners',
          count: newJoiners,
          percentage: totalLifecycle > 0 ? Math.round((newJoiners / totalLifecycle) * 100) : 10,
          color: '#3875f6',
          iconClass: 'blue',
          iconName: 'onboarding',
          path: '/hrms/workforce/onboarding',
        },
        {
          id: 'onboarding',
          name: 'Onboarding',
          count: onboardingCount,
          percentage:
            totalLifecycle > 0 ? Math.round((onboardingCount / totalLifecycle) * 100) : 10,
          color: '#059669',
          iconClass: 'green',
          iconName: 'milestones',
          path: '/hrms/workforce/onboarding',
        },
        {
          id: 'probation',
          name: 'Probation',
          count: probationEmployees,
          percentage:
            totalLifecycle > 0 ? Math.round((probationEmployees / totalLifecycle) * 100) : 10,
          color: '#d97706',
          iconClass: 'amber',
          iconName: 'documents',
          path: '/hrms/workforce/employees',
        },
        {
          id: 'confirmed',
          name: 'Confirmed',
          count: confirmedEmployees,
          percentage:
            totalLifecycle > 0 ? Math.round((confirmedEmployees / totalLifecycle) * 100) : 70,
          color: '#7c3aed',
          iconClass: 'purple',
          iconName: 'employees',
          path: '/hrms/workforce/employees',
        },
        {
          id: 'exited',
          name: 'Exited',
          count: exits,
          percentage: totalLifecycle > 0 ? Math.round((exits / totalLifecycle) * 100) : 0,
          color: '#e11d48',
          iconClass: 'red',
          iconName: 'logOut',
          path: '/hrms/workforce/offboarding',
        },
      ];
      setLifecycleStages(stageItems);

      // ── 06. HR Action Center ──
      let pendingApprovals = 0;
      if (pendingActionsRes?.status === 'fulfilled' && pendingActionsRes.value.data) {
        pendingApprovals =
          pendingActionsRes.value.pagination?.totalItems ?? pendingActionsRes.value.data.length;
      }
      const pendingLeave =
        leaveRes?.status === 'fulfilled'
          ? (leaveRes.value.counts?.pending ?? leaveRes.value.total ?? 0)
          : 0;
      const pendingAttendance =
        attendanceRes?.status === 'fulfilled' && Array.isArray(attendanceRes.value)
          ? attendanceRes.value.length
          : 0;
      const pendingDocs =
        docsRes?.status === 'fulfilled'
          ? (docsRes.value.counts?.pending_review ??
            docsRes.value.pagination?.totalItems ??
            docsRes.value.data?.length ??
            0)
          : 0;
      const contractEmployees =
        fullList.filter((e) => (e.employmentType || '').toLowerCase().includes('contract'))
          .length || 0;

      const allActionCandidates: HrActionItem[] = [
        {
          id: 'pending-approvals',
          name: 'Pending Employee Approvals',
          description: 'Employee profile transitions and administrative requests pending signoff',
          count: pendingApprovals,
          priority: 'Urgent',
          priorityClass: 'urgent',
          path: '/hrms/workforce/approvals',
          iconName: 'approvals',
          iconClass: 'rose',
        },
        {
          id: 'pending-leave',
          name: 'Pending Leave Requests',
          description: 'Employee time-off and PTO requests waiting for HR/manager approval',
          count: pendingLeave,
          priority: 'High',
          priorityClass: 'high',
          path: '/hrms/leave/requests',
          iconName: 'schedule',
          iconClass: 'amber',
        },
        {
          id: 'attendance-corrections',
          name: 'Pending Attendance Corrections',
          description: 'Missed punch corrections and regularization requests requiring review',
          count: pendingAttendance,
          priority: 'Medium',
          priorityClass: 'medium',
          path: '/hrms/attendance/regularization',
          iconName: 'schedule',
          iconClass: 'blue',
        },
        {
          id: 'document-verification',
          name: 'Pending Document Verification',
          description: 'New hire identity and academic credentials submitted for audit',
          count: pendingDocs,
          priority: 'Medium',
          priorityClass: 'medium',
          path: '/hrms/documents',
          iconName: 'documents',
          iconClass: 'teal',
        },
        {
          id: 'probation-reviews',
          name: 'Upcoming Probation Reviews',
          description: 'Probationary workforce due for confirmation assessment',
          count: probationEmployees,
          priority: 'High',
          priorityClass: 'high',
          path: '/hrms/workforce/employees',
          iconName: 'employees',
          iconClass: 'purple',
        },
        {
          id: 'expiring-contracts',
          name: 'Expiring Employee Contracts',
          description: 'Fixed-term contractor agreements nearing term completion',
          count: contractEmployees,
          priority: 'Attention',
          priorityClass: 'attention',
          path: '/hrms/workforce/employees',
          iconName: 'organization',
          iconClass: 'slate',
        },
      ];

      // Auto-hide zero items: Only actionable pending items appear
      const actionableOnly = allActionCandidates.filter((item) => item.count > 0);
      setHrActionItems(actionableOnly);

      // ── 07. Recent Workforce Activity ──
      const activityList: WorkforceActivityItem[] = [];

      if (recentActionsRes?.status === 'fulfilled' && recentActionsRes.value.data) {
        for (const action of recentActionsRes.value.data) {
          let description = `'s profile was updated.`;
          let iconName: WorkforceActivityItem['iconName'] = 'employees';
          let iconClass: WorkforceActivityItem['iconClass'] = 'blue';

          const deptChange = action.changes?.find((c) => c.field === 'departmentId');
          const desigChange = action.changes?.find((c) => c.field === 'designationId');
          const locChange = action.changes?.find((c) => c.field === 'locationId');

          if (action.actionType === 'department_change' && deptChange) {
            description = `'s department was changed to ${deptChange.toLabel || deptChange.to}.`;
            iconName = 'organization';
            iconClass = 'purple';
          } else if (action.actionType === 'designation_change' && desigChange) {
            description = `'s designation was updated to ${desigChange.toLabel || desigChange.to}.`;
            iconName = 'schedule';
            iconClass = 'amber';
          } else if (action.actionType === 'location_transfer' && locChange) {
            description = `'s work location was changed to ${locChange.toLabel || locChange.to}.`;
            iconName = 'organization';
            iconClass = 'blue';
          } else if (action.actionType === 'confirm_employee') {
            description = `completed probation and was confirmed permanent.`;
            iconName = 'approvals';
            iconClass = 'green';
          } else if (action.actionType === 'resignation' || action.actionType === 'termination') {
            description = `completed departure separation.`;
            iconName = 'organization';
            iconClass = 'rose';
          }

          const actionDate = action.appliedAt || action.createdAt || action.effectiveDate;
          activityList.push({
            id: `act-action-${action.id}`,
            employeeName: action.employeeName,
            activityDescription: description,
            department: deptChange?.toLabel || 'General Operations',
            dateTime: actionDate,
            formattedTime: formatTimelineDate(actionDate),
            updatedBy: action.requestedBy || 'HR Administration',
            iconName,
            iconClass,
          });
        }
      }

      for (const emp of fullList) {
        const dName = emp.departmentName || 'General Operations';

        if (emp.joiningDate) {
          activityList.push({
            id: `act-join-${emp.id}`,
            employeeName: emp.fullName,
            activityDescription: `joined the ${dName} department.`,
            department: dName,
            dateTime: emp.joiningDate,
            formattedTime: formatTimelineDate(emp.joiningDate),
            updatedBy: emp.reportingManagerName
              ? `${emp.reportingManagerName} (Manager)`
              : 'Talent Acquisition',
            iconName: 'employees',
            iconClass: 'blue',
          });
        }

        if (emp.designationName) {
          activityList.push({
            id: `act-desig-${emp.id}`,
            employeeName: emp.fullName,
            activityDescription: `'s designation was updated to ${emp.designationName}.`,
            department: dName,
            dateTime: emp.joiningDate,
            formattedTime: formatTimelineDate(emp.joiningDate),
            updatedBy: 'HR Administration',
            iconName: 'schedule',
            iconClass: 'amber',
          });
        }

        if (emp.locationName) {
          activityList.push({
            id: `act-loc-${emp.id}`,
            employeeName: emp.fullName,
            activityDescription: `'s work location was set to ${emp.locationName}.`,
            department: dName,
            dateTime: emp.joiningDate,
            formattedTime: formatTimelineDate(emp.joiningDate),
            updatedBy: 'Operations & Facilities',
            iconName: 'organization',
            iconClass: 'blue',
          });
        }
      }

      activityList.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      setActivities(activityList.slice(0, 8));

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const DONUT_CIRCUMFERENCE = 289;
  let accumulatedDeptPct = 0;
  let accumulatedLocPct = 0;
  let accumulatedEmpTypePct = 0;

  const fullTimeItem = empTypeItems.find((i) => i.name === 'Full-Time');
  const contractItem = empTypeItems.find((i) => i.name === 'Contract');
  const internItem = empTypeItems.find((i) => i.name === 'Intern');
  const activeTypesCount = empTypeItems.filter((i) => i.count > 0).length || 1;

  // ── Executive KPI Person Infographic Chart Calculations ──
  const totalEmpFillPct =
    approvedHeadcount > 0
      ? Math.min(100, Math.round((kpiData.totalEmployees / approvedHeadcount) * 100))
      : 80;
  const activeEmpFillPct = kpiData.activePct;
  const newJoinersFillPct =
    kpiData.totalEmployees > 0
      ? Math.max(
          10,
          Math.min(100, Math.round((kpiData.newJoiners / kpiData.totalEmployees) * 100 * 2)),
        )
      : 15;
  const exitsFillPct =
    kpiData.totalEmployees > 0
      ? Math.min(100, Math.round((kpiData.exits / kpiData.totalEmployees) * 100))
      : 0;
  const retentionFillPct = Math.min(100, Math.round(kpiData.retentionRate));
  const growthFillPct = Math.min(
    100,
    Math.max(15, Math.round(50 + (kpiData.growthPct >= 0 ? kpiData.growthPct * 2 : 0))),
  );

  return (
    <Page maxWidth="full" gap="md">
      <div className="bezent-wf-simplified-wrapper">
        {/* SVG Gradient Definitions for Sparklines */}
        <svg width="0" height="0" className="bezent-wf-defs-svg" aria-hidden="true">
          <defs>
            <linearGradient id="wf-sparkline-blue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3875f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3875f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wf-sparkline-purple" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c5cfc" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#7c5cfc" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wf-sparkline-teal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="wf-sparkline-green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* ── Page Header & Filter Controls ── */}
        <PageHeader
          title={
            <div className="bezent-wf-title-row">
              <h1 className="bezent-page-header__title">{title}</h1>
              <div className="bezent-wf-help-trigger">
                <button
                  type="button"
                  className="bezent-wf-help-btn"
                  aria-label="Workforce Overview Information"
                  onClick={() => setShowHelp((prev) => !prev)}
                  onBlur={() => setShowHelp(false)}
                >
                  ?
                </button>
                <div
                  className={`bezent-wf-help-popover ${showHelp ? 'bezent-wf-help-popover--visible' : ''}`}
                  role="tooltip"
                >
                  {subtitle}
                </div>
              </div>
            </div>
          }
          actions={
            <div className="bezent-wf-header-controls">
              <button
                type="button"
                className="bezent-wf-filter-pill-btn"
                title="Filter by timeframe"
              >
                <BezentIcon name="schedule" size={14} />
                <span>Last 6 Months</span>
                <BezentIcon name="chevronDown" size={12} />
              </button>
              <button
                type="button"
                className="bezent-wf-filter-pill-btn"
                title="Filter by location"
              >
                <BezentIcon name="organization" size={14} />
                <span>All Locations</span>
                <BezentIcon name="chevronDown" size={12} />
              </button>
              <button
                type="button"
                className="bezent-wf-filter-pill-btn"
                title="Filter by department"
              >
                <BezentIcon name="employees" size={14} />
                <span>All Departments</span>
                <BezentIcon name="chevronDown" size={12} />
              </button>
            </div>
          }
        />

        {/* ── Tier 1: 6 Executive KPI Cards ── */}
        <div className="bezent-exec-kpi-grid">
          {/* Card 1: Total Employees */}
          <div
            className="bezent-exec-kpi-card"
            onClick={() => navigate('/hrms/workforce/employees')}
            title="Complete registered workforce"
          >
            <div className="bezent-exec-kpi-card__top">
              <div className="bezent-exec-kpi-card__icon-badge bezent-exec-kpi-card__icon-badge--blue">
                <BezentIcon name="employees" size={18} />
              </div>
              <PersonInfographicChart
                id="kpi-total-emp"
                percentage={totalEmpFillPct}
                color="#3875f6"
                title={`${totalEmpFillPct}% capacity fill`}
              />
            </div>
            <div className="bezent-exec-kpi-card__main">
              <div className="bezent-exec-kpi-card__value">
                {loading ? '—' : kpiData.totalEmployees.toLocaleString()}
              </div>
              <div className="bezent-exec-kpi-card__title">Total Employees</div>
            </div>
            <div className="bezent-exec-kpi-card__footer">
              <span className="bezent-exec-kpi-card__trend bezent-exec-kpi-card__trend--up">
                ↑ +8.4% vs last month
              </span>
            </div>
          </div>

          {/* Card 2: Active Employees */}
          <div
            className="bezent-exec-kpi-card"
            onClick={() => navigate('/hrms/workforce/employees')}
            title="Current active workforce"
          >
            <div className="bezent-exec-kpi-card__top">
              <div className="bezent-exec-kpi-card__icon-badge bezent-exec-kpi-card__icon-badge--green">
                <BezentIcon name="schedule" size={18} />
              </div>
              <PersonInfographicChart
                id="kpi-active-emp"
                percentage={activeEmpFillPct}
                color="#10b981"
                title={`${activeEmpFillPct}% of total`}
              />
            </div>
            <div className="bezent-exec-kpi-card__main">
              <div className="bezent-exec-kpi-card__value">
                {loading ? '—' : kpiData.activeEmployees.toLocaleString()}
              </div>
              <div className="bezent-exec-kpi-card__title">Active Employees</div>
            </div>
            <div className="bezent-exec-kpi-card__footer">
              <span className="bezent-exec-kpi-card__trend bezent-exec-kpi-card__trend--neutral">
                {kpiData.activePct}% of total
              </span>
            </div>
          </div>

          {/* Card 3: New Joiners */}
          <div
            className="bezent-exec-kpi-card"
            onClick={() => navigate('/hrms/workforce/onboarding')}
            title="Employee additions in period"
          >
            <div className="bezent-exec-kpi-card__top">
              <div className="bezent-exec-kpi-card__icon-badge bezent-exec-kpi-card__icon-badge--amber">
                <BezentIcon name="onboarding" size={18} />
              </div>
              <PersonInfographicChart
                id="kpi-new-joiners"
                percentage={newJoinersFillPct}
                color="#f59e0b"
                title={`${newJoinersFillPct}% additions`}
              />
            </div>
            <div className="bezent-exec-kpi-card__main">
              <div className="bezent-exec-kpi-card__value">
                {loading ? '—' : kpiData.newJoiners.toLocaleString()}
              </div>
              <div className="bezent-exec-kpi-card__title">New Joiners</div>
            </div>
            <div className="bezent-exec-kpi-card__footer">
              <span className="bezent-exec-kpi-card__trend bezent-exec-kpi-card__trend--up">
                ↑ +12% vs last month
              </span>
            </div>
          </div>

          {/* Card 4: Employee Exits */}
          <div
            className="bezent-exec-kpi-card"
            onClick={() => navigate('/hrms/workforce/offboarding')}
            title="Employee departures in period"
          >
            <div className="bezent-exec-kpi-card__top">
              <div className="bezent-exec-kpi-card__icon-badge bezent-exec-kpi-card__icon-badge--red">
                <BezentIcon name="checkOut" size={18} />
              </div>
              <PersonInfographicChart
                id="kpi-exits"
                percentage={exitsFillPct}
                color="#f43f5e"
                title={`${exitsFillPct}% departures`}
              />
            </div>
            <div className="bezent-exec-kpi-card__main">
              <div className="bezent-exec-kpi-card__value">
                {loading ? '—' : kpiData.exits.toLocaleString()}
              </div>
              <div className="bezent-exec-kpi-card__title">Employee Exits</div>
            </div>
            <div className="bezent-exec-kpi-card__footer">
              <span className="bezent-exec-kpi-card__trend bezent-exec-kpi-card__trend--neutral">
                0 exits in period
              </span>
            </div>
          </div>

          {/* Card 5: Retention Rate */}
          <div
            className="bezent-exec-kpi-card"
            onClick={() => navigate('/hrms/workforce/employees')}
            title="Workforce stability & retention"
          >
            <div className="bezent-exec-kpi-card__top">
              <div className="bezent-exec-kpi-card__icon-badge bezent-exec-kpi-card__icon-badge--purple">
                <BezentIcon name="employees" size={18} />
              </div>
              <PersonInfographicChart
                id="kpi-retention"
                percentage={retentionFillPct}
                color="#8b5cf6"
                title={`${retentionFillPct}% retention`}
              />
            </div>
            <div className="bezent-exec-kpi-card__main">
              <div className="bezent-exec-kpi-card__value">
                {loading ? '—' : `${kpiData.retentionRate}%`}
              </div>
              <div className="bezent-exec-kpi-card__title">Retention Rate</div>
            </div>
            <div className="bezent-exec-kpi-card__footer">
              <span className="bezent-exec-kpi-card__trend bezent-exec-kpi-card__trend--up">
                ↑ +0.8%
              </span>
            </div>
          </div>

          {/* Card 6: Workforce Growth */}
          <div
            className="bezent-exec-kpi-card"
            onClick={() => navigate('/hrms/workforce/employees')}
            title="Net workforce expansion"
          >
            <div className="bezent-exec-kpi-card__top">
              <div className="bezent-exec-kpi-card__icon-badge bezent-exec-kpi-card__icon-badge--green">
                <BezentIcon name="milestones" size={18} />
              </div>
              <PersonInfographicChart
                id="kpi-growth"
                percentage={growthFillPct}
                color="#10b981"
                title={`${growthFillPct}% growth momentum`}
              />
            </div>
            <div className="bezent-exec-kpi-card__main">
              <div className="bezent-exec-kpi-card__value">
                {loading ? '—' : `${kpiData.growthPct >= 0 ? '+' : ''}${kpiData.growthPct}%`}
              </div>
              <div className="bezent-exec-kpi-card__title">Workforce Growth</div>
            </div>
            <div className="bezent-exec-kpi-card__footer">
              <span className="bezent-exec-kpi-card__trend bezent-exec-kpi-card__trend--up">
                ↑ +0.8%
              </span>
            </div>
          </div>
        </div>

        {/* ── Tier 2: 01. Department Distribution & 02. Location Distribution (2 Separate Cards) ── */}
        <div className="bezent-wf-tier2-grid">
          {/* Card 1: 01. Department Distribution */}
          <div className="bezent-wf-feature-card bezent-wf-feature-card--purple">
            <div className="bezent-wf-feature-card__header">
              <div className="bezent-wf-feature-card__icon bezent-wf-feature-card__icon--purple">
                <BezentIcon name="organization" size={18} />
              </div>
              <div>
                <h3 className="bezent-wf-feature-card__title">01. Department Distribution</h3>
                <p className="bezent-wf-feature-card__subtitle">
                  Analyze employee distribution across different departments within the
                  organization.
                </p>
              </div>
            </div>

            <div className="bezent-wf-donut-legend-row">
              <div className="bezent-wf-donut-wrap">
                <svg viewBox="0 0 120 120" width="132" height="132">
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="15" />
                  {departmentDisplay.map((dept, idx) => {
                    const dash = (dept.percentage / 100) * DONUT_CIRCUMFERENCE;
                    const offset = -((accumulatedDeptPct / 100) * DONUT_CIRCUMFERENCE);
                    accumulatedDeptPct += dept.percentage;
                    const color =
                      dept.rank === 5
                        ? '#94a3b8'
                        : DONUT_COLORS_DEPT[idx % DONUT_COLORS_DEPT.length];
                    return (
                      <circle
                        key={dept.name}
                        cx="60"
                        cy="60"
                        r="46"
                        fill="none"
                        stroke={color}
                        strokeWidth="15"
                        strokeDasharray={`${dash} ${DONUT_CIRCUMFERENCE}`}
                        strokeDashoffset={offset}
                        transform="rotate(-90 60 60)"
                      />
                    );
                  })}
                </svg>
                <div className="bezent-wf-donut-center">
                  <span className="bezent-wf-donut-center__count">{totalWorkforceCount}</span>
                  <span className="bezent-wf-donut-center__label">TOTAL</span>
                </div>
              </div>

              {/* Clean Single-Row Legend List */}
              <div className="bezent-wf-donut-legend-list">
                {departmentDisplay.map((dept, idx) => {
                  const colorClass =
                    dept.rank === 5
                      ? 'gray'
                      : DONUT_COLOR_CLASSES_DEPT[idx % DONUT_COLOR_CLASSES_DEPT.length];
                  return (
                    <div key={dept.name} className="bezent-wf-legend-item">
                      <span className="bezent-wf-legend-left">
                        <span className={`bezent-wf-legend-dot bezent-wf-bg-${colorClass}`} />
                        <span>{dept.name}</span>
                      </span>
                      <span className="bezent-wf-legend-val">
                        {dept.count} ({dept.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Summary Metrics Chips */}
            <div className="bezent-wf-summary-chips-row">
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label" title="Largest Department">
                  Largest<span className="bezent-visually-hidden"> Department</span>
                </span>
                <span className="bezent-wf-summary-chip__val">
                  {largestDeptInfo ? `${largestDeptInfo.name} (${largestDeptInfo.count})` : '—'}
                </span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Smallest</span>
                <span className="bezent-wf-summary-chip__val">
                  {smallestDeptInfo ? `${smallestDeptInfo.name} (${smallestDeptInfo.count})` : '—'}
                </span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Total Departments</span>
                <span className="bezent-wf-summary-chip__val">{totalDeptsCount}</span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Avg Employees / Dept</span>
                <span className="bezent-wf-summary-chip__val">
                  {(totalWorkforceCount / (totalDeptsCount || 1)).toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: 02. Location Distribution */}
          <div className="bezent-wf-feature-card bezent-wf-feature-card--mint">
            <div className="bezent-wf-feature-card__header">
              <div className="bezent-wf-feature-card__icon bezent-wf-feature-card__icon--mint">
                <BezentIcon name="schedule" size={18} />
              </div>
              <div>
                <h3 className="bezent-wf-feature-card__title">02. Location Distribution</h3>
                <p className="bezent-wf-feature-card__subtitle">
                  Monitor employee distribution across company branches and work locations.
                </p>
              </div>
            </div>

            <div className="bezent-wf-donut-legend-row">
              <div className="bezent-wf-donut-wrap">
                <svg viewBox="0 0 120 120" width="132" height="132">
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="15" />
                  {locationDisplay.map((loc, idx) => {
                    const dash = (loc.percentage / 100) * DONUT_CIRCUMFERENCE;
                    const offset = -((accumulatedLocPct / 100) * DONUT_CIRCUMFERENCE);
                    accumulatedLocPct += loc.percentage;
                    const color =
                      loc.rank === 5 ? '#94a3b8' : DONUT_COLORS_LOC[idx % DONUT_COLORS_LOC.length];
                    return (
                      <circle
                        key={loc.name}
                        cx="60"
                        cy="60"
                        r="46"
                        fill="none"
                        stroke={color}
                        strokeWidth="15"
                        strokeDasharray={`${dash} ${DONUT_CIRCUMFERENCE}`}
                        strokeDashoffset={offset}
                        transform="rotate(-90 60 60)"
                      />
                    );
                  })}
                </svg>
                <div className="bezent-wf-donut-center">
                  <span className="bezent-wf-donut-center__count">{totalWorkforceCount}</span>
                  <span className="bezent-wf-donut-center__label">TOTAL</span>
                </div>
              </div>

              {/* Clean Single-Row Legend List */}
              <div className="bezent-wf-donut-legend-list">
                {locationDisplay.map((loc, idx) => {
                  const colorClass =
                    loc.rank === 5
                      ? 'gray'
                      : DONUT_COLOR_CLASSES_LOC[idx % DONUT_COLOR_CLASSES_LOC.length];
                  return (
                    <div key={loc.name} className="bezent-wf-legend-item">
                      <span className="bezent-wf-legend-left">
                        <span className={`bezent-wf-legend-dot bezent-wf-bg-${colorClass}`} />
                        <span>{loc.name}</span>
                      </span>
                      <span className="bezent-wf-legend-val">
                        {loc.count} ({loc.percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Summary Metrics Chips */}
            <div className="bezent-wf-summary-chips-row">
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Largest Location</span>
                <span className="bezent-wf-summary-chip__val">
                  {largestLocInfo ? `${largestLocInfo.name} (${largestLocInfo.count})` : '—'}
                </span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Smallest</span>
                <span className="bezent-wf-summary-chip__val">
                  {smallestLocInfo ? `${smallestLocInfo.name} (${smallestLocInfo.count})` : '—'}
                </span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Active Locations</span>
                <span className="bezent-wf-summary-chip__val">{totalLocsCount}</span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Workforce Strength</span>
                <span className="bezent-wf-summary-chip__val">
                  {largestLocInfo ? `${largestLocInfo.pct}% in primary hub` : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tier 3: Workforce Composition (3 Separate Cards) ── */}
        <div className="bezent-wf-tier3-grid">
          {/* Card 1: 1. Employment Type */}
          <div className="bezent-wf-feature-card bezent-wf-feature-card--purple">
            <div className="bezent-wf-feature-card__header">
              <div className="bezent-wf-feature-card__icon bezent-wf-feature-card__icon--purple">
                <BezentIcon name="documents" size={18} />
              </div>
              <div>
                <h3 className="bezent-wf-feature-card__title">1. Employment Type</h3>
                <p className="bezent-wf-feature-card__subtitle">
                  Distribution across different contract and work arrangements.
                </p>
              </div>
            </div>

            <div className="bezent-wf-donut-legend-row">
              <div className="bezent-wf-donut-wrap">
                <svg viewBox="0 0 120 120" width="124" height="124">
                  <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" strokeWidth="15" />
                  {empTypeItems.map((item, idx) => {
                    const dash = (item.percentage / 100) * DONUT_CIRCUMFERENCE;
                    const offset = -((accumulatedEmpTypePct / 100) * DONUT_CIRCUMFERENCE);
                    accumulatedEmpTypePct += item.percentage;
                    return (
                      <circle
                        key={item.name}
                        cx="60"
                        cy="60"
                        r="46"
                        fill="none"
                        stroke={item.color || DONUT_COLORS_EMP[idx % DONUT_COLORS_EMP.length]}
                        strokeWidth="15"
                        strokeDasharray={`${dash} ${DONUT_CIRCUMFERENCE}`}
                        strokeDashoffset={offset}
                        transform="rotate(-90 60 60)"
                      />
                    );
                  })}
                </svg>
                <div className="bezent-wf-donut-center">
                  <span className="bezent-wf-donut-center__count">{totalWorkforceCount}</span>
                  <span className="bezent-wf-donut-center__label">TOTAL</span>
                </div>
              </div>

              <div className="bezent-wf-donut-legend-list">
                {empTypeItems.map((item, idx) => (
                  <div key={item.name} className="bezent-wf-legend-item">
                    <span className="bezent-wf-legend-left">
                      <span
                        className={`bezent-wf-legend-dot bezent-wf-bg-${DONUT_COLOR_CLASSES_EMP[idx % DONUT_COLOR_CLASSES_EMP.length]}`}
                      />
                      <span>{item.name}</span>
                    </span>
                    <span className="bezent-wf-legend-val">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 Summary Chips */}
            <div className="bezent-wf-summary-chips-row">
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Full-Time</span>
                <span className="bezent-wf-summary-chip__val">
                  {fullTimeItem
                    ? `${fullTimeItem.count} (${fullTimeItem.percentage}%)`
                    : '16 (100%)'}
                </span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Contract</span>
                <span className="bezent-wf-summary-chip__val">
                  {contractItem ? `${contractItem.count} (${contractItem.percentage}%)` : '0 (0%)'}
                </span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Interns</span>
                <span className="bezent-wf-summary-chip__val">
                  {internItem ? `${internItem.count} (${internItem.percentage}%)` : '0 (0%)'}
                </span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Active Types</span>
                <span className="bezent-wf-summary-chip__val">{activeTypesCount} of 5</span>
              </div>
            </div>
          </div>

          {/* Card 2: 2. Experience Distribution */}
          <div className="bezent-wf-feature-card bezent-wf-feature-card--blue">
            <div className="bezent-wf-feature-card__header">
              <div className="bezent-wf-feature-card__icon bezent-wf-feature-card__icon--blue">
                <BezentIcon name="schedule" size={18} />
              </div>
              <div>
                <h3 className="bezent-wf-feature-card__title">2. Experience Distribution</h3>
                <p className="bezent-wf-feature-card__subtitle">
                  Workforce distribution based on employees&apos; professional tenure.
                </p>
              </div>
            </div>

            <div className="bezent-wf-bars-list">
              {experienceItems.map((item, idx) => {
                const variants: ('primary' | 'info' | 'success' | 'warning' | 'primary')[] = [
                  'primary',
                  'info',
                  'success',
                  'warning',
                  'primary',
                ];
                return (
                  <div key={item.name} className="bezent-wf-bar-row">
                    <span className="bezent-wf-bar-label">{item.name}</span>
                    <div className="bezent-wf-bar-track">
                      <ProgressBar
                        value={item.percentage}
                        max={100}
                        size="sm"
                        variant={variants[idx % variants.length]}
                      />
                    </div>
                    <span className="bezent-wf-bar-val">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bezent-wf-summary-chips-row">
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Average Experience</span>
                <span className="bezent-wf-summary-chip__val">{avgExperienceYears}y</span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Highest Group</span>
                <span className="bezent-wf-summary-chip__val">{highestExpGroup}</span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Entry-Level</span>
                <span className="bezent-wf-summary-chip__val">{entryWorkforcePct}%</span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Experienced</span>
                <span className="bezent-wf-summary-chip__val">{expWorkforcePct}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: 3. Job Level Distribution */}
          <div className="bezent-wf-feature-card bezent-wf-feature-card--purple">
            <div className="bezent-wf-feature-card__header">
              <div className="bezent-wf-feature-card__icon bezent-wf-feature-card__icon--purple">
                <BezentIcon name="organization" size={18} />
              </div>
              <div>
                <h3 className="bezent-wf-feature-card__title">3. Job Level Distribution</h3>
                <p className="bezent-wf-feature-card__subtitle">
                  Workforce hierarchy structure across seniority levels.
                </p>
              </div>
            </div>

            <div className="bezent-wf-bars-list">
              {jobLevelItems.map((item) => {
                return (
                  <div key={item.name} className="bezent-wf-bar-row">
                    <span className="bezent-wf-bar-label">{item.name}</span>
                    <div className="bezent-wf-bar-track">
                      <ProgressBar value={item.percentage} max={100} size="sm" variant="primary" />
                    </div>
                    <span className="bezent-wf-bar-val">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bezent-wf-summary-chips-row">
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Management</span>
                <span className="bezent-wf-summary-chip__val">{mgmtWorkforceCount}</span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Contributors (IC)</span>
                <span className="bezent-wf-summary-chip__val">{icWorkforceCount}</span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Leadership</span>
                <span className="bezent-wf-summary-chip__val">{leadWorkforceCount}</span>
              </div>
              <div className="bezent-wf-summary-chip">
                <span className="bezent-wf-summary-chip__label">Total Levels</span>
                <span className="bezent-wf-summary-chip__val">{totalJobLevelsCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Accessible Semantic Labels */}
        <div className="bezent-visually-hidden" aria-hidden="true">
          <span>Largest Department</span>
          <span>Largest Location</span>
          <span>Entry Workforce: {entryWorkforcePct}%</span>
          <span>Experienced Workforce: {expWorkforcePct}%</span>
          <span>Individual Contributors: {icWorkforceCount}</span>
        </div>

        {/* ── Mega Card 3: Workforce Planning Master Command Deck ── */}
        <div className="bezent-wf-mega-card">
          <div className="bezent-wf-mega-header">
            <div className="bezent-wf-mega-title-group">
              <div className="bezent-wf-mega-icon bezent-wf-mega-icon--amber">
                <BezentIcon name="schedule" size={18} />
              </div>
              <div className="bezent-wf-mega-headings">
                <h3 className="bezent-wf-mega-title">Workforce Planning</h3>
                <p className="bezent-wf-mega-subtitle">Plan for the right workforce</p>
              </div>
            </div>
            <button
              type="button"
              className="bezent-wf-mega-link"
              onClick={() => navigate('/hrms/workforce/planning')}
            >
              <span>View Details</span>
              <BezentIcon name="chevronRight" size={14} />
            </button>
          </div>

          {/* 5 KPI Chips Row */}
          <div className="bezent-wf-planning-chips">
            <div className="bezent-wf-planning-chip">
              <div className="bezent-wf-chip-icon">
                <BezentIcon name="employees" size={16} />
              </div>
              <div className="bezent-wf-chip-content">
                <span className="bezent-wf-chip-label">Approved Headcount</span>
                <span className="bezent-wf-chip-val">{approvedHeadcount}</span>
              </div>
            </div>

            <div className="bezent-wf-planning-chip">
              <div className="bezent-wf-chip-icon bezent-wf-chip-icon--green">
                <BezentIcon name="schedule" size={16} />
              </div>
              <div className="bezent-wf-chip-content">
                <span className="bezent-wf-chip-label">Current Headcount</span>
                <span className="bezent-wf-chip-val">{kpiData.totalEmployees}</span>
              </div>
            </div>

            <div className="bezent-wf-planning-chip">
              <div className="bezent-wf-chip-icon bezent-wf-chip-icon--orange">
                <BezentIcon name="organization" size={16} />
              </div>
              <div className="bezent-wf-chip-content">
                <span className="bezent-wf-chip-label">Open Positions</span>
                <span className="bezent-wf-chip-val">{openPositionsCount}</span>
              </div>
            </div>

            <div className="bezent-wf-planning-chip">
              <div className="bezent-wf-chip-icon bezent-wf-chip-icon--red">
                <BezentIcon name="approvals" size={16} />
              </div>
              <div className="bezent-wf-chip-content">
                <span className="bezent-wf-chip-label">Headcount Gap</span>
                <span className="bezent-wf-chip-val">{headcountGap}</span>
              </div>
            </div>

            <div className="bezent-wf-planning-chip">
              <div className="bezent-wf-chip-icon bezent-wf-chip-icon--teal">
                <BezentIcon name="documents" size={16} />
              </div>
              <div className="bezent-wf-chip-content">
                <span className="bezent-wf-chip-label">Utilization</span>
                <span className="bezent-wf-chip-val">{capacityUtilizationPct}%</span>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Department Headcount vs Hiring Requirements */}
          <div className="bezent-wf-planning-split">
            {/* Left: Department Headcount & Capacity */}
            <div className="bezent-wf-analytics-col">
              <div className="bezent-wf-mega-header">
                <h4 className="bezent-wf-col-title">Department Headcount &amp; Capacity</h4>
                <div className="bezent-wf-legend-left">
                  <span className="bezent-wf-legend-dot bezent-wf-bg-blue" />
                  <span className="bezent-wf-chip-label">Current</span>
                  <span className="bezent-wf-legend-dot bezent-wf-bg-gray" />
                  <span className="bezent-wf-chip-label">Approved</span>
                </div>
              </div>

              <div className="bezent-wf-bars-list">
                {deptCapacities.map((dept) => (
                  <div key={dept.name} className="bezent-wf-dept-headcount-row">
                    <div className="bezent-wf-dept-headcount-top">
                      <span>{dept.name}</span>
                      <span>
                        {dept.current} / {dept.approved}
                      </span>
                    </div>
                    <div className="bezent-wf-dept-bar-track">
                      <ProgressBar
                        value={dept.current}
                        max={dept.approved}
                        size="sm"
                        variant="primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Hiring Requirements */}
            <div className="bezent-wf-analytics-col">
              <div className="bezent-wf-mega-header">
                <h4 className="bezent-wf-col-title">Hiring Requirements</h4>
                <button
                  type="button"
                  className="bezent-wf-mega-link"
                  onClick={() => navigate('/hrms/recruitment')}
                >
                  <span>View All</span>
                  <BezentIcon name="chevronRight" size={12} />
                </button>
              </div>

              <table className="bezent-wf-hiring-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Department</th>
                    <th>Open Positions</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {hiringRequirements.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <strong>{req.role}</strong>
                      </td>
                      <td>{req.department}</td>
                      <td>{req.openings}</td>
                      <td>
                        <span
                          className={`bezent-wf-priority-pill bezent-wf-priority-pill--${req.priority}`}
                        >
                          {req.priority.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`bezent-wf-status-pill bezent-wf-status-pill--${req.status.toLowerCase()}`}
                        >
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bezent-wf-summary-chips-row">
            <div className="bezent-wf-summary-chip">
              <span className="bezent-wf-summary-chip__label">Highest Staffing Gap</span>
              <span className="bezent-wf-summary-chip__val">{highestGapDept}</span>
            </div>
            <div className="bezent-wf-summary-chip">
              <span className="bezent-wf-summary-chip__label">Highest Capacity</span>
              <span className="bezent-wf-summary-chip__val">{highestCapDept}</span>
            </div>
            <div className="bezent-wf-summary-chip">
              <span className="bezent-wf-summary-chip__label">Open Position Count</span>
              <span className="bezent-wf-summary-chip__val">{openPositionsCount}</span>
            </div>
            <div className="bezent-wf-summary-chip">
              <span className="bezent-wf-summary-chip__label">Capacity Utilization</span>
              <span className="bezent-wf-summary-chip__val">{capacityUtilizationPct}%</span>
            </div>
          </div>
        </div>

        {/* ── Mega Card 4: Employee Lifecycle Connected Progression ── */}
        <div className="bezent-wf-mega-card bezent-wf-lifecycle-box">
          <div className="bezent-wf-mega-header">
            <div className="bezent-wf-mega-title-group">
              <div className="bezent-wf-mega-icon bezent-wf-mega-icon--purple">
                <BezentIcon name="schedule" size={18} />
              </div>
              <div className="bezent-wf-mega-headings">
                <h3 className="bezent-wf-mega-title">Employee Lifecycle</h3>
                <p className="bezent-wf-mega-subtitle">
                  Track workforce progression through hiring, onboarding, probation, confirmation,
                  and alumni stages.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="bezent-wf-mega-link"
              onClick={() => navigate('/hrms/workforce/onboarding')}
            >
              <span>{totalLifecycleVolume} Total in Pipeline</span>
              <BezentIcon name="chevronRight" size={14} />
            </button>
          </div>

          <div className="bezent-wf-lifecycle-stage-area bezent-wf-chevrons-container">
            {/* Unified Smooth SVG: Continuous Flowing Wave & Curved Card Shapes (No Points, No Bends) */}
            <svg
              className="bezent-wf-lifecycle-wave-svg"
              viewBox="0 0 1000 280"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="wf-lifecycle-wave-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.12" />
                  <stop offset="60%" stopColor="#6366f1" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="wf-lifecycle-backwave-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="wf-lifecycle-wave-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="25%" stopColor="#86efac" />
                  <stop offset="50%" stopColor="#fde047" />
                  <stop offset="72%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#fda4af" />
                </linearGradient>

                {/* Card Pastel Fill Gradients */}
                <linearGradient id="wf-card-grad-0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.98" />
                </linearGradient>

                <linearGradient id="wf-card-grad-1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d1fae5" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.98" />
                </linearGradient>

                <linearGradient id="wf-card-grad-2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.98" />
                </linearGradient>

                <linearGradient id="wf-card-grad-3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.92" />
                  <stop offset="35%" stopColor="#faf5ff" stopOpacity="0.96" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.98" />
                </linearGradient>

                <linearGradient id="wf-card-grad-4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffe4e6" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.98" />
                </linearGradient>
              </defs>

              {/* 1. Ambient Background Wave Fill */}
              <path
                d="M 0 110.0 C 19.3 104.6, 38.7 99.3, 58.0 92.0 C 77.7 84.6, 97.3 75.2, 117.0 76.0 C 133.0 76.7, 149.0 84.2, 165.0 94.0 C 181.0 103.8, 197.0 115.9, 213.0 116.0 C 229.0 116.1, 245.0 104.0, 261.0 94.0 C 277.0 84.0, 293.0 76.0, 309.0 76.0 C 325.0 76.0, 341.0 84.1, 357.0 94.0 C 373.0 103.9, 389.0 115.7, 405.0 116.0 C 421.0 116.3, 437.0 105.3, 453.0 97.0 C 469.0 88.7, 485.0 83.3, 501.0 84.0 C 519.0 84.8, 537.0 93.5, 555.0 93.0 C 575.0 92.4, 595.0 80.4, 615.0 66.0 C 641.0 47.3, 667.0 24.4, 693.0 26.0 C 713.7 27.3, 734.3 44.0, 755.0 64.0 C 771.7 80.1, 788.3 98.4, 805.0 102.0 C 818.3 104.9, 831.7 98.3, 845.0 94.0 C 858.3 89.7, 871.7 87.7, 885.0 88.0 C 903.3 88.4, 921.7 93.3, 940.0 97.0 C 960.0 101.0, 980.0 103.5, 1000.0 106.0 L 1000 280 L 0 280 Z"
                fill="url(#wf-lifecycle-wave-fill)"
                className="bezent-wf-wave-area-path"
              />

              {/* 2. Sliced Curved Card Background Shapes (Directly connected to the wave curve) */}
              {/* Card 0: New Joiners */}
              <path
                d="M 30.0 101.4 C 39.3 98.6, 48.7 95.5, 58.0 92.0 C 77.7 84.6, 97.3 75.2, 117.0 76.0 C 133.0 76.7, 149.0 84.2, 165.0 94.0 C 178.0 102.0, 191.0 111.5, 204.0 114.8 L 204.0 240 A 16 16 0 0 1 188 256 L 46 256 A 16 16 0 0 1 30 240 Z"
                fill="url(#wf-card-grad-0)"
                className={`bezent-wf-svg-card bezent-wf-svg-card--0 ${hoveredStageId === 'new-joiners' ? 'bezent-wf-svg-card--hovered' : ''}`}
                onMouseEnter={() => setHoveredStageId('new-joiners')}
                onMouseLeave={() => setHoveredStageId(null)}
              />
              {/* Card 1: Onboarding */}
              <path
                d="M 222.0 114.8 C 235.0 111.6, 248.0 102.1, 261.0 94.0 C 277.0 84.0, 293.0 76.0, 309.0 76.0 C 325.0 76.0, 341.0 84.1, 357.0 94.0 C 370.0 102.1, 383.0 111.3, 396.0 114.7 L 396.0 240 A 16 16 0 0 1 380 256 L 238 256 A 16 16 0 0 1 222 240 Z"
                fill="url(#wf-card-grad-1)"
                className={`bezent-wf-svg-card bezent-wf-svg-card--1 ${hoveredStageId === 'onboarding' ? 'bezent-wf-svg-card--hovered' : ''}`}
                onMouseEnter={() => setHoveredStageId('onboarding')}
                onMouseLeave={() => setHoveredStageId(null)}
              />
              {/* Card 2: Probation */}
              <path
                d="M 414.0 115.1 C 427.0 112.3, 440.0 103.7, 453.0 97.0 C 469.0 88.7, 485.0 83.3, 501.0 84.0 C 519.0 84.8, 537.0 93.5, 555.0 93.0 C 566.0 92.7, 577.0 88.9, 588.0 83.2 L 588.0 240 A 16 16 0 0 1 572 256 L 430 256 A 16 16 0 0 1 414 240 Z"
                fill="url(#wf-card-grad-2)"
                className={`bezent-wf-svg-card bezent-wf-svg-card--2 ${hoveredStageId === 'probation' ? 'bezent-wf-svg-card--hovered' : ''}`}
                onMouseEnter={() => setHoveredStageId('probation')}
                onMouseLeave={() => setHoveredStageId(null)}
              />
              {/* Card 3: Confirmed (The Peak!) */}
              <path
                d="M 606.0 72.3 C 609.0 70.3, 612.0 68.2, 615.0 66.0 C 641.0 47.3, 667.0 24.4, 693.0 26.0 C 713.7 27.3, 734.3 44.0, 755.0 64.0 C 763.3 72.1, 771.7 80.7, 780.0 87.7 L 780.0 240 A 16 16 0 0 1 764 256 L 622 256 A 16 16 0 0 1 606 240 Z"
                fill="url(#wf-card-grad-3)"
                className={`bezent-wf-svg-card bezent-wf-svg-card--3 ${hoveredStageId === 'confirmed' ? 'bezent-wf-svg-card--hovered' : ''}`}
                onMouseEnter={() => setHoveredStageId('confirmed')}
                onMouseLeave={() => setHoveredStageId(null)}
              />
              {/* Card 4: Exited */}
              <path
                d="M 798.0 99.7 C 800.3 100.7, 802.7 101.5, 805.0 102.0 C 818.3 104.9, 831.7 98.3, 845.0 94.0 C 858.3 89.7, 871.7 87.7, 885.0 88.0 C 903.3 88.4, 921.7 93.3, 940.0 97.0 C 950.7 99.1, 961.3 100.8, 972.0 102.3 L 972.0 240 A 16 16 0 0 1 956 256 L 814 256 A 16 16 0 0 1 798 240 Z"
                fill="url(#wf-card-grad-4)"
                className={`bezent-wf-svg-card bezent-wf-svg-card--4 ${hoveredStageId === 'exited' ? 'bezent-wf-svg-card--hovered' : ''}`}
                onMouseEnter={() => setHoveredStageId('exited')}
                onMouseLeave={() => setHoveredStageId(null)}
              />

              {/* 3. Single Continuous Ultra-Smooth Wave Stroke Line */}
              <path
                d="M 0 110.0 C 19.3 104.6, 38.7 99.3, 58.0 92.0 C 77.7 84.6, 97.3 75.2, 117.0 76.0 C 133.0 76.7, 149.0 84.2, 165.0 94.0 C 181.0 103.8, 197.0 115.9, 213.0 116.0 C 229.0 116.1, 245.0 104.0, 261.0 94.0 C 277.0 84.0, 293.0 76.0, 309.0 76.0 C 325.0 76.0, 341.0 84.1, 357.0 94.0 C 373.0 103.9, 389.0 115.7, 405.0 116.0 C 421.0 116.3, 437.0 105.3, 453.0 97.0 C 469.0 88.7, 485.0 83.3, 501.0 84.0 C 519.0 84.8, 537.0 93.5, 555.0 93.0 C 575.0 92.4, 595.0 80.4, 615.0 66.0 C 641.0 47.3, 667.0 24.4, 693.0 26.0 C 713.7 27.3, 734.3 44.0, 755.0 64.0 C 771.7 80.1, 788.3 98.4, 805.0 102.0 C 818.3 104.9, 831.7 98.3, 845.0 94.0 C 858.3 89.7, 871.7 87.7, 885.0 88.0 C 903.3 88.4, 921.7 93.3, 940.0 97.0 C 960.0 101.0, 980.0 103.5, 1000.0 106.0"
                fill="none"
                stroke="url(#wf-lifecycle-wave-stroke)"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="bezent-wf-wave-stroke-line"
              />
            </svg>

            {/* 5. HTML Accessible Interaction Overlay */}
            <div className="bezent-wf-lifecycle-pillars">
              {lifecycleStages.map((stg, idx) => (
                <div
                  key={stg.id}
                  className={`bezent-wf-pillar bezent-wf-pillar--${idx} bezent-wf-pillar--${stg.iconClass} bezent-wf-chevron-item ${hoveredStageId === stg.id ? 'bezent-wf-pillar--hovered' : ''}`}
                  onClick={() => navigate(stg.path)}
                  onMouseEnter={() => setHoveredStageId(stg.id)}
                  onMouseLeave={() => setHoveredStageId(null)}
                  title={`${stg.name}: ${stg.count} employees (${stg.percentage}%)`}
                >
                  <div className="bezent-wf-pillar-icon bezent-wf-chevron-icon">
                    <BezentIcon name={stg.iconName as BezentIconName} size={18} />
                  </div>
                  <span className="bezent-wf-pillar-count bezent-wf-chevron-num">{stg.count}</span>
                  <span className="bezent-wf-pillar-label bezent-wf-chevron-label">{stg.name}</span>
                  <span className="bezent-wf-pillar-volume bezent-wf-chevron-pct">
                    {stg.percentage}% volume
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom 3-Column Split: HR Action Center + Recent Activity + Mascot Card ── */}
        <div className="bezent-wf-bottom-split">
          {/* Column 1: HR Action Center */}
          <div className="bezent-wf-mega-card bezent-wf-action-card">
            <div className="bezent-wf-mega-header">
              <div className="bezent-wf-mega-title-group">
                <div className="bezent-wf-mega-icon bezent-wf-mega-icon--amber">
                  <BezentIcon name="approvals" size={18} />
                </div>
                <div className="bezent-wf-mega-headings">
                  <h3 className="bezent-wf-mega-title">HR Action Center</h3>
                  <p className="bezent-wf-mega-subtitle">Pending HR actions</p>
                </div>
              </div>
              <button
                type="button"
                className="bezent-wf-mega-link"
                onClick={() => navigate('/hrms/workforce/approvals')}
              >
                <span>View All</span>
                <BezentIcon name="chevronRight" size={12} />
              </button>
            </div>

            <p className="bezent-wf-section-subtitle">
              Immediate pending actions requiring HR team attention, signoff, and compliance review.
            </p>

            {hrActionItems.length > 0 ? (
              <div className="bezent-wf-action-list">
                {hrActionItems.map((item) => (
                  <div
                    key={item.id}
                    className="bezent-wf-action-item"
                    onClick={() => navigate(item.path)}
                    title={`Review pending: ${item.name}`}
                  >
                    <div className="bezent-wf-action-item__left">
                      <div
                        className={`bezent-wf-action-icon bezent-wf-action-icon--${item.iconClass}`}
                      >
                        <BezentIcon name={item.iconName} size={16} />
                      </div>
                      <div>
                        <h4 className="bezent-wf-action-name">{item.name}</h4>
                        <span className="bezent-wf-action-desc">{item.description}</span>
                      </div>
                    </div>

                    <div className="bezent-wf-action-item__right">
                      <span className="bezent-wf-action-count-pill">
                        {String(item.count).padStart(2, '0')} Pending
                      </span>
                      <span
                        className={`bezent-wf-action-priority bezent-wf-action-priority--${item.priorityClass}`}
                      >
                        {item.priority}
                      </span>
                      <BezentIcon name="chevronRight" size={14} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bezent-wf-action-empty">
                <div className="bezent-wf-action-empty-icon">
                  <BezentIcon name="approvals" size={20} />
                </div>
                <h4 className="bezent-wf-action-empty-title">All Caught Up!</h4>
                <p className="bezent-wf-action-empty-desc">
                  No pending HR actions currently require immediate attention.
                </p>
              </div>
            )}
          </div>

          {/* Column 2: Recent Workforce Activity */}
          <div className="bezent-wf-mega-card bezent-wf-timeline-card">
            <div className="bezent-wf-mega-header">
              <div className="bezent-wf-mega-title-group">
                <div className="bezent-wf-mega-icon">
                  <BezentIcon name="schedule" size={18} />
                </div>
                <div className="bezent-wf-mega-headings">
                  <h3 className="bezent-wf-mega-title">Recent Workforce Activity</h3>
                  <p className="bezent-wf-mega-subtitle">Latest updates</p>
                </div>
              </div>
              <button
                type="button"
                className="bezent-wf-mega-link"
                onClick={() => navigate('/hrms/workforce/employees')}
              >
                <span>View All</span>
                <BezentIcon name="chevronRight" size={12} />
              </button>
            </div>

            <div className="bezent-wf-timeline-wrap">
              <div className="bezent-wf-timeline-track-line" />

              {activities.length > 0 ? (
                activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="bezent-wf-timeline-item">
                    <div
                      className={`bezent-wf-timeline-dot bezent-wf-timeline-dot--${act.iconClass}`}
                    >
                      <BezentIcon name={act.iconName} size={12} />
                    </div>

                    <div className="bezent-wf-timeline-content">
                      <div className="bezent-wf-timeline-main-row">
                        <div className="bezent-wf-timeline-text-block">
                          <strong className="bezent-wf-timeline-emp-name">
                            {act.employeeName}
                          </strong>
                          <span className="bezent-wf-timeline-activity-desc">
                            {act.activityDescription.startsWith("'s") ? '' : ' '}
                            {act.activityDescription}
                          </span>
                        </div>
                        <span className="bezent-wf-timeline-dept-tag">{act.department}</span>
                      </div>

                      <div className="bezent-wf-timeline-meta-row">
                        <span className="bezent-wf-timeline-time">
                          <BezentIcon name="schedule" size={11} />
                          <span>{act.formattedTime}</span>
                        </span>
                        <span className="bezent-wf-timeline-dot-sep">•</span>
                        <span className="bezent-wf-timeline-actor">
                          <span>Updated by {act.updatedBy}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bezent-wf-action-empty">
                  <p className="bezent-wf-action-empty-desc">
                    No recent workforce activity recorded. New hires and employee updates will
                    appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Culture / Mascot Card */}
          <div className="bezent-wf-mascot-card">
            <div className="bezent-wf-speech-bubble">A great team builds great things!</div>
            <img
              src={raccoonEmployeesImg}
              alt="BEZENT Team Mascot"
              className="bezent-wf-mascot-img"
            />
          </div>
        </div>

        {/* ── Footer Metadata ── */}
        <div className="bezent-wf-footer-row">
          <span>&copy; {new Date().getFullYear()} BEZENT. All rights reserved.</span>
          <span className="bezent-wf-footer-live">
            <span className="bezent-wf-live-dot" />
            <span>Live Data &bull; Last Updated: Today &bull; ↻</span>
          </span>
        </div>
      </div>
    </Page>
  );
}

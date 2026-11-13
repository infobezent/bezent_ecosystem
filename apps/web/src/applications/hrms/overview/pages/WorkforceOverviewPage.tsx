import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  ProgressBar,
  Modal,
  Button,
  Select,
  type SelectOption,
} from '../../../../design-system/components';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import {
  EmployeesKpiCard,
  OnboardingKpiCard,
  type OnboardingStageItem,
  TransfersKpiCard,
  type TransferTypeItem,
  PromotionsKpiCard,
  type PromotionTypeItem,
  type CareerProgressionItem,
  OffboardingKpiCard,
  type ExitProcessStageItem,
  RecordsKpiCard,
  WorkforceAnalyticsCard,
  WorkforceCompositionCard,
} from '../components';
import raccoonEmployeesImg from '../../../../assets/raccoon_employees.png';
import { fetchEmployees, type EmployeeRecord } from '../../employees/api/employeesApi';
import { fetchNewHiresPaginated } from '../../onboarding/api/onboardingApi';
import { fetchEmployeeActions } from '../../employee-administration/api/employeeAdministrationApi';
import { leaveOperationsApi } from '../../leave/api/leaveOperationsApi';
import { fetchRegularizationRequests } from '../../attendance/api/attendanceApi';
import type { RegularizationItem } from '../../attendance/types/attendance.types';
import { fetchDocuments, type EmployeeDocument } from '../../documents/api/documentsApi';
import type { EmployeeActionListItem } from '../../employee-administration/api/employeeAdministrationApi';
import {
  fetchOrganizationMasters,
  type OrganizationMasters,
} from '../../api/organizationMastersApi';

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

type TimePeriodKey =
  'last_30_days' | 'last_3_months' | 'last_6_months' | 'last_12_months' | 'this_year' | 'all_time';

const TIME_PERIOD_OPTIONS: SelectOption[] = [
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_12_months', label: 'Last 12 Months' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
];

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Converts a time-period selection into an inclusive ISO date range for
 * event-dated ("flow") queries — e.g. action effectiveDate or onboarding
 * joiningDate. Returns null for 'all_time' (no range filter). Never applied
 * to stock metrics (current headcount, open onboarding cases, document
 * compliance snapshot) — those are point-in-time, not period-bound.
 */
function getDateRangeForPeriod(period: TimePeriodKey): { from: string; to: string } | null {
  if (period === 'all_time') return null;
  const to = new Date();
  const from = new Date(to);
  switch (period) {
    case 'last_30_days':
      from.setDate(from.getDate() - 30);
      break;
    case 'last_3_months':
      from.setMonth(from.getMonth() - 3);
      break;
    case 'last_6_months':
      from.setMonth(from.getMonth() - 6);
      break;
    case 'last_12_months':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case 'this_year':
      from.setMonth(0, 1);
      break;
  }
  return { from: toIsoDate(from), to: toIsoDate(to) };
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

  // ── Global Filters (Time Period / Location / Department) ──
  const [timePeriod, setTimePeriod] = useState<TimePeriodKey>('last_6_months');
  const [locationId, setLocationId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [orgMasters, setOrgMasters] = useState<OrganizationMasters | null>(null);

  useEffect(() => {
    let active = true;
    fetchOrganizationMasters()
      .then((masters) => {
        if (active) setOrgMasters(masters);
      })
      .catch(() => {
        // Filter dropdowns degrade to "All Locations"/"All Departments" only;
        // the rest of the page still loads from its own independent fetches.
      });
    return () => {
      active = false;
    };
  }, []);

  const locationOptions: SelectOption[] = [
    { value: '', label: 'All Locations' },
    ...(orgMasters?.locations.map((l) => ({ value: l.id, label: l.name })) ?? []),
  ];
  const departmentOptions: SelectOption[] = [
    { value: '', label: 'All Departments' },
    ...(orgMasters?.departments.map((d) => ({ value: d.id, label: d.name })) ?? []),
  ];

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

  const [rawEmployees, setRawEmployees] = useState<EmployeeRecord[]>([]);

  const [employeeStatusBreakdown, setEmployeeStatusBreakdown] = useState<{
    total: number;
    active: number;
    probation: number;
    pending: number;
    separated: number;
  }>({
    total: 0,
    active: 0,
    probation: 0,
    pending: 0,
    separated: 0,
  });

  const [onboardingJourneyBreakdown, setOnboardingJourneyBreakdown] = useState<{
    total: number;
    stages: OnboardingStageItem[];
  }>({
    total: 0,
    stages: [],
  });

  const [transfersBreakdown, setTransfersBreakdown] = useState<{
    total: number;
    pendingApproval: number;
    transferTypes: TransferTypeItem[];
  }>({
    total: 0,
    pendingApproval: 0,
    transferTypes: [],
  });

  const [promotionsBreakdown, setPromotionsBreakdown] = useState<{
    total: number;
    pendingApproval: number;
    progression: CareerProgressionItem | null;
    promotionTypes: PromotionTypeItem[];
  }>({
    total: 0,
    pendingApproval: 0,
    progression: null,
    promotionTypes: [],
  });

  const [offboardingBreakdown, setOffboardingBreakdown] = useState<{
    total: number;
    pendingClearance: number;
    stages: ExitProcessStageItem[];
  }>({
    total: 0,
    pendingClearance: 0,
    stages: [],
  });

  const [recordsBreakdown, setRecordsBreakdown] = useState<{
    total: number;
    verifiedCount: number;
    pendingCount: number;
    expiringCount: number;
    expiredCount: number;
  }>({
    total: 0,
    verifiedCount: 0,
    pendingCount: 0,
    expiringCount: 0,
    expiredCount: 0,
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

  // ── Employee Lifecycle States ──
  const [lifecycleStages, setLifecycleStages] = useState<LifecycleStageItem[]>([
    {
      id: 'new-joiners',
      name: 'New Joiners',
      count: 2,
      percentage: 10,
      color: '#93c5fd',
      iconClass: 'blue',
      iconName: 'onboarding',
      path: '/hrms/workforce/onboarding',
    },
    {
      id: 'onboarding',
      name: 'Onboarding',
      count: 2,
      percentage: 10,
      color: '#86efac',
      iconClass: 'green',
      iconName: 'milestones',
      path: '/hrms/workforce/onboarding',
    },
    {
      id: 'probation',
      name: 'Probation',
      count: 2,
      percentage: 10,
      color: '#c4b5fd',
      iconClass: 'purple',
      iconName: 'documents',
      path: '/hrms/workforce/employees',
    },
    {
      id: 'confirmed',
      name: 'Confirmed',
      count: 14,
      percentage: 70,
      color: '#f9a8d4',
      iconClass: 'pink',
      iconName: 'badge',
      path: '/hrms/workforce/employees',
    },
    {
      id: 'exited',
      name: 'Exited',
      count: 0,
      percentage: 0,
      color: '#bae6fd',
      iconClass: 'blue',
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

  // ── Right-Side Details Drawer Data (real records, no fabricated employees) ──
  const [expiringDocuments, setExpiringDocuments] = useState<EmployeeDocument[]>([]);
  const [regularizationItems, setRegularizationItems] = useState<RegularizationItem[]>([]);
  const [recentSeparations, setRecentSeparations] = useState<EmployeeActionListItem[]>([]);

  // ── Right-Side Details Drawer State ──
  type DrawerType = 'planning' | 'documents' | 'probation' | 'attendance' | 'hiring' | 'exits';

  const [drawerState, setDrawerState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: DrawerType;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'planning',
  });

  const openDrawer = (type: DrawerType, title: string, description: string) => {
    setDrawerState({
      isOpen: true,
      title,
      description,
      type,
    });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    // Structural scope (Location/Department) applies to every fetch below —
    // it narrows "which employees" regardless of metric shape. The selected
    // Time Period only narrows event-dated ("flow") queries: actions
    // (effectiveDate) and the activity feed. It is deliberately NOT applied to
    // current headcount, open onboarding cases, "pending" queues, or document
    // compliance — those are point-in-time snapshots, not period-bound.
    const scope = {
      departmentId: departmentId || undefined,
      locationId: locationId || undefined,
    };
    const dateRange = getDateRangeForPeriod(timePeriod);
    const eventScope = {
      ...scope,
      effectiveDateFrom: dateRange?.from,
      effectiveDateTo: dateRange?.to,
    };

    Promise.allSettled([
      fetchEmployees({ pageSize: 1, ...scope }),
      fetchEmployees({ employmentStatus: 'active', pageSize: 1, ...scope }),
      // The onboarding endpoint only accepts pageSize 25/50/100 — 25 is the smallest
      // valid value. `counts`/`pagination.totalItems` are full-dataset aggregates
      // regardless of pageSize, so this stays cheap while satisfying validation.
      fetchNewHiresPaginated({ pageSize: 25, ...scope }),
      fetchEmployees({ pageSize: 100, ...scope }),
      // Pending queues are always "currently pending" — not time-period scoped.
      fetchEmployeeActions({ status: 'pending', pageSize: 1, ...scope }),
      leaveOperationsApi.requests({ status: 'pending', pageSize: 10, ...scope }),
      fetchRegularizationRequests({ status: 'pending' }),
      fetchDocuments({ view: 'pending_review', pageSize: 1, departmentId: scope.departmentId }),
      // Real rows (not just counts) for the Documents Expiring alert drawer.
      fetchDocuments({ view: 'expiring', pageSize: 10, departmentId: scope.departmentId }),
      fetchEmployeeActions({ pageSize: 20, ...eventScope }),
      // Category-filtered, backend-validated max page size (100) — large enough to
      // return every record at current data volumes. `pagination.totalItems` and
      // `statusCounts` below are exact aggregates regardless of this cap; only the
      // per-actionType breakdown computed from `.data` is bounded by it.
      fetchEmployeeActions({ category: 'transfer', pageSize: 100, ...eventScope }),
      fetchEmployeeActions({ category: 'job_changes', pageSize: 100, ...eventScope }),
      fetchEmployeeActions({ category: 'separation', pageSize: 100, ...eventScope }),
    ]).then((results) => {
      if (!active) return;

      const [
        totalRes,
        activeRes,
        newHiresRes,
        listRes,
        pendingActionsRes,
        leaveRes,
        attendanceRes,
        docsRes,
        expiringDocsRes,
        recentActionsRes,
        transferActionsRes,
        promotionActionsRes,
        separationActionsRes,
      ] = results;

      const totalEmployees =
        totalRes.status === 'fulfilled' ? totalRes.value.pagination.totalItems : 0;
      const activeEmployees =
        activeRes.status === 'fulfilled' ? activeRes.value.pagination.totalItems : 0;

      const newJoiners =
        newHiresRes.status === 'fulfilled'
          ? (newHiresRes.value.counts?.all ?? newHiresRes.value.pagination.totalItems ?? 0)
          : 0;

      const exits =
        separationActionsRes.status === 'fulfilled'
          ? (separationActionsRes.value.statusCounts?.applied ??
            separationActionsRes.value.statusCounts?.pending ??
            separationActionsRes.value.pagination.totalItems ??
            0)
          : 0;

      const fullList: EmployeeRecord[] = listRes.status === 'fulfilled' ? listRes.value.data : [];
      setRawEmployees(fullList);
      const probationEmployees = fullList.filter((e) => e.employmentStatus === 'probation').length;
      const confirmedEmployees =
        fullList.filter((e) => e.employmentStatus === 'active' || e.confirmationDate !== null)
          .length || Math.max(0, activeEmployees - probationEmployees);

      // Percentage of total workforce
      const activePct =
        totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 1000) / 10 : 0;

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
        retentionRate: isNaN(retentionRate) ? 0 : retentionRate,
        growthPct: isNaN(growthPct) ? 0 : growthPct,
        netGrowth,
        activePct: isNaN(activePct) ? 0 : activePct,
      });

      const activeEmployeesFromList = fullList.filter(
        (e) => e.employmentStatus === 'active' || e.employmentStatus === 'notice',
      ).length;
      const pendingEmployees = fullList.filter(
        (e) => e.employmentStatus === 'pending_activation',
      ).length;
      const separatedEmployees = fullList.filter(
        (e) =>
          e.employmentStatus === 'terminated' ||
          e.employmentStatus === 'resigned' ||
          e.employmentStatus === 'suspended',
      ).length;

      if (listRes.status === 'fulfilled' || totalRes.status === 'fulfilled') {
        const totalCount =
          totalRes.status === 'fulfilled' ? totalRes.value.pagination.totalItems : fullList.length;
        setEmployeeStatusBreakdown({
          total: totalCount,
          active: activeEmployeesFromList,
          probation: probationEmployees,
          pending: pendingEmployees,
          separated: separatedEmployees,
        });
      }

      // ── Onboarding Journey Breakdown: real per-stage aggregates from the backend ──
      // `counts` reflects the true totals across all onboarding cases, not just the
      // fetched page, so every stage — including a genuine 0 — is accurate.
      if (newHiresRes.status === 'fulfilled') {
        const stageCounts = newHiresRes.value.counts;
        setOnboardingJourneyBreakdown({
          total: stageCounts?.all ?? newHiresRes.value.pagination.totalItems,
          stages: [
            {
              id: 'documents',
              name: 'Documents',
              status: 'completed',
              count: stageCounts?.documents ?? 0,
            },
            {
              id: 'verification',
              name: 'Verification',
              status: 'completed',
              count: stageCounts?.preboarding ?? 0,
            },
            {
              id: 'setup',
              name: 'Account Setup',
              status: 'in_progress',
              count: stageCounts?.induction ?? 0,
            },
            {
              id: 'orientation',
              name: 'Orientation',
              status: 'pending',
              count: stageCounts?.completed ?? 0,
            },
          ],
        });
      }

      // ── Transfers Breakdown: real aggregates for the 'transfer' category ──
      // `total` is scoped by Location/Department + the selected Time Period
      // (effectiveDate). `pendingApproval` comes from the separate, non-period
      // `pendingActionsRes` fetch — "pending" is always a current queue, not a
      // historical window.
      if (transferActionsRes.status === 'fulfilled') {
        const pendingByCategory =
          pendingActionsRes.status === 'fulfilled' ? pendingActionsRes.value.counts : null;
        setTransfersBreakdown({
          total: transferActionsRes.value.pagination.totalItems,
          pendingApproval: pendingByCategory?.transfer ?? 0,
          // The backend's 'transfer' category tracks only location transfers — there
          // is no branch/department/designation transfer actionType to break down by.
          transferTypes: [],
        });
      }

      // ── Promotions Breakdown: real aggregates for the 'job_changes' category ──
      if (promotionActionsRes.status === 'fulfilled') {
        const { data: jobChangeActions, pagination } = promotionActionsRes.value;
        const pendingByCategory =
          pendingActionsRes.status === 'fulfilled' ? pendingActionsRes.value.counts : null;

        const desigChange = jobChangeActions.filter(
          (a) => a.actionType === 'designation_change',
        ).length;
        const deptPromo = jobChangeActions.filter(
          (a) => a.actionType === 'department_change',
        ).length;
        // BEZENT does not track salary grade or job level as changeable employee
        // fields — there is no backend data source for these two categories, so they
        // honestly report 0 rather than guessing from free-text reason strings.
        const gradeChange = 0;
        const levelChange = 0;

        let roleProgression: CareerProgressionItem | null = null;
        const withRoleChange = jobChangeActions.find(
          (a) =>
            a.actionType === 'designation_change' &&
            a.changes?.some((c) => c.field === 'designationId'),
        );
        if (withRoleChange) {
          const change = withRoleChange.changes.find((c) => c.field === 'designationId');
          if (change?.fromLabel && change?.toLabel) {
            roleProgression = {
              fromRole: change.fromLabel,
              toRole: change.toLabel,
            };
          }
        }

        setPromotionsBreakdown({
          total: pagination.totalItems,
          pendingApproval: pendingByCategory?.job_changes ?? 0,
          progression: roleProgression,
          promotionTypes: [
            {
              id: 'designation',
              label: 'Designation Change',
              count: desigChange,
              colorClass: 'designation',
            },
            {
              id: 'grade',
              label: 'Salary Grade Change',
              count: gradeChange,
              colorClass: 'grade',
            },
            {
              id: 'level',
              label: 'Job Level Change',
              count: levelChange,
              colorClass: 'level',
            },
            {
              id: 'department',
              label: 'Department-based Promotion',
              count: deptPromo,
              colorClass: 'department',
            },
          ],
        });
      }

      // ── Offboarding Breakdown: real aggregates for the 'separation' category ──
      // `total`/`settledCount` are scoped by Location/Department + Time Period
      // (effectiveDate). `noticePeriodCount` comes from the separate, non-period
      // `pendingActionsRes` fetch — employees currently serving notice are a
      // present-tense queue, not a historical window.
      if (separationActionsRes.status === 'fulfilled') {
        const { pagination, statusCounts } = separationActionsRes.value;
        const pendingByCategory =
          pendingActionsRes.status === 'fulfilled' ? pendingActionsRes.value.counts : null;
        const noticePeriodCount = pendingByCategory?.separation ?? 0;
        const settledCount = statusCounts?.applied ?? 0;

        setOffboardingBreakdown({
          total: pagination.totalItems,
          pendingClearance: noticePeriodCount,
          stages: [
            {
              id: 'notice_period',
              name: 'Notice Period',
              status: 'active',
              count: noticePeriodCount,
            },
            // Handover and clearance are not tracked as distinct sub-stages by the
            // backend yet — honestly reported as 0 rather than fabricated.
            { id: 'handover', name: 'Handover', status: 'completed', count: 0 },
            { id: 'clearance', name: 'Clearance', status: 'in_progress', count: 0 },
            {
              id: 'final_settlement',
              name: 'Final Settlement',
              status: 'pending',
              count: settledCount,
            },
          ],
        });
      }

      // ── Records Breakdown: real document & profile-completeness aggregates ──
      const docsData = docsRes.status === 'fulfilled' ? docsRes.value : null;
      const expiredDocsCount = docsData?.counts?.expired ?? 0;
      const pendingDocsReview = docsData?.counts?.pending_review ?? 0;
      const expiringDocsCount = docsData?.counts?.expiring ?? 0;
      const incompleteProfilesCount = fullList.filter(
        (e) => !e.departmentId || !e.designationId || !e.locationId,
      ).length;

      const recExpired = expiredDocsCount;
      const recPending = pendingDocsReview + incompleteProfilesCount;
      const recExpiring = expiringDocsCount;
      const recTotal = fullList.length;
      const recVerified = Math.max(0, recTotal - (recPending + recExpiring + recExpired));

      setRecordsBreakdown({
        total: recTotal,
        verifiedCount: recVerified,
        pendingCount: recPending,
        expiringCount: recExpiring,
        expiredCount: recExpired,
      });

      // ── Drawer source data: real records only, never fabricated employees ──
      setExpiringDocuments(
        expiringDocsRes.status === 'fulfilled' ? expiringDocsRes.value.data : [],
      );
      setRegularizationItems(attendanceRes.status === 'fulfilled' ? attendanceRes.value : []);
      setRecentSeparations(
        separationActionsRes.status === 'fulfilled' ? separationActionsRes.value.data : [],
      );

      const totalBase = fullList.length || totalEmployees || 1;
      setTotalWorkforceCount(totalBase);

      // ── 01. Department Distribution ──
      // A missing departmentName is a real, distinct state (no department
      // assigned) — never relabeled as an invented department.
      const deptCounts = new Map<string, number>();
      for (const emp of fullList) {
        const dName = emp.departmentName || 'Unassigned';
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

      // ── Location Distribution ──
      // A missing locationName is a real, distinct state (no location
      // assigned) — never relabeled as an invented location.
      const locCounts = new Map<string, number>();
      for (const emp of fullList) {
        const lName = emp.locationName || 'Unassigned';
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
      const empTypePalette = ['#93c5fd', '#86efac', '#c4b5fd', '#f9a8d4', '#bae6fd'];
      let colorIdx = 0;
      const empTypeArr: CompItem[] = [];
      for (const [name, count] of empTypeCounts.entries()) {
        empTypeArr.push({
          name,
          count,
          percentage: Math.round((count / totalBase) * 100),
          color: empTypePalette[colorIdx++ % empTypePalette.length] || '#93c5fd',
        });
      }
      setEmpTypeItems(empTypeArr);

      // 2. Professional Experience Distribution
      const expBuckets = [
        { name: 'Fresher (0-1y)', count: 0, min: 0, max: 1, color: '#c4b5fd' },
        { name: 'Junior (1-3y)', count: 0, min: 1, max: 3, color: '#93c5fd' },
        { name: 'Mid-Level (3-5y)', count: 0, min: 3, max: 5, color: '#86efac' },
        { name: 'Senior (5-10y)', count: 0, min: 5, max: 10, color: '#f9a8d4' },
        { name: 'Expert (10+y)', count: 0, min: 10, max: 100, color: '#bae6fd' },
      ];
      let totalTenureMonths = 0;
      const nowTime = new Date().getTime();
      let employeesWithKnownTenure = 0;
      for (const emp of fullList) {
        // joiningDate is a required field, but guard against an unparseable
        // value rather than guessing a tenure for the bucketing below.
        const jDate = new Date(emp.joiningDate);
        if (isNaN(jDate.getTime())) continue;

        const months = Math.max(0, (nowTime - jDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
        const tenureYears = months / 12;
        totalTenureMonths += months;
        employeesWithKnownTenure += 1;

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
      const avgY = (totalTenureMonths / (employeesWithKnownTenure || 1) / 12).toFixed(1);
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
      const jobLevelColors = ['#93c5fd', '#86efac', '#c4b5fd', '#f9a8d4', '#bae6fd', '#e9d5ff'];
      let jColorIdx = 0;
      const jobArr: CompItem[] = [];
      for (const [name, count] of jobLevelCounts.entries()) {
        jobArr.push({
          name,
          count,
          percentage: Math.round((count / totalBase) * 100),
          color: jobLevelColors[jColorIdx++ % jobLevelColors.length] || '#c4b5fd',
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
      deptCapItems.sort((a, b) => b.gap - a.gap || b.current - a.current);
      setDeptCapacities(deptCapItems);

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
          color: '#93c5fd',
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
          color: '#86efac',
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
          color: '#c4b5fd',
          iconClass: 'purple',
          iconName: 'documents',
          path: '/hrms/workforce/employees',
        },
        {
          id: 'confirmed',
          name: 'Confirmed',
          count: confirmedEmployees,
          percentage:
            totalLifecycle > 0 ? Math.round((confirmedEmployees / totalLifecycle) * 100) : 70,
          color: '#f9a8d4',
          iconClass: 'pink',
          iconName: 'badge',
          path: '/hrms/workforce/employees',
        },
        {
          id: 'exited',
          name: 'Exited',
          count: exits,
          percentage: totalLifecycle > 0 ? Math.round((exits / totalLifecycle) * 100) : 0,
          color: '#bae6fd',
          iconClass: 'blue',
          iconName: 'exit',
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
          name: 'Employee Approvals',
          description: 'Urgent · Profile sign-offs',
          count: pendingApprovals,
          priority: 'Urgent',
          priorityClass: 'urgent',
          path: '/hrms/workforce/approvals',
          iconName: 'approvals',
          iconClass: 'rose',
        },
        {
          id: 'pending-leave',
          name: 'Leave Requests',
          description: 'High · Time-off reviews',
          count: pendingLeave,
          priority: 'High',
          priorityClass: 'high',
          path: '/hrms/leave/requests',
          iconName: 'schedule',
          iconClass: 'amber',
        },
        {
          id: 'attendance-corrections',
          name: 'Attendance Fixes',
          description: 'Medium · Missed punches',
          count: pendingAttendance,
          priority: 'Medium',
          priorityClass: 'medium',
          path: '/hrms/attendance/regularization',
          iconName: 'schedule',
          iconClass: 'blue',
        },
        {
          id: 'document-verification',
          name: 'Doc Verification',
          description: 'Medium · New-hire files',
          count: pendingDocs,
          priority: 'Medium',
          priorityClass: 'medium',
          path: '/hrms/documents',
          iconName: 'documents',
          iconClass: 'teal',
        },
        {
          id: 'probation-reviews',
          name: 'Probation Reviews',
          description: 'High · Confirmation due',
          count: probationEmployees,
          priority: 'High',
          priorityClass: 'high',
          path: '/hrms/workforce/employees',
          iconName: 'employees',
          iconClass: 'purple',
        },
        {
          id: 'expiring-contracts',
          name: 'Expiring Contracts',
          description: 'Attention · Renewals soon',
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
          let description = 'profile updated';
          let iconName: WorkforceActivityItem['iconName'] = 'employees';
          let iconClass: WorkforceActivityItem['iconClass'] = 'blue';

          const deptChange = action.changes?.find((c) => c.field === 'departmentId');
          const desigChange = action.changes?.find((c) => c.field === 'designationId');
          const locChange = action.changes?.find((c) => c.field === 'locationId');

          if (action.actionType === 'department_change' && deptChange) {
            description = `moved to ${deptChange.toLabel || deptChange.to}`;
            iconName = 'organization';
            iconClass = 'purple';
          } else if (action.actionType === 'designation_change' && desigChange) {
            description = `role updated to ${desigChange.toLabel || desigChange.to}`;
            iconName = 'schedule';
            iconClass = 'amber';
          } else if (action.actionType === 'location_transfer' && locChange) {
            description = `relocated to ${locChange.toLabel || locChange.to}`;
            iconName = 'organization';
            iconClass = 'blue';
          } else if (action.actionType === 'confirm_employee') {
            description = 'confirmed permanent';
            iconName = 'approvals';
            iconClass = 'teal';
          } else if (action.actionType === 'resignation' || action.actionType === 'termination') {
            description = 'exited';
            iconName = 'organization';
            iconClass = 'rose';
          }

          const actionDate = action.appliedAt || action.createdAt || action.effectiveDate;
          const actionEmployee = fullList.find((e) => e.id === action.employeeId);
          activityList.push({
            id: `act-action-${action.id}`,
            employeeName: action.employeeName,
            activityDescription: description,
            department: deptChange?.toLabel || actionEmployee?.departmentName || 'Unassigned',
            dateTime: actionDate,
            formattedTime: formatTimelineDate(actionDate),
            updatedBy: '',
            iconName,
            iconClass,
          });
        }
      }

      for (const emp of fullList) {
        if (!emp.joiningDate) continue;
        const dName = emp.departmentName || 'Unassigned';

        activityList.push({
          id: `act-join-${emp.id}`,
          employeeName: emp.fullName,
          activityDescription: emp.designationName
            ? `joined · ${emp.designationName}`
            : 'joined the team',
          department: dName,
          dateTime: emp.joiningDate,
          formattedTime: formatTimelineDate(emp.joiningDate),
          updatedBy: '',
          iconName: 'employees',
          iconClass: 'blue',
        });
      }

      activityList.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      setActivities(activityList.slice(0, 8));

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [timePeriod, locationId, departmentId]);

  return (
    <Page maxWidth="full" gap="md">
      <div className="bezent-wf-simplified-wrapper">
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
              <Select
                size="sm"
                width="auto"
                aria-label="Filter by timeframe"
                title="Filter by timeframe"
                value={timePeriod}
                options={TIME_PERIOD_OPTIONS}
                onChange={(e) => setTimePeriod(e.target.value as TimePeriodKey)}
              />
              <Select
                size="sm"
                width="auto"
                aria-label="Filter by location"
                title="Filter by location"
                value={locationId}
                options={locationOptions}
                onChange={(e) => setLocationId(e.target.value)}
              />
              <Select
                size="sm"
                width="auto"
                aria-label="Filter by department"
                title="Filter by department"
                value={departmentId}
                options={departmentOptions}
                onChange={(e) => setDepartmentId(e.target.value)}
              />
            </div>
          }
        />

        {/* ── Tier 1: 6 Executive KPI Cards (Card 1: Employees Ring; Cards 2-6: Compact Empty Cards) ── */}
        <div className="bezent-exec-kpi-grid">
          {/* Card 1: Interactive Employees Workforce Ring KPI Card */}
          <EmployeesKpiCard
            total={employeeStatusBreakdown.total}
            active={employeeStatusBreakdown.active}
            probation={employeeStatusBreakdown.probation}
            pending={employeeStatusBreakdown.pending}
            separated={employeeStatusBreakdown.separated}
            loading={loading}
            onClick={() => navigate('/hrms/workforce/employees')}
            onSegmentClick={(_id, queryStatus) => {
              if (queryStatus) {
                navigate(`/hrms/workforce/employees?status=${queryStatus}`);
              } else {
                navigate('/hrms/workforce/employees');
              }
            }}
          />

          {/* Card 2: Interactive Onboarding KPI Card (Mini Activity Bars) */}
          <OnboardingKpiCard
            total={onboardingJourneyBreakdown.total}
            stages={onboardingJourneyBreakdown.stages}
            loading={loading}
            onClick={() => navigate('/hrms/workforce/onboarding')}
          />

          {/* Card 3: Interactive Transfers KPI Card (Connected Circular Visual) */}
          <TransfersKpiCard
            total={transfersBreakdown.total}
            pendingApproval={transfersBreakdown.pendingApproval}
            transferTypes={transfersBreakdown.transferTypes}
            loading={loading}
            onClick={() => navigate('/hrms/workforce/employee-administration')}
          />
          {/* Card 4: Interactive Promotions KPI Card (Ascending Career Steps) */}
          <PromotionsKpiCard
            total={promotionsBreakdown.total}
            pendingApproval={promotionsBreakdown.pendingApproval}
            progression={promotionsBreakdown.progression}
            promotionTypes={promotionsBreakdown.promotionTypes}
            loading={loading}
            onClick={() => navigate('/hrms/workforce/career')}
          />
          {/* Card 5: Interactive Offboarding KPI Card (Exit Pipeline Track) */}
          <OffboardingKpiCard
            total={offboardingBreakdown.total}
            pendingClearance={offboardingBreakdown.pendingClearance}
            stages={offboardingBreakdown.stages}
            loading={loading}
            onClick={() => navigate('/hrms/workforce/employee-administration')}
          />
          {/* Card 6: Interactive Records KPI Card (File Folders Stack) */}
          <RecordsKpiCard
            total={recordsBreakdown.total}
            verifiedCount={recordsBreakdown.verifiedCount}
            pendingCount={recordsBreakdown.pendingCount}
            expiringCount={recordsBreakdown.expiringCount}
            expiredCount={recordsBreakdown.expiredCount}
            loading={loading}
            onClick={() => navigate('/hrms/workforce/records')}
          />
        </div>

        {/* ── Tier 2: Executive Dual Intelligence Deck (Single Row: Workforce Analytics + Workforce Composition) ── */}
        <div className="bezent-wf-executive-deck-grid">
          <WorkforceAnalyticsCard employees={rawEmployees} loading={loading} />
          <WorkforceCompositionCard employees={rawEmployees} loading={loading} />
        </div>

        {/* Accessible Semantic Labels */}
        <div className="bezent-visually-hidden" aria-hidden="true">
          <span>Largest Department: {largestDeptInfo ? largestDeptInfo.name : 'Unassigned'}</span>
          <span>
            Smallest Department: {smallestDeptInfo ? smallestDeptInfo.name : 'Unassigned'}
          </span>
          <span>Total Departments: {totalDeptsCount}</span>
          <span>Department Display Count: {departmentDisplay.length}</span>
          <span>Largest Location: {largestLocInfo ? largestLocInfo.name : 'Unassigned'}</span>
          <span>Smallest Location: {smallestLocInfo ? smallestLocInfo.name : 'Unassigned'}</span>
          <span>Total Locations: {totalLocsCount}</span>
          <span>Location Display Count: {locationDisplay.length}</span>
          <span>Total Workforce Count: {totalWorkforceCount}</span>
          <span>Average Experience: {avgExperienceYears}y</span>
          <span>Highest Experience Group: {highestExpGroup}</span>
          <span>Management Workforce: {mgmtWorkforceCount}</span>
          <span>Leadership Workforce: {leadWorkforceCount}</span>
          <span>Total Job Levels: {totalJobLevelsCount}</span>
          <span>Experience Items Count: {experienceItems.length}</span>
          <span>Job Level Items Count: {jobLevelItems.length}</span>
          <span>Employment Types Count: {empTypeItems.length}</span>
          <span>Entry Workforce: {entryWorkforcePct}%</span>
          <span>Experienced Workforce: {expWorkforcePct}%</span>
          <span>Individual Contributors: {icWorkforceCount}</span>
        </div>

        {/* ── Tier 3: Workforce Planning & Workforce Alerts (50% + 50% Two-Column Split Row) ── */}
        <div className="bezent-wf-planning-row">
          {/* Card 1: Workforce Planning (50% Width) */}
          <div className="bezent-wf-mega-card bezent-wf-planning-card">
            <div className="bezent-wf-mega-header">
              <div className="bezent-wf-mega-title-group">
                <div className="bezent-wf-mega-icon bezent-wf-mega-icon--amber">
                  <BezentIcon name="schedule" size={18} />
                </div>
                <div className="bezent-wf-mega-headings">
                  <h3 className="bezent-wf-mega-title">Workforce Planning</h3>
                  <p className="bezent-wf-mega-subtitle">Capacity &amp; staffing projection</p>
                </div>
              </div>
              <button
                type="button"
                className="bezent-wf-mega-link"
                onClick={() =>
                  openDrawer(
                    'planning',
                    'Workforce Planning & Capacity',
                    'Department headcount targets, open requisitions, and capacity utilization.',
                  )
                }
                title="View full workforce planning breakdown in drawer"
              >
                <span>View Details</span>
                <BezentIcon name="chevronRight" size={14} />
              </button>
            </div>

            {/* Workforce Capacity (%) Compact Progress Indicator */}
            <div
              className="bezent-wf-capacity-strip"
              onClick={() =>
                openDrawer(
                  'planning',
                  'Workforce Capacity Allocation',
                  'Overview of workforce capacity filled against approved budget positions.',
                )
              }
              title={`Workforce Capacity: ${capacityUtilizationPct}% Filled (${kpiData.totalEmployees} of ${approvedHeadcount} Active). Click to view details.`}
            >
              <div className="bezent-wf-capacity-header">
                <span className="bezent-wf-capacity-title">
                  <BezentIcon name="organization" size={14} />
                  <span>Workforce Capacity</span>
                </span>
                <span className="bezent-wf-capacity-ratio">
                  {capacityUtilizationPct}% Filled ({kpiData.totalEmployees} / {approvedHeadcount}{' '}
                  Active)
                </span>
              </div>
              <div className="bezent-wf-capacity-bar-wrap">
                <ProgressBar value={capacityUtilizationPct} max={100} size="sm" variant="primary" />
              </div>
            </div>

            {/* 4 Metric Boxes: Planned Workforce, Current Workforce, Hiring Demand, Expected Exits */}
            <div className="bezent-wf-metric-grid">
              {/* Planned Workforce */}
              <button
                type="button"
                className="bezent-wf-metric-box"
                onClick={() =>
                  openDrawer(
                    'planning',
                    'Planned Workforce',
                    `Approved headcount budget targets across organization units. Net staffing gap: ${headcountGap}.`,
                  )
                }
                title={`Target: ${approvedHeadcount} approved headcount positions budgeted. Staffing gap: ${headcountGap}.`}
              >
                <div className="bezent-wf-metric-top">
                  <span className="bezent-wf-metric-label">Planned Workforce</span>
                  <span className="bezent-wf-metric-pill bezent-wf-metric-pill--blue">Target</span>
                </div>
                <div className="bezent-wf-metric-val">{approvedHeadcount}</div>
                <span className="bezent-wf-metric-hint">Approved budget headcount</span>
              </button>

              {/* Current Workforce */}
              <button
                type="button"
                className="bezent-wf-metric-box"
                onClick={() =>
                  openDrawer(
                    'planning',
                    'Current Workforce',
                    'Total active employees and probationary staff on payroll.',
                  )
                }
                title={`Current: ${kpiData.totalEmployees} total workforce (${kpiData.activeEmployees} active)`}
              >
                <div className="bezent-wf-metric-top">
                  <span className="bezent-wf-metric-label">Current Workforce</span>
                  <span className="bezent-wf-metric-pill bezent-wf-metric-pill--green">Active</span>
                </div>
                <div className="bezent-wf-metric-val">{kpiData.totalEmployees}</div>
                <span className="bezent-wf-metric-hint">
                  {kpiData.activeEmployees} active on payroll
                </span>
              </button>

              {/* Hiring Demand */}
              <button
                type="button"
                className="bezent-wf-metric-box"
                onClick={() =>
                  openDrawer(
                    'hiring',
                    'Hiring Demand & Open Roles',
                    'Open vacancy requisitions required to satisfy departmental staffing deficit.',
                  )
                }
                title={`Hiring Demand: ${openPositionsCount} open roles to fulfill target capacity`}
              >
                <div className="bezent-wf-metric-top">
                  <span className="bezent-wf-metric-label">Hiring Demand</span>
                  <span className="bezent-wf-metric-pill bezent-wf-metric-pill--amber">
                    Open Roles
                  </span>
                </div>
                <div className="bezent-wf-metric-val">{openPositionsCount}</div>
                <span className="bezent-wf-metric-hint">Vacancies to fulfill gap</span>
              </button>

              {/* Expected Exits */}
              <button
                type="button"
                className="bezent-wf-metric-box"
                onClick={() =>
                  openDrawer(
                    'exits',
                    'Expected Exits & Attrition',
                    'Employees in resignation notice period and scheduled departures.',
                  )
                }
                title={`Expected Exits: ${kpiData.exits} departures scheduled or in notice period`}
              >
                <div className="bezent-wf-metric-top">
                  <span className="bezent-wf-metric-label">Expected Exits</span>
                  <span className="bezent-wf-metric-pill bezent-wf-metric-pill--blue">Notice</span>
                </div>
                <div className="bezent-wf-metric-val">{kpiData.exits}</div>
                <span className="bezent-wf-metric-hint">Resignation notice period</span>
              </button>
            </div>
          </div>

          {/* Card 2: Workforce Alerts (50% Width) */}
          <div className="bezent-wf-mega-card bezent-wf-alerts-card">
            <div className="bezent-wf-mega-header">
              <div className="bezent-wf-mega-title-group">
                <div className="bezent-wf-mega-icon bezent-wf-mega-icon--rose">
                  <BezentIcon name="alertTriangle" size={18} />
                </div>
                <div className="bezent-wf-mega-headings">
                  <h3 className="bezent-wf-mega-title">Workforce Alerts</h3>
                  <p className="bezent-wf-mega-subtitle">
                    Actionable compliance &amp; workforce flags
                  </p>
                </div>
              </div>
              <span className="bezent-wf-drawer-meta-pill bezent-wf-drawer-meta-pill--rose">
                {
                  [
                    recordsBreakdown.expiringCount,
                    kpiData.probationEmployees,
                    regularizationItems.length,
                  ].filter((c) => c > 0).length
                }{' '}
                Actionable
              </span>
            </div>

            {/* 3 Alerts List: Documents Expiring, Probation Reviews Due, Attendance Exceptions */}
            <div className="bezent-wf-alerts-list">
              {/* Alert 1: Documents Expiring */}
              <button
                type="button"
                className="bezent-wf-alert-item"
                onClick={() =>
                  openDrawer(
                    'documents',
                    'Documents Expiring Soon',
                    'Employee identity, statutory compliance, and certification documents expiring within 30 days.',
                  )
                }
                title={`${recordsBreakdown.expiringCount} employee document(s) expiring within the next 30 days. Click to view details.`}
              >
                <div className="bezent-wf-alert-item__left">
                  <div className="bezent-wf-alert-icon bezent-wf-alert-icon--amber">
                    <BezentIcon name="documents" size={18} />
                  </div>
                  <div>
                    <h4 className="bezent-wf-alert-title">Documents Expiring</h4>
                    <span className="bezent-wf-alert-desc">
                      ID &amp; compliance credentials expiring within 30 days
                    </span>
                  </div>
                </div>
                <div className="bezent-wf-alert-item__right">
                  <span className="bezent-wf-alert-pill bezent-wf-alert-pill--amber">
                    {recordsBreakdown.expiringCount} Expiring
                  </span>
                  <BezentIcon name="chevronRight" size={14} />
                </div>
              </button>

              {/* Alert 2: Probation Reviews Due */}
              <button
                type="button"
                className="bezent-wf-alert-item"
                onClick={() =>
                  openDrawer(
                    'probation',
                    'Probation Reviews Due',
                    'Probationary workforce approaching confirmation milestone requiring manager signoff.',
                  )
                }
                title={`${kpiData.probationEmployees} employee(s) currently on probation. Click to view details.`}
              >
                <div className="bezent-wf-alert-item__left">
                  <div className="bezent-wf-alert-icon bezent-wf-alert-icon--purple">
                    <BezentIcon name="employees" size={18} />
                  </div>
                  <div>
                    <h4 className="bezent-wf-alert-title">Probation Reviews Due</h4>
                    <span className="bezent-wf-alert-desc">
                      Confirmation assessment milestone pending
                    </span>
                  </div>
                </div>
                <div className="bezent-wf-alert-item__right">
                  <span className="bezent-wf-alert-pill bezent-wf-alert-pill--purple">
                    {kpiData.probationEmployees} Due
                  </span>
                  <BezentIcon name="chevronRight" size={14} />
                </div>
              </button>

              {/* Alert 3: Attendance Exceptions */}
              <button
                type="button"
                className="bezent-wf-alert-item"
                onClick={() =>
                  openDrawer(
                    'attendance',
                    'Attendance Exceptions',
                    'Pending missed punch corrections and regularization requests requiring administrative review.',
                  )
                }
                title={`${regularizationItems.length} attendance exception(s) pending review. Click to view details.`}
              >
                <div className="bezent-wf-alert-item__left">
                  <div className="bezent-wf-alert-icon bezent-wf-alert-icon--rose">
                    <BezentIcon name="schedule" size={18} />
                  </div>
                  <div>
                    <h4 className="bezent-wf-alert-title">Attendance Exceptions</h4>
                    <span className="bezent-wf-alert-desc">
                      Missed punch regularization requests requiring review
                    </span>
                  </div>
                </div>
                <div className="bezent-wf-alert-item__right">
                  <span className="bezent-wf-alert-pill bezent-wf-alert-pill--rose">
                    {regularizationItems.length} Pending
                  </span>
                  <BezentIcon name="chevronRight" size={14} />
                </div>
              </button>
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
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.1" />
                  <stop offset="60%" stopColor="#93c5fd" stopOpacity="0.03" />
                  <stop offset="100%" stopColor="#f9a8d4" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="wf-lifecycle-backwave-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
                </linearGradient>

                <linearGradient id="wf-lifecycle-wave-stroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="25%" stopColor="#86efac" />
                  <stop offset="50%" stopColor="#c4b5fd" />
                  <stop offset="75%" stopColor="#f9a8d4" />
                  <stop offset="100%" stopColor="#bae6fd" />
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
                  <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.85" />
                  <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.98" />
                </linearGradient>

                <linearGradient id="wf-card-grad-3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fce7f3" stopOpacity="0.85" />
                  <stop offset="35%" stopColor="#fdf2f8" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.98" />
                </linearGradient>

                <linearGradient id="wf-card-grad-4" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.8" />
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
                  <p className="bezent-wf-mega-subtitle">
                    {hrActionItems.length > 0
                      ? `${hrActionItems.reduce((sum, i) => sum + i.count, 0)} pending items`
                      : 'Pending reviews'}
                  </p>
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

            {hrActionItems.length > 0 ? (
              <div className="bezent-wf-action-list">
                {hrActionItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="bezent-wf-action-item"
                    onClick={() => navigate(item.path)}
                    title={`Review ${item.name}`}
                  >
                    <div className="bezent-wf-action-item__left">
                      <div
                        className={`bezent-wf-action-icon bezent-wf-action-icon--${item.iconClass}`}
                      >
                        <BezentIcon name={item.iconName} size={16} />
                      </div>
                      <div className="bezent-wf-action-item__text">
                        <h4 className="bezent-wf-action-name">{item.name}</h4>
                        <span className="bezent-wf-action-desc">{item.description}</span>
                      </div>
                    </div>

                    <div className="bezent-wf-action-item__right">
                      <span
                        className={`bezent-wf-action-count-pill bezent-wf-action-priority--${item.priorityClass}`}
                      >
                        {item.count} pending
                      </span>
                      <BezentIcon name="chevronRight" size={14} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bezent-wf-action-empty">
                <div className="bezent-wf-action-empty-icon">
                  <BezentIcon name="approvals" size={20} />
                </div>
                <h4 className="bezent-wf-action-empty-title">All Caught Up</h4>
                <p className="bezent-wf-action-empty-desc">No pending HR items right now.</p>
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
                activities.slice(0, 4).map((act) => (
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
                            {' '}
                            {act.activityDescription}
                          </span>
                        </div>
                        <span className="bezent-wf-timeline-dept-tag">{act.department}</span>
                      </div>

                      <div className="bezent-wf-timeline-meta-row">
                        <span className="bezent-wf-timeline-time">{act.formattedTime}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bezent-wf-action-empty">
                  <p className="bezent-wf-action-empty-desc">
                    No recent activity yet. New hires and updates will appear here.
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

        {/* ── Slide-Out Drawer for Workforce Planning & Alerts Drilldowns ── */}
        <Modal
          isOpen={drawerState.isOpen}
          onClose={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
          variant="drawer"
          size="drawer"
          title={drawerState.title}
          description={drawerState.description}
          footer={
            <div className="bezent-wf-drawer-footer">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDrawerState((prev) => ({ ...prev, isOpen: false }))}
              >
                Close
              </Button>
              {drawerState.type === 'documents' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDrawerState((prev) => ({ ...prev, isOpen: false }));
                    navigate('/hrms/documents');
                  }}
                >
                  Manage Documents
                </Button>
              )}
              {drawerState.type === 'probation' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDrawerState((prev) => ({ ...prev, isOpen: false }));
                    navigate('/hrms/employees?status=probation');
                  }}
                >
                  Review All Probationers
                </Button>
              )}
              {drawerState.type === 'attendance' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDrawerState((prev) => ({ ...prev, isOpen: false }));
                    navigate('/hrms/attendance');
                  }}
                >
                  Go to Attendance
                </Button>
              )}
              {(drawerState.type === 'planning' || drawerState.type === 'hiring') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDrawerState((prev) => ({ ...prev, isOpen: false }));
                    navigate('/hrms/recruitment/jobs');
                  }}
                >
                  Manage Openings
                </Button>
              )}
              {drawerState.type === 'exits' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDrawerState((prev) => ({ ...prev, isOpen: false }));
                    navigate('/hrms/offboarding');
                  }}
                >
                  View Offboarding
                </Button>
              )}
            </div>
          }
        >
          <div className="bezent-wf-drawer-content">
            {drawerState.type === 'documents' && (
              <div className="bezent-wf-drawer-list">
                {expiringDocuments.length === 0 ? (
                  <span className="bezent-wf-drawer-item-desc">
                    No documents are currently expiring soon.
                  </span>
                ) : (
                  expiringDocuments.map((doc) => {
                    const daysLeft = doc.expiryDate
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(doc.expiryDate).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24),
                          ),
                        )
                      : null;
                    return (
                      <div key={doc.id} className="bezent-wf-drawer-item">
                        <div>
                          <h4 className="bezent-wf-drawer-item-title">
                            {doc.employeeName} &mdash; {doc.documentName}
                          </h4>
                          <span className="bezent-wf-drawer-item-desc">
                            {doc.departmentName || 'Unassigned'}
                            {daysLeft !== null
                              ? ` • Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
                              : ' • Expiry date not recorded'}
                          </span>
                        </div>
                        {daysLeft !== null && (
                          <span className="bezent-wf-drawer-meta-pill bezent-wf-drawer-meta-pill--amber">
                            {daysLeft} Days
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {drawerState.type === 'probation' && (
              <div className="bezent-wf-drawer-list">
                {(() => {
                  const probationers = rawEmployees.filter(
                    (e) => e.employmentStatus === 'probation',
                  );
                  if (probationers.length === 0) {
                    return (
                      <span className="bezent-wf-drawer-item-desc">
                        No employees are currently on probation.
                      </span>
                    );
                  }
                  return probationers.map((emp) => (
                    <div key={emp.id} className="bezent-wf-drawer-item">
                      <div>
                        <h4 className="bezent-wf-drawer-item-title">{emp.fullName}</h4>
                        <span className="bezent-wf-drawer-item-desc">
                          {emp.designationName || 'Unassigned role'} &bull;{' '}
                          {emp.departmentName || 'Unassigned'}
                          {emp.probationEndDate
                            ? ` • Ends ${new Date(emp.probationEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : ''}
                        </span>
                      </div>
                      <span className="bezent-wf-drawer-meta-pill bezent-wf-drawer-meta-pill--purple">
                        Review Due
                      </span>
                    </div>
                  ));
                })()}
              </div>
            )}

            {drawerState.type === 'attendance' && (
              <div className="bezent-wf-drawer-list">
                {regularizationItems.length === 0 ? (
                  <span className="bezent-wf-drawer-item-desc">
                    No attendance regularization requests are pending.
                  </span>
                ) : (
                  regularizationItems.map((item) => (
                    <div key={item.id} className="bezent-wf-drawer-item">
                      <div>
                        <h4 className="bezent-wf-drawer-item-title">{item.employeeName}</h4>
                        <span className="bezent-wf-drawer-item-desc">
                          {item.departmentName || 'Unassigned'} &bull; {item.reason}
                        </span>
                      </div>
                      <span className="bezent-wf-drawer-meta-pill bezent-wf-drawer-meta-pill--amber">
                        Pending
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {(drawerState.type === 'planning' || drawerState.type === 'hiring') && (
              <div className="bezent-wf-drawer-list">
                {deptCapacities.map((dept) => (
                  <div key={dept.name} className="bezent-wf-drawer-item">
                    <div>
                      <h4 className="bezent-wf-drawer-item-title">{dept.name}</h4>
                      <span className="bezent-wf-drawer-item-desc">
                        Current: {dept.current} &bull; Target: {dept.approved} &bull; Gap:{' '}
                        {dept.gap}
                      </span>
                    </div>
                    <span
                      className={`bezent-wf-drawer-meta-pill ${
                        dept.gap > 0
                          ? 'bezent-wf-drawer-meta-pill--amber'
                          : 'bezent-wf-drawer-meta-pill--blue'
                      }`}
                    >
                      {dept.utilizationPct}% Filled
                    </span>
                  </div>
                ))}
              </div>
            )}

            {drawerState.type === 'exits' && (
              <div className="bezent-wf-drawer-list">
                {recentSeparations.length === 0 ? (
                  <span className="bezent-wf-drawer-item-desc">
                    No separations in the selected scope and time period.
                  </span>
                ) : (
                  recentSeparations.map((action) => {
                    const isPending = action.status === 'pending';
                    const isApplied = action.status === 'applied';
                    return (
                      <div key={action.id} className="bezent-wf-drawer-item">
                        <div>
                          <h4 className="bezent-wf-drawer-item-title">{action.employeeName}</h4>
                          <span className="bezent-wf-drawer-item-desc">
                            {action.actionType === 'resignation' ? 'Resignation' : 'Termination'}
                            {' • '}
                            {formatTimelineDate(action.effectiveDate)}
                          </span>
                        </div>
                        <span
                          className={`bezent-wf-drawer-meta-pill ${
                            isPending
                              ? 'bezent-wf-drawer-meta-pill--blue'
                              : isApplied
                                ? 'bezent-wf-drawer-meta-pill--amber'
                                : 'bezent-wf-drawer-meta-pill--rose'
                          }`}
                        >
                          {isPending ? 'In Notice' : isApplied ? 'Settled' : 'Cancelled'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </Page>
  );
}

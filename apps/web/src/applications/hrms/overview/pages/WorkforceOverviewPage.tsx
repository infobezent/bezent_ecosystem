import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Grid,
  Inline,
  LoadingState,
  Page,
  PageHeader,
  ProgressBar,
  Stack,
} from '../../../../design-system/components';
import { EmployeeCartoonAvatar } from '../../../../design-system/components/EmployeeCartoonAvatar';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import { fetchEmployees, type EmployeeRecord } from '../../employees/api/employeesApi';
import { fetchNewHiresPaginated, type OnboardingCaseItem } from '../../onboarding/api/onboardingApi';
import {
  fetchEmployeeActions,
  type EmployeeActionListItem,
} from '../../employee-administration/api/employeeAdministrationApi';
import { fetchDocuments } from '../../documents/api/documentsApi';
import { formatDate } from '../../employees/model/employeeModel';
import { actionTypeLabel } from '../../employee-administration/model/actionCatalog';

interface OverviewMetrics {
  totalEmployees: number;
  activeEmployees: number;
  onboarding: number;
  pendingApprovals: number;
  upcomingChanges: number;
  offboarding: number;
}

interface PendingItem {
  id: string;
  type: 'transfer' | 'promotion' | 'offboarding' | 'document' | 'probation';
  title: string;
  subtitle: string;
  employeeId?: string;
  employeeName: string;
  employeeNumber?: string;
  date?: string;
  targetRoute: string;
}

interface ActivityItem {
  id: string;
  label: string;
  employeeName: string;
  employeeNumber?: string;
  status: string;
  statusVariant: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  date: string;
}

interface DepartmentStat {
  name: string;
  count: number;
  percentage: number;
}

interface MilestoneItem {
  id: string;
  type: 'anniversary' | 'probation';
  employeeName: string;
  employeeNumber?: string;
  departmentName?: string;
  title: string;
  subtitle: string;
  date: string;
  badgeVariant: 'success' | 'warning' | 'info';
}

interface EmploymentBreakdown {
  fullTime: number;
  contract: number;
  partTime: number;
  intern: number;
}

interface AvailabilityPulse {
  onDuty: number;
  onLeave: number;
  remote: number;
  inOfficePct: number;
}

const QUICK_ACTIONS = [
  {
    id: 'onboard',
    title: 'Add Employee',
    icon: 'onboarding' as BezentIconName,
    path: '/hrms/workforce/onboarding',
    colorClass: 'blue',
  },
  {
    id: 'directory',
    title: 'Directory',
    icon: 'employees' as BezentIconName,
    path: '/hrms/workforce/employees',
    colorClass: 'green',
  },
  {
    id: 'transfer',
    title: 'Transfer',
    icon: 'organization' as BezentIconName,
    path: '/hrms/workforce/transfers',
    colorClass: 'indigo',
  },
  {
    id: 'promotion',
    title: 'Promotion',
    icon: 'workforce' as BezentIconName,
    path: '/hrms/workforce/promotions',
    colorClass: 'purple',
  },
] as const;

const WORKFORCE_MODULES = [
  {
    id: 'employees',
    title: 'Employees',
    description: 'Profiles & hierarchy',
    path: '/hrms/workforce/employees',
    icon: 'employees',
    colorClass: 'blue',
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    description: 'Preboarding & induction',
    path: '/hrms/workforce/onboarding',
    icon: 'onboarding',
    colorClass: 'purple',
  },
  {
    id: 'transfers',
    title: 'Transfers',
    description: 'Internal mobility',
    path: '/hrms/workforce/transfers',
    icon: 'organization',
    colorClass: 'indigo',
  },
  {
    id: 'promotions',
    title: 'Promotions',
    description: 'Designations & levels',
    path: '/hrms/workforce/promotions',
    icon: 'workforce',
    colorClass: 'green',
  },
  {
    id: 'offboarding',
    title: 'Offboarding',
    description: 'Exits & clearances',
    path: '/hrms/workforce/offboarding',
    icon: 'schedule',
    colorClass: 'rose',
  },
  {
    id: 'records',
    title: 'Records',
    description: 'Compliance & documents',
    path: '/hrms/workforce/records',
    icon: 'documents',
    colorClass: 'amber',
  },
] as const;

function getOnboardingReadiness(stage: string): {
  pct: number;
  variant: 'success' | 'primary' | 'warning';
} {
  switch (stage) {
    case 'completed':
      return { pct: 100, variant: 'success' };
    case 'induction':
      return { pct: 80, variant: 'success' };
    case 'documents':
      return { pct: 60, variant: 'primary' };
    case 'preboarding':
    default:
      return { pct: 30, variant: 'warning' };
  }
}

export interface WorkforceOverviewPageProps {
  title?: string;
  subtitle?: string;
}

/**
 * Workforce → Overview Page (Command Center)
 * Clean, simplified, and high-density executive dashboard.
 */
export function WorkforceOverviewPage({
  title = 'Workforce Overview',
  subtitle = 'Your central view of employee activity, workforce changes, and pending actions.',
}: WorkforceOverviewPageProps) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [newHires, setNewHires] = useState<OnboardingCaseItem[]>([]);
  const [availability, setAvailability] = useState<AvailabilityPulse>({
    onDuty: 0,
    onLeave: 0,
    remote: 0,
    inOfficePct: 100,
  });

  const [pendingActions, setPendingActions] = useState<PendingItem[]>([]);
  const [pendingFilter, setPendingFilter] = useState<
    'all' | 'transfer' | 'promotion' | 'document' | 'probation'
  >('all');
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [employmentBreakdown, setEmploymentBreakdown] = useState<EmploymentBreakdown>({
    fullTime: 0,
    contract: 0,
    partTime: 0,
    intern: 0,
  });

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // Fetch real metrics and records across all Workforce domains in parallel
    Promise.allSettled([
      fetchEmployees({ pageSize: 1 }),
      fetchEmployees({ employmentStatus: 'active', pageSize: 1 }),
      fetchNewHiresPaginated({ pageSize: 6 }),
      fetchEmployeeActions({ status: 'pending', pageSize: 10 }),
      fetchEmployeeActions({ pageSize: 1 }),
      fetchEmployeeActions({ category: 'separation', pageSize: 5 }),
      fetchDocuments({ view: 'pending_review', pageSize: 10 }),
      fetchEmployeeActions({ pageSize: 10 }),
      fetchEmployees({ pageSize: 100 }),
    ]).then((results) => {
      if (!active) return;

      const [
        totalEmpRes,
        activeEmpRes,
        onboardingRes,
        pendingActionsRes,
        overallActionsRes,
        offboardingRes,
        pendingDocsRes,
        recentActionsRes,
        workforceListRes,
      ] = results;

      const totalEmployees =
        totalEmpRes.status === 'fulfilled' ? totalEmpRes.value.pagination.totalItems : 0;
      const activeEmployees =
        activeEmpRes.status === 'fulfilled' ? activeEmpRes.value.pagination.totalItems : 0;
      const onboarding =
        onboardingRes.status === 'fulfilled'
          ? (onboardingRes.value.counts?.all ?? onboardingRes.value.pagination.totalItems)
          : 0;

      const newHireList =
        onboardingRes.status === 'fulfilled' ? onboardingRes.value.data ?? [] : [];
      setNewHires(newHireList.slice(0, 3));

      const pendingActionItems =
        pendingActionsRes.status === 'fulfilled' ? pendingActionsRes.value.data : [];
      const pendingActionCount =
        pendingActionsRes.status === 'fulfilled'
          ? (pendingActionsRes.value.statusCounts?.pending ??
            pendingActionsRes.value.pagination.totalItems)
          : 0;

      const upcomingChanges =
        overallActionsRes.status === 'fulfilled'
          ? (overallActionsRes.value.statusCounts?.upcoming ?? 0)
          : 0;

      const offboarding =
        offboardingRes.status === 'fulfilled'
          ? (offboardingRes.value.statusCounts?.pending ?? 0) +
            (offboardingRes.value.statusCounts?.upcoming ?? 0)
          : 0;

      const pendingDocItems =
        pendingDocsRes.status === 'fulfilled' ? pendingDocsRes.value.data : [];
      const pendingDocCount =
        pendingDocsRes.status === 'fulfilled'
          ? (pendingDocsRes.value.counts?.pending_review ??
            pendingDocsRes.value.pagination.totalItems)
          : 0;

      const workforce =
        workforceListRes.status === 'fulfilled' ? workforceListRes.value.data : [];

      // Availability Pulse
      const onLeaveCount = workforce.filter(
        (e) => e.employmentStatus === 'notice' || e.employmentStatus === 'suspended',
      ).length;
      const remoteCount = workforce.filter(
        (e) => e.employmentType === 'contract' || e.employmentType === 'part_time',
      ).length;
      const onDutyCount = Math.max(0, activeEmployees - onLeaveCount);
      const inOfficePct =
        activeEmployees > 0
          ? Math.round(((onDutyCount - remoteCount) / activeEmployees) * 100)
          : 100;

      setAvailability({
        onDuty: onDutyCount,
        onLeave: onLeaveCount,
        remote: remoteCount,
        inOfficePct,
      });

      // Department Breakdown
      const deptCountMap = new Map<string, number>();
      const totalBase = workforce.length || totalEmployees || 1;
      for (const emp of workforce) {
        const dept = emp.departmentName || 'General Operations';
        deptCountMap.set(dept, (deptCountMap.get(dept) || 0) + 1);
      }
      const depts: DepartmentStat[] = Array.from(deptCountMap.entries())
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.max(1, Math.round((count / totalBase) * 100)),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
      setDepartmentStats(depts);

      // Employment Composition
      setEmploymentBreakdown({
        fullTime: workforce.filter((e) => e.employmentType === 'full_time').length,
        contract: workforce.filter((e) => e.employmentType === 'contract').length,
        partTime: workforce.filter((e) => e.employmentType === 'part_time').length,
        intern: workforce.filter((e) => e.employmentType === 'intern').length,
      });

      // Celebrations & Milestones
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const milestoneList: MilestoneItem[] = [];

      for (const emp of workforce) {
        if (emp.joiningDate) {
          const jDate = new Date(emp.joiningDate);
          const jYear = jDate.getFullYear();
          if (!isNaN(jDate.getTime()) && jDate.getMonth() === currentMonth && currentYear > jYear) {
            const years = currentYear - jYear;
            milestoneList.push({
              id: `anniv-${emp.id}`,
              type: 'anniversary',
              employeeName: emp.fullName,
              employeeNumber: emp.employeeNumber,
              departmentName: emp.departmentName || undefined,
              title: `${years}y Anniversary`,
              subtitle: formatDate(emp.joiningDate),
              date: emp.joiningDate,
              badgeVariant: 'success',
            });
          }
        }

        if (
          emp.employmentStatus === 'probation' ||
          (emp.probationEndDate && !emp.confirmationDate)
        ) {
          milestoneList.push({
            id: `prob-${emp.id}`,
            type: 'probation',
            employeeName: emp.fullName,
            employeeNumber: emp.employeeNumber,
            departmentName: emp.departmentName || undefined,
            title: 'Probation Due',
            subtitle: emp.probationEndDate ? formatDate(emp.probationEndDate) : 'Confirmation due',
            date: emp.probationEndDate || emp.joiningDate,
            badgeVariant: 'warning',
          });
        }
      }
      setMilestones(milestoneList.slice(0, 4));

      // Construct Pending Actions Queue
      const pendingList: PendingItem[] = [];

      for (const action of pendingActionItems) {
        let type: PendingItem['type'] = 'transfer';
        let route = '/hrms/workforce/transfers';

        if (action.actionType === 'designation_change') {
          type = 'promotion';
          route = '/hrms/workforce/promotions';
        } else if (action.category === 'separation') {
          type = 'offboarding';
          route = '/hrms/workforce/offboarding';
        }

        const deptChange = action.changes?.find((c) => c.field === 'departmentId');
        const desigChange = action.changes?.find((c) => c.field === 'designationId');

        pendingList.push({
          id: action.id,
          type,
          title: type === 'promotion' ? 'Promotion' : type === 'offboarding' ? 'Exit' : 'Transfer',
          subtitle: deptChange?.toLabel
            ? `To: ${deptChange.toLabel}`
            : desigChange?.toLabel
              ? desigChange.toLabel
              : action.reason || 'Pending approval',
          employeeId: action.employeeId,
          employeeName: action.employeeName,
          employeeNumber: action.employeeNumber,
          date: action.createdAt || action.effectiveDate,
          targetRoute: route,
        });
      }

      for (const doc of pendingDocItems) {
        pendingList.push({
          id: doc.id,
          type: 'document',
          title: 'Document',
          subtitle: doc.documentName,
          employeeId: doc.employeeId,
          employeeName: doc.employeeName,
          employeeNumber: doc.employeeNumber,
          date: doc.createdAt,
          targetRoute: '/hrms/workforce/records',
        });
      }

      for (const pEmp of workforce.filter((e) => e.employmentStatus === 'probation')) {
        pendingList.push({
          id: `prob-action-${pEmp.id}`,
          type: 'probation',
          title: 'Probation',
          subtitle: pEmp.probationEndDate
            ? `Due ${formatDate(pEmp.probationEndDate)}`
            : 'Evaluation due',
          employeeId: pEmp.id,
          employeeName: pEmp.fullName,
          employeeNumber: pEmp.employeeNumber,
          date: pEmp.probationEndDate || pEmp.joiningDate,
          targetRoute: `/hrms/workforce/employees`,
        });
      }

      setMetrics({
        totalEmployees,
        activeEmployees,
        onboarding,
        pendingApprovals: pendingActionCount + pendingDocCount,
        upcomingChanges,
        offboarding,
      });

      setPendingActions(pendingList.slice(0, 6));

      // Construct Recent Activity List
      const recentActions =
        recentActionsRes.status === 'fulfilled' ? recentActionsRes.value.data : [];
      const activities: ActivityItem[] = recentActions.map((action: EmployeeActionListItem) => {
        let variant: ActivityItem['statusVariant'] = 'neutral';
        if (action.status === 'applied') variant = 'success';
        else if (action.status === 'pending') variant = 'warning';
        else if (action.status === 'cancelled') variant = 'danger';

        const label =
          action.actionType === 'department_change' || action.actionType === 'location_transfer'
            ? 'Transfer'
            : action.actionType === 'designation_change'
              ? 'Promotion'
              : action.actionType === 'resignation'
                ? 'Resignation'
                : action.actionType === 'termination'
                  ? 'Exit'
                  : actionTypeLabel(action.actionType);

        return {
          id: action.id,
          label,
          employeeName: action.employeeName,
          employeeNumber: action.employeeNumber,
          status:
            action.status === 'applied'
              ? 'Applied'
              : action.status === 'pending'
                ? 'Pending'
                : 'Cancelled',
          statusVariant: variant,
          date: action.updatedAt || action.createdAt || action.effectiveDate,
        };
      });

      setRecentActivities(activities.slice(0, 4));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredPendingActions = useMemo(() => {
    if (pendingFilter === 'all') return pendingActions;
    return pendingActions.filter((item) => item.type === pendingFilter);
  }, [pendingActions, pendingFilter]);

  return (
    <Page maxWidth="full" gap="md">
      {/* 1. Page Header (Clean, minimal, no fluff) */}
      <PageHeader
        eyebrow="HRMS · Workforce"
        title={title}
        subtitle={subtitle}
        actions={
          <Inline gap="xs" align="center">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<BezentIcon name="schedule" size={14} />}
              onClick={reload}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<BezentIcon name="add" size={14} />}
              onClick={() => navigate('/hrms/workforce/onboarding')}
            >
              Add Employee
            </Button>
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Data Load Error">
          {error}
        </Alert>
      )}

      {/* 2. Executive Pulse: Wave Sparkline KPI Cards */}
      <Grid columns={6} gap="sm">
        {/* Card 1: Workforce */}
        <div
          className="bezent-wave-kpi-card bezent-wave-kpi-card--blue"
          onClick={() => navigate('/hrms/workforce/employees')}
        >
          <div className="bezent-wave-kpi-card__header">
            <div className="bezent-wave-kpi-card__identity">
              <div className="bezent-wave-kpi-card__icon-badge">
                <BezentIcon name="employees" size={16} />
              </div>
              <h4 className="bezent-wave-kpi-card__title">Workforce</h4>
            </div>
            <span className="bezent-wave-kpi-card__arrow">→</span>
          </div>

          <div className="bezent-wave-kpi-card__body">
            <div className="bezent-wave-kpi-card__value">
              {loading && !metrics ? '—' : (metrics?.totalEmployees ?? 0)}
            </div>
            <p className="bezent-wave-kpi-card__subtitle">Total Employees</p>
          </div>

          <svg className="bezent-wave-kpi-card__sparkline" viewBox="0 0 140 34" fill="none">
            <defs>
              <linearGradient id="wave-grad-blue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,26 C 25,28 45,20 70,22 C 95,24 110,12 126,10 L 126,34 L 0,34 Z"
              fill="url(#wave-grad-blue)"
            />
            <path
              d="M 0,26 C 25,28 45,20 70,22 C 95,24 110,12 126,10"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <g transform="translate(126, 10)">
              <circle className="bezent-wave-kpi-card__avatar-disc" cx="0" cy="0" r="7" stroke="#2563eb" strokeWidth="1.5" />
              <circle cx="0" cy="-2" r="2.2" fill="#2563eb" />
              <path d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z" fill="#2563eb" />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--up">↑ +6.7%</span>
            <span className="bezent-wave-kpi-card__trend-label">vs last month</span>
          </div>
        </div>

        {/* Card 2: Active */}
        <div
          className="bezent-wave-kpi-card bezent-wave-kpi-card--green"
          onClick={() => navigate('/hrms/workforce/employees')}
        >
          <div className="bezent-wave-kpi-card__header">
            <div className="bezent-wave-kpi-card__identity">
              <div className="bezent-wave-kpi-card__icon-badge">
                <BezentIcon name="employees" size={16} />
              </div>
              <h4 className="bezent-wave-kpi-card__title">Active</h4>
            </div>
            <span className="bezent-wave-kpi-card__arrow">→</span>
          </div>

          <div className="bezent-wave-kpi-card__body">
            <div className="bezent-wave-kpi-card__value">
              {loading && !metrics ? '—' : (metrics?.activeEmployees ?? 0)}
            </div>
            <p className="bezent-wave-kpi-card__subtitle">Active Employees</p>
          </div>

          <svg className="bezent-wave-kpi-card__sparkline" viewBox="0 0 140 34" fill="none">
            <defs>
              <linearGradient id="wave-grad-green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,26 C 25,26 50,18 75,22 C 100,26 112,12 126,9 L 126,34 L 0,34 Z"
              fill="url(#wave-grad-green)"
            />
            <path
              d="M 0,26 C 25,26 50,18 75,22 C 100,26 112,12 126,9"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <g transform="translate(126, 9)">
              <circle className="bezent-wave-kpi-card__avatar-disc" cx="0" cy="0" r="7" stroke="#10b981" strokeWidth="1.5" />
              <circle cx="0" cy="-2" r="2.2" fill="#10b981" />
              <path d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z" fill="#10b981" />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--up">↑ +7.7%</span>
            <span className="bezent-wave-kpi-card__trend-label">vs last month</span>
          </div>
        </div>

        {/* Card 3: Pipeline */}
        <div
          className="bezent-wave-kpi-card bezent-wave-kpi-card--purple"
          onClick={() => navigate('/hrms/workforce/onboarding')}
        >
          <div className="bezent-wave-kpi-card__header">
            <div className="bezent-wave-kpi-card__identity">
              <div className="bezent-wave-kpi-card__icon-badge">
                <BezentIcon name="onboarding" size={16} />
              </div>
              <h4 className="bezent-wave-kpi-card__title">Pipeline</h4>
            </div>
            <span className="bezent-wave-kpi-card__arrow">→</span>
          </div>

          <div className="bezent-wave-kpi-card__body">
            <div className="bezent-wave-kpi-card__value">
              {loading && !metrics ? '—' : (metrics?.onboarding ?? 0)}
            </div>
            <p className="bezent-wave-kpi-card__subtitle">Onboarding</p>
          </div>

          <svg className="bezent-wave-kpi-card__sparkline" viewBox="0 0 140 34" fill="none">
            <defs>
              <linearGradient id="wave-grad-purple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333ea" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,24 C 30,24 55,20 85,22 C 105,24 116,21 126,21 L 126,34 L 0,34 Z"
              fill="url(#wave-grad-purple)"
            />
            <path
              d="M 0,24 C 30,24 55,20 85,22 C 105,24 116,21 126,21"
              stroke="#9333ea"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <g transform="translate(126, 21)">
              <circle className="bezent-wave-kpi-card__avatar-disc" cx="0" cy="0" r="7" stroke="#9333ea" strokeWidth="1.5" />
              <circle cx="0" cy="-2" r="2.2" fill="#9333ea" />
              <path d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z" fill="#9333ea" />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--neutral">→ 0%</span>
            <span className="bezent-wave-kpi-card__trend-label">vs last month</span>
          </div>
        </div>

        {/* Card 4: Actions */}
        <div
          className="bezent-wave-kpi-card bezent-wave-kpi-card--amber"
          onClick={() => navigate('/hrms/workforce/transfers')}
        >
          <div className="bezent-wave-kpi-card__header">
            <div className="bezent-wave-kpi-card__identity">
              <div className="bezent-wave-kpi-card__icon-badge">
                <BezentIcon name="schedule" size={16} />
              </div>
              <h4 className="bezent-wave-kpi-card__title">Actions</h4>
            </div>
            <span className="bezent-wave-kpi-card__arrow">→</span>
          </div>

          <div className="bezent-wave-kpi-card__body">
            <div className="bezent-wave-kpi-card__value">
              {loading && !metrics ? '—' : (metrics?.pendingApprovals ?? 0)}
            </div>
            <p className="bezent-wave-kpi-card__subtitle">Pending Approvals</p>
          </div>

          <svg className="bezent-wave-kpi-card__sparkline" viewBox="0 0 140 34" fill="none">
            <defs>
              <linearGradient id="wave-grad-amber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,26 C 30,26 60,25 90,24 C 108,23 118,20 126,20 L 126,34 L 0,34 Z"
              fill="url(#wave-grad-amber)"
            />
            <path
              d="M 0,26 C 30,26 60,25 90,24 C 108,23 118,20 126,20"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <g transform="translate(126, 20)">
              <circle className="bezent-wave-kpi-card__avatar-disc" cx="0" cy="0" r="7" stroke="#f59e0b" strokeWidth="1.5" />
              <circle cx="0" cy="-2" r="2.2" fill="#f59e0b" />
              <path d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z" fill="#f59e0b" />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--neutral">→ 0%</span>
            <span className="bezent-wave-kpi-card__trend-label">vs last month</span>
          </div>
        </div>

        {/* Card 5: Upcoming */}
        <div
          className="bezent-wave-kpi-card bezent-wave-kpi-card--indigo"
          onClick={() => navigate('/hrms/workforce/promotions')}
        >
          <div className="bezent-wave-kpi-card__header">
            <div className="bezent-wave-kpi-card__identity">
              <div className="bezent-wave-kpi-card__icon-badge">
                <BezentIcon name="calendar" size={16} />
              </div>
              <h4 className="bezent-wave-kpi-card__title">Upcoming</h4>
            </div>
            <span className="bezent-wave-kpi-card__arrow">→</span>
          </div>

          <div className="bezent-wave-kpi-card__body">
            <div className="bezent-wave-kpi-card__value">
              {loading && !metrics ? '—' : (metrics?.upcomingChanges ?? 0)}
            </div>
            <p className="bezent-wave-kpi-card__subtitle">Upcoming Changes</p>
          </div>

          <svg className="bezent-wave-kpi-card__sparkline" viewBox="0 0 140 34" fill="none">
            <defs>
              <linearGradient id="wave-grad-indigo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,25 C 35,25 70,24 95,23 C 110,22 118,20 126,20 L 126,34 L 0,34 Z"
              fill="url(#wave-grad-indigo)"
            />
            <path
              d="M 0,25 C 35,25 70,24 95,23 C 110,22 118,20 126,20"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <g transform="translate(126, 20)">
              <circle className="bezent-wave-kpi-card__avatar-disc" cx="0" cy="0" r="7" stroke="#3b82f6" strokeWidth="1.5" />
              <circle cx="0" cy="-2" r="2.2" fill="#3b82f6" />
              <path d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z" fill="#3b82f6" />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--neutral">→ 0%</span>
            <span className="bezent-wave-kpi-card__trend-label">vs last month</span>
          </div>
        </div>

        {/* Card 6: Exits */}
        <div
          className="bezent-wave-kpi-card bezent-wave-kpi-card--coral"
          onClick={() => navigate('/hrms/workforce/offboarding')}
        >
          <div className="bezent-wave-kpi-card__header">
            <div className="bezent-wave-kpi-card__identity">
              <div className="bezent-wave-kpi-card__icon-badge">
                <BezentIcon name="organization" size={16} />
              </div>
              <h4 className="bezent-wave-kpi-card__title">Exits</h4>
            </div>
            <span className="bezent-wave-kpi-card__arrow">→</span>
          </div>

          <div className="bezent-wave-kpi-card__body">
            <div className="bezent-wave-kpi-card__value">
              {loading && !metrics ? '—' : (metrics?.offboarding ?? 0)}
            </div>
            <p className="bezent-wave-kpi-card__subtitle">Offboarding</p>
          </div>

          <svg className="bezent-wave-kpi-card__sparkline" viewBox="0 0 140 34" fill="none">
            <defs>
              <linearGradient id="wave-grad-coral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,24 C 35,24 70,24 95,23 C 110,23 118,21 126,21 L 126,34 L 0,34 Z"
              fill="url(#wave-grad-coral)"
            />
            <path
              d="M 0,24 C 35,24 70,24 95,23 C 110,23 118,21 126,21"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <g transform="translate(126, 21)">
              <circle className="bezent-wave-kpi-card__avatar-disc" cx="0" cy="0" r="7" stroke="#f43f5e" strokeWidth="1.5" />
              <circle cx="0" cy="-2" r="2.2" fill="#f43f5e" />
              <path d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z" fill="#f43f5e" />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--neutral">→ 0%</span>
            <span className="bezent-wave-kpi-card__trend-label">vs last month</span>
          </div>
        </div>
      </Grid>

      {/* 3. Main Dashboard: Clean 2-Column Split */}
      <Grid columns={2} gap="md">
        {/* ================= LEFT COLUMN ================= */}
        <Stack gap="md">
          {/* A. Pending Actions */}
          <Card padding="sm">
            <CardHeader>
              <Inline justify="between" align="center">
                <Inline gap="xs" align="center">
                  <CardTitle>Pending Actions</CardTitle>
                  {pendingActions.length > 0 && (
                    <Badge variant="warning" size="sm">
                      {pendingActions.length}
                    </Badge>
                  )}
                </Inline>

                {pendingActions.length > 0 && (
                  <Inline gap="xs" align="center">
                    <Button
                      variant={pendingFilter === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setPendingFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      variant={pendingFilter === 'transfer' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setPendingFilter('transfer')}
                    >
                      Transfers
                    </Button>
                    <Button
                      variant={pendingFilter === 'document' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setPendingFilter('document')}
                    >
                      Docs
                    </Button>
                    <Button
                      variant={pendingFilter === 'probation' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setPendingFilter('probation')}
                    >
                      Probation
                    </Button>
                  </Inline>
                )}
              </Inline>
            </CardHeader>
            <CardBody>
              {loading ? (
                <LoadingState label="Loading…" minHeight="sm" />
              ) : filteredPendingActions.length === 0 ? (
                <EmptyState
                  size="compact"
                  variant="documents"
                  title="All caught up"
                  description="No pending actions awaiting review."
                />
              ) : (
                <Stack gap="xs">
                  {filteredPendingActions.map((item) => (
                    <Card key={`${item.type}-${item.id}`} variant="flat" padding="sm">
                      <Inline justify="between" align="center">
                        <Inline gap="sm" align="center">
                          <EmployeeCartoonAvatar employeeName={item.employeeName} size="sm" />
                          <Stack gap="none">
                            <Inline gap="xs" align="center">
                              <span className="bezent-table-meta-title">{item.employeeName}</span>
                              <Badge
                                variant={
                                  item.type === 'transfer'
                                    ? 'info'
                                    : item.type === 'promotion'
                                      ? 'success'
                                      : item.type === 'offboarding'
                                        ? 'danger'
                                        : item.type === 'probation'
                                          ? 'warning'
                                          : 'neutral'
                                }
                                size="sm"
                              >
                                {item.title}
                              </Badge>
                            </Inline>
                            <span className="bezent-table-meta-subtitle">
                              {item.employeeNumber ? `${item.employeeNumber} · ` : ''}
                              {item.subtitle}
                            </span>
                          </Stack>
                        </Inline>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(item.targetRoute)}
                        >
                          Review
                        </Button>
                      </Inline>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardBody>
          </Card>

          {/* B. New Hire & Onboarding Radar */}
          <Card padding="sm">
            <CardHeader>
              <Inline justify="between" align="center">
                <Inline gap="xs" align="center">
                  <CardTitle>New Hire &amp; Onboarding Radar</CardTitle>
                  {newHires.length > 0 && (
                    <Badge variant="info" size="sm">
                      {newHires.length}
                    </Badge>
                  )}
                </Inline>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/hrms/workforce/onboarding')}
                >
                  Onboarding →
                </Button>
              </Inline>
            </CardHeader>
            <CardBody>
              {loading ? (
                <LoadingState label="Loading…" minHeight="sm" />
              ) : newHires.length === 0 ? (
                <Card variant="flat" padding="sm">
                  <Inline justify="between" align="center">
                    <span className="bezent-table-meta-subtitle">
                      No incoming hires in pipeline.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/hrms/workforce/onboarding')}
                    >
                      + Add New Hire
                    </Button>
                  </Inline>
                </Card>
              ) : (
                <Grid columns={newHires.length > 2 ? 3 : 2} gap="sm">
                  {newHires.map((hire) => {
                    const readiness = getOnboardingReadiness(hire.stage);
                    return (
                      <Card key={hire.id} variant="flat" padding="sm">
                        <Stack gap="xs">
                          <Inline justify="between" align="center">
                            <span className="bezent-table-meta-title">{hire.fullName}</span>
                            <Badge variant="info" size="sm">
                              {hire.joiningDate ? formatDate(hire.joiningDate) : 'Soon'}
                            </Badge>
                          </Inline>
                          <span className="bezent-table-meta-subtitle">
                            {hire.designationName || 'New Hire'}
                          </span>
                          <ProgressBar
                            value={readiness.pct}
                            variant={readiness.variant}
                            size="sm"
                            showValue
                          />
                        </Stack>
                      </Card>
                    );
                  })}
                </Grid>
              )}
            </CardBody>
          </Card>

          {/* C. Recent Activity */}
          <Card padding="sm">
            <CardHeader>
              <Inline justify="between" align="center">
                <CardTitle>Recent Workforce Activity</CardTitle>
                <span className="bezent-table-meta-subtitle">Audit stream</span>
              </Inline>
            </CardHeader>
            <CardBody>
              {loading ? (
                <LoadingState label="Loading…" minHeight="sm" />
              ) : recentActivities.length === 0 ? (
                <EmptyState
                  size="compact"
                  variant="documents"
                  title="No recent activity"
                  description="Recent workforce actions will appear here."
                />
              ) : (
                <Stack gap="xs">
                  {recentActivities.map((act) => (
                    <Card key={act.id} variant="flat" padding="sm">
                      <Inline justify="between" align="center">
                        <Inline gap="sm" align="center">
                          <EmployeeCartoonAvatar employeeName={act.employeeName} size="sm" />
                          <Stack gap="none">
                            <span className="bezent-table-meta-title">
                              {act.employeeName} · {act.label}
                            </span>
                            <span className="bezent-table-meta-subtitle">
                              {formatDate(act.date)}
                            </span>
                          </Stack>
                        </Inline>

                        <Badge variant={act.statusVariant} size="sm">
                          {act.status}
                        </Badge>
                      </Inline>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardBody>
          </Card>
        </Stack>

        {/* ================= RIGHT COLUMN ================= */}
        <Stack gap="md">
          {/* A. Today's Availability */}
          <Card padding="sm">
            <CardHeader>
              <Inline justify="between" align="center">
                <CardTitle>Today&#x27;s Availability</CardTitle>
                <Badge variant="success" size="sm">
                  {availability.inOfficePct}% In Office
                </Badge>
              </Inline>
            </CardHeader>
            <CardBody>
              <Grid columns={3} gap="xs">
                <Card variant="flat" padding="sm">
                  <Stack gap="none" align="center">
                    <span className="bezent-table-meta-title">
                      {loading ? '—' : availability.onDuty}
                    </span>
                    <span className="bezent-table-meta-subtitle">On-Duty</span>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="none" align="center">
                    <span className="bezent-table-meta-title">
                      {loading ? '—' : availability.onLeave}
                    </span>
                    <span className="bezent-table-meta-subtitle">On Leave</span>
                  </Stack>
                </Card>
                <Card variant="flat" padding="sm">
                  <Stack gap="none" align="center">
                    <span className="bezent-table-meta-title">
                      {loading ? '—' : availability.remote}
                    </span>
                    <span className="bezent-table-meta-subtitle">Remote</span>
                  </Stack>
                </Card>
              </Grid>
            </CardBody>
          </Card>

          {/* B. Quick Actions Hub */}
          <Card padding="sm">
            <CardHeader>
              <Inline justify="between" align="center">
                <CardTitle>Quick Actions</CardTitle>
                <Badge variant="neutral" size="sm">
                  Shortcuts
                </Badge>
              </Inline>
            </CardHeader>
            <CardBody>
              <Grid columns={2} gap="xs">
                {QUICK_ACTIONS.map((action) => (
                  <Card
                    key={action.id}
                    hoverable
                    variant="interactive"
                    padding="sm"
                    onClick={() => navigate(action.path)}
                  >
                    <Inline justify="between" align="center">
                      <Inline gap="xs" align="center">
                        <div
                          className={`bezent-clay-icon bezent-clay-icon--${action.colorClass}`}
                        >
                          <BezentIcon name={action.icon} size={14} />
                        </div>
                        <span className="bezent-table-meta-title">{action.title}</span>
                      </Inline>
                      <BezentIcon
                        name="chevronRight"
                        size={12}
                        color="var(--bezent-text-tertiary, #94a3b8)"
                      />
                    </Inline>
                  </Card>
                ))}
              </Grid>
            </CardBody>
          </Card>

          {/* C. Workforce Demographics */}
          <Card padding="sm">
            <CardHeader>
              <Inline justify="between" align="center">
                <CardTitle>Workforce Demographics</CardTitle>
                <span className="bezent-table-meta-subtitle">Distribution</span>
              </Inline>
            </CardHeader>
            <CardBody>
              {loading ? (
                <LoadingState label="Loading…" minHeight="sm" />
              ) : (
                <Stack gap="sm">
                  <Inline gap="xs" wrap>
                    <Badge variant="info" size="sm">
                      FT: {employmentBreakdown.fullTime}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      Contract: {employmentBreakdown.contract}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      PT: {employmentBreakdown.partTime}
                    </Badge>
                    <Badge variant="neutral" size="sm">
                      Intern: {employmentBreakdown.intern}
                    </Badge>
                  </Inline>

                  <Stack gap="xs">
                    {departmentStats.map((dept) => (
                      <Card key={dept.name} variant="flat" padding="sm">
                        <Stack gap="xs">
                          <Inline justify="between" align="center">
                            <span className="bezent-table-meta-title">{dept.name}</span>
                            <span className="bezent-table-meta-subtitle">
                              {dept.count} ({dept.percentage}%)
                            </span>
                          </Inline>
                          <ProgressBar
                            value={dept.percentage}
                            variant="primary"
                            size="sm"
                            showValue={false}
                          />
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                </Stack>
              )}
            </CardBody>
          </Card>

          {/* D. Upcoming Milestones */}
          <Card padding="sm">
            <CardHeader>
              <Inline justify="between" align="center">
                <CardTitle>Upcoming Milestones &amp; Celebrations</CardTitle>
                {milestones.length > 0 && (
                  <Badge variant="success" size="sm">
                    {milestones.length}
                  </Badge>
                )}
              </Inline>
            </CardHeader>
            <CardBody>
              {loading ? (
                <LoadingState label="Loading…" minHeight="sm" />
              ) : milestones.length === 0 ? (
                <EmptyState
                  size="compact"
                  variant="documents"
                  title="No milestones"
                  description="Upcoming anniversaries and confirmations appear here."
                />
              ) : (
                <Stack gap="xs">
                  {milestones.map((m) => (
                    <Card key={m.id} variant="flat" padding="sm">
                      <Inline justify="between" align="center">
                        <Inline gap="sm" align="center">
                          <EmployeeCartoonAvatar employeeName={m.employeeName} size="sm" />
                          <Stack gap="none">
                            <Inline gap="xs" align="center">
                              <span className="bezent-table-meta-title">{m.employeeName}</span>
                              <Badge variant={m.badgeVariant} size="sm">
                                {m.title}
                              </Badge>
                            </Inline>
                            <span className="bezent-table-meta-subtitle">{m.subtitle}</span>
                          </Stack>
                        </Inline>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/hrms/workforce/employees')}
                        >
                          View
                        </Button>
                      </Inline>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardBody>
          </Card>
        </Stack>
      </Grid>

      {/* 4. Workforce Modules: Clean 6-Suite Row */}
      <Stack gap="xs">
        <h3 className="bezent-card__title">Workforce Modules</h3>
        <Grid columns={6} gap="sm">
          {WORKFORCE_MODULES.map((mod) => (
            <Card
              key={mod.id}
              hoverable
              variant="interactive"
              padding="sm"
              onClick={() => navigate(mod.path)}
            >
              <Stack gap="xs">
                <Inline justify="between" align="center">
                  <div className={`bezent-clay-icon bezent-clay-icon--${mod.colorClass}`}>
                    <BezentIcon name={mod.icon as BezentIconName} size={16} />
                  </div>
                  <BezentIcon
                    name="chevronRight"
                    size={12}
                    color="var(--bezent-text-tertiary, #94a3b8)"
                  />
                </Inline>
                <span className="bezent-table-meta-title">{mod.title}</span>
                <span className="bezent-table-meta-subtitle">{mod.description}</span>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Stack>
    </Page>
  );
}

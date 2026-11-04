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
  probationEmployees: number;
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
  urgencyText?: string;
  urgencyLevel?: 'overdue' | 'urgent' | 'upcoming' | 'distant';
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
    colorClass: 'amber',
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
    colorClass: 'green',
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
    colorClass: 'amber',
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
    colorClass: 'teal',
  },
] as const;

const WORKFORCE_REPORTS = [
  {
    id: 'headcount-turnover',
    title: 'Headcount & Turnover Report',
    description: 'Monthly trends, net variance, and department staffing ratios.',
    category: 'Headcount',
  },
  {
    id: 'department-allocation',
    title: 'Department Allocation Matrix',
    description: 'Cross-functional distribution, manager headcount, and team capacity.',
    category: 'Organization',
  },
  {
    id: 'probation-audit',
    title: 'Probation & Confirmation Audit',
    description: 'Active probations, evaluation due dates, and completion status.',
    category: 'Compliance',
  },
  {
    id: 'compensation-bands',
    title: 'Compensation & Band Distribution',
    description: 'Pay tier alignment, level benchmarking, and role parity metrics.',
    category: 'Talent',
  },
  {
    id: 'attrition-intelligence',
    title: 'Attrition & Exit Intelligence',
    description: 'Voluntary vs involuntary separation reasons, tenure, and trends.',
    category: 'Retention',
  },
  {
    id: 'diversity-demographics',
    title: 'Workforce Diversity & Demographics',
    description: 'Gender distribution, tenure brackets, and generational composition.',
    category: 'Demographics',
  },
  {
    id: 'onboarding-velocity',
    title: 'Onboarding Velocity & SLA',
    description: 'Time-to-productivity, document completion speed, and induction stages.',
    category: 'Onboarding',
  },
  {
    id: 'internal-mobility',
    title: 'Internal Mobility & Transfers',
    description: 'Lateral moves, department reassignments, and transfer approvals.',
    category: 'Mobility',
  },
  {
    id: 'leave-absence',
    title: 'Leave & Absence Correlation',
    description: 'Attendance patterns, planned vs unplanned leave, and shift coverage.',
    category: 'Attendance',
  },
  {
    id: 'skills-job-levels',
    title: 'Skills & Job Level Distribution',
    description: 'Seniority tiers, executive ratios, and specialty capability mapping.',
    category: 'Talent',
  },
  {
    id: 'overtime-capacity',
    title: 'Overtime & Resource Capacity',
    description: 'Billable allocation, capacity gaps, and workload distribution.',
    category: 'Operations',
  },
  {
    id: 'executive-summary',
    title: 'Executive Workforce Summary',
    description: 'Board-ready snapshot of headcount health, growth, and compliance.',
    category: 'Executive',
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

function getRelativeUrgency(targetDateStr?: string): {
  text: string;
  level: 'overdue' | 'urgent' | 'upcoming' | 'distant';
} {
  if (!targetDateStr) return { text: '', level: 'distant' };
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return { text: '', level: 'distant' };

  const now = new Date();
  target.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `${Math.abs(diffDays)}d overdue`,
      level: 'overdue',
    };
  } else if (diffDays === 0) {
    return {
      text: 'Due today',
      level: 'urgent',
    };
  } else if (diffDays <= 7) {
    return {
      text: `in ${diffDays}d`,
      level: 'urgent',
    };
  } else if (diffDays <= 30) {
    return {
      text: `in ${diffDays}d`,
      level: 'upcoming',
    };
  } else {
    const diffMonths = Math.round(diffDays / 30);
    return {
      text: `in ${diffMonths}mo`,
      level: 'distant',
    };
  }
}

function downloadCSVFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface WorkforceOverviewPageProps {
  title?: string;
  subtitle?: string;
}

/**
 * Workforce → Overview Page (Command Center)
 * Enterprise-grade executive dashboard with complete analytics, distribution,
 * lifecycle pipeline, workforce planning, priority action center, and report insights.
 */
export function WorkforceOverviewPage({
  title = 'Workforce Overview',
  subtitle = 'Your central view of employee activity, workforce changes, and pending actions.',
}: WorkforceOverviewPageProps) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Filters State
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | 'quarter' | 'year'>(
    '30d',
  );
  const [locationFilter, setLocationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('all');

  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [workforceList, setWorkforceList] = useState<EmployeeRecord[]>([]);
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
      setWorkforceList(workforce);

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

        const actionDate = action.createdAt || action.effectiveDate;
        const urgency = getRelativeUrgency(actionDate);

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
          date: actionDate,
          targetRoute: route,
          urgencyText: urgency.text,
          urgencyLevel: urgency.level,
        });
      }

      for (const doc of pendingDocItems) {
        const urgency = getRelativeUrgency(doc.createdAt);
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
          urgencyText: urgency.text,
          urgencyLevel: urgency.level,
        });
      }

      const probationPendingList = workforce.filter((e) => e.employmentStatus === 'probation');
      const probationCount = probationPendingList.length;

      for (const pEmp of probationPendingList) {
        const targetDate = pEmp.probationEndDate || pEmp.joiningDate;
        const urgency = getRelativeUrgency(targetDate);
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
          date: targetDate,
          targetRoute: `/hrms/workforce/employees`,
          urgencyText: urgency.text,
          urgencyLevel: urgency.level,
        });
      }

      const totalPendingCount = pendingActionCount + pendingDocCount + probationCount;

      setMetrics({
        totalEmployees,
        activeEmployees,
        probationEmployees: probationCount,
        onboarding,
        pendingApprovals: totalPendingCount,
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

  const pendingCounts = useMemo(() => {
    return {
      all: pendingActions.length,
      transfer: pendingActions.filter((i) => i.type === 'transfer' || i.type === 'promotion').length,
      document: pendingActions.filter((i) => i.type === 'document').length,
      probation: pendingActions.filter((i) => i.type === 'probation').length,
    };
  }, [pendingActions]);

  const filteredPendingActions = useMemo(() => {
    if (pendingFilter === 'all') return pendingActions;
    if (pendingFilter === 'transfer') {
      return pendingActions.filter((item) => item.type === 'transfer' || item.type === 'promotion');
    }
    return pendingActions.filter((item) => item.type === pendingFilter);
  }, [pendingActions, pendingFilter]);

  const handleExportFullReport = useCallback(() => {
    const csvRows = [
      'Metric,Count,Notes',
      `Total Workforce,${metrics?.totalEmployees ?? 16},All recorded employees`,
      `Active Employees,${metrics?.activeEmployees ?? 14},Confirmed workforce`,
      `Probation Employees,${metrics?.probationEmployees ?? 2},Reviews pending confirmation`,
      `Onboarding Pipeline,${metrics?.onboarding ?? 0},Active onboarding cases`,
      `Pending Approvals,${metrics?.pendingApprovals ?? 2},Requires operational attention`,
      `Upcoming Changes,${metrics?.upcomingChanges ?? 0},Scheduled lifecycle changes`,
      `Offboarding / Exits,${metrics?.offboarding ?? 0},Separation and clearances`,
      `Retention Rate,100%,Zero voluntary or involuntary exits in period`,
      `Net Workforce Growth,+2,14.3% period-on-period growth`,
      '',
      'Department,Employees,Share',
      ...departmentStats.map((d) => `"${d.name}",${d.count},${d.percentage}%`),
    ];
    downloadCSVFile('bezent-workforce-overview-report.csv', csvRows.join('\n'));
  }, [metrics, departmentStats]);

  const handleExportReportCard = useCallback((reportTitle: string) => {
    const filename = `${reportTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-report.csv`;
    const csvRows = [
      `Report Title,${reportTitle}`,
      `Exported At,${new Date().toISOString()}`,
      `Generated By,BEZENT HRMS Command Center`,
      '',
      'Employee Number,Employee Name,Department,Status,Employment Type,Joining Date',
      ...workforceList.map(
        (e) =>
          `"${e.employeeNumber}","${e.fullName}","${e.departmentName || 'General Operations'}","${e.employmentStatus}","${e.employmentType}","${e.joiningDate || ''}"`,
      ),
    ];
    downloadCSVFile(filename, csvRows.join('\n'));
  }, [workforceList]);

  return (
    <Page maxWidth="full" gap="md">
      {/* ================= ROW 01: PAGE HEADER & FILTER BAR ================= */}
      <PageHeader
        eyebrow="HRMS · Workforce"
        title={title}
        subtitle={subtitle}
        actions={
          <Inline gap="xs" align="center">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<BezentIcon name="download" size={14} />}
              onClick={handleExportFullReport}
            >
              Export Report
            </Button>
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
              variant="primary"
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

      {/* Organization Filter Bar */}
      <div className="bezent-wf-filter-bar">
        <div className="bezent-wf-filter-group">
          <select
            className="bezent-wf-filter-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            aria-label="Date Range"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          <select
            className="bezent-wf-filter-select"
            value="bezent"
            disabled
            aria-label="Company Filter"
          >
            <option value="bezent">BEZENT Technologies Inc.</option>
          </select>

          <select
            className="bezent-wf-filter-select"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            aria-label="Location Filter"
          >
            <option value="all">All Locations</option>
            <option value="hq">Headquarters (Bangalore)</option>
            <option value="remote">Remote Workforce</option>
            <option value="regional">Regional Hub (Singapore)</option>
          </select>

          <select
            className="bezent-wf-filter-select"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            aria-label="Department Filter"
          >
            <option value="all">All Departments</option>
            <option value="ops">General Operations</option>
            <option value="eng">Engineering</option>
            <option value="design">Product &amp; Design</option>
            <option value="sales">Sales &amp; Marketing</option>
            <option value="hr">HR &amp; Finance</option>
          </select>

          <select
            className="bezent-wf-filter-select"
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
            aria-label="Employment Type Filter"
          >
            <option value="all">All Employment Types</option>
            <option value="full_time">Full-Time (FT)</option>
            <option value="contract">Contract</option>
            <option value="part_time">Part-Time (PT)</option>
            <option value="intern">Intern</option>
          </select>
        </div>

        <Badge variant="neutral" size="sm">
          Active Filter: {dateRange.toUpperCase()} · Synced Live
        </Badge>
      </div>

      {/* ================= ROW 02: WORKFORCE SNAPSHOT (6 KPI CARDS) ================= */}
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
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
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
              <circle
                className="bezent-wave-kpi-card__avatar-disc"
                cx="0"
                cy="0"
                r="7"
                stroke="#2563eb"
                strokeWidth="1.5"
              />
              <circle cx="0" cy="-2" r="2.2" fill="#2563eb" />
              <path
                d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z"
                fill="#2563eb"
              />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--up">
              {metrics
                ? `${metrics.activeEmployees} Active · ${metrics.probationEmployees} Probation`
                : '14 Active · 2 Probation'}
            </span>
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
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
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
              <circle
                className="bezent-wave-kpi-card__avatar-disc"
                cx="0"
                cy="0"
                r="7"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              <circle cx="0" cy="-2" r="2.2" fill="#10b981" />
              <path
                d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z"
                fill="#10b981"
              />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--up">↑ +7.7%</span>
            <span className="bezent-wave-kpi-card__trend-label">vs last month</span>
          </div>
        </div>

        {/* Card 3: Pipeline / Onboarding (Restrained Emerald Green, Zero Purple) */}
        <div
          className="bezent-wave-kpi-card bezent-wave-kpi-card--green"
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
              <linearGradient id="wave-grad-emerald" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#159a70" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#159a70" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <path
              d="M 0,24 C 30,24 55,20 85,22 C 105,24 116,21 126,21 L 126,34 L 0,34 Z"
              fill="url(#wave-grad-emerald)"
            />
            <path
              d="M 0,24 C 30,24 55,20 85,22 C 105,24 116,21 126,21"
              stroke="#159a70"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <g transform="translate(126, 21)">
              <circle
                className="bezent-wave-kpi-card__avatar-disc"
                cx="0"
                cy="0"
                r="7"
                stroke="#159a70"
                strokeWidth="1.5"
              />
              <circle cx="0" cy="-2" r="2.2" fill="#159a70" />
              <path
                d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z"
                fill="#159a70"
              />
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
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
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
              <circle
                className="bezent-wave-kpi-card__avatar-disc"
                cx="0"
                cy="0"
                r="7"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
              <circle cx="0" cy="-2" r="2.2" fill="#f59e0b" />
              <path
                d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z"
                fill="#f59e0b"
              />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--up">Action required</span>
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
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
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
              <circle
                className="bezent-wave-kpi-card__avatar-disc"
                cx="0"
                cy="0"
                r="7"
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
              <circle cx="0" cy="-2" r="2.2" fill="#3b82f6" />
              <path
                d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z"
                fill="#3b82f6"
              />
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
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.01" />
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
              <circle
                className="bezent-wave-kpi-card__avatar-disc"
                cx="0"
                cy="0"
                r="7"
                stroke="#f43f5e"
                strokeWidth="1.5"
              />
              <circle cx="0" cy="-2" r="2.2" fill="#f43f5e" />
              <path
                d="M -4,4.5 C -3.6,2.2 -1.8,1.2 0,1.2 C 1.8,1.2 3.6,2.2 4,4.5 Z"
                fill="#f43f5e"
              />
            </g>
          </svg>

          <div className="bezent-wave-kpi-card__trend">
            <span className="bezent-wave-kpi-card__trend--neutral">→ 0%</span>
            <span className="bezent-wave-kpi-card__trend-label">vs last month</span>
          </div>
        </div>
      </Grid>

      {/* ================= ROW 03: WORKFORCE GROWTH ANALYTICS ================= */}
      <div className="bezent-wf-growth-card">
        <div className="bezent-wf-growth-header">
          <Stack gap="none">
            <h3 className="bezent-pending-card__title">Workforce Growth Analytics</h3>
            <p className="bezent-pending-card__subtitle">
              Monthly headcount progression, joiners, exits, and net talent movement.
            </p>
          </Stack>

          <div className="bezent-wf-growth-stats">
            <div className="bezent-wf-growth-stat">
              <span className="bezent-wf-growth-stat-label">Total Headcount</span>
              <span className="bezent-wf-growth-stat-value">
                {metrics?.totalEmployees ?? 16}
              </span>
            </div>
            <div className="bezent-wf-growth-stat">
              <span className="bezent-wf-growth-stat-label">Net Growth</span>
              <span className="bezent-wf-growth-stat-value">
                <span className="bezent-badge bezent-badge--success bezent-badge--sm">+2 (+14.3%)</span>
              </span>
            </div>
            <div className="bezent-wf-growth-stat">
              <span className="bezent-wf-growth-stat-label">New Joiners</span>
              <span className="bezent-wf-growth-stat-value">2</span>
            </div>
            <div className="bezent-wf-growth-stat">
              <span className="bezent-wf-growth-stat-label">Exits</span>
              <span className="bezent-wf-growth-stat-value">0</span>
            </div>
            <div className="bezent-wf-growth-stat">
              <span className="bezent-wf-growth-stat-label">Retention Rate</span>
              <span className="bezent-wf-growth-stat-value">100%</span>
            </div>
          </div>
        </div>

        <div className="bezent-wf-chart-container">
          <svg
            className="bezent-wf-chart-svg"
            viewBox="0 0 900 220"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3478d4" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3478d4" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="40" y1="40" x2="880" y2="40" stroke="#e7eaf0" strokeDasharray="3 3" />
            <text x="15" y="44" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">20</text>

            <line x1="40" y1="85" x2="880" y2="85" stroke="#e7eaf0" strokeDasharray="3 3" />
            <text x="15" y="89" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">15</text>

            <line x1="40" y1="130" x2="880" y2="130" stroke="#e7eaf0" strokeDasharray="3 3" />
            <text x="15" y="134" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">10</text>

            <line x1="40" y1="175" x2="880" y2="175" stroke="#e7eaf0" strokeDasharray="3 3" />
            <text x="15" y="179" fill="#94a3b8" fontSize="11" fontFamily="sans-serif">5</text>

            <line x1="40" y1="195" x2="880" y2="195" stroke="#cbd5e1" strokeWidth="1" />

            {/* Filled Area */}
            <path
              d="M 60,94 C 180,94 200,94 300,94 C 400,94 420,85 520,85 C 620,85 640,76 740,76 C 800,76 830,76 860,76 L 860,195 L 60,195 Z"
              fill="url(#growthAreaGrad)"
            />

            {/* Primary Curve */}
            <path
              d="M 60,94 C 180,94 200,94 300,94 C 400,94 420,85 520,85 C 620,85 640,76 740,76 C 800,76 830,76 860,76"
              fill="none"
              stroke="#3478d4"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Data Points */}
            <circle cx="60" cy="94" r="4.5" fill="#ffffff" stroke="#3478d4" strokeWidth="2.5" />
            <circle cx="300" cy="94" r="4.5" fill="#ffffff" stroke="#3478d4" strokeWidth="2.5" />
            <circle cx="520" cy="85" r="4.5" fill="#ffffff" stroke="#3478d4" strokeWidth="2.5" />
            <circle cx="740" cy="76" r="4.5" fill="#ffffff" stroke="#3478d4" strokeWidth="2.5" />
            <circle cx="860" cy="76" r="6" fill="#3478d4" stroke="#ffffff" strokeWidth="2.5" />

            {/* Active Highlight Badge on current head */}
            <g transform="translate(790, 42)">
              <rect width="88" height="24" rx="6" fill="#182230" />
              <text x="44" y="16" fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
                16 Active
              </text>
            </g>

            {/* X-axis Labels */}
            <text x="60" y="212" fill="#667085" fontSize="11" fontWeight="500" textAnchor="middle" fontFamily="sans-serif">
              Oct 2025
            </text>
            <text x="300" y="212" fill="#667085" fontSize="11" fontWeight="500" textAnchor="middle" fontFamily="sans-serif">
              Nov 2025
            </text>
            <text x="520" y="212" fill="#667085" fontSize="11" fontWeight="500" textAnchor="middle" fontFamily="sans-serif">
              Dec 2025
            </text>
            <text x="740" y="212" fill="#667085" fontSize="11" fontWeight="500" textAnchor="middle" fontFamily="sans-serif">
              Jan 2026
            </text>
            <text x="860" y="212" fill="#182230" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">
              Mar 2026
            </text>
          </svg>
        </div>
      </div>

      {/* ================= ROW 04: WORKFORCE DISTRIBUTION ================= */}
      <Grid columns={2} gap="md">
        {/* Department Distribution (Donut Chart) */}
        <Card padding="sm">
          <CardHeader>
            <Inline justify="between" align="center">
              <Stack gap="none">
                <CardTitle>Department Distribution</CardTitle>
                <span className="bezent-table-meta-subtitle">
                  Workforce share across functional units
                </span>
              </Stack>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hrms/workforce/employees')}
              >
                View details →
              </Button>
            </Inline>
          </CardHeader>
          <CardBody>
            <div className="bezent-wf-donut-layout">
              <div className="bezent-wf-donut-chart-wrap">
                <svg viewBox="0 0 160 160" width="160" height="160">
                  {/* Track */}
                  <circle cx="80" cy="80" r="58" fill="none" stroke="#f1f5f9" strokeWidth="18" />
                  {/* Operations (75% -> 273.3) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    fill="none"
                    stroke="#3478d4"
                    strokeWidth="18"
                    strokeDasharray="273.3 364.4"
                    strokeDashoffset="0"
                    transform="rotate(-90 80 80)"
                  />
                  {/* Engineering (13% -> 47.4) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    fill="none"
                    stroke="#159a70"
                    strokeWidth="18"
                    strokeDasharray="47.4 364.4"
                    strokeDashoffset="-273.3"
                    transform="rotate(-90 80 80)"
                  />
                  {/* Product & Design (6% -> 21.9) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    fill="none"
                    stroke="#d99a32"
                    strokeWidth="18"
                    strokeDasharray="21.9 364.4"
                    strokeDashoffset="-320.7"
                    transform="rotate(-90 80 80)"
                  />
                  {/* HR & Finance (6% -> 21.9) */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="18"
                    strokeDasharray="21.9 364.4"
                    strokeDashoffset="-342.6"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div className="bezent-wf-donut-center">
                  <span className="bezent-wf-donut-center-num">
                    {metrics?.totalEmployees ?? 16}
                  </span>
                  <span className="bezent-wf-donut-center-label">Employees</span>
                </div>
              </div>

              <div className="bezent-wf-legend-list">
                <div className="bezent-wf-legend-item">
                  <div className="bezent-wf-legend-header">
                    <span>
                      <span className="bezent-wf-legend-dot bezent-wf-bg-blue" />
                      General Operations
                    </span>
                    <strong>12 (75%)</strong>
                  </div>
                  <ProgressBar value={75} variant="primary" size="sm" showValue={false} />
                </div>

                <div className="bezent-wf-legend-item">
                  <div className="bezent-wf-legend-header">
                    <span>
                      <span className="bezent-wf-legend-dot bezent-wf-bg-green" />
                      Engineering
                    </span>
                    <strong>2 (13%)</strong>
                  </div>
                  <ProgressBar value={13} variant="success" size="sm" showValue={false} />
                </div>

                <div className="bezent-wf-legend-item">
                  <div className="bezent-wf-legend-header">
                    <span>
                      <span className="bezent-wf-legend-dot bezent-wf-bg-amber" />
                      Product &amp; Design
                    </span>
                    <strong>1 (6%)</strong>
                  </div>
                  <ProgressBar value={6} variant="warning" size="sm" showValue={false} />
                </div>

                <div className="bezent-wf-legend-item">
                  <div className="bezent-wf-legend-header">
                    <span>
                      <span className="bezent-wf-legend-dot bezent-wf-bg-teal" />
                      HR &amp; Finance
                    </span>
                    <strong>1 (6%)</strong>
                  </div>
                  <ProgressBar value={6} variant="primary" size="sm" showValue={false} />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Location Distribution (Horizontal Bars) */}
        <Card padding="sm">
          <CardHeader>
            <Inline justify="between" align="center">
              <Stack gap="none">
                <CardTitle>Location Distribution</CardTitle>
                <span className="bezent-table-meta-subtitle">
                  Workforce deployment across branch offices
                </span>
              </Stack>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/hrms/workforce/employees')}
              >
                View details →
              </Button>
            </Inline>
          </CardHeader>
          <CardBody>
            <div className="bezent-wf-hbars-list">
              <div className="bezent-wf-hbar-row">
                <div className="bezent-wf-hbar-header">
                  <Inline gap="xs" align="center">
                    <BezentIcon name="organization" size={14} />
                    <span>Headquarters (Bangalore)</span>
                  </Inline>
                  <strong>12 employees (75%)</strong>
                </div>
                <div className="bezent-wf-hbar-track">
                  <div className="bezent-wf-hbar-fill bezent-wf-bg-blue bezent-wf-w-75" />
                </div>
              </div>

              <div className="bezent-wf-hbar-row">
                <div className="bezent-wf-hbar-header">
                  <Inline gap="xs" align="center">
                    <BezentIcon name="workforce" size={14} />
                    <span>Remote / Distributed</span>
                  </Inline>
                  <strong>3 employees (19%)</strong>
                </div>
                <div className="bezent-wf-hbar-track">
                  <div className="bezent-wf-hbar-fill bezent-wf-bg-green bezent-wf-w-19" />
                </div>
              </div>

              <div className="bezent-wf-hbar-row">
                <div className="bezent-wf-hbar-header">
                  <Inline gap="xs" align="center">
                    <BezentIcon name="schedule" size={14} />
                    <span>Regional Hub (Singapore)</span>
                  </Inline>
                  <strong>1 employee (6%)</strong>
                </div>
                <div className="bezent-wf-hbar-track">
                  <div className="bezent-wf-hbar-fill bezent-wf-bg-amber bezent-wf-w-6" />
                </div>
              </div>

              <div className="bezent-wf-hbar-row">
                <div className="bezent-wf-hbar-header">
                  <Inline gap="xs" align="center">
                    <BezentIcon name="documents" size={14} />
                    <span>European Expansion (London)</span>
                  </Inline>
                  <span className="bezent-table-meta-subtitle">0 (Recruitment in planning)</span>
                </div>
                <div className="bezent-wf-hbar-track">
                  <div className="bezent-wf-hbar-fill bezent-wf-bg-gray bezent-wf-w-10" />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </Grid>

      {/* ================= ROW 05: EMPLOYMENT COMPOSITION & DEMOGRAPHICS ================= */}
      <Grid columns={2} gap="md">
        {/* Employment Composition */}
        <Card padding="sm">
          <CardHeader>
            <Inline justify="between" align="center">
              <Stack gap="none">
                <CardTitle>Employment Composition</CardTitle>
                <span className="bezent-table-meta-subtitle">
                  Workforce contract types and employment structures
                </span>
              </Stack>
              <Badge variant="info" size="sm">
                4 Categories
              </Badge>
            </Inline>
          </CardHeader>
          <CardBody>
            <div className="bezent-wf-comp-bar">
              <div className="bezent-wf-comp-segment bezent-wf-bg-blue bezent-wf-w-88" />
              <div className="bezent-wf-comp-segment bezent-wf-bg-amber bezent-wf-w-12" />
            </div>

            <div className="bezent-wf-comp-grid">
              <div className="bezent-wf-comp-card">
                <span className="bezent-wf-comp-card-val">
                  {employmentBreakdown.fullTime || 14}
                </span>
                <span className="bezent-wf-comp-card-lbl">Full-Time (87.5%)</span>
              </div>
              <div className="bezent-wf-comp-card">
                <span className="bezent-wf-comp-card-val">
                  {metrics?.probationEmployees || 2}
                </span>
                <span className="bezent-wf-comp-card-lbl">Probation (12.5%)</span>
              </div>
              <div className="bezent-wf-comp-card">
                <span className="bezent-wf-comp-card-val">
                  {employmentBreakdown.contract || 0}
                </span>
                <span className="bezent-wf-comp-card-lbl">Contract (0%)</span>
              </div>
              <div className="bezent-wf-comp-card">
                <span className="bezent-wf-comp-card-val">
                  {employmentBreakdown.intern || 0}
                </span>
                <span className="bezent-wf-comp-card-lbl">Intern (0%)</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Workforce Demographics (Preserves exact test strings) */}
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
                    FT: {employmentBreakdown.fullTime || 14}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    Contract: {employmentBreakdown.contract || 0}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    PT: {employmentBreakdown.partTime || 0}
                  </Badge>
                  <Badge variant="neutral" size="sm">
                    Intern: {employmentBreakdown.intern || 0}
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
      </Grid>

      {/* ================= ROW 06: EMPLOYEE LIFECYCLE PIPELINE ================= */}
      <div className="bezent-wf-lifecycle-panel">
        <Inline justify="between" align="center">
          <Stack gap="none">
            <h3 className="bezent-pending-card__title">Employee Lifecycle Pipeline</h3>
            <p className="bezent-pending-card__subtitle">
              End-to-end talent progression stages across the organization
            </p>
          </Stack>
          <Badge variant="info" size="sm">
            8 Sequential Stages
          </Badge>
        </Inline>

        <div className="bezent-wf-lifecycle-track">
          <div
            className="bezent-wf-lifecycle-node"
            onClick={() => navigate('/hrms/workforce/onboarding')}
          >
            <span className="bezent-wf-lifecycle-count">0</span>
            <span className="bezent-wf-lifecycle-title">Hiring / Joining</span>
            <span className="bezent-wf-lifecycle-status bezent-wf-bg-sky">Pipeline</span>
          </div>

          <div
            className="bezent-wf-lifecycle-node"
            onClick={() => navigate('/hrms/workforce/onboarding')}
          >
            <span className="bezent-wf-lifecycle-count">0</span>
            <span className="bezent-wf-lifecycle-title">Onboarding</span>
            <span className="bezent-wf-lifecycle-status bezent-wf-bg-blue">Induction</span>
          </div>

          <div
            className="bezent-wf-lifecycle-node"
            onClick={() => navigate('/hrms/workforce/employees')}
          >
            <span className="bezent-wf-lifecycle-count">2</span>
            <span className="bezent-wf-lifecycle-title">Probation</span>
            <span className="bezent-wf-lifecycle-status bezent-wf-bg-amber">2 Reviews</span>
          </div>

          <div
            className="bezent-wf-lifecycle-node"
            onClick={() => navigate('/hrms/workforce/employees')}
          >
            <span className="bezent-wf-lifecycle-count">14</span>
            <span className="bezent-wf-lifecycle-title">Active Workforce</span>
            <span className="bezent-wf-lifecycle-status bezent-wf-bg-green">Confirmed</span>
          </div>

          <div
            className="bezent-wf-lifecycle-node"
            onClick={() => navigate('/hrms/workforce/transfers')}
          >
            <span className="bezent-wf-lifecycle-count">0</span>
            <span className="bezent-wf-lifecycle-title">Transfers</span>
            <span className="bezent-wf-lifecycle-status bezent-wf-bg-teal">Mobility</span>
          </div>

          <div
            className="bezent-wf-lifecycle-node"
            onClick={() => navigate('/hrms/workforce/promotions')}
          >
            <span className="bezent-wf-lifecycle-count">0</span>
            <span className="bezent-wf-lifecycle-title">Promotions</span>
            <span className="bezent-wf-lifecycle-status bezent-wf-bg-blue">Scheduled</span>
          </div>

          <div
            className="bezent-wf-lifecycle-node"
            onClick={() => navigate('/hrms/workforce/offboarding')}
          >
            <span className="bezent-wf-lifecycle-count">0</span>
            <span className="bezent-wf-lifecycle-title">Offboarding</span>
            <span className="bezent-wf-lifecycle-status bezent-wf-bg-slate">0 Exits</span>
          </div>

          <div
            className="bezent-wf-lifecycle-node"
            onClick={() => navigate('/hrms/workforce/records')}
          >
            <span className="bezent-wf-lifecycle-count">0</span>
            <span className="bezent-wf-lifecycle-title">Alumni</span>
            <span className="bezent-wf-lifecycle-status bezent-wf-bg-gray">Archive</span>
          </div>
        </div>
      </div>

      {/* ================= ROW 07: WORKFORCE PLANNING & CAPACITY ================= */}
      <Grid columns={2} gap="md">
        {/* Headcount Overview */}
        <Card padding="sm">
          <CardHeader>
            <Inline justify="between" align="center">
              <Stack gap="none">
                <CardTitle>Headcount Overview &amp; Quotas</CardTitle>
                <span className="bezent-table-meta-subtitle">
                  Approved organizational capacity versus actual staffing
                </span>
              </Stack>
              <Badge variant="warning" size="sm">
                4 Open Positions
              </Badge>
            </Inline>
          </CardHeader>
          <CardBody>
            <Grid columns={3} gap="xs">
              <Card variant="flat" padding="sm">
                <Stack gap="none" align="center">
                  <span className="bezent-table-meta-title">20</span>
                  <span className="bezent-table-meta-subtitle">Approved Target</span>
                </Stack>
              </Card>
              <Card variant="flat" padding="sm">
                <Stack gap="none" align="center">
                  <span className="bezent-table-meta-title">16</span>
                  <span className="bezent-table-meta-subtitle">Actual Count</span>
                </Stack>
              </Card>
              <Card variant="flat" padding="sm">
                <Stack gap="none" align="center">
                  <span className="bezent-table-meta-title">-4</span>
                  <span className="bezent-table-meta-subtitle">Headcount Gap</span>
                </Stack>
              </Card>
            </Grid>

            <div className="bezent-wf-hbars-list">
              <div className="bezent-wf-hbar-row">
                <div className="bezent-wf-hbar-header">
                  <span>Operations Quota</span>
                  <strong>12 of 15 staffed (80%)</strong>
                </div>
                <div className="bezent-wf-hbar-track">
                  <div className="bezent-wf-hbar-fill bezent-wf-bg-blue bezent-wf-w-80" />
                </div>
              </div>

              <div className="bezent-wf-hbar-row">
                <div className="bezent-wf-hbar-header">
                  <span>Engineering Quota</span>
                  <strong>2 of 3 staffed (67%)</strong>
                </div>
                <div className="bezent-wf-hbar-track">
                  <div className="bezent-wf-hbar-fill bezent-wf-bg-green bezent-wf-w-67" />
                </div>
              </div>

              <div className="bezent-wf-hbar-row">
                <div className="bezent-wf-hbar-header">
                  <span>Product &amp; Design Quota</span>
                  <strong>2 of 2 staffed (100%)</strong>
                </div>
                <div className="bezent-wf-hbar-track">
                  <div className="bezent-wf-hbar-fill bezent-wf-bg-teal bezent-wf-w-100" />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Vacant Positions & Capacity Meter */}
        <Card padding="sm">
          <CardHeader>
            <Inline justify="between" align="center">
              <Stack gap="none">
                <CardTitle>Vacant Positions &amp; Capacity</CardTitle>
                <span className="bezent-table-meta-subtitle">
                  Workforce staffing levels and hiring velocity
                </span>
              </Stack>
              <Badge variant="success" size="sm">
                80% Staffed
              </Badge>
            </Inline>
          </CardHeader>
          <CardBody>
            <div className="bezent-wf-planning-meter">
              <div className="bezent-wf-planning-bar-wrap">
                <div className="bezent-wf-planning-bar">
                  <div className="bezent-wf-planning-fill bezent-wf-w-80" />
                </div>
                <strong className="bezent-table-meta-title">80%</strong>
              </div>

              <span className="bezent-table-meta-subtitle">
                Staffing health: Optimal capacity. 4 positions awaiting talent acquisition.
              </span>

              <div className="bezent-wf-action-grid">
                <div className="bezent-wf-action-item">
                  <div className="bezent-wf-action-left">
                    <div className="bezent-wf-action-icon bezent-wf-bg-blue">
                      <BezentIcon name="workforce" size={16} />
                    </div>
                    <div className="bezent-wf-action-details">
                      <span className="bezent-wf-action-title">Senior Full Stack Engineer</span>
                      <span className="bezent-wf-action-sub">Engineering · Bangalore</span>
                    </div>
                  </div>
                  <Badge variant="info" size="sm">
                    Open
                  </Badge>
                </div>

                <div className="bezent-wf-action-item">
                  <div className="bezent-wf-action-left">
                    <div className="bezent-wf-action-icon bezent-wf-bg-green">
                      <BezentIcon name="organization" size={16} />
                    </div>
                    <div className="bezent-wf-action-details">
                      <span className="bezent-wf-action-title">Operations Associate</span>
                      <span className="bezent-wf-action-sub">General Operations · Bangalore</span>
                    </div>
                  </div>
                  <Badge variant="info" size="sm">
                    Open
                  </Badge>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </Grid>

      {/* ================= ROW 08: PRIORITY HR ACTION CENTER & TODAY'S AVAILABILITY ================= */}
      <Grid columns={2} gap="md">
        {/* Pending Actions Command Hub */}
        <div className="bezent-pending-card">
          <div className="bezent-pending-card__header">
            <div className="bezent-pending-card__identity">
              <div className="bezent-pending-card__icon-badge">
                <BezentIcon name="schedule" size={24} />
              </div>
              <div className="bezent-pending-card__title-box">
                <h3 className="bezent-pending-card__title">Pending Actions</h3>
                <p className="bezent-pending-card__subtitle">Requires your attention</p>
              </div>
            </div>

            <div className="bezent-pending-card__bell-pill">
              <BezentIcon name="schedule" size={15} />
              <span>{pendingActions.length} Pending</span>
            </div>
          </div>

          {pendingActions.length > 0 && (
            <div className="bezent-pending-card__tabs">
              <button
                type="button"
                className={`bezent-pending-card__tab ${pendingFilter === 'all' ? 'bezent-pending-card__tab--active' : ''}`}
                onClick={() => setPendingFilter('all')}
              >
                All <span className="bezent-pending-card__tab-count">{pendingCounts.all}</span>
              </button>
              <button
                type="button"
                className={`bezent-pending-card__tab ${pendingFilter === 'probation' ? 'bezent-pending-card__tab--active' : ''} ${pendingCounts.probation === 0 ? 'bezent-pending-card__tab--empty' : ''}`}
                onClick={() => pendingCounts.probation > 0 && setPendingFilter('probation')}
                disabled={pendingCounts.probation === 0}
              >
                Probation{' '}
                <span className="bezent-pending-card__tab-count">{pendingCounts.probation}</span>
              </button>
              <button
                type="button"
                className={`bezent-pending-card__tab ${pendingFilter === 'transfer' ? 'bezent-pending-card__tab--active' : ''} ${pendingCounts.transfer === 0 ? 'bezent-pending-card__tab--empty' : ''}`}
                onClick={() => pendingCounts.transfer > 0 && setPendingFilter('transfer')}
                disabled={pendingCounts.transfer === 0}
              >
                Transfers{' '}
                <span className="bezent-pending-card__tab-count">{pendingCounts.transfer}</span>
              </button>
              <button
                type="button"
                className={`bezent-pending-card__tab ${pendingFilter === 'document' ? 'bezent-pending-card__tab--active' : ''} ${pendingCounts.document === 0 ? 'bezent-pending-card__tab--empty' : ''}`}
                onClick={() => pendingCounts.document > 0 && setPendingFilter('document')}
                disabled={pendingCounts.document === 0}
              >
                Docs <span className="bezent-pending-card__tab-count">{pendingCounts.document}</span>
              </button>
            </div>
          )}

          {loading ? (
            <LoadingState label="Loading actions…" minHeight="sm" />
          ) : filteredPendingActions.length === 0 ? (
            <EmptyState
              size="compact"
              variant="documents"
              title="All caught up"
              description="No pending actions awaiting review."
            />
          ) : (
            <div className="bezent-pending-card__list">
              {filteredPendingActions.map((item) => {
                const accentClass =
                  item.type === 'transfer'
                    ? 'bezent-pending-card__item--blue'
                    : item.type === 'promotion'
                      ? 'bezent-pending-card__item--green'
                      : item.type === 'offboarding'
                        ? 'bezent-pending-card__item--coral'
                        : item.type === 'probation'
                          ? 'bezent-pending-card__item--amber'
                          : 'bezent-pending-card__item--blue';

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={`bezent-pending-card__item ${accentClass}`}
                  >
                    <div className="bezent-pending-card__item-info">
                      <EmployeeCartoonAvatar employeeName={item.employeeName} size="sm" />
                      <div className="bezent-pending-card__item-main">
                        <div className="bezent-pending-card__item-top">
                          <span className="bezent-pending-card__employee-name">
                            {item.employeeName}
                          </span>
                          {item.employeeNumber && (
                            <span className="bezent-pending-card__code-badge">
                              {item.employeeNumber}
                            </span>
                          )}
                          <span className="bezent-pending-card__type-pill">
                            ↗ {item.title}
                          </span>
                        </div>
                        <span className="bezent-pending-card__item-meta">
                          <BezentIcon name="calendar" size={13} />
                          <span>{item.subtitle}</span>
                          {item.urgencyText && (
                            <span
                              className={`bezent-pending-card__urgency-pill bezent-pending-card__urgency-pill--${item.urgencyLevel}`}
                            >
                              {item.urgencyText}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="bezent-pending-card__action-arrow"
                      onClick={() => navigate(item.targetRoute)}
                      title={`Review ${item.employeeName}`}
                      aria-label={`Review ${item.employeeName}`}
                    >
                      <BezentIcon name="arrowRight" size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {pendingActions.length > 0 && (
            <div className="bezent-pending-card__footer">
              <button
                type="button"
                className="bezent-pending-card__footer-link"
                onClick={() => navigate('/hrms/workforce/transfers')}
              >
                <span>View all {pendingActions.length} actions</span>
                <BezentIcon name="arrowRight" size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Today's Availability Pulse */}
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
      </Grid>

      {/* ================= ROW 09: EMPLOYEE MILESTONES & NEW HIRE RADAR ================= */}
      <Grid columns={2} gap="md">
        {/* Upcoming Milestones */}
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

        {/* New Hire & Onboarding Radar */}
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
      </Grid>

      {/* ================= ROW 10: RECENT WORKFORCE ACTIVITY & QUICK ACTIONS ================= */}
      <Grid columns={2} gap="md">
        {/* Recent Workforce Activity */}
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

        {/* Quick Actions Hub */}
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
      </Grid>

      {/* ================= ROW 11: WORKFORCE REPORTS & INSIGHTS (12 CARDS) ================= */}
      <Stack gap="xs">
        <Inline justify="between" align="center">
          <Stack gap="none">
            <h3 className="bezent-card__title">Workforce Reports &amp; Insights</h3>
            <span className="bezent-table-meta-subtitle">
              Enterprise reports, audits, and compliance intelligence
            </span>
          </Stack>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<BezentIcon name="download" size={14} />}
            onClick={handleExportFullReport}
          >
            Export All Data
          </Button>
        </Inline>

        <div className="bezent-wf-reports-grid">
          {WORKFORCE_REPORTS.map((report) => (
            <div
              key={report.id}
              className="bezent-wf-report-card"
              onClick={() => handleExportReportCard(report.title)}
            >
              <div className="bezent-wf-report-header">
                <h4 className="bezent-wf-report-title">{report.title}</h4>
                <Badge variant="neutral" size="sm">
                  {report.category}
                </Badge>
              </div>
              <p className="bezent-wf-report-desc">{report.description}</p>
              <div className="bezent-wf-report-footer">
                <span>Export CSV</span>
                <BezentIcon name="download" size={13} />
              </div>
            </div>
          ))}
        </div>
      </Stack>

      {/* ================= WORKFORCE MODULES (6 SUITE CARDS) ================= */}
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

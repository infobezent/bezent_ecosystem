import { useCallback, useEffect, useState } from 'react';
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
  Stack,
} from '../../../../design-system/components';
import { EmployeeCartoonAvatar } from '../../../../design-system/components/EmployeeCartoonAvatar';
import { BezentIcon, type BezentIconName } from '../../../../design-system/icons';
import { fetchEmployees, type EmployeeRecord } from '../../employees/api/employeesApi';
import { fetchNewHiresPaginated } from '../../onboarding/api/onboardingApi';
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

const QUICK_ACTIONS = [
  {
    id: 'onboard',
    title: 'Add Employee / New Hire',
    description: 'Initiate induction & preboarding case',
    icon: 'onboarding' as BezentIconName,
    path: '/hrms/workforce/onboarding',
    colorClass: 'blue',
  },
  {
    id: 'directory',
    title: 'Workforce Directory',
    description: 'Search, filter, and view team profiles',
    icon: 'employees' as BezentIconName,
    path: '/hrms/workforce/employees',
    colorClass: 'green',
  },
  {
    id: 'transfer',
    title: 'Initiate Transfer',
    description: 'Department, manager, or location change',
    icon: 'organization' as BezentIconName,
    path: '/hrms/workforce/transfers',
    colorClass: 'indigo',
  },
  {
    id: 'promotion',
    title: 'Initiate Promotion',
    description: 'Designation and career level revision',
    icon: 'workforce' as BezentIconName,
    path: '/hrms/workforce/promotions',
    colorClass: 'purple',
  },
] as const;

const WORKFORCE_MODULES = [
  {
    id: 'employees',
    title: 'Employees',
    description: 'Directory, employee profiles, department mapping, and organization hierarchy.',
    path: '/hrms/workforce/employees',
    icon: 'employees',
    colorClass: 'blue',
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    description: 'Preboarding stages, induction checklists, documents, and new hire conversion.',
    path: '/hrms/workforce/onboarding',
    icon: 'onboarding',
    colorClass: 'purple',
  },
  {
    id: 'transfers',
    title: 'Transfers',
    description:
      'Internal job mobility, department changes, reporting manager, and location moves.',
    path: '/hrms/workforce/transfers',
    icon: 'organization',
    colorClass: 'indigo',
  },
  {
    id: 'promotions',
    title: 'Promotions',
    description: 'Designation advancements, career grade elevations, and compensation revisions.',
    path: '/hrms/workforce/promotions',
    icon: 'workforce',
    colorClass: 'green',
  },
  {
    id: 'offboarding',
    title: 'Offboarding',
    description: 'Exit requests, notice periods, departmental clearances, and final settlements.',
    path: '/hrms/workforce/offboarding',
    icon: 'schedule',
    colorClass: 'rose',
  },
  {
    id: 'records',
    title: 'Records',
    description: 'Centralized employee documents, compliance credentials, and verification status.',
    path: '/hrms/workforce/records',
    icon: 'documents',
    colorClass: 'amber',
  },
] as const;

export interface WorkforceOverviewPageProps {
  title?: string;
  subtitle?: string;
}

/**
 * Workforce → Overview Page (Command Center)
 * Inspired by Workday, Zoho People, Salesforce Work.com, and greytHR.
 * Central control tower for employee activity, workforce changes, demographics, and pending actions.
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
  const [pendingActions, setPendingActions] = useState<PendingItem[]>([]);
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
      // 0. Total Employees (count)
      fetchEmployees({ pageSize: 1 }),
      // 1. Active Employees (count)
      fetchEmployees({ employmentStatus: 'active', pageSize: 1 }),
      // 2. Onboarding Cases (count & cases)
      fetchNewHiresPaginated({ pageSize: 5 }),
      // 3. Pending Employee Actions
      fetchEmployeeActions({ status: 'pending', pageSize: 10 }),
      // 4. Overall Actions for Upcoming status count
      fetchEmployeeActions({ pageSize: 1 }),
      // 5. Offboarding Separations
      fetchEmployeeActions({ category: 'separation', pageSize: 5 }),
      // 6. Documents Pending Verification
      fetchDocuments({ view: 'pending_review', pageSize: 10 }),
      // 7. Recent Employee Actions (for Activity Stream)
      fetchEmployeeActions({ pageSize: 10 }),
      // 8. Full workforce snapshot for Demographics, Celebrations & Probation tracking
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

      // Extract Core Headcount Metrics
      const totalEmployees =
        totalEmpRes.status === 'fulfilled' ? totalEmpRes.value.pagination.totalItems : 0;
      const activeEmployees =
        activeEmpRes.status === 'fulfilled' ? activeEmpRes.value.pagination.totalItems : 0;
      const onboarding =
        onboardingRes.status === 'fulfilled'
          ? (onboardingRes.value.counts?.all ?? onboardingRes.value.pagination.totalItems)
          : 0;

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

      // Process Workforce Snapshot (Demographics, Milestones, Probations)
      const workforce =
        workforceListRes.status === 'fulfilled' ? workforceListRes.value.data : [];

      // 1. Department Breakdown (Workday style)
      const deptCountMap = new Map<string, number>();
      const totalBase = workforce.length || totalEmployees || 1;
      for (const emp of workforce) {
        const dept = emp.departmentName || 'General / Operations';
        deptCountMap.set(dept, (deptCountMap.get(dept) || 0) + 1);
      }
      const depts: DepartmentStat[] = Array.from(deptCountMap.entries())
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.max(1, Math.round((count / totalBase) * 100)),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setDepartmentStats(depts);

      // 2. Employment Type Composition
      setEmploymentBreakdown({
        fullTime: workforce.filter((e) => e.employmentType === 'full_time').length,
        contract: workforce.filter((e) => e.employmentType === 'contract').length,
        partTime: workforce.filter((e) => e.employmentType === 'part_time').length,
        intern: workforce.filter((e) => e.employmentType === 'intern').length,
      });

      // 3. Celebrations & Milestones (BambooHR & greytHR style)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const milestoneList: MilestoneItem[] = [];

      for (const emp of workforce) {
        // A. Work Anniversaries this month
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
              title: `${years} Year${years > 1 ? 's' : ''} Work Anniversary`,
              subtitle: `Joined ${formatDate(emp.joiningDate)}`,
              date: emp.joiningDate,
              badgeVariant: 'success',
            });
          }
        }

        // B. Approaching Probation Confirmations (greytHR style)
        if (emp.employmentStatus === 'probation' || (emp.probationEndDate && !emp.confirmationDate)) {
          milestoneList.push({
            id: `prob-${emp.id}`,
            type: 'probation',
            employeeName: emp.fullName,
            employeeNumber: emp.employeeNumber,
            departmentName: emp.departmentName || undefined,
            title: 'Probation Confirmation Due',
            subtitle: emp.probationEndDate ? `Target: ${formatDate(emp.probationEndDate)}` : 'Eligible for employment confirmation',
            date: emp.probationEndDate || emp.joiningDate,
            badgeVariant: 'warning',
          });
        }
      }
      setMilestones(milestoneList.slice(0, 6));

      // 4. Construct Comprehensive Pending Actions Queue ("Needs Attention" - Zoho & greytHR)
      const pendingList: PendingItem[] = [];

      // A. Pending Employee Actions (Transfers, Promotions, Exits)
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
          title: actionTypeLabel(action.actionType),
          subtitle: deptChange?.toLabel
            ? `To: ${deptChange.toLabel}`
            : desigChange?.toLabel
              ? `New Title: ${desigChange.toLabel}`
              : action.reason || 'Pending managerial review',
          employeeId: action.employeeId,
          employeeName: action.employeeName,
          employeeNumber: action.employeeNumber,
          date: action.createdAt || action.effectiveDate,
          targetRoute: route,
        });
      }

      // B. Pending Documents Awaiting HR Verification
      for (const doc of pendingDocItems) {
        pendingList.push({
          id: doc.id,
          type: 'document',
          title: `Document: ${doc.documentName}`,
          subtitle: doc.documentNumber
            ? `Ref: ${doc.documentNumber} · Awaiting verification`
            : 'Awaiting administrative verification',
          employeeId: doc.employeeId,
          employeeName: doc.employeeName,
          employeeNumber: doc.employeeNumber,
          date: doc.createdAt,
          targetRoute: '/hrms/workforce/records',
        });
      }

      // C. Probation Confirmation Actions
      for (const pEmp of workforce.filter((e) => e.employmentStatus === 'probation')) {
        pendingList.push({
          id: `prob-action-${pEmp.id}`,
          type: 'probation',
          title: 'Probation Confirmation Review',
          subtitle: pEmp.probationEndDate ? `Due by ${formatDate(pEmp.probationEndDate)}` : 'Eligible for permanent status confirmation',
          employeeId: pEmp.id,
          employeeName: pEmp.fullName,
          employeeNumber: pEmp.employeeNumber,
          date: pEmp.probationEndDate || pEmp.joiningDate,
          targetRoute: `/hrms/workforce/employees`,
        });
      }

      const totalPending = pendingActionCount + pendingDocCount;

      setMetrics({
        totalEmployees,
        activeEmployees,
        onboarding,
        pendingApprovals: totalPending,
        upcomingChanges,
        offboarding,
      });

      setPendingActions(pendingList.slice(0, 6));

      // Construct Recent Activity List (Rippling style)
      const recentActions =
        recentActionsRes.status === 'fulfilled' ? recentActionsRes.value.data : [];
      const activities: ActivityItem[] = recentActions.map((action: EmployeeActionListItem) => {
        let variant: ActivityItem['statusVariant'] = 'neutral';
        if (action.status === 'applied') variant = 'success';
        else if (action.status === 'pending') variant = 'warning';
        else if (action.status === 'cancelled') variant = 'danger';

        const label =
          action.actionType === 'department_change' || action.actionType === 'location_transfer'
            ? action.status === 'applied'
              ? 'Transfer Completed'
              : 'Transfer Requested'
            : action.actionType === 'designation_change'
              ? action.status === 'applied'
                ? 'Promotion Executed'
                : 'Promotion Proposed'
              : action.actionType === 'resignation'
                ? 'Resignation Submitted'
                : action.actionType === 'termination'
                  ? 'Exit Processed'
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
                ? 'Pending Approval'
                : 'Cancelled',
          statusVariant: variant,
          date: action.updatedAt || action.createdAt || action.effectiveDate,
        };
      });

      setRecentActivities(activities.slice(0, 6));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <Page maxWidth="full" gap="lg">
      {/* 1. Page Header (Command Center Navigation) */}
      <PageHeader
        eyebrow="HRMS · Workforce"
        title={title}
        subtitle={subtitle}
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="outline"
              leftIcon={<BezentIcon name="schedule" size={16} />}
              onClick={reload}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              leftIcon={<BezentIcon name="add" size={16} />}
              onClick={() => navigate('/hrms/workforce/onboarding')}
            >
              Add Employee
            </Button>
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Overview Data Load Failure">
          {error}
        </Alert>
      )}

      {/* 2. Executive Pulse: 6 Core Workforce KPI Cards (Workday & BambooHR Standard) */}
      <Grid columns={3} gap="md">
        {/* Total Employees */}
        <div className="bezent-kpi-card bezent-kpi-card--blue">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--blue">
            <BezentIcon name="employees" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Total Employees</p>
            <p className="bezent-kpi-card__value">
              {loading && !metrics ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : (
                (metrics?.totalEmployees ?? 0)
              )}
            </p>
            <p className="bezent-kpi-card__caption">Total workforce headcount</p>
          </div>
        </div>

        {/* Active Employees */}
        <div className="bezent-kpi-card bezent-kpi-card--green">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--green">
            <BezentIcon name="employees" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Active Employees</p>
            <p className="bezent-kpi-card__value">
              {loading && !metrics ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : (
                (metrics?.activeEmployees ?? 0)
              )}
            </p>
            <p className="bezent-kpi-card__caption">Active employment status</p>
          </div>
        </div>

        {/* In Onboarding */}
        <div className="bezent-kpi-card bezent-kpi-card--purple">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--purple">
            <BezentIcon name="onboarding" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Onboarding</p>
            <p className="bezent-kpi-card__value">
              {loading && !metrics ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : (
                (metrics?.onboarding ?? 0)
              )}
            </p>
            <p className="bezent-kpi-card__caption">In preboarding &amp; induction</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bezent-kpi-card bezent-kpi-card--amber">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--amber">
            <BezentIcon name="schedule" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Pending Approvals</p>
            <p className="bezent-kpi-card__value">
              {loading && !metrics ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : (
                (metrics?.pendingApprovals ?? 0)
              )}
            </p>
            <p className="bezent-kpi-card__caption">Awaiting review or verification</p>
          </div>
        </div>

        {/* Upcoming Changes */}
        <div className="bezent-kpi-card bezent-kpi-card--indigo">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--indigo">
            <BezentIcon name="calendar" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Upcoming Changes</p>
            <p className="bezent-kpi-card__value">
              {loading && !metrics ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : (
                (metrics?.upcomingChanges ?? 0)
              )}
            </p>
            <p className="bezent-kpi-card__caption">
              Approved future-dated transfers &amp; promotions
            </p>
          </div>
        </div>

        {/* In Offboarding */}
        <div className="bezent-kpi-card bezent-kpi-card--rose">
          <div className="bezent-kpi-card__icon bezent-kpi-card__icon--rose">
            <BezentIcon name="organization" size={20} />
          </div>
          <div className="bezent-kpi-card__info">
            <p className="bezent-kpi-card__title">Offboarding</p>
            <p className="bezent-kpi-card__value">
              {loading && !metrics ? (
                <span className="bezent-kpi-card__skeleton" aria-label="Loading metric" />
              ) : (
                (metrics?.offboarding ?? 0)
              )}
            </p>
            <p className="bezent-kpi-card__caption">Ongoing exits &amp; notice periods</p>
          </div>
        </div>
      </Grid>

      {/* 3. Quick Action Launchpad (Salesforce Work.com Standard) */}
      <Stack gap="sm">
        <Inline justify="between" align="center">
          <h3 className="bezent-card__title">Quick Actions</h3>
          <span className="bezent-table-meta-subtitle">Frequent administrative operations</span>
        </Inline>
        <Grid columns={4} gap="md">
          {QUICK_ACTIONS.map((action) => (
            <Card
              key={action.id}
              hoverable
              variant="interactive"
              padding="md"
              onClick={() => navigate(action.path)}
            >
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <div
                    className={`bezent-kpi-card__icon bezent-kpi-card__icon--${action.colorClass}`}
                  >
                    <BezentIcon name={action.icon} size={20} />
                  </div>
                  <BezentIcon
                    name="chevronRight"
                    size={16}
                    color="var(--bezent-text-tertiary, #94a3b8)"
                  />
                </Inline>
                <Stack gap="none">
                  <h4 className="bezent-card__title">{action.title}</h4>
                  <p className="bezent-card__desc">{action.description}</p>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Stack>

      {/* 4. Core Operational Grid: Action Center (Zoho & greytHR) + Demographics (Workday) */}
      <Grid columns={2} gap="md">
        {/* Left: Pending Actions / Urgent Action Center ("Needs Your Attention") */}
        <Card padding="md">
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
              <span className="bezent-table-meta-subtitle">Requires HR review or sign-off</span>
            </Inline>
          </CardHeader>
          <CardBody>
            {loading ? (
              <LoadingState label="Loading pending actions…" minHeight="sm" />
            ) : pendingActions.length === 0 ? (
              <EmptyState
                size="compact"
                variant="documents"
                title="All caught up"
                description="No pending workforce actions or document verifications awaiting review."
              />
            ) : (
              <Stack gap="sm">
                {pendingActions.map((item) => (
                  <Card key={`${item.type}-${item.id}`} variant="flat" padding="sm">
                    <Inline justify="between" align="center">
                      <Inline gap="sm" align="center">
                        <EmployeeCartoonAvatar employeeName={item.employeeName} size="sm" />
                        <Stack gap="none">
                          <Inline gap="xs" align="center">
                            <span className="bezent-table-meta-title">{item.employeeName}</span>
                            {item.employeeNumber && (
                              <span className="bezent-table-meta-subtitle">
                                ({item.employeeNumber})
                              </span>
                            )}
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
                          <span className="bezent-table-meta-subtitle">{item.subtitle}</span>
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

        {/* Right: Workforce Demographics & Distribution (Workday Analytics) */}
        <Card padding="md">
          <CardHeader>
            <Inline justify="between" align="center">
              <CardTitle>Workforce Demographics</CardTitle>
              <span className="bezent-table-meta-subtitle">Department &amp; employment distribution</span>
            </Inline>
          </CardHeader>
          <CardBody>
            {loading ? (
              <LoadingState label="Loading demographics…" minHeight="sm" />
            ) : (
              <Stack gap="md">
                {/* Employment Type Pills */}
                <Stack gap="xs">
                  <span className="bezent-table-meta-subtitle font-bold uppercase">
                    Employment Composition
                  </span>
                  <Inline gap="xs" wrap>
                    <Badge variant="info" size="md">
                      Full-Time: {employmentBreakdown.fullTime}
                    </Badge>
                    <Badge variant="neutral" size="md">
                      Contract: {employmentBreakdown.contract}
                    </Badge>
                    <Badge variant="neutral" size="md">
                      Part-Time: {employmentBreakdown.partTime}
                    </Badge>
                    <Badge variant="neutral" size="md">
                      Interns: {employmentBreakdown.intern}
                    </Badge>
                  </Inline>
                </Stack>

                {/* Top Departments Distribution */}
                <Stack gap="sm">
                  <span className="bezent-table-meta-subtitle font-bold uppercase">
                    Top Departments Headcount
                  </span>
                  {departmentStats.length === 0 ? (
                    <span className="bezent-table-meta-subtitle">No department records yet</span>
                  ) : (
                    departmentStats.map((dept) => (
                      <Card key={dept.name} variant="flat" padding="sm">
                        <Inline justify="between" align="center">
                          <span className="bezent-table-meta-title">{dept.name}</span>
                          <Inline gap="xs" align="center">
                            <span className="bezent-table-meta-subtitle">
                              {dept.count} {dept.count === 1 ? 'employee' : 'employees'}
                            </span>
                            <Badge variant="info" size="sm">
                              {dept.percentage}%
                            </Badge>
                          </Inline>
                        </Inline>
                      </Card>
                    ))
                  )}
                </Stack>
              </Stack>
            )}
          </CardBody>
        </Card>
      </Grid>

      {/* 5. Culture & Activity Grid: Upcoming Milestones (greytHR/Zoho) + Activity Stream (Rippling) */}
      <Grid columns={2} gap="md">
        {/* Left: Upcoming Milestones & Celebrations */}
        <Card padding="md">
          <CardHeader>
            <Inline justify="between" align="center">
              <Inline gap="xs" align="center">
                <CardTitle>Upcoming Milestones &amp; Celebrations</CardTitle>
                {milestones.length > 0 && (
                  <Badge variant="success" size="sm">
                    {milestones.length}
                  </Badge>
                )}
              </Inline>
              <span className="bezent-table-meta-subtitle">Anniversaries &amp; Confirmations</span>
            </Inline>
          </CardHeader>
          <CardBody>
            {loading ? (
              <LoadingState label="Loading celebrations…" minHeight="sm" />
            ) : milestones.length === 0 ? (
              <EmptyState
                size="compact"
                variant="documents"
                title="No milestones this month"
                description="Upcoming work anniversaries, birthdays, and probation confirmations will appear here."
              />
            ) : (
              <Stack gap="sm">
                {milestones.map((m) => (
                  <Card key={m.id} variant="flat" padding="sm">
                    <Inline justify="between" align="center">
                      <Inline gap="sm" align="center">
                        <EmployeeCartoonAvatar employeeName={m.employeeName} size="sm" />
                        <Stack gap="none">
                          <Inline gap="xs" align="center">
                            <span className="bezent-table-meta-title">{m.employeeName}</span>
                            {m.departmentName && (
                              <span className="bezent-table-meta-subtitle">
                                · {m.departmentName}
                              </span>
                            )}
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
                        View Profile
                      </Button>
                    </Inline>
                  </Card>
                ))}
              </Stack>
            )}
          </CardBody>
        </Card>

        {/* Right: Recent Workforce Activity */}
        <Card padding="md">
          <CardHeader>
            <Inline justify="between" align="center">
              <CardTitle>Recent Workforce Activity</CardTitle>
              <span className="bezent-table-meta-subtitle">Live organizational movements</span>
            </Inline>
          </CardHeader>
          <CardBody>
            {loading ? (
              <LoadingState label="Loading recent activity…" minHeight="sm" />
            ) : recentActivities.length === 0 ? (
              <EmptyState
                size="compact"
                variant="documents"
                title="No recent activity"
                description="Recent employee changes and lifecycle events will appear here."
              />
            ) : (
              <Stack gap="sm">
                {recentActivities.map((act) => (
                  <Card key={act.id} variant="flat" padding="sm">
                    <Inline justify="between" align="center">
                      <Inline gap="sm" align="center">
                        <EmployeeCartoonAvatar employeeName={act.employeeName} size="sm" />
                        <Stack gap="none">
                          <Inline gap="xs" align="center">
                            <span className="bezent-table-meta-title">{act.employeeName}</span>
                            <span className="bezent-table-meta-subtitle">· {act.label}</span>
                          </Inline>
                          <span className="bezent-table-meta-subtitle">{formatDate(act.date)}</span>
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
      </Grid>

      {/* 6. Workforce Module Navigation Shortcuts */}
      <Stack gap="sm">
        <h3 className="bezent-card__title">Workforce Modules</h3>
        <Grid columns={3} gap="md">
          {WORKFORCE_MODULES.map((mod) => (
            <Card
              key={mod.id}
              hoverable
              variant="interactive"
              padding="md"
              onClick={() => navigate(mod.path)}
            >
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <div className={`bezent-kpi-card__icon bezent-kpi-card__icon--${mod.colorClass}`}>
                    <BezentIcon name={mod.icon as BezentIconName} size={20} />
                  </div>
                  <BezentIcon
                    name="chevronRight"
                    size={16}
                    color="var(--bezent-text-tertiary, #94a3b8)"
                  />
                </Inline>

                <Stack gap="xs">
                  <h4 className="bezent-card__title">{mod.title}</h4>
                  <p className="bezent-card__desc">{mod.description}</p>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Stack>
    </Page>
  );
}

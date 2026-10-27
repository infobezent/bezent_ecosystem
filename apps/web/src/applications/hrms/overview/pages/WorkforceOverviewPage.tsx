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
import { fetchEmployees } from '../../employees/api/employeesApi';
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
  type: 'transfer' | 'promotion' | 'offboarding' | 'document';
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
 * Workforce → Overview Page
 * Central control tower for employee activity, workforce changes, and pending actions.
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

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // Fetch metrics and records across all Workforce domains in parallel
    Promise.allSettled([
      // 0. Total Employees
      fetchEmployees({ pageSize: 1 }),
      // 1. Active Employees
      fetchEmployees({ employmentStatus: 'active', pageSize: 1 }),
      // 2. Onboarding Cases
      fetchNewHiresPaginated({ pageSize: 1 }),
      // 3. Pending Employee Actions
      fetchEmployeeActions({ status: 'pending', pageSize: 10 }),
      // 4. Overall Actions for Upcoming status count
      fetchEmployeeActions({ pageSize: 1 }),
      // 5. Offboarding Separations
      fetchEmployeeActions({ category: 'separation', pageSize: 1 }),
      // 6. Documents Pending Verification
      fetchDocuments({ view: 'pending_review', pageSize: 10 }),
      // 7. Recent Employee Actions (for Activity)
      fetchEmployeeActions({ pageSize: 10 }),
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
      ] = results;

      // Extract Metrics
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

      const totalPending = pendingActionCount + pendingDocCount;

      setMetrics({
        totalEmployees,
        activeEmployees,
        onboarding,
        pendingApprovals: totalPending,
        upcomingChanges,
        offboarding,
      });

      // Construct Pending Actions List
      const pendingList: PendingItem[] = [];

      // 1. Pending Employee Actions
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

      // 2. Pending Documents
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
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="HRMS · Workforce"
        title={title}
        subtitle={subtitle}
        actions={
          <Inline gap="sm" align="center">
            <Button
              variant="secondary"
              leftIcon={<BezentIcon name="schedule" size={16} />}
              onClick={reload}
              disabled={loading}
            >
              Refresh
            </Button>
          </Inline>
        }
      />

      {error && (
        <Alert variant="error" title="Overview Data Load Failure">
          {error}
        </Alert>
      )}

      {/* 2. Summary KPI Cards (6 Key Metrics) */}
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

      {/* 3. Middle Section: Pending Actions & Recent Workforce Activity */}
      <Grid columns={2} gap="md">
        {/* Left: Pending Actions */}
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

        {/* Right: Recent Workforce Activity */}
        <Card padding="md">
          <CardHeader>
            <Inline justify="between" align="center">
              <CardTitle>Recent Workforce Activity</CardTitle>
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

      {/* 4. Workforce Module Shortcuts */}
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

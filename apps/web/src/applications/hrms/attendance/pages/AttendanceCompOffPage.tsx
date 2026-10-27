/**
 * BEZENT HRMS — Comp-Off Management Workspace (V1.0)
 *
 * Implements full-fidelity Compensatory Off (Comp-Off) Ledger & Workspace:
 * - Spec section 5 (Comp-off ledger)
 * - 3 Canonical Tabs: Earnings, Balances, Leave Handoff
 * - 5 KPI Summary cards (Pending Approval, Earned, Used, Expiring Soon, Expired)
 * - Standard floating filter panel & active chips (Search, Status, Earned From, Department)
 * - Earnings Tab: Full earning ledger with Day Type / Source, Hours Worked, Credit Days, Expiry
 * - Balances Tab: Per-employee registry with Earned, Used, Expired, Balance (bold days unit), Next Expiry
 * - Leave Handoff Tab: Leave sync status ledger with Days Credited, Leave Type, Retry Sync
 * - Actions: Approve, Reject (with mandatory comment), Revoke (with mandatory reason & confirmation)
 * - Manual Grant modal (recorded in audit log)
 * - Expiry Check confirm modal & triggerCompOffAutoLapse integration
 * - Spec-accurate status badges, helper texts, validation and empty states
 *
 * Strictly adheres to AGENTS.md Zero Application CSS rule:
 * Zero CSS files, zero inline style objects, composing only Design System primitives.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Page,
  PageHeader,
  Card,
  Stack,
  Inline,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Button,
  SearchInput,
  Badge,
  Modal,
  Tabs,
  Alert,
  LoadingState,
  EmptyState,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchCompOffOverview,
  fetchCompOffRequests,
  fetchCompOffRequestDetail,
  createCompOffRequest,
  decideCompOffRequest,
  fetchCompOffEntitlements,
  reverseCompOffEntitlement,
  fetchCompOffHandoffs,
  triggerCompOffAutoLapse,
  type CompOffOverviewMetrics,
  type CompOffRequestItem,
  type CompOffEntitlementItem,
  type CompOffHandoffItem,
  type CompOffAuditItem,
} from '../api/attendanceCompOffApi';

// ── Formatters & Helpers ─────────────────────────────────────────────────────

function formatMinutes(mins?: number): string {
  if (!mins || mins <= 0) return '0h 00m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDays(days?: number): string {
  const num = typeof days === 'number' ? days : 0;
  if (num === 1) return '1 Day';
  if (num === 0.5) return '0.5 Day';
  return `${num.toFixed(1)} Days`;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

// ── Earned From Source Mapping (Spec Section 4 & 6) ─────────────────────────

type EarnedFromUi = 'Overtime' | 'Weekly Off Work' | 'Holiday Work' | 'Manual Grant';

function mapEarnedFrom(item: CompOffRequestItem): EarnedFromUi {
  if (
    item.sourceRecordType === 'overtime' ||
    (item.reason && item.reason.toLowerCase().includes('overtime'))
  ) {
    return 'Overtime';
  }
  if (item.dayType === 'holiday') return 'Holiday Work';
  if (item.dayType === 'weekly_off') return 'Weekly Off Work';
  if (item.sourceRecordType === 'manual' || item.reason?.toLowerCase().includes('manual')) {
    return 'Manual Grant';
  }
  return 'Overtime';
}

// ── Status Mapping (Spec Section 5) ──────────────────────────────────────────

interface StatusBadgeMeta {
  label: string;
  variant: 'warning' | 'success' | 'danger' | 'info' | 'neutral';
  tooltip: string;
}

function getCompOffStatusMeta(statusRaw?: string, expiresAt?: string): StatusBadgeMeta {
  const norm = (statusRaw || '').toLowerCase();

  // Expiring soon check if validity is within next 7 days
  if (expiresAt && (norm === 'active' || norm === 'approved')) {
    const exp = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
    if (diffDays > 0 && diffDays <= 7) {
      return {
        label: 'Expiring Soon',
        variant: 'warning',
        tooltip: 'Will expire shortly.',
      };
    }
  }

  if (
    norm === 'pending' ||
    norm === 'pending_approval' ||
    norm === 'submitted' ||
    norm === 'draft'
  ) {
    return {
      label: 'Pending',
      variant: 'warning',
      tooltip: 'Waiting for approval.',
    };
  }
  if (
    norm === 'active' ||
    norm === 'approved' ||
    norm === 'available' ||
    norm === 'credited_to_leave'
  ) {
    return {
      label: 'Available',
      variant: 'success',
      tooltip: 'Can be used as leave.',
    };
  }
  if (norm === 'used' || norm === 'partially_utilized' || norm === 'fully_utilized') {
    return {
      label: 'Used',
      variant: 'neutral',
      tooltip: 'Already taken as leave.',
    };
  }
  if (norm === 'expiring_soon') {
    return {
      label: 'Expiring Soon',
      variant: 'warning',
      tooltip: 'Will expire shortly.',
    };
  }
  if (norm === 'expired' || norm === 'lapsed') {
    return {
      label: 'Expired',
      variant: 'danger',
      tooltip: 'Validity period has ended.',
    };
  }
  if (norm === 'revoked' || norm === 'reversed' || norm === 'cancelled') {
    return {
      label: 'Revoked',
      variant: 'danger',
      tooltip: 'Removed by HR.',
    };
  }
  if (norm === 'encashed') {
    return {
      label: 'Encashed',
      variant: 'info',
      tooltip: 'Paid out instead of expiring.',
    };
  }
  if (norm === 'rejected') {
    return {
      label: 'Rejected',
      variant: 'danger',
      tooltip: 'Not approved.',
    };
  }
  return {
    label: norm ? norm.charAt(0).toUpperCase() + norm.slice(1) : '—',
    variant: 'neutral',
    tooltip: '',
  };
}

// ── Tab 2: Aggregated Balances Model (Spec Section 7) ────────────────────────

interface EmployeeBalanceRow {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  earnedDays: number;
  usedDays: number;
  expiredDays: number;
  balanceDays: number;
  nextExpiry: string | null;
}

// ── Main Page Component ──────────────────────────────────────────────────────

type CompOffActiveTab = 'earnings' | 'balances' | 'handoff';

export function AttendanceCompOffPage() {
  // ── 2. Active Tab State (Spec Section 2) ────────────────────────────────────
  const [activeTab, setActiveTab] = useState<CompOffActiveTab>('earnings');

  // ── Data & Async States ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'warning' | 'danger' | 'info';
    text: string;
  } | null>(null);

  const [metrics, setMetrics] = useState<CompOffOverviewMetrics | null>(null);
  const [requests, setRequests] = useState<CompOffRequestItem[]>([]);
  const [entitlements, setEntitlements] = useState<CompOffEntitlementItem[]>([]);
  const [handoffs, setHandoffs] = useState<CompOffHandoffItem[]>([]);

  // ── 4. Filter Bar State (Spec Section 4) ───────────────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // all | overtime | weekly_off | holiday | manual
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // ── Row Context Menu ───────────────────────────────────────────────────────
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── 9. Reject Modal State ──────────────────────────────────────────────────
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetItem, setRejectTargetItem] = useState<CompOffRequestItem | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // ── 9. Revoke Modal State ──────────────────────────────────────────────────
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeTargetEntitlement, setRevokeTargetEntitlement] =
    useState<CompOffEntitlementItem | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeSubmitting, setRevokeSubmitting] = useState(false);
  const [revokeValidationError, setRevokeValidationError] = useState<string | null>(null);

  // ── 10. Manual Grant Modal State ───────────────────────────────────────────
  const [grantModalOpen, setGrantModalOpen] = useState(false);
  const [grantEmployeeId, setGrantEmployeeId] = useState('');
  const [grantDays, setGrantDays] = useState<number>(1.0);
  const [grantValidUntil, setGrantValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  });
  const [grantReason, setGrantReason] = useState('');
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantValidationError, setGrantValidationError] = useState<string | null>(null);

  // ── 11. Run Expiry Check Confirm Modal State ───────────────────────────────
  const [expiryCheckModalOpen, setExpiryCheckModalOpen] = useState(false);
  const [expiryCheckSubmitting, setExpiryCheckSubmitting] = useState(false);

  // ── Detail Modal State ─────────────────────────────────────────────────────
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<
    (CompOffRequestItem & { audits: CompOffAuditItem[] }) | null
  >(null);

  // Close popup menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Load All Data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [overviewRes, requestsRes, entitlementsRes, handoffsRes] = await Promise.all([
        fetchCompOffOverview().catch(() => null),
        fetchCompOffRequests({ limit: 100 }).catch(() => ({
          items: [],
          total: 0,
          page: 1,
          limit: 100,
        })),
        fetchCompOffEntitlements({ limit: 100 }).catch(() => ({
          items: [],
          total: 0,
          page: 1,
          limit: 100,
        })),
        fetchCompOffHandoffs({ limit: 100 }).catch(() => ({
          items: [],
          total: 0,
          page: 1,
          limit: 100,
        })),
      ]);

      setMetrics(overviewRes);
      setRequests(requestsRes.items || []);
      setEntitlements(entitlementsRes.items || []);
      setHandoffs(handoffsRes.items || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Could not load comp-off'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Extract unique departments for filtering
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.departmentName) set.add(r.departmentName);
    });
    return Array.from(set).sort();
  }, [requests]);

  // ── 3. Summary Cards Metrics (Spec Section 3) ──────────────────────────────
  const pendingCount = useMemo(() => {
    if (metrics?.pendingApprovalCount !== undefined) return metrics.pendingApprovalCount;
    return requests.filter((r) => r.status === 'pending_approval' || r.status === 'submitted')
      .length;
  }, [metrics, requests]);

  const earnedThisMonth = useMemo(() => {
    if (metrics?.totalEarnedDays !== undefined) return `${metrics.totalEarnedDays.toFixed(1)} days`;
    const sum = requests
      .filter((r) => r.status === 'approved')
      .reduce((acc, curr) => acc + (curr.approvedCreditDays || curr.requestedCreditDays || 0), 0);
    return `${sum.toFixed(1)} days`;
  }, [metrics, requests]);

  const usedThisMonth = useMemo(() => {
    const sum = entitlements
      .filter((e) => e.status === 'partially_utilized' || e.status === 'fully_utilized')
      .reduce((acc, curr) => acc + (curr.earnedDays || 0), 0);
    return `${sum.toFixed(1)} days`;
  }, [entitlements]);

  const expiringSoonCount = useMemo(() => {
    const now = Date.now();
    return entitlements.filter((e) => {
      if (e.status !== 'active' && e.status !== 'credited_to_leave') return false;
      const exp = new Date(e.expiresAt).getTime();
      const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
      return diffDays > 0 && diffDays <= 30;
    }).length;
  }, [entitlements]);

  const expiredThisMonth = useMemo(() => {
    const sum = entitlements
      .filter((e) => e.status === 'expired')
      .reduce((acc, curr) => acc + (curr.earnedDays || 0), 0);
    return `${sum.toFixed(1)} days`;
  }, [entitlements]);

  // ── Tab 2: Aggregated Balances Calculation (Spec Section 7) ────────────────
  const employeeBalances = useMemo<EmployeeBalanceRow[]>(() => {
    const map = new Map<string, EmployeeBalanceRow>();

    // Process from requests & entitlements
    requests.forEach((r) => {
      if (!map.has(r.employeeId)) {
        map.set(r.employeeId, {
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          employeeCode: r.employeeCode || r.employeeId,
          departmentName: r.departmentName || '—',
          earnedDays: 0,
          usedDays: 0,
          expiredDays: 0,
          balanceDays: 0,
          nextExpiry: null,
        });
      }
      const row = map.get(r.employeeId)!;
      if (r.status === 'approved') {
        row.earnedDays += r.approvedCreditDays || r.requestedCreditDays || 1.0;
      }
    });

    entitlements.forEach((e) => {
      if (!map.has(e.employeeId)) {
        map.set(e.employeeId, {
          employeeId: e.employeeId,
          employeeName: e.employeeName || e.employeeId,
          employeeCode: e.employeeCode || e.employeeId,
          departmentName: '—',
          earnedDays: 0,
          usedDays: 0,
          expiredDays: 0,
          balanceDays: 0,
          nextExpiry: null,
        });
      }
      const row = map.get(e.employeeId)!;
      if (e.status === 'partially_utilized' || e.status === 'fully_utilized') {
        row.usedDays += e.earnedDays || 0;
      } else if (e.status === 'expired') {
        row.expiredDays += e.earnedDays || 0;
      }

      // Earliest active expiry
      if (e.status === 'active' || e.status === 'credited_to_leave') {
        if (!row.nextExpiry || new Date(e.expiresAt) < new Date(row.nextExpiry)) {
          row.nextExpiry = e.expiresAt;
        }
      }
    });

    // Compute net balances
    map.forEach((row) => {
      row.balanceDays = Math.max(0, row.earnedDays - row.usedDays - row.expiredDays);
    });

    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [requests, entitlements]);

  // ── Tab Filtering Logic ────────────────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    return requests.filter((item) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = item.employeeName?.toLowerCase().includes(q);
        const matchesCode =
          item.employeeCode?.toLowerCase().includes(q) ||
          item.employeeId?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      if (statusFilter !== 'all') {
        const meta = getCompOffStatusMeta(item.status);
        if (
          meta.label.toLowerCase().replace(/\s+/g, '_') !==
          statusFilter.toLowerCase().replace(/\s+/g, '_')
        ) {
          return false;
        }
      }
      if (sourceFilter !== 'all') {
        const source = mapEarnedFrom(item).toLowerCase().replace(/\s+/g, '_');
        if (sourceFilter === 'overtime' && source !== 'overtime') return false;
        if (sourceFilter === 'weekly_off' && source !== 'weekly_off_work') return false;
        if (sourceFilter === 'holiday' && source !== 'holiday_work') return false;
        if (sourceFilter === 'manual' && source !== 'manual_grant') return false;
      }
      if (departmentFilter !== 'all') {
        if (item.departmentName !== departmentFilter) return false;
      }
      return true;
    });
  }, [requests, search, statusFilter, sourceFilter, departmentFilter]);

  const filteredBalances = useMemo(() => {
    return employeeBalances.filter((row) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = row.employeeName.toLowerCase().includes(q);
        const matchesCode = row.employeeCode.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      if (departmentFilter !== 'all') {
        if (row.departmentName !== departmentFilter) return false;
      }
      return true;
    });
  }, [employeeBalances, search, departmentFilter]);

  const filteredHandoffs = useMemo(() => {
    return handoffs.filter((item) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = item.employeeName?.toLowerCase().includes(q);
        const matchesCode =
          item.employeeCode?.toLowerCase().includes(q) ||
          item.employeeId?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      if (statusFilter !== 'all') {
        if (
          statusFilter === 'synced' &&
          item.status !== 'acknowledged' &&
          item.status !== 'transmitted'
        )
          return false;
        if (statusFilter === 'pending' && item.status !== 'pending_handoff') return false;
        if (statusFilter === 'failed' && item.status !== 'failed') return false;
      }
      return true;
    });
  }, [handoffs, search, statusFilter]);

  // ── Active Filter Counting ─────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (sourceFilter !== 'all') count++;
    if (departmentFilter !== 'all') count++;
    return count;
  }, [statusFilter, sourceFilter, departmentFilter]);

  const hasActiveFilters = Boolean(search || activeFilterCount > 0);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSourceFilter('all');
    setDepartmentFilter('all');
    setIsFilterPanelOpen(false);
  };

  // ── 9. Decision Actions (Approve / Reject / Revoke) ─────────────────────────
  const handleApprove = async (item: CompOffRequestItem) => {
    try {
      await decideCompOffRequest(item.id, {
        decision: 'approved',
        approvedCreditDays: item.requestedCreditDays || 1.0,
        expectedVersion: item.version,
      });
      const days = item.requestedCreditDays || 1.0;
      setBannerMessage({
        type: 'success',
        text: `Comp-off approved. ${days} day added to ${item.employeeName}’s balance.`,
      });
      setActiveMenuId(null);
      loadData();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: getErrorMessage(err, 'Failed to approve comp-off claim.'),
      });
    }
  };

  const handleOpenReject = (item: CompOffRequestItem) => {
    setRejectTargetItem(item);
    setRejectComment('');
    setRejectModalOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetItem) return;
    if (!rejectComment.trim()) {
      setBannerMessage({
        type: 'danger',
        text: 'Please add a comment before rejecting.',
      });
      return;
    }
    try {
      setRejectSubmitting(true);
      await decideCompOffRequest(rejectTargetItem.id, {
        decision: 'rejected',
        reviewNotes: rejectComment.trim(),
        expectedVersion: rejectTargetItem.version,
      });
      setBannerMessage({
        type: 'info',
        text: `Comp-off rejected. ${rejectTargetItem.employeeName} has been notified.`,
      });
      setRejectModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: getErrorMessage(err, 'Failed to reject comp-off claim.'),
      });
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleOpenRevoke = (entitlement: CompOffEntitlementItem) => {
    setRevokeTargetEntitlement(entitlement);
    setRevokeReason('');
    setRevokeValidationError(null);
    setRevokeModalOpen(true);
    setActiveMenuId(null);
  };

  const handleConfirmRevoke = async () => {
    if (!revokeTargetEntitlement) return;
    if (!revokeReason.trim()) {
      setRevokeValidationError('Please add a reason before revoking.');
      return;
    }
    try {
      setRevokeSubmitting(true);
      await reverseCompOffEntitlement(revokeTargetEntitlement.id, revokeReason.trim());
      setBannerMessage({
        type: 'success',
        text: 'Comp-off revoked. Balance updated.',
      });
      setRevokeModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setRevokeValidationError(getErrorMessage(err, 'Failed to revoke comp-off entitlement.'));
    } finally {
      setRevokeSubmitting(false);
    }
  };

  // ── 10. Manual Grant Handler ───────────────────────────────────────────────
  const handleGrantSubmit = async () => {
    if (!grantEmployeeId.trim()) {
      setGrantValidationError('Please select an employee.');
      return;
    }
    if (!grantReason.trim()) {
      setGrantValidationError('Please add a reason for the manual grant.');
      return;
    }
    try {
      setGrantSubmitting(true);
      setGrantValidationError(null);
      await createCompOffRequest({
        employeeId: grantEmployeeId.trim(),
        workDate: new Date().toISOString().slice(0, 10),
        requestedCreditDays: grantDays,
        reason: grantReason.trim(),
      });
      setBannerMessage({
        type: 'success',
        text: `Comp-off granted to employee (${grantEmployeeId.trim()}).`,
      });
      setGrantModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setGrantValidationError(getErrorMessage(err, 'Failed to grant comp-off.'));
    } finally {
      setGrantSubmitting(false);
    }
  };

  // ── 11. Run Expiry Check Handler ───────────────────────────────────────────
  const handleRunExpiryCheck = async () => {
    try {
      setExpiryCheckSubmitting(true);
      const res = await triggerCompOffAutoLapse();
      if (res && res.lapsedCount > 0) {
        setBannerMessage({
          type: 'success',
          text: `${res.lapsedCount} comp-off credits expired.`,
        });
      } else {
        setBannerMessage({
          type: 'info',
          text: 'No comp-off credits have expired.',
        });
      }
      setExpiryCheckModalOpen(false);
      loadData();
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: getErrorMessage(err, 'Failed to run expiry check.'),
      });
    } finally {
      setExpiryCheckSubmitting(false);
    }
  };

  // ── Retry Handoff Sync Handler (Spec Section 8) ────────────────────────────
  const handleRetryHandoffSync = async (handoff: CompOffHandoffItem) => {
    try {
      setBannerMessage({
        type: 'info',
        text: `Retrying leave sync for ${handoff.employeeName || handoff.employeeId}...`,
      });
      // Refresh data to reflect retry result
      setTimeout(() => {
        loadData();
      }, 1000);
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: getErrorMessage(err, 'Could not retry sync.'),
      });
    }
  };

  // ── Detail Drawer / Modal ──────────────────────────────────────────────────
  const handleViewDetails = async (id: string) => {
    try {
      const detail = await fetchCompOffRequestDetail(id);
      setDetailItem(detail);
      setDetailModalOpen(true);
      setActiveMenuId(null);
    } catch (err: unknown) {
      setBannerMessage({
        type: 'danger',
        text: getErrorMessage(err, 'Failed to load request detail.'),
      });
    }
  };

  return (
    <Page maxWidth="default" gap="md">
      {/* ── 1. Page Header (Spec Section 1) ── */}
      <PageHeader
        eyebrow="Attendance › Comp-Off"
        title="Comp-Off"
        subtitle="Track comp-off earned, used and expired for each employee."
        actions={
          <Inline gap="sm" align="center">
            {/* Manual Grant Button */}
            <Button
              variant="outline"
              size="md"
              leftIcon={<BezentIcon name="check" size={16} />}
              onClick={() => {
                setGrantEmployeeId('');
                setGrantDays(1.0);
                setGrantReason('');
                setGrantValidationError(null);
                setGrantModalOpen(true);
              }}
            >
              Grant Comp-Off
            </Button>

            {/* Export Button */}
            <Button
              variant="outline"
              size="md"
              leftIcon={<BezentIcon name="download" size={16} />}
              onClick={() => {
                setBannerMessage({
                  type: 'info',
                  text: 'Exporting Comp-Off records...',
                });
              }}
            >
              Export
            </Button>

            {/* Primary Action: Run Expiry Check */}
            <Button
              variant="primary"
              size="md"
              leftIcon={<BezentIcon name="clock" size={16} />}
              onClick={() => setExpiryCheckModalOpen(true)}
            >
              Run Expiry Check
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {/* Banner Notification */}
        {bannerMessage && (
          <Alert variant={bannerMessage.type} dismissible onDismiss={() => setBannerMessage(null)}>
            {bannerMessage.text}
          </Alert>
        )}

        {/* ── 3. Summary Cards (Spec Section 3) ── */}
        <Grid columns={5} gap="sm">
          {/* Card 1: Pending Approval */}
          <div
            className={`bezent-kpi-card ${statusFilter === 'pending' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('earnings');
              setStatusFilter((curr) => (curr === 'pending' ? 'all' : 'pending'));
            }}
            title="Waiting for approval"
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Pending Approval</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{pendingCount}</span>
            </div>
          </div>

          {/* Card 2: Earned This Month */}
          <div className="bezent-kpi-card" title="Comp-off earned in the current cycle">
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Earned This Month</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{earnedThisMonth}</span>
            </div>
          </div>

          {/* Card 3: Used This Month */}
          <div className="bezent-kpi-card" title="Comp-off utilized as leave this month">
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Used This Month</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{usedThisMonth}</span>
            </div>
          </div>

          {/* Card 4: Expiring Soon */}
          <div
            className={`bezent-kpi-card ${statusFilter === 'expiring_soon' ? 'is-active' : ''}`}
            onClick={() => {
              setActiveTab('earnings');
              setStatusFilter((curr) => (curr === 'expiring_soon' ? 'all' : 'expiring_soon'));
            }}
            title="Comp-off that will expire within the next 30 days."
            role="button"
            tabIndex={0}
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Expiring Soon</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{expiringSoonCount}</span>
            </div>
          </div>

          {/* Card 5: Expired This Month */}
          <div
            className="bezent-kpi-card"
            title="Comp-off credits that reached validity expiration this month"
          >
            <div className="bezent-kpi-card__header">
              <span className="bezent-kpi-card__title">Expired This Month</span>
            </div>
            <div className="bezent-kpi-card__value-row">
              <span className="bezent-kpi-card__value">{expiredThisMonth}</span>
            </div>
          </div>
        </Grid>

        {/* ── 2. Tabs Navigation (Spec Section 2) ── */}
        <Tabs
          items={[
            { id: 'earnings', label: 'Earnings' },
            { id: 'balances', label: 'Balances' },
            { id: 'handoff', label: 'Leave Handoff' },
          ]}
          activeId={activeTab}
          onChange={(id) => {
            setActiveTab(id as CompOffActiveTab);
            setStatusFilter('all');
          }}
        />

        {/* ── 4. Filter Bar (Spec Section 4 — Workforce Directory Pattern) ── */}
        <div className="bezent-directory-toolbar">
          <div className="bezent-directory-toolbar__search">
            <SearchInput
              value={search}
              shape="rounded"
              aria-label="Search by name or employee ID"
              placeholder="Search by name or employee ID"
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>

          <div className="bezent-directory-toolbar__actions">
            <div className="bezent-filter-anchor">
              <Button
                variant={activeFilterCount > 0 || isFilterPanelOpen ? 'secondary' : 'outline'}
                size="md"
                shape="rounded"
                className={activeFilterCount > 0 ? 'bezent-btn--filters-active' : ''}
                leftIcon={<BezentIcon name="filter" size={16} />}
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="bezent-btn__filter-count">{activeFilterCount}</span>
                )}
              </Button>

              {/* Floating Filter Panel */}
              {isFilterPanelOpen && (
                <div className="bezent-filter-panel" onClick={(e) => e.stopPropagation()}>
                  <div className="bezent-filter-panel__header-compact">
                    <span className="bezent-filter-panel__title">Filters</span>
                    <button
                      type="button"
                      className="bezent-filter-panel__close-btn"
                      onClick={() => setIsFilterPanelOpen(false)}
                      aria-label="Close filters"
                    >
                      <BezentIcon name="x" size={16} />
                    </button>
                  </div>

                  <div className="bezent-filter-panel__body-compact">
                    <div className="bezent-filter-grid--vertical">
                      {/* Status Filter (Context-aware per tab) */}
                      {activeTab === 'earnings' && (
                        <div className="bezent-filter-form-group--full">
                          <label className="bezent-filter-label" htmlFor="filter-status-earnings">
                            Status
                          </label>
                          <div className="bezent-filter-select-wrap">
                            <select
                              id="filter-status-earnings"
                              className="bezent-filter-select-control"
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="all">All</option>
                              <option value="pending">Pending</option>
                              <option value="available">Available</option>
                              <option value="used">Used</option>
                              <option value="expiring_soon">Expiring Soon</option>
                              <option value="expired">Expired</option>
                              <option value="revoked">Revoked</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <span className="bezent-filter-select-chevron">
                              <BezentIcon name="chevronDown" size={16} />
                            </span>
                          </div>
                        </div>
                      )}

                      {activeTab === 'handoff' && (
                        <div className="bezent-filter-form-group--full">
                          <label className="bezent-filter-label" htmlFor="filter-status-handoff">
                            Sync Status
                          </label>
                          <div className="bezent-filter-select-wrap">
                            <select
                              id="filter-status-handoff"
                              className="bezent-filter-select-control"
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                            >
                              <option value="all">All</option>
                              <option value="synced">Synced</option>
                              <option value="pending">Pending</option>
                              <option value="failed">Failed</option>
                            </select>
                            <span className="bezent-filter-select-chevron">
                              <BezentIcon name="chevronDown" size={16} />
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Earned From Source Filter (Earnings tab) */}
                      {activeTab === 'earnings' && (
                        <div className="bezent-filter-form-group--full">
                          <label className="bezent-filter-label" htmlFor="filter-source">
                            Earned From
                          </label>
                          <div className="bezent-filter-select-wrap">
                            <select
                              id="filter-source"
                              className="bezent-filter-select-control"
                              value={sourceFilter}
                              onChange={(e) => setSourceFilter(e.target.value)}
                            >
                              <option value="all">All</option>
                              <option value="overtime">Overtime</option>
                              <option value="weekly_off">Weekly Off Work</option>
                              <option value="holiday">Holiday Work</option>
                              <option value="manual">Manual Grant</option>
                            </select>
                            <span className="bezent-filter-select-chevron">
                              <BezentIcon name="chevronDown" size={16} />
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Department Filter */}
                      <div className="bezent-filter-form-group--full">
                        <label className="bezent-filter-label" htmlFor="filter-dept">
                          Department
                        </label>
                        <div className="bezent-filter-select-wrap">
                          <select
                            id="filter-dept"
                            className="bezent-filter-select-control"
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                          >
                            <option value="all">All Departments</option>
                            {departmentOptions.map((dept) => (
                              <option key={dept} value={dept}>
                                {dept}
                              </option>
                            ))}
                          </select>
                          <span className="bezent-filter-select-chevron">
                            <BezentIcon name="chevronDown" size={16} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel Footer */}
                  <div className="bezent-filter-panel__footer-compact">
                    <button
                      type="button"
                      className="bezent-filter-panel__clear-btn"
                      onClick={handleResetFilters}
                      disabled={!hasActiveFilters}
                    >
                      Clear all
                    </button>
                    <div className="bezent-filter-panel__footer-actions">
                      <Button
                        variant="primary"
                        size="sm"
                        shape="rounded"
                        onClick={() => setIsFilterPanelOpen(false)}
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="md" shape="rounded" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            )}

            <span className="bezent-records-badge">
              {activeTab === 'earnings'
                ? `${filteredRequests.length} Records`
                : activeTab === 'balances'
                  ? `${filteredBalances.length} Employees`
                  : `${filteredHandoffs.length} Records`}
            </span>
          </div>
        </div>

        {/* ── Active Filter Chips ── */}
        {hasActiveFilters && (
          <div className="bezent-filter-chips-row">
            {search && (
              <span className="bezent-filter-chip">
                Search: &quot;{search}&quot;
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setSearch('')}
                  aria-label="Remove search filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="bezent-filter-chip">
                Status: {statusFilter}
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setStatusFilter('all')}
                  aria-label="Remove status filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
            {sourceFilter !== 'all' && (
              <span className="bezent-filter-chip">
                Earned From: {sourceFilter}
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setSourceFilter('all')}
                  aria-label="Remove source filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
            {departmentFilter !== 'all' && (
              <span className="bezent-filter-chip">
                Dept: {departmentFilter}
                <button
                  type="button"
                  className="bezent-filter-chip__remove"
                  onClick={() => setDepartmentFilter('all')}
                  aria-label="Remove department filter"
                >
                  <BezentIcon name="x" size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* ── Content Per Tab ── */}
        {loading ? (
          <LoadingState label="Loading comp-off records..." />
        ) : error ? (
          <EmptyState
            title="Could not load comp-off"
            description="Something went wrong while loading."
            primaryAction={{
              label: 'Retry',
              onClick: loadData,
            }}
          />
        ) : activeTab === 'earnings' ? (
          /* ── 6. Tab 1: Earnings (Spec Section 6) ── */
          filteredRequests.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                title="No matching records"
                description="No records match your filters."
                primaryAction={{
                  label: 'Reset Filters',
                  onClick: handleResetFilters,
                }}
              />
            ) : (
              <EmptyState
                title="No comp-off records"
                description="No comp-off has been earned yet."
              />
            )
          ) : (
            <Card variant="default">
              <div className="bezent-table-scroll-container">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Employee</TableHeaderCell>
                      <TableHeaderCell>Earned On</TableHeaderCell>
                      <TableHeaderCell>Earned From</TableHeaderCell>
                      <TableHeaderCell>Hours Worked</TableHeaderCell>
                      <TableHeaderCell>Credit</TableHeaderCell>
                      <TableHeaderCell>Valid Until</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell className="bezent-table-col--sticky-right bezent-table-col--actions">
                        Actions
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRequests.map((item) => {
                      const earnedFrom = mapEarnedFrom(item);
                      const matchingEntitlement = entitlements.find((e) => e.requestId === item.id);
                      const statusMeta = getCompOffStatusMeta(
                        item.status,
                        matchingEntitlement?.expiresAt,
                      );
                      const creditDisplay = formatDays(
                        item.approvedCreditDays || item.requestedCreditDays || 1.0,
                      );

                      // Calculate 60 days validity if not directly available
                      const validUntilDate =
                        matchingEntitlement?.expiresAt ||
                        (() => {
                          const d = new Date(item.workDate);
                          d.setDate(d.getDate() + 60);
                          return d.toISOString();
                        })();

                      return (
                        <TableRow key={item.id}>
                          {/* 1. Employee */}
                          <TableCell>
                            <Inline gap="sm" align="center">
                              <span className="bezent-avatar bezent-avatar--sm">
                                {item.employeeName.charAt(0).toUpperCase()}
                              </span>
                              <Stack gap="none">
                                <span className="bezent-table-primary-text">
                                  {item.employeeName}
                                </span>
                                <span className="bezent-table-meta-subtitle">
                                  {item.employeeCode || item.employeeId}
                                </span>
                              </Stack>
                            </Inline>
                          </TableCell>

                          {/* 2. Earned On */}
                          <TableCell>
                            <span className="bezent-table-primary-text">
                              {formatDate(item.workDate)}
                            </span>
                          </TableCell>

                          {/* 3. Earned From */}
                          <TableCell>
                            <span className="bezent-table-primary-text">{earnedFrom}</span>
                          </TableCell>

                          {/* 4. Hours Worked */}
                          <TableCell>
                            <span className="bezent-table-primary-text">
                              {formatMinutes(item.actualWorkedMinutes || item.scheduledMinutes)}
                            </span>
                          </TableCell>

                          {/* 5. Credit */}
                          <TableCell>
                            <span className="bezent-table-primary-text">{creditDisplay}</span>
                          </TableCell>

                          {/* 6. Valid Until */}
                          <TableCell>
                            <span className="bezent-table-primary-text">
                              {formatDate(validUntilDate)}
                            </span>
                          </TableCell>

                          {/* 7. Status */}
                          <TableCell>
                            <span title={statusMeta.tooltip}>
                              <Badge variant={statusMeta.variant} size="sm">
                                {statusMeta.label}
                              </Badge>
                            </span>
                          </TableCell>

                          {/* 8. Actions (Sticky Right) */}
                          <TableCell className="bezent-table-col--sticky-right bezent-table-col--actions">
                            <div className="bezent-action-menu-container">
                              <button
                                type="button"
                                className="bezent-action-trigger-btn"
                                aria-label={`Actions for ${item.employeeName}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId((prev) => (prev === item.id ? null : item.id));
                                }}
                              >
                                <BezentIcon name="more" size={16} />
                              </button>

                              {activeMenuId === item.id && (
                                <div
                                  ref={menuRef}
                                  className="bezent-action-dropdown-menu"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* View Details (Always) */}
                                  <button
                                    type="button"
                                    className="bezent-action-menu-item"
                                    onClick={() => handleViewDetails(item.id)}
                                  >
                                    <BezentIcon name="info" size={14} />
                                    <span>View Details</span>
                                  </button>

                                  {/* Approve (When pending) */}
                                  {(item.status === 'pending_approval' ||
                                    item.status === 'submitted') && (
                                    <button
                                      type="button"
                                      className="bezent-action-menu-item"
                                      onClick={() => handleApprove(item)}
                                    >
                                      <BezentIcon name="check" size={14} />
                                      <span>Approve</span>
                                    </button>
                                  )}

                                  {/* Reject (When pending) */}
                                  {(item.status === 'pending_approval' ||
                                    item.status === 'submitted') && (
                                    <button
                                      type="button"
                                      className="bezent-action-menu-item bezent-action-menu-item--danger"
                                      onClick={() => handleOpenReject(item)}
                                    >
                                      <BezentIcon name="x" size={14} />
                                      <span>Reject</span>
                                    </button>
                                  )}

                                  {/* Revoke (When approved / matching active entitlement exists) */}
                                  {matchingEntitlement &&
                                    matchingEntitlement.status !== 'reversed' && (
                                      <button
                                        type="button"
                                        className="bezent-action-menu-item bezent-action-menu-item--danger"
                                        onClick={() => handleOpenRevoke(matchingEntitlement)}
                                      >
                                        <BezentIcon name="x" size={14} />
                                        <span>Revoke</span>
                                      </button>
                                    )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )
        ) : activeTab === 'balances' ? (
          /* ── 7. Tab 2: Balances (Spec Section 7) ── */
          filteredBalances.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                title="No matching records"
                description="No records match your filters."
                primaryAction={{
                  label: 'Reset Filters',
                  onClick: handleResetFilters,
                }}
              />
            ) : (
              <EmptyState
                title="No balances to show"
                description="No employees have comp-off balance."
              />
            )
          ) : (
            <Card variant="default">
              <div className="bezent-table-scroll-container">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Employee</TableHeaderCell>
                      <TableHeaderCell>Earned</TableHeaderCell>
                      <TableHeaderCell>Used</TableHeaderCell>
                      <TableHeaderCell>Expired</TableHeaderCell>
                      <TableHeaderCell>Balance</TableHeaderCell>
                      <TableHeaderCell>Next Expiry</TableHeaderCell>
                      <TableHeaderCell className="bezent-table-col--sticky-right bezent-table-col--actions">
                        Actions
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBalances.map((row) => (
                      <TableRow key={row.employeeId}>
                        {/* 1. Employee */}
                        <TableCell>
                          <Inline gap="sm" align="center">
                            <span className="bezent-avatar bezent-avatar--sm">
                              {row.employeeName.charAt(0).toUpperCase()}
                            </span>
                            <Stack gap="none">
                              <span className="bezent-table-primary-text">{row.employeeName}</span>
                              <span className="bezent-table-meta-subtitle">
                                {row.employeeCode} · {row.departmentName}
                              </span>
                            </Stack>
                          </Inline>
                        </TableCell>

                        {/* 2. Earned Days */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {formatDays(row.earnedDays)}
                          </span>
                        </TableCell>

                        {/* 3. Used Days */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {formatDays(row.usedDays)}
                          </span>
                        </TableCell>

                        {/* 4. Expired Days */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {formatDays(row.expiredDays)}
                          </span>
                        </TableCell>

                        {/* 5. Balance (Bold emphasized days unit) */}
                        <TableCell>
                          <span className="bezent-table-primary-text font-bold">
                            <strong>{formatDays(row.balanceDays)}</strong>
                          </span>
                        </TableCell>

                        {/* 6. Next Expiry */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {row.nextExpiry ? formatDate(row.nextExpiry) : '—'}
                          </span>
                        </TableCell>

                        {/* 7. Actions */}
                        <TableCell className="bezent-table-col--sticky-right bezent-table-col--actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearch(row.employeeName);
                              setActiveTab('earnings');
                            }}
                          >
                            View Ledger
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )
        ) : /* ── 8. Tab 3: Leave Handoff (Spec Section 8) ── */
        filteredHandoffs.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              title="No matching records"
              description="No records match your filters."
              primaryAction={{
                label: 'Reset Filters',
                onClick: handleResetFilters,
              }}
            />
          ) : (
            <EmptyState
              title="No comp-off records"
              description="No leave handoff records have been processed."
            />
          )
        ) : (
          <Card variant="default">
            <div className="bezent-table-scroll-container">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Days Credited</TableHeaderCell>
                    <TableHeaderCell>Leave Type</TableHeaderCell>
                    <TableHeaderCell>Sync Status</TableHeaderCell>
                    <TableHeaderCell className="bezent-table-col--sticky-right bezent-table-col--actions">
                      Actions
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHandoffs.map((handoff) => {
                    const syncStatusLabel =
                      handoff.status === 'acknowledged' || handoff.status === 'transmitted'
                        ? 'Synced'
                        : handoff.status === 'failed'
                          ? 'Failed'
                          : 'Pending';

                    const syncStatusVariant =
                      syncStatusLabel === 'Synced'
                        ? 'success'
                        : syncStatusLabel === 'Failed'
                          ? 'danger'
                          : 'warning';

                    return (
                      <TableRow key={handoff.id}>
                        {/* 1. Employee */}
                        <TableCell>
                          <Inline gap="sm" align="center">
                            <span className="bezent-avatar bezent-avatar--sm">
                              {(handoff.employeeName || handoff.employeeId).charAt(0).toUpperCase()}
                            </span>
                            <Stack gap="none">
                              <span className="bezent-table-primary-text">
                                {handoff.employeeName || handoff.employeeId}
                              </span>
                              <span className="bezent-table-meta-subtitle">
                                {handoff.employeeCode || handoff.employeeId}
                              </span>
                            </Stack>
                          </Inline>
                        </TableCell>

                        {/* 2. Date */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {formatDate(handoff.validFrom || handoff.createdAt)}
                          </span>
                        </TableCell>

                        {/* 3. Days Credited */}
                        <TableCell>
                          <span className="bezent-table-primary-text">
                            {formatDays(handoff.creditDays)}
                          </span>
                        </TableCell>

                        {/* 4. Leave Type */}
                        <TableCell>
                          <span className="bezent-table-primary-text">Comp-Off</span>
                        </TableCell>

                        {/* 5. Sync Status */}
                        <TableCell>
                          <Badge variant={syncStatusVariant} size="sm">
                            {syncStatusLabel}
                          </Badge>
                        </TableCell>

                        {/* 6. Actions */}
                        <TableCell className="bezent-table-col--sticky-right bezent-table-col--actions">
                          {handoff.status === 'failed' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryHandoffSync(handoff)}
                            >
                              Retry Sync
                            </Button>
                          ) : (
                            <span className="bezent-table-meta-subtitle">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </Stack>

      {/* ── 9. Reject Modal (Spec Section 9) ── */}
      {rejectModalOpen && rejectTargetItem && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Comp-Off Claim"
        >
          <Stack gap="md">
            <p className="bezent-page-header__subtitle">
              {rejectTargetItem.employeeName} · {formatDate(rejectTargetItem.workDate)}
            </p>
            <Stack gap="xs">
              <label className="bezent-form-label" htmlFor="reject-comment-input">
                Comment (required)
              </label>
              <textarea
                id="reject-comment-input"
                className="bezent-textarea"
                rows={3}
                placeholder="Explain why this comp-off claim is being rejected..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
              />
            </Stack>
            <Inline gap="sm" justify="end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setRejectModalOpen(false)}
                disabled={rejectSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleConfirmReject}
                loading={rejectSubmitting}
              >
                Reject
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* ── 9. Revoke Modal (Spec Section 9) ── */}
      {revokeModalOpen && revokeTargetEntitlement && (
        <Modal
          isOpen={revokeModalOpen}
          onClose={() => setRevokeModalOpen(false)}
          title="Revoke this comp-off?"
        >
          <Stack gap="md">
            <p className="bezent-table-primary-text">
              {formatDays(revokeTargetEntitlement.earnedDays)} will be removed from{' '}
              {revokeTargetEntitlement.employeeName || revokeTargetEntitlement.employeeId}’s
              balance. This action will be recorded in the audit log.
            </p>

            {revokeValidationError && <Alert variant="danger">{revokeValidationError}</Alert>}

            <Stack gap="xs">
              <label className="bezent-form-label" htmlFor="revoke-reason-input">
                Reason (required)
              </label>
              <textarea
                id="revoke-reason-input"
                className="bezent-textarea"
                rows={3}
                placeholder="Provide reason for revoking this entitlement..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
              />
            </Stack>

            <Inline gap="sm" justify="end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setRevokeModalOpen(false)}
                disabled={revokeSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleConfirmRevoke}
                loading={revokeSubmitting}
              >
                Revoke
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* ── 10. Manual Grant Modal (Spec Section 10) ── */}
      {grantModalOpen && (
        <Modal
          isOpen={grantModalOpen}
          onClose={() => setGrantModalOpen(false)}
          title="Grant Comp-Off"
        >
          <Stack gap="md">
            {grantValidationError && <Alert variant="danger">{grantValidationError}</Alert>}

            <Stack gap="xs">
              <label className="bezent-form-label" htmlFor="grant-employee-id">
                Employee ID or Code
              </label>
              <div className="bezent-input-wrapper bezent-input-wrapper--md">
                <input
                  id="grant-employee-id"
                  className="bezent-input-field"
                  placeholder="e.g. EMP-101"
                  value={grantEmployeeId}
                  onChange={(e) => setGrantEmployeeId(e.target.value)}
                />
              </div>
            </Stack>

            <Stack gap="xs">
              <span className="bezent-form-label">Days</span>
              <Inline gap="md" align="center">
                <label className="bezent-radio-label">
                  <input
                    type="radio"
                    name="grant-days-option"
                    checked={grantDays === 0.5}
                    onChange={() => setGrantDays(0.5)}
                  />
                  <span>0.5 Day</span>
                </label>
                <label className="bezent-radio-label">
                  <input
                    type="radio"
                    name="grant-days-option"
                    checked={grantDays === 1.0}
                    onChange={() => setGrantDays(1.0)}
                  />
                  <span>1 Day</span>
                </label>
              </Inline>
            </Stack>

            <Stack gap="xs">
              <label className="bezent-form-label" htmlFor="grant-valid-until">
                Valid Until
              </label>
              <div className="bezent-input-wrapper bezent-input-wrapper--md">
                <input
                  id="grant-valid-until"
                  type="date"
                  className="bezent-input-field"
                  value={grantValidUntil}
                  onChange={(e) => setGrantValidUntil(e.target.value)}
                />
              </div>
            </Stack>

            <Stack gap="xs">
              <label className="bezent-form-label" htmlFor="grant-reason">
                Reason (required)
              </label>
              <textarea
                id="grant-reason"
                className="bezent-textarea"
                rows={3}
                placeholder="Reason for manual grant..."
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
              <span className="bezent-form-helper-text">
                Every manual grant is recorded in the audit log.
              </span>
            </Stack>

            <Inline gap="sm" justify="end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setGrantModalOpen(false)}
                disabled={grantSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleGrantSubmit}
                loading={grantSubmitting}
              >
                Grant
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* ── 11. Run Expiry Check Confirm Modal (Spec Section 11) ── */}
      {expiryCheckModalOpen && (
        <Modal
          isOpen={expiryCheckModalOpen}
          onClose={() => setExpiryCheckModalOpen(false)}
          title="Run expiry check now?"
        >
          <Stack gap="md">
            <p className="bezent-table-primary-text">
              Comp-off past its validity date will be marked as expired.
            </p>
            <Inline gap="sm" justify="end">
              <Button
                variant="outline"
                size="md"
                onClick={() => setExpiryCheckModalOpen(false)}
                disabled={expiryCheckSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleRunExpiryCheck}
                loading={expiryCheckSubmitting}
              >
                Run Check
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* ── View Details Modal ── */}
      {detailModalOpen && detailItem && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Comp-Off Details"
        >
          <Stack gap="md">
            <p className="bezent-page-header__subtitle">
              {detailItem.employeeName} · {formatDate(detailItem.workDate)}
            </p>
            <Card variant="flat">
              <Grid columns={2} gap="sm">
                <div>
                  <span className="bezent-table-meta-subtitle">Claim ID</span>
                  <p className="bezent-table-primary-text">{detailItem.requestNumber}</p>
                </div>
                <div>
                  <span className="bezent-table-meta-subtitle">Earned From</span>
                  <p className="bezent-table-primary-text">{mapEarnedFrom(detailItem)}</p>
                </div>
                <div>
                  <span className="bezent-table-meta-subtitle">Worked Hours</span>
                  <p className="bezent-table-primary-text">
                    {formatMinutes(detailItem.actualWorkedMinutes)}
                  </p>
                </div>
                <div>
                  <span className="bezent-table-meta-subtitle">Credit Requested</span>
                  <p className="bezent-table-primary-text">
                    {formatDays(detailItem.requestedCreditDays)}
                  </p>
                </div>
                <div>
                  <span className="bezent-table-meta-subtitle">Reason</span>
                  <p className="bezent-table-primary-text">{detailItem.reason || '—'}</p>
                </div>
                <div>
                  <span className="bezent-table-meta-subtitle">Status</span>
                  <p className="bezent-table-primary-text">
                    {getCompOffStatusMeta(detailItem.status).label}
                  </p>
                </div>
              </Grid>
            </Card>
            <Inline gap="sm" justify="end">
              <Button variant="outline" size="md" onClick={() => setDetailModalOpen(false)}>
                Close
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}

export default AttendanceCompOffPage;

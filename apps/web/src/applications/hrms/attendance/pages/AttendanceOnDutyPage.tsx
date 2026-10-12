import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Select,
  Input,
  SearchInput,
  Checkbox,
  Badge,
  Avatar,
  Modal,
  Tabs,
  Alert,
  LoadingState,
  EmptyState,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  fetchOnDutyWorkspace,
  fetchOnDutyDetails,
  fetchOnDutyTypes,
  createOnDutyRequest,
  assignOnDutyReviewer,
  startOnDutyReview,
  requestOnDutyClarification,
  provideOnDutyClarification,
  reviewOnDutyDecision,
  cancelOnDutyRequest,
  previewBulkOnDutyApproval,
  executeBulkOnDutyAction,
  exportOnDutyCsvBlob,
} from '../api/attendanceApi';
import type {
  OnDutyItemV1,
  OnDutyDetailV1,
  OnDutySummaryCounters,
  OnDutyFilterV1,
  OnDutyTypeConfig,
  OnDutyDurationType,
  OnDutyApprovalStatus,
  OnDutyProcessingStatus,
  BulkOnDutyEligibilityPreview,
  BulkOnDutyActionInput,
  CreateOnDutyRequestPayload,
} from '../types/attendance.types';

// Preset date helpers
function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStartOfMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getEndOfMonthString(): string {
  const d = new Date();
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function formatDate(val?: string | Date | null): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatDayOfWeek(val?: string | null): string {
  if (!val) return '';
  const parts = val.split('-').map(Number);
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  }
  return '';
}

function formatDateTime(val?: string | Date | null): string {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const DURATION_TYPE_LABELS: Record<OnDutyDurationType, string> = {
  full_day: 'Full Day',
  half_day: 'Half Day',
  hourly: 'Hourly',
  multi_day: 'Multi-Day',
};

const OD_TYPE_LABELS: Record<string, string> = {
  od_client_visit: 'Client Visit',
  od_field_duty: 'Field Duty',
  od_site_work: 'Customer Site Work',
  od_seminar: 'Seminar / Training',
  od_travel: 'Business Travel',
  od_deployment: 'Project Deployment',
  od_other: 'Other Official Duty',
};

export function AttendanceOnDutyPage() {
  // 1. Date Range State (defaults to current month)
  const [startDate, setStartDate] = useState(getStartOfMonthString());
  const [endDate, setEndDate] = useState(getEndOfMonthString());

  // 2. Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<string>('all');
  const [odTypeId, setOdTypeId] = useState<string>('all');
  const [processingStatus, setProcessingStatus] = useState<string>('all');

  // Progressive Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [durationType, setDurationType] = useState<string>('all');
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [assignedTo, setAssignedTo] = useState('all');
  const [departmentId, setDepartmentId] = useState('all');
  const [locationId, setLocationId] = useState('all');
  const [conflictStatus, setConflictStatus] = useState('all');

  // 3. Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // 4. Data State
  const [items, setItems] = useState<OnDutyItemV1[]>([]);
  const [configuredTypes, setConfiguredTypes] = useState<OnDutyTypeConfig[]>([]);
  const [counters, setCounters] = useState<OnDutySummaryCounters>({
    pendingReview: 0,
    underReview: 0,
    awaitingInfo: 0,
    approvedToday: 0,
    processingIssues: 0,
    upcomingOd: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 5. Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 6. Review Drawer State
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<OnDutyDetailV1 | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'evidence' | 'decision' | 'history'>('overview');
  const [drawerActionLoading, setDrawerActionLoading] = useState(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'clarify'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [clarificationReply, setClarificationReply] = useState('');

  // 7. New Request Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newStep, setNewStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [formEmployeeId, setFormEmployeeId] = useState('emp_demo_01');
  const [formOdTypeId, setFormOdTypeId] = useState('od_client_visit');
  const [formDurationType, setFormDurationType] = useState<OnDutyDurationType>('full_day');
  const [formStartDate, setFormStartDate] = useState(getTodayString());
  const [formEndDate, setFormEndDate] = useState(getTodayString());
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formHalfDaySession, setFormHalfDaySession] = useState<'first_half' | 'second_half'>('first_half');
  const [formLocation, setFormLocation] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formProjectRef, setFormProjectRef] = useState('');
  const [formAttachments, setFormAttachments] = useState<Array<{ name: string; size: string; url?: string }>>([]);
  const [formNewAttachmentName, setFormNewAttachmentName] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 8. Bulk Operations State
  const [bulkModalAction, setBulkModalAction] = useState<
    BulkOnDutyActionInput['action'] | null
  >(null);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<BulkOnDutyEligibilityPreview | null>(null);
  const [bulkResultReport, setBulkResultReport] = useState<{
    succeeded: string[];
    skipped: Array<{ id: string; reason: string }>;
    failed: Array<{ id: string; error: string }>;
  } | null>(null);

  // 9. Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [exportScope, setExportScope] = useState<'selected' | 'filtered'>('filtered');
  const [exportLevel, setExportLevel] = useState<'standard' | 'detailed' | 'audit'>('standard');
  const [exporting, setExporting] = useState(false);

  // Fetch configured OD Types on mount
  useEffect(() => {
    fetchOnDutyTypes()
      .then((types) => setConfiguredTypes(types))
      .catch(() => setConfiguredTypes([]));
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load Table Data & Summary Counters
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter: OnDutyFilterV1 = {
        startDate,
        endDate,
        search: debouncedSearch.trim() || undefined,
        approvalStatus: approvalStatus === 'all' ? undefined : approvalStatus,
        odTypeId: odTypeId === 'all' ? undefined : odTypeId,
        processingStatus: processingStatus === 'all' ? undefined : processingStatus,
        durationType: durationType === 'all' ? undefined : durationType,
        submittedFrom: submittedFrom || undefined,
        submittedTo: submittedTo || undefined,
        assignedTo: assignedTo === 'all' ? undefined : assignedTo,
        departmentId: departmentId === 'all' ? undefined : departmentId,
        locationId: locationId === 'all' ? undefined : locationId,
        conflictStatus: conflictStatus === 'all' ? undefined : conflictStatus,
        page,
        pageSize,
      };

      const res = await fetchOnDutyWorkspace(filter);
      setItems(res.items);
      setCounters(res.counters);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load On-Duty requests');
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    debouncedSearch,
    approvalStatus,
    odTypeId,
    processingStatus,
    durationType,
    submittedFrom,
    submittedTo,
    assignedTo,
    departmentId,
    locationId,
    conflictStatus,
    page,
    pageSize,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Review Drawer Details
  const handleOpenDrawer = useCallback(async (id: string) => {
    setDrawerId(id);
    setDrawerLoading(true);
    setDecisionNotes('');
    setClarificationReply('');
    setDrawerTab('overview');
    try {
      const data = await fetchOnDutyDetails(id);
      setDrawerDetail(data);
    } catch {
      // Handled gracefully in drawer
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const handleCloseDrawer = () => {
    setDrawerId(null);
    setDrawerDetail(null);
  };

  // Quick action from drawer: Assign
  const handleQuickAssign = async (assignee: string) => {
    if (!drawerId) return;
    setDrawerActionLoading(true);
    try {
      await assignOnDutyReviewer(drawerId, assignee, 'HR Reviewer');
      await handleOpenDrawer(drawerId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setDrawerActionLoading(false);
    }
  };

  // Quick action from drawer: Start Review
  const handleQuickStartReview = async () => {
    if (!drawerId) return;
    setDrawerActionLoading(true);
    try {
      await startOnDutyReview(drawerId);
      await handleOpenDrawer(drawerId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start review');
    } finally {
      setDrawerActionLoading(false);
    }
  };

  // Drawer Decision: Approve / Reject / Clarify
  const handleDrawerDecision = async () => {
    if (!drawerId) return;
    if (decisionType === 'rejected' && !decisionNotes.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    if (decisionType === 'clarify' && !decisionNotes.trim()) {
      alert('Please enter notes or questions for the employee.');
      return;
    }

    setDrawerActionLoading(true);
    try {
      if (decisionType === 'clarify') {
        await requestOnDutyClarification(drawerId, decisionNotes);
      } else {
        await reviewOnDutyDecision(drawerId, {
          action: decisionType,
          reason: decisionNotes || undefined,
          notes: decisionNotes || undefined,
        });
      }
      await handleOpenDrawer(drawerId);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Decision execution failed');
    } finally {
      setDrawerActionLoading(false);
    }
  };

  // Provide Clarification response
  const handleProvideClarification = async () => {
    if (!drawerId || !clarificationReply.trim()) return;
    setDrawerActionLoading(true);
    try {
      await provideOnDutyClarification(drawerId, clarificationReply.trim());
      await handleOpenDrawer(drawerId);
      await loadData();
      setClarificationReply('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setDrawerActionLoading(false);
    }
  };

  // Selection handlers
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Counter quick-filters
  const handleCounterClick = (type: string) => {
    setPage(1);
    switch (type) {
      case 'submitted':
        setApprovalStatus(approvalStatus === 'submitted' ? 'all' : 'submitted');
        break;
      case 'under_review':
        setApprovalStatus(approvalStatus === 'under_review' ? 'all' : 'under_review');
        break;
      case 'awaiting_info':
        setApprovalStatus(approvalStatus === 'awaiting_info' ? 'all' : 'awaiting_info');
        break;
      case 'approved_today':
        setApprovalStatus(approvalStatus === 'approved' ? 'all' : 'approved');
        break;
      case 'processing_issues':
        setProcessingStatus(processingStatus === 'processing_issues' ? 'all' : 'processing_issues');
        break;
      case 'upcoming_od':
        setStartDate(getTodayString());
        break;
      default:
        break;
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setApprovalStatus('all');
    setOdTypeId('all');
    setProcessingStatus('all');
    setDurationType('all');
    setSubmittedFrom('');
    setSubmittedTo('');
    setAssignedTo('all');
    setDepartmentId('all');
    setLocationId('all');
    setConflictStatus('all');
    setStartDate(getStartOfMonthString());
    setEndDate(getEndOfMonthString());
    setPage(1);
  };

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (durationType !== 'all') count++;
    if (submittedFrom || submittedTo) count++;
    if (assignedTo !== 'all') count++;
    if (departmentId !== 'all') count++;
    if (locationId !== 'all') count++;
    if (conflictStatus !== 'all') count++;
    return count;
  }, [durationType, submittedFrom, submittedTo, assignedTo, departmentId, locationId, conflictStatus]);

  // Bulk operation executor
  const handleOpenBulkModal = async (
    action: BulkOnDutyActionInput['action'],
  ) => {
    setBulkModalAction(action);
    setBulkReason('');
    setBulkResultReport(null);
    if (action === 'bulk_approve') {
      try {
        const preview = await previewBulkOnDutyApproval(Array.from(selectedIds));
        setBulkPreview(preview);
      } catch {
        setBulkPreview(null);
      }
    } else {
      setBulkPreview(null);
    }
  };

  const handleExecuteBulkAction = async () => {
    if (!bulkModalAction) return;
    setBulkSubmitting(true);
    try {
      const result = await executeBulkOnDutyAction({
        action: bulkModalAction,
        requestIds: Array.from(selectedIds),
        assignedTo: bulkAssignee || undefined,
        reason: bulkReason || undefined,
        notes: bulkReason || undefined,
      });
      setBulkResultReport(result);
      setSelectedIds(new Set());
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Export executor
  const handleExecuteExport = async () => {
    setExporting(true);
    try {
      const blob = await exportOnDutyCsvBlob({
        startDate,
        endDate,
        search: debouncedSearch || undefined,
        approvalStatus: approvalStatus === 'all' ? undefined : approvalStatus,
        odTypeId: odTypeId === 'all' ? undefined : odTypeId,
        processingStatus: processingStatus === 'all' ? undefined : processingStatus,
        selectedIds: exportScope === 'selected' ? Array.from(selectedIds) : undefined,
        format: exportFormat,
        level: exportLevel,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `on-duty-export-${getTodayString()}.${exportFormat === 'csv' ? 'csv' : exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setShowExportModal(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  // Create On-Duty Request Submit
  const handleCreateRequest = async (isDraft: boolean) => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      const payload: CreateOnDutyRequestPayload = {
        employeeId: formEmployeeId,
        odTypeId: formOdTypeId,
        durationType: formDurationType,
        startDate: formStartDate,
        endDate: formDurationType === 'multi_day' ? formEndDate : formStartDate,
        startTime: formDurationType === 'hourly' ? formStartTime : undefined,
        endTime: formDurationType === 'hourly' ? formEndTime : undefined,
        halfDaySession: formDurationType === 'half_day' ? formHalfDaySession : undefined,
        locationOrSite: formLocation.trim() || undefined,
        workLocation: formLocation.trim() || undefined,
        purpose: formPurpose.trim() || 'Official Duty',
        reason: formPurpose.trim() || 'Official Duty',
        projectReference: formProjectRef.trim() || undefined,
        evidenceAttachments: formAttachments,
        isDraft,
      };

      await createOnDutyRequest(payload, isDraft);
      setShowNewModal(false);
      setNewStep(1);
      setFormPurpose('');
      setFormLocation('');
      setFormProjectRef('');
      setFormAttachments([]);
      await loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Renders Approval Status Badge
  const renderApprovalBadge = (status: OnDutyApprovalStatus) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'under_review':
        return <Badge variant="info">Under Review</Badge>;
      case 'awaiting_info':
        return <Badge variant="warning">Awaiting Info</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="neutral">Cancelled</Badge>;
      case 'withdrawn':
        return <Badge variant="neutral">Withdrawn</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Renders Processing Status Badge
  const renderProcessingBadge = (status: OnDutyProcessingStatus) => {
    switch (status) {
      case 'applied':
        return <Badge variant="success">Applied</Badge>;
      case 'partially_applied':
        return <Badge variant="info">Partially Applied</Badge>;
      case 'processing_issues':
        return <Badge variant="danger">Issues</Badge>;
      case 'blocked':
        return <Badge variant="danger">Blocked</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'not_applicable':
      default:
        return <Badge variant="neutral">Not Applied</Badge>;
    }
  };

  return (
    <Page>
      {/* 1. Header & Actions Strip */}
      <PageHeader
        breadcrumbs={<span>Attendance / On-Duty</span>}
        title={
          <span>
            On-Duty (OD)
            <span className="bezent-sr-only">
              Manage client visits, site deployments, field duties, and official external work approvals
            </span>
          </span>
        }
        actions={
          <Inline gap="xs" align="center">
            {/* Date Range Selector */}
            <Card padding="none">
              <Inline gap="xs" align="center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const from = new Date(startDate);
                    from.setMonth(from.getMonth() - 1);
                    setStartDate(from.toISOString().slice(0, 10));
                  }}
                  aria-label="Previous month"
                >
                  <BezentIcon name="chevron_left" size={14} />
                </Button>
                <span className="bezent-table-meta-title">
                  {formatDate(startDate)} – {formatDate(endDate)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const to = new Date(endDate);
                    to.setMonth(to.getMonth() + 1);
                    setEndDate(to.toISOString().slice(0, 10));
                  }}
                  aria-label="Next month"
                >
                  <BezentIcon name="chevron_right" size={14} />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStartDate(getStartOfMonthString());
                    setEndDate(getEndOfMonthString());
                  }}
                >
                  Today
                </Button>
              </Inline>
            </Card>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setExportScope('filtered');
                setShowExportModal(true);
              }}
            >
              <BezentIcon name="download" size={14} /> Export
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormEmployeeId('emp_demo_01');
                setFormStartDate(getTodayString());
                setFormEndDate(getTodayString());
                setNewStep(1);
                setShowNewModal(true);
              }}
            >
              <BezentIcon name="add" size={14} /> New Request
            </Button>
          </Inline>
        }
      />

      <Stack gap="md">
        {/* 2. Six Compact Summary Counters Strip (~78px height, 1 row) */}
        <Grid columns={6} gap="sm">
          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'submitted' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('submitted')}
            role="button"
            tabIndex={0}
            title="Requests awaiting review"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Pending Review</span>
              <BezentIcon name="tasks" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.pendingReview}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'under_review' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('under_review')}
            role="button"
            tabIndex={0}
            title="Requests under active review"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Under Review</span>
              <BezentIcon name="search" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.underReview}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'awaiting_info' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('awaiting_info')}
            role="button"
            tabIndex={0}
            title="Requests awaiting employee clarification"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Awaiting Info</span>
              <BezentIcon name="notes" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.awaitingInfo}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${approvalStatus === 'approved' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('approved_today')}
            role="button"
            tabIndex={0}
            title="Requests approved today"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Approved Today</span>
              <BezentIcon name="approvals" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.approvedToday}</span>
          </div>

          <div
            className={`bezent-stat-card--compact ${processingStatus === 'processing_issues' ? 'is-active' : ''}`}
            onClick={() => handleCounterClick('processing_issues')}
            role="button"
            tabIndex={0}
            title="Approved requests blocked or failed during application"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Processing Issues</span>
              <BezentIcon name="security" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.processingIssues}</span>
          </div>

          <div
            className="bezent-stat-card--compact"
            onClick={() => handleCounterClick('upcoming_od')}
            role="button"
            tabIndex={0}
            title="Upcoming scheduled On-Duty periods"
          >
            <div className="bezent-stat-card__header">
              <span className="bezent-stat-card__title">Upcoming OD</span>
              <BezentIcon name="calendar" size={15} />
            </div>
            <span className="bezent-stat-card__num">{counters.upcomingOd}</span>
          </div>
        </Grid>

        {/* 3. Primary Filter Toolbar */}
        <Card padding="sm">
          <Stack gap="sm">
            <div className="bezent-filter-toolbar">
              <SearchInput
                placeholder="Search by name, employee code, request #, site..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <Select
                value={approvalStatus}
                onChange={(e) => {
                  setApprovalStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Approval Statuses</option>
                <option value="submitted">Pending Review</option>
                <option value="under_review">Under Review</option>
                <option value="awaiting_info">Awaiting Info</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="withdrawn">Withdrawn</option>
              </Select>

              <Select
                value={odTypeId}
                onChange={(e) => {
                  setOdTypeId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All OD Types</option>
                {configuredTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>

              <Select
                value={processingStatus}
                onChange={(e) => {
                  setProcessingStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Processing States</option>
                <option value="not_applicable">Not Applicable</option>
                <option value="pending">Pending</option>
                <option value="applied">Applied</option>
                <option value="partially_applied">Partially Applied</option>
                <option value="processing_issues">Processing Issues</option>
                <option value="blocked">Blocked</option>
                <option value="failed">Failed</option>
              </Select>

              <div className="bezent-filter-toolbar__actions">
                <Button
                  variant={showAdvancedFilters ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <BezentIcon name="filter_list" size={14} />
                  {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
                  {activeAdvancedFilterCount > 0 && ` (${activeAdvancedFilterCount})`}
                </Button>

                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </div>

            {/* Collapsible Advanced Filters Row */}
            {showAdvancedFilters && (
              <div className="bezent-filter-toolbar__more">
                <Stack gap="xs">
                  <span className="bezent-card__desc">Duration Type</span>
                  <Select
                    value={durationType}
                    onChange={(e) => {
                      setDurationType(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Durations</option>
                    <option value="full_day">Full Day</option>
                    <option value="half_day">Half Day</option>
                    <option value="hourly">Hourly</option>
                    <option value="multi_day">Multi-Day</option>
                  </Select>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Duty Date Range</span>
                  <Inline gap="xs">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </Inline>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Assigned Reviewer</span>
                  <Select
                    value={assignedTo}
                    onChange={(e) => {
                      setAssignedTo(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Reviewers</option>
                    <option value="unassigned">Unassigned</option>
                  </Select>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Department</span>
                  <Select
                    value={departmentId}
                    onChange={(e) => {
                      setDepartmentId(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Departments</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales</option>
                    <option value="Support">Support</option>
                  </Select>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Location / Site</span>
                  <Select
                    value={locationId}
                    onChange={(e) => {
                      setLocationId(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Locations</option>
                  </Select>
                </Stack>

                <Stack gap="xs">
                  <span className="bezent-card__desc">Conflict Status</span>
                  <Select
                    value={conflictStatus}
                    onChange={(e) => {
                      setConflictStatus(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">All Records</option>
                    <option value="has_conflict">Has Conflict Flag</option>
                  </Select>
                </Stack>

                <Inline justify="end" align="center" gap="xs">
                  <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                    Reset Filters
                  </Button>
                  <Button variant="primary" size="sm" onClick={loadData}>
                    Apply Filters
                  </Button>
                </Inline>
              </div>
            )}
          </Stack>
        </Card>

        {/* 4. Contextual Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <Card padding="sm">
            <Inline justify="between" align="center">
              <Inline gap="md" align="center">
                <Checkbox
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                />
                <strong>{selectedIds.size} selected</strong>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set(items.map((i) => i.id)))}
                >
                  Select all {totalCount}
                </Button>
              </Inline>

              <Inline gap="xs" align="center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenBulkModal('assign')}
                >
                  <BezentIcon name="person" size={14} /> Assign
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenBulkModal('start_review')}
                >
                  <BezentIcon name="play_arrow" size={14} /> Start Review
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenBulkModal('request_info')}
                >
                  <BezentIcon name="chat" size={14} /> Request Info
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenBulkModal('bulk_approve')}
                >
                  <BezentIcon name="check" size={14} /> Approve
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleOpenBulkModal('bulk_reject')}
                >
                  <BezentIcon name="close" size={14} /> Reject
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setExportScope('selected');
                    setShowExportModal(true);
                  }}
                >
                  <BezentIcon name="download" size={14} /> Export Selected
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </Inline>
            </Inline>
          </Card>
        )}

        {/* 5. Ten-Column Data Table (+ Checkbox) */}
        {loading ? (
          <LoadingState label="Loading On-Duty workspace..." />
        ) : error ? (
          <Alert variant="danger" title="Error Loading Requests">
            {error}
            <Button variant="secondary" onClick={loadData}>
              Retry
            </Button>
          </Alert>
        ) : items.length === 0 ? (
          <EmptyState
            title="No On-Duty Requests Found"
            description="There are currently no On-Duty requests matching the specified date range and filters."
          />
        ) : (
          <Table compact hoverable className="bezent-table--workspace">
            <TableHead>
              <TableRow>
                <TableHeaderCell className="bezent-table-col--select">
                  <Checkbox
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                </TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--employee">Employee</TableHeaderCell>
                <TableHeaderCell>Duty Period</TableHeaderCell>
                <TableHeaderCell>OD Type</TableHeaderCell>
                <TableHeaderCell>Duration</TableHeaderCell>
                <TableHeaderCell>Location / Purpose</TableHeaderCell>
                <TableHeaderCell>Submitted At</TableHeaderCell>
                <TableHeaderCell>Assigned To</TableHeaderCell>
                <TableHeaderCell>Approval Status</TableHeaderCell>
                <TableHeaderCell>Processing Status</TableHeaderCell>
                <TableHeaderCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                  Actions
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((req) => (
                <TableRow key={req.id}>
                  {/* 0. Select Checkbox */}
                  <TableCell className="bezent-table-col--select">
                    <Checkbox
                      checked={selectedIds.has(req.id)}
                      onChange={() => toggleSelectOne(req.id)}
                    />
                  </TableCell>

                  {/* 1. Employee */}
                  <TableCell className="bezent-table-col--employee">
                    <div className="bezent-table-cell--avatar-meta">
                      <Avatar
                        initials={req.employeeName ? req.employeeName.slice(0, 2).toUpperCase() : 'EM'}
                        alt={req.employeeName}
                        size="sm"
                      />
                      <div className="bezent-table-meta-group">
                        <span className="bezent-table-meta-title" title={req.employeeName}>
                          {req.employeeName}
                        </span>
                        <span className="bezent-table-meta-subtitle">
                          {req.employeeCode} {req.departmentName ? `• ${req.departmentName}` : ''}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 2. Duty Period */}
                  <TableCell>
                    <div className="bezent-table-meta-group">
                      <span className="bezent-table-meta-title">
                        {formatDate(req.startDate)}
                        {req.startDate !== req.endDate ? ` – ${formatDate(req.endDate)}` : ''}
                      </span>
                      <span className="bezent-table-meta-subtitle">
                        {req.startDate === req.endDate
                          ? formatDayOfWeek(req.startDate)
                          : `${req.durationHours} hrs calculated`}
                      </span>
                    </div>
                  </TableCell>

                  {/* 3. OD Type */}
                  <TableCell>
                    <span
                      className="bezent-table-cell--nowrap"
                      title={OD_TYPE_LABELS[req.odTypeId] ?? req.odTypeName ?? req.odTypeId}
                    >
                      {OD_TYPE_LABELS[req.odTypeId] ?? req.odTypeName ?? req.odTypeId}
                    </span>
                  </TableCell>

                  {/* 4. Duration */}
                  <TableCell>
                    <Badge variant="neutral">
                      {DURATION_TYPE_LABELS[req.durationType] ?? req.durationType}
                      {req.durationType === 'half_day' && req.halfDaySession
                        ? ` (${req.halfDaySession === 'first_half' ? '1st Half' : '2nd Half'})`
                        : ''}
                    </Badge>
                  </TableCell>

                  {/* 5. Location / Purpose */}
                  <TableCell>
                    <div className="bezent-table-meta-group">
                      <span className="bezent-table-meta-title" title={req.locationOrSite || req.purpose}>
                        {req.locationOrSite || 'On-Site / External'}
                      </span>
                      <span className="bezent-table-meta-subtitle" title={req.purpose}>
                        {req.projectReference ? `[${req.projectReference}] ` : ''}
                        {req.purpose}
                      </span>
                    </div>
                  </TableCell>

                  {/* 6. Submitted At */}
                  <TableCell>
                    <div className="bezent-table-meta-group">
                      <span className="bezent-table-meta-title">{formatDate(req.submittedAt)}</span>
                      <span className="bezent-table-meta-subtitle">
                        {req.submittedAt ? new Date(req.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                  </TableCell>

                  {/* 7. Assigned To */}
                  <TableCell>
                    {req.assignedToName ? (
                      <span className="bezent-table-cell--nowrap">{req.assignedToName}</span>
                    ) : (
                      <Badge variant="neutral">Unassigned</Badge>
                    )}
                  </TableCell>

                  {/* 8. Approval Status */}
                  <TableCell>{renderApprovalBadge(req.approvalStatus)}</TableCell>

                  {/* 9. Processing Status */}
                  <TableCell>{renderProcessingBadge(req.processingStatus)}</TableCell>

                  {/* 10. Actions (Sticky Right) */}
                  <TableCell className="bezent-table-col--actions bezent-table-col--sticky-right">
                    <Inline gap="xs" align="center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenDrawer(req.id)}
                      >
                        {req.approvalStatus === 'submitted' || req.approvalStatus === 'under_review' ? 'Review' : 'View'}
                      </Button>
                    </Inline>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination Strip */}
        {totalPages > 1 && (
          <Inline justify="between" align="center">
            <span className="bezent-card__desc">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} requests
            </span>
            <Inline gap="xs">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </Inline>
          </Inline>
        )}
      </Stack>

      {/* 6. Four-Tab Review Drawer (Modal size="lg") */}
      {drawerId && (
        <Modal
          title={
            drawerDetail
              ? `Review On-Duty Request ${drawerDetail.requestNumber}`
              : 'Loading On-Duty Request...'
          }
          isOpen={true}
          onClose={handleCloseDrawer}
          size="lg"
        >
          {drawerLoading || !drawerDetail ? (
            <LoadingState label="Fetching request details and attendance context..." />
          ) : (
            <Stack gap="md">
              {/* Header Status & Employee Summary */}
              <Inline justify="between" align="center">
                <Inline gap="sm" align="center">
                  <Avatar
                    initials={drawerDetail.employeeName ? drawerDetail.employeeName.slice(0, 2).toUpperCase() : 'EM'}
                    alt={drawerDetail.employeeName}
                  />
                  <Stack gap="none">
                    <strong>{drawerDetail.employeeName}</strong>
                    <span className="bezent-card__desc">
                      {drawerDetail.employeeCode} {drawerDetail.departmentName ? `• ${drawerDetail.departmentName}` : ''}
                    </span>
                  </Stack>
                </Inline>
                <Inline gap="xs">
                  {renderApprovalBadge(drawerDetail.approvalStatus)}
                  {renderProcessingBadge(drawerDetail.processingStatus)}
                </Inline>
              </Inline>

              {/* Four Tabs */}
              <Tabs
                items={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'evidence', label: 'Evidence' },
                  { id: 'decision', label: 'Decision' },
                  { id: 'history', label: 'History' },
                ]}
                activeId={drawerTab}
                onChange={(tabId) => setDrawerTab(tabId as typeof drawerTab)}
              />

              {/* Tab 1: Overview */}
              {drawerTab === 'overview' && (
                <Stack gap="md">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Duty Details</span>
                      <Grid columns={2} gap="sm">
                        <Stack gap="none">
                          <span className="bezent-card__desc">Duty Period</span>
                          <strong>
                            {formatDate(drawerDetail.startDate)}
                            {drawerDetail.startDate !== drawerDetail.endDate ? ` to ${formatDate(drawerDetail.endDate)}` : ''}
                          </strong>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">OD Type</span>
                          <strong>
                            {OD_TYPE_LABELS[drawerDetail.odTypeId] ?? drawerDetail.odTypeName ?? drawerDetail.odTypeId}
                          </strong>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Duration Type</span>
                          <span>
                            {DURATION_TYPE_LABELS[drawerDetail.durationType]} ({drawerDetail.durationHours} hrs)
                          </span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Work Location / Site</span>
                          <span>{drawerDetail.locationOrSite || 'External / Customer Site'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Business Purpose</span>
                          <span>{drawerDetail.purpose}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Project Reference</span>
                          <span>{drawerDetail.projectReference || 'None'}</span>
                        </Stack>
                      </Grid>
                    </Stack>
                  </Card>

                  {/* Attendance Context & Conflicts */}
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Attendance Policy & Conflict Checks</span>
                      <Grid columns={2} gap="sm">
                        <Stack gap="none">
                          <span className="bezent-card__desc">Assigned Shift Schedule</span>
                          <span>
                            {drawerDetail.attendanceContext?.shiftSchedule
                              ? `${drawerDetail.attendanceContext.shiftSchedule.shiftName} (${drawerDetail.attendanceContext.shiftSchedule.startTime} – ${drawerDetail.attendanceContext.shiftSchedule.endTime})`
                              : 'Standard General Shift'}
                          </span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Punches Summary</span>
                          <span>{drawerDetail.attendanceContext?.recordedPunchesSummary || 'No punches recorded'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Leave Conflict</span>
                          <span>{drawerDetail.attendanceContext?.leaveConflict || 'No conflicting leaves'}</span>
                        </Stack>
                        <Stack gap="none">
                          <span className="bezent-card__desc">Payroll State</span>
                          <span>
                            {drawerDetail.attendanceContext?.isPayrollLocked ? (
                              <Badge variant="danger">Payroll Locked</Badge>
                            ) : (
                              <Badge variant="success">Period Open</Badge>
                            )}
                          </span>
                        </Stack>
                      </Grid>
                    </Stack>
                  </Card>

                  {/* Workdays Breakdown */}
                  {drawerDetail.workdays && drawerDetail.workdays.length > 0 && (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <span className="bezent-table-meta-title">Workdays Credit Breakdown</span>
                        <Table compact>
                          <TableHead>
                            <TableRow>
                              <TableHeaderCell>Workday</TableHeaderCell>
                              <TableHeaderCell>Credit Status</TableHeaderCell>
                              <TableHeaderCell>Credited Mins</TableHeaderCell>
                              <TableHeaderCell>Processing Status</TableHeaderCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {drawerDetail.workdays.map((w) => (
                              <TableRow key={w.id}>
                                <TableCell>{formatDate(w.workday)}</TableCell>
                                <TableCell>{w.creditedStatus}</TableCell>
                                <TableCell>{w.creditedWorkedMinutes} min</TableCell>
                                <TableCell>
                                  {renderProcessingBadge(
                                    w.processingStatus as OnDutyProcessingStatus,
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Stack>
                    </Card>
                  )}

                  {/* Quick Action Strip */}
                  <Inline justify="between" align="center">
                    <Inline gap="xs">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={drawerActionLoading}
                        onClick={() => handleQuickAssign('usr_demo_hr_01')}
                      >
                        Assign to Me
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={drawerActionLoading}
                        onClick={handleQuickStartReview}
                      >
                        Start Review
                      </Button>
                    </Inline>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setDrawerTab('decision')}
                    >
                      Review & Decide
                    </Button>
                  </Inline>
                </Stack>
              )}

              {/* Tab 2: Evidence */}
              {drawerTab === 'evidence' && (
                <Stack gap="md">
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Evidence & Attachments</span>
                      {drawerDetail.evidenceAttachments && drawerDetail.evidenceAttachments.length > 0 ? (
                        drawerDetail.evidenceAttachments.map((att, idx) => (
                          <Inline key={idx} justify="between" align="center">
                            <Inline gap="xs" align="center">
                              <BezentIcon name="attachment" size={16} />
                              <span>{att.name}</span>
                              <span className="bezent-card__desc">({att.size})</span>
                            </Inline>
                            <Button variant="ghost" size="sm">
                              Download
                            </Button>
                          </Inline>
                        ))
                      ) : (
                        <span className="bezent-card__desc">No supporting documents attached.</span>
                      )}
                    </Stack>
                  </Card>

                  {/* Clarification Exchange Thread */}
                  {(drawerDetail.clarificationNotes || drawerDetail.clarificationResponse) && (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <span className="bezent-table-meta-title">Clarification Thread</span>
                        {drawerDetail.clarificationNotes && (
                          <Card padding="sm">
                            <Stack gap="none">
                              <strong>Reviewer Request:</strong>
                              <p className="bezent-card__desc">{drawerDetail.clarificationNotes}</p>
                              <span className="bezent-card__desc">
                                Requested at: {formatDateTime(drawerDetail.clarificationRequestedAt)}
                              </span>
                            </Stack>
                          </Card>
                        )}
                        {drawerDetail.clarificationResponse && (
                          <Card padding="sm">
                            <Stack gap="none">
                              <strong>Employee Response:</strong>
                              <p className="bezent-card__desc">{drawerDetail.clarificationResponse}</p>
                              <span className="bezent-card__desc">
                                Provided at: {formatDateTime(drawerDetail.clarificationProvidedAt)}
                              </span>
                            </Stack>
                          </Card>
                        )}
                      </Stack>
                    </Card>
                  )}

                  {/* Response Input (if awaiting info) */}
                  {drawerDetail.approvalStatus === 'awaiting_info' && (
                    <Card padding="sm">
                      <Stack gap="xs">
                        <span className="bezent-table-meta-title">Provide Clarification</span>
                        <Input
                          placeholder="Type employee clarification response..."
                          value={clarificationReply}
                          onChange={(e) => setClarificationReply(e.target.value)}
                        />
                        <Inline justify="end">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={drawerActionLoading || !clarificationReply.trim()}
                            onClick={handleProvideClarification}
                          >
                            Submit Clarification
                          </Button>
                        </Inline>
                      </Stack>
                    </Card>
                  )}
                </Stack>
              )}

              {/* Tab 3: Decision */}
              {drawerTab === 'decision' && (
                <Stack gap="md">
                  <Card padding="sm">
                    <Stack gap="sm">
                      <span className="bezent-table-meta-title">Decision & Resolution</span>

                      <Inline gap="md">
                        <label>
                          <input
                            type="radio"
                            name="decision"
                            value="approved"
                            checked={decisionType === 'approved'}
                            onChange={() => setDecisionType('approved')}
                          />{' '}
                          <strong>Approve Request</strong>
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="decision"
                            value="rejected"
                            checked={decisionType === 'rejected'}
                            onChange={() => setDecisionType('rejected')}
                          />{' '}
                          <strong>Reject Request</strong>
                        </label>
                        <label>
                          <input
                            type="radio"
                            name="decision"
                            value="clarify"
                            checked={decisionType === 'clarify'}
                            onChange={() => setDecisionType('clarify')}
                          />{' '}
                          <strong>Request More Info</strong>
                        </label>
                      </Inline>

                      <Stack gap="xs">
                        <span className="bezent-card__desc">
                          {decisionType === 'rejected'
                            ? 'Rejection Reason (Mandatory):'
                            : decisionType === 'clarify'
                              ? 'Information Required from Employee (Mandatory):'
                              : 'Approval Notes / Comments (Optional):'}
                        </span>
                        <Input
                          placeholder="Enter reviewer decision notes..."
                          value={decisionNotes}
                          onChange={(e) => setDecisionNotes(e.target.value)}
                        />
                      </Stack>

                      {decisionType === 'approved' && (
                        <Alert variant="info" title="Attendance Credit Impact">
                          Approving this request will credit On-Duty attendance for all scheduled workdays
                          in the duty period ({formatDate(drawerDetail.startDate)} to {formatDate(drawerDetail.endDate)}).
                        </Alert>
                      )}

                      <Inline justify="end">
                        <Button
                          variant={decisionType === 'rejected' ? 'danger' : 'primary'}
                          disabled={drawerActionLoading}
                          onClick={handleDrawerDecision}
                        >
                          {decisionType === 'approved'
                            ? 'Confirm & Apply Approval'
                            : decisionType === 'rejected'
                              ? 'Confirm Rejection'
                              : 'Send Request for Info'}
                        </Button>
                      </Inline>
                    </Stack>
                  </Card>
                </Stack>
              )}

              {/* Tab 4: History */}
              {drawerTab === 'history' && (
                <Card padding="sm">
                  <Stack gap="sm">
                    <span className="bezent-table-meta-title">Audit History</span>
                    {drawerDetail.audits && drawerDetail.audits.length > 0 ? (
                      drawerDetail.audits.map((a) => (
                        <Card key={a.id} padding="sm">
                          <Inline justify="between" align="center">
                            <Stack gap="none">
                              <strong>{a.action.toUpperCase()}</strong>
                              <span className="bezent-card__desc">{a.notes || 'No comments'}</span>
                            </Stack>
                            <Stack gap="none" align="end">
                              <span>{formatDateTime(a.createdAt)}</span>
                              <span className="bezent-card__desc">
                                {a.actorUserId ? `User: ${a.actorUserId}` : 'System'}
                              </span>
                            </Stack>
                          </Inline>
                        </Card>
                      ))
                    ) : (
                      <span className="bezent-card__desc">No audit logs recorded.</span>
                    )}
                  </Stack>
                </Card>
              )}
            </Stack>
          )}
        </Modal>
      )}

      {/* 7. New On-Duty Request Modal (5 Steps) */}
      {showNewModal && (
        <Modal
          title={`New On-Duty Request — Step ${newStep} of 5`}
          isOpen={true}
          onClose={() => setShowNewModal(false)}
          size="md"
        >
          <Stack gap="md">
            {formError && <Alert variant="danger">{formError}</Alert>}

            {/* Step 1: Employee & OD Type */}
            {newStep === 1 && (
              <Stack gap="sm">
                <span className="bezent-table-meta-title">Step 1: Employee & On-Duty Type</span>
                <Stack gap="xs">
                  <label className="bezent-card__desc">Employee ID</label>
                  <Input
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    placeholder="Enter Employee ID (e.g. emp_demo_01)"
                  />
                </Stack>
                <Stack gap="xs">
                  <label className="bezent-card__desc">On-Duty Type</label>
                  <Select
                    value={formOdTypeId}
                    onChange={(e) => setFormOdTypeId(e.target.value)}
                  >
                    {configuredTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Stack>
              </Stack>
            )}

            {/* Step 2: Duty Period & Duration */}
            {newStep === 2 && (
              <Stack gap="sm">
                <span className="bezent-table-meta-title">Step 2: Duty Period & Duration</span>
                <Stack gap="xs">
                  <label className="bezent-card__desc">Duration Type</label>
                  <Select
                    value={formDurationType}
                    onChange={(e) => setFormDurationType(e.target.value as OnDutyDurationType)}
                  >
                    <option value="full_day">Full Day</option>
                    <option value="half_day">Half Day</option>
                    <option value="hourly">Hourly</option>
                    <option value="multi_day">Multi-Day</option>
                  </Select>
                </Stack>

                <Grid columns={2} gap="sm">
                  <Stack gap="xs">
                    <label className="bezent-card__desc">Start Date</label>
                    <Input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                    />
                  </Stack>
                  <Stack gap="xs">
                    <label className="bezent-card__desc">End Date</label>
                    <Input
                      type="date"
                      value={formEndDate}
                      disabled={formDurationType !== 'multi_day'}
                      onChange={(e) => setFormEndDate(e.target.value)}
                    />
                  </Stack>
                </Grid>

                {formDurationType === 'half_day' && (
                  <Stack gap="xs">
                    <label className="bezent-card__desc">Half Day Session</label>
                    <Select
                      value={formHalfDaySession}
                      onChange={(e) => setFormHalfDaySession(e.target.value as 'first_half' | 'second_half')}
                    >
                      <option value="first_half">First Half (Morning Session)</option>
                      <option value="second_half">Second Half (Afternoon Session)</option>
                    </Select>
                  </Stack>
                )}

                {formDurationType === 'hourly' && (
                  <Grid columns={2} gap="sm">
                    <Stack gap="xs">
                      <label className="bezent-card__desc">Start Time</label>
                      <Input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                      />
                    </Stack>
                    <Stack gap="xs">
                      <label className="bezent-card__desc">End Time</label>
                      <Input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                      />
                    </Stack>
                  </Grid>
                )}
              </Stack>
            )}

            {/* Step 3: Location & Purpose */}
            {newStep === 3 && (
              <Stack gap="sm">
                <span className="bezent-table-meta-title">Step 3: Location & Business Purpose</span>
                <Stack gap="xs">
                  <label className="bezent-card__desc">Work Location / Customer Site</label>
                  <Input
                    placeholder="e.g. Acme Corp Headquarters, Building B"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </Stack>
                <Stack gap="xs">
                  <label className="bezent-card__desc">Business Purpose / Reason</label>
                  <Input
                    placeholder="Enter business reason for On-Duty assignment..."
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                  />
                </Stack>
                <Stack gap="xs">
                  <label className="bezent-card__desc">Project / Client Reference (Optional)</label>
                  <Input
                    placeholder="e.g. PRJ-2026-ALPHA"
                    value={formProjectRef}
                    onChange={(e) => setFormProjectRef(e.target.value)}
                  />
                </Stack>
              </Stack>
            )}

            {/* Step 4: Evidence Attachments */}
            {newStep === 4 && (
              <Stack gap="sm">
                <span className="bezent-table-meta-title">Step 4: Evidence & Documents</span>
                <Inline gap="xs">
                  <Input
                    placeholder="Document name (e.g. Client_Invite.pdf)"
                    value={formNewAttachmentName}
                    onChange={(e) => setFormNewAttachmentName(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (!formNewAttachmentName.trim()) return;
                      setFormAttachments([
                        ...formAttachments,
                        { name: formNewAttachmentName.trim(), size: '240 KB' },
                      ]);
                      setFormNewAttachmentName('');
                    }}
                  >
                    Add
                  </Button>
                </Inline>

                {formAttachments.map((att, i) => (
                  <Inline key={i} justify="between" align="center">
                    <span>{att.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormAttachments(formAttachments.filter((_, idx) => idx !== i))}
                    >
                      Remove
                    </Button>
                  </Inline>
                ))}
              </Stack>
            )}

            {/* Step 5: Review & Submit */}
            {newStep === 5 && (
              <Stack gap="sm">
                <span className="bezent-table-meta-title">Step 5: Review Summary</span>
                <Card padding="sm">
                  <Grid columns={2} gap="sm">
                    <Stack gap="none">
                      <span className="bezent-card__desc">Employee ID</span>
                      <strong>{formEmployeeId}</strong>
                    </Stack>
                    <Stack gap="none">
                      <span className="bezent-card__desc">OD Type</span>
                      <strong>{formOdTypeId}</strong>
                    </Stack>
                    <Stack gap="none">
                      <span className="bezent-card__desc">Duration</span>
                      <span>{DURATION_TYPE_LABELS[formDurationType]}</span>
                    </Stack>
                    <Stack gap="none">
                      <span className="bezent-card__desc">Period</span>
                      <span>
                        {formStartDate} {formDurationType === 'multi_day' ? `to ${formEndDate}` : ''}
                      </span>
                    </Stack>
                    <Stack gap="none">
                      <span className="bezent-card__desc">Location</span>
                      <span>{formLocation || 'External Site'}</span>
                    </Stack>
                    <Stack gap="none">
                      <span className="bezent-card__desc">Purpose</span>
                      <span>{formPurpose}</span>
                    </Stack>
                  </Grid>
                </Card>
              </Stack>
            )}

            {/* Modal Navigation Buttons */}
            <Inline justify="between" align="center">
              {newStep > 1 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setNewStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4 | 5)
                  }
                >
                  Back
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
              )}

              {newStep < 5 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    setNewStep((prev) => Math.min(5, prev + 1) as 1 | 2 | 3 | 4 | 5)
                  }
                >
                  Next
                </Button>
              ) : (
                <Inline gap="xs">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={formSubmitting}
                    onClick={() => handleCreateRequest(true)}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={formSubmitting}
                    onClick={() => handleCreateRequest(false)}
                  >
                    Submit Request
                  </Button>
                </Inline>
              )}
            </Inline>
          </Stack>
        </Modal>
      )}

      {/* 8. Bulk Operations Modal (e.g. Bulk Approval Preview) */}
      {bulkModalAction && (
        <Modal
          title={`Bulk Action: ${bulkModalAction.replace('_', ' ').toUpperCase()}`}
          isOpen={true}
          onClose={() => setBulkModalAction(null)}
          size="md"
        >
          <Stack gap="md">
            {bulkResultReport ? (
              <Stack gap="sm">
                <Alert variant="success" title="Bulk Operation Completed">
                  {bulkResultReport.succeeded.length} requests successfully processed.
                </Alert>
                {bulkResultReport.skipped.length > 0 && (
                  <Alert variant="warning" title="Skipped Items">
                    {bulkResultReport.skipped.map((s) => (
                      <div key={s.id}>
                        {s.id}: {s.reason}
                      </div>
                    ))}
                  </Alert>
                )}
                <Inline justify="end">
                  <Button variant="primary" size="sm" onClick={() => setBulkModalAction(null)}>
                    Done
                  </Button>
                </Inline>
              </Stack>
            ) : (
              <Stack gap="sm">
                <span>Selected: {selectedIds.size} request(s)</span>

                {bulkModalAction === 'assign' && (
                  <Stack gap="xs">
                    <label className="bezent-card__desc">Assignee User ID</label>
                    <Input
                      placeholder="Enter reviewer user ID..."
                      value={bulkAssignee}
                      onChange={(e) => setBulkAssignee(e.target.value)}
                    />
                  </Stack>
                )}

                {bulkModalAction === 'bulk_approve' && bulkPreview && (
                  <Card padding="sm">
                    <Stack gap="xs">
                      <span className="bezent-table-meta-title">Approval Eligibility Preview</span>
                      <span>Eligible for instant approval: {bulkPreview.eligibleCount}</span>
                      <span>Requires individual review / ineligible: {bulkPreview.notEligibleCount}</span>
                    </Stack>
                  </Card>
                )}

                <Stack gap="xs">
                  <label className="bezent-card__desc">Notes / Reason (Optional)</label>
                  <Input
                    placeholder="Enter operation rationale..."
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                  />
                </Stack>

                <Inline justify="end" gap="xs">
                  <Button variant="ghost" size="sm" onClick={() => setBulkModalAction(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant={bulkModalAction === 'bulk_reject' ? 'danger' : 'primary'}
                    size="sm"
                    disabled={bulkSubmitting}
                    onClick={handleExecuteBulkAction}
                  >
                    Confirm Action
                  </Button>
                </Inline>
              </Stack>
            )}
          </Stack>
        </Modal>
      )}

      {/* 9. Export Modal */}
      {showExportModal && (
        <Modal
          title="Export On-Duty Requests"
          isOpen={true}
          onClose={() => setShowExportModal(false)}
          size="sm"
        >
          <Stack gap="md">
            <Stack gap="xs">
              <label className="bezent-card__desc">Export Scope</label>
              <Select
                value={exportScope}
                onChange={(e) =>
                  setExportScope(e.target.value as 'selected' | 'filtered')
                }
              >
                <option value="filtered">Current Filtered View ({totalCount} items)</option>
                <option value="selected" disabled={selectedIds.size === 0}>
                  Selected Requests ({selectedIds.size} items)
                </option>
              </Select>
            </Stack>

            <Stack gap="xs">
              <label className="bezent-card__desc">File Format</label>
              <Select
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as 'csv' | 'excel' | 'pdf')
                }
              >
                <option value="csv">CSV (Comma Separated Values)</option>
                <option value="excel">Excel (.xlsx)</option>
                <option value="pdf">PDF Document</option>
              </Select>
            </Stack>

            <Stack gap="xs">
              <label className="bezent-card__desc">Data Level</label>
              <Select
                value={exportLevel}
                onChange={(e) =>
                  setExportLevel(
                    e.target.value as 'standard' | 'detailed' | 'audit',
                  )
                }
              >
                <option value="standard">Standard Summary</option>
                <option value="detailed">Detailed Breakdown (with workdays)</option>
                <option value="audit">Full Audit History Trail</option>
              </Select>
            </Stack>

            <Inline justify="end" gap="xs">
              <Button variant="ghost" size="sm" onClick={() => setShowExportModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={exporting}
                onClick={handleExecuteExport}
              >
                {exporting ? 'Generating...' : 'Download Export'}
              </Button>
            </Inline>
          </Stack>
        </Modal>
      )}
    </Page>
  );
}

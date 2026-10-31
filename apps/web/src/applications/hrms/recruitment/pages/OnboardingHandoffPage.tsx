import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Inline,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { INITIAL_HANDOFFS } from '../data/mockHandoffs';
import type { ConvertHandoffInput, OnboardingHandoffItem } from '../types/handoff';
import { HandoffMetrics } from '../components/HandoffMetrics';
import { HandoffTable } from '../components/HandoffTable';
import { ConvertHandoffModal } from '../components/ConvertHandoffModal';
import { HandoffDetailDrawer } from '../components/HandoffDetailDrawer';

export function OnboardingHandoffPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [handoffs, setHandoffs] = useState<OnboardingHandoffItem[]>(INITIAL_HANDOFFS);
  const [tabFilter, setTabFilter] = useState<'all' | 'ready' | 'pending' | 'completed' | 'alerts'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const [selectedHandoff, setSelectedHandoff] = useState<OnboardingHandoffItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // If candidateId or offerId in URL, open conversion modal automatically
  useEffect(() => {
    const candidateIdParam = searchParams.get('candidateId');
    const offerIdParam = searchParams.get('offerId');
    if (candidateIdParam || offerIdParam) {
      const match = handoffs.find(
        (h) =>
          (candidateIdParam && h.candidateId === candidateIdParam) ||
          (offerIdParam && h.offerId === offerIdParam),
      );
      if (match) {
        setSelectedHandoff(match);
        setIsConvertOpen(true);
      }
    }
  }, [searchParams, handoffs]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: handoffs.length,
      ready: handoffs.filter((h) => h.status === 'ready_for_handoff').length,
      pending: handoffs.filter((h) => h.status === 'handoff_in_progress' || h.status === 'on_hold')
        .length,
      completed: handoffs.filter((h) => h.status === 'handoff_completed').length,
      alerts: handoffs.filter((h) => h.duplicateCheck.hasDuplicate).length,
    };
  }, [handoffs]);

  // Filtered
  const filteredHandoffs = useMemo(() => {
    return handoffs.filter((h) => {
      // Tab filter
      if (tabFilter === 'ready' && h.status !== 'ready_for_handoff') return false;
      if (
        tabFilter === 'pending' &&
        !(h.status === 'handoff_in_progress' || h.status === 'on_hold')
      )
        return false;
      if (tabFilter === 'completed' && h.status !== 'handoff_completed') return false;
      if (tabFilter === 'alerts' && !h.duplicateCheck.hasDuplicate) return false;

      // Dept filter
      if (deptFilter !== 'all' && h.department !== deptFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = h.candidateName.toLowerCase().includes(q);
        const matchesNum = h.candidateNumber.toLowerCase().includes(q);
        const matchesJob = h.jobTitle.toLowerCase().includes(q);
        const matchesOffer = h.offerNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesJob && !matchesOffer) {
          return false;
        }
      }

      return true;
    });
  }, [handoffs, tabFilter, deptFilter, searchQuery]);

  // Handlers
  const handleSelectHandoff = (item: OnboardingHandoffItem) => {
    setSelectedHandoff(item);
    setIsDetailOpen(true);
  };

  const handleInitiateConversion = (item: OnboardingHandoffItem) => {
    setSelectedHandoff(item);
    setIsConvertOpen(true);
  };

  const handleConfirmHandoff = (input: ConvertHandoffInput) => {
    const caseNum = `ONB-2026-0${Math.floor(80 + Math.random() * 20)}`;
    const empCode = input.isRehire
      ? selectedHandoff?.duplicateCheck?.existingEmployeeCode || 'EMP-REHIRE'
      : `EMP-2026-1${Math.floor(40 + Math.random() * 20)}`;

    setHandoffs((prev) =>
      prev.map((h) => {
        if (h.id !== input.handoffId) return h;
        return {
          ...h,
          status: 'handoff_completed',
          assignedPartner: input.assignedPartner,
          workflowTemplate: input.workflowTemplate,
          targetJoiningDate: input.targetJoiningDate,
          onboardingCaseId: `case-${Date.now()}`,
          onboardingCaseCode: caseNum,
          employeeCode: empCode,
          handoffDate: new Date().toISOString().slice(0, 10),
          notes: `${h.notes ? `${h.notes} | ` : ''}${input.notes || 'Handoff confirmed.'}`,
        };
      }),
    );

    setBannerNotice(
      `Successfully initialized Onboarding Case ${caseNum} for ${selectedHandoff?.candidateName}. Designated Employee Code: ${empCode}.`,
    );
  };

  const handleOpenWorkforceOnboarding = (item: OnboardingHandoffItem) => {
    navigate(`/hrms/workforce/onboarding?caseId=${item.onboardingCaseId || ''}`);
  };

  return (
    <Page>
      <PageHeader
        title="Onboarding Handoff"
        subtitle="Bridge hired candidates into workforce onboarding cases, prevent duplicate employee records, and track pre-boarding readiness."
      />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="success" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {/* 1. Metrics */}
        <HandoffMetrics handoffs={handoffs} />

        {/* 2. Tabs */}
        <Tabs
          items={[
            { id: 'all', label: `All Handoffs (${counts.all})` },
            { id: 'ready', label: `Ready for Handoff (${counts.ready})` },
            { id: 'pending', label: `Pending Verification (${counts.pending})` },
            { id: 'completed', label: `Cases Active (${counts.completed})` },
            { id: 'alerts', label: `Duplicate Alerts (${counts.alerts})` },
          ]}
          activeId={tabFilter}
          onChange={(id) => setTabFilter(id as typeof tabFilter)}
        />

        {/* 3. Toolbar */}
        <Toolbar>
          <Inline justify="between" align="center" className="w-full">
            <Inline align="center" gap="md">
              <SearchInput
                placeholder="Search candidate, requisition, offer number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />

              <Select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Departments' },
                  { value: 'Engineering', label: 'Engineering' },
                  { value: 'Product & Design', label: 'Product & Design' },
                  { value: 'Core Platform', label: 'Core Platform' },
                  { value: 'Human Resources', label: 'Human Resources' },
                  { value: 'Infrastructure', label: 'Infrastructure' },
                ]}
              />
            </Inline>

            <span className="bezent-text-xs bezent-text-secondary">
              Showing {filteredHandoffs.length} of {handoffs.length} candidates
            </span>
          </Inline>
        </Toolbar>

        {/* 4. Table */}
        <HandoffTable
          handoffs={filteredHandoffs}
          onSelectHandoff={handleSelectHandoff}
          onInitiateConversion={handleInitiateConversion}
          onOpenWorkforceOnboarding={handleOpenWorkforceOnboarding}
        />
      </Stack>

      {/* Convert Modal */}
      <ConvertHandoffModal
        item={selectedHandoff}
        isOpen={isConvertOpen}
        onClose={() => {
          setIsConvertOpen(false);
          setSelectedHandoff(null);
        }}
        onConfirmHandoff={handleConfirmHandoff}
      />

      {/* Detail Drawer */}
      <HandoffDetailDrawer
        item={selectedHandoff}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedHandoff(null);
        }}
        onInitiateConversion={handleInitiateConversion}
        onOpenWorkforceOnboarding={handleOpenWorkforceOnboarding}
      />
    </Page>
  );
}

export default OnboardingHandoffPage;

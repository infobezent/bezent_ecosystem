import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Inline,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Tabs,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { INITIAL_OFFERS } from '../data/mockOffers';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';
import type { JobOffer, OfferStatus } from '../types/offer';
import { OfferMetrics } from '../components/OfferMetrics';
import { OffersTable } from '../components/OffersTable';
import { OfferDetailsModal } from '../components/OfferDetailsModal';
import { CreateOfferModal } from '../components/CreateOfferModal';
import { ApproveOfferModal } from '../components/ApproveOfferModal';

export function OffersPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<JobOffer[]>(INITIAL_OFFERS);
  const [tabFilter, setTabFilter] = useState<'all' | 'pending' | 'sent' | 'accepted' | 'declined'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const [selectedOffer, setSelectedOffer] = useState<JobOffer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: offers.length,
      pending: offers.filter((o) => o.status === 'pending_approval' || o.status === 'draft').length,
      sent: offers.filter((o) => o.status === 'sent' || o.status === 'approved').length,
      accepted: offers.filter((o) => o.status === 'accepted').length,
      declined: offers.filter((o) => o.status === 'declined' || o.status === 'expired').length,
    };
  }, [offers]);

  // Filtered offers
  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      // Tab filter
      if (tabFilter === 'pending' && !(o.status === 'pending_approval' || o.status === 'draft')) {
        return false;
      }
      if (tabFilter === 'sent' && !(o.status === 'sent' || o.status === 'approved')) {
        return false;
      }
      if (tabFilter === 'accepted' && o.status !== 'accepted') {
        return false;
      }
      if (tabFilter === 'declined' && !(o.status === 'declined' || o.status === 'expired')) {
        return false;
      }

      // Department filter
      if (deptFilter !== 'all' && o.department !== deptFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = o.candidateName.toLowerCase().includes(q);
        const matchesNum = o.offerNumber.toLowerCase().includes(q);
        const matchesJob = o.jobTitle.toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesJob) {
          return false;
        }
      }

      return true;
    });
  }, [offers, tabFilter, deptFilter, searchQuery]);

  // Handlers
  const handleSelectOffer = (offer: JobOffer) => {
    setSelectedOffer(offer);
    setIsDetailOpen(true);
  };

  const handleApproveClick = (offer: JobOffer) => {
    setSelectedOffer(offer);
    setIsApproveOpen(true);
  };

  const handleConfirmApproval = (
    offerId: string,
    decision: 'approved' | 'rejected',
    comments: string,
  ) => {
    setOffers((prev) =>
      prev.map((o) => {
        if (o.id !== offerId) return o;
        const nextStatus: OfferStatus = decision === 'approved' ? 'approved' : 'draft';
        const updatedChain = o.approvalChain.map((step) => {
          if (step.status === 'pending') {
            return {
              ...step,
              status: decision === 'approved' ? ('approved' as const) : ('rejected' as const),
              actionDate: new Date().toISOString().slice(0, 10),
              comments,
            };
          }
          return step;
        });
        return {
          ...o,
          status: nextStatus,
          approvalChain: updatedChain,
        };
      }),
    );
    setBannerNotice(
      decision === 'approved'
        ? `Offer ${offerId} was successfully approved and marked ready to send.`
        : `Offer ${offerId} was rejected with comments. Re-routing to recruiter.`,
    );
  };

  const handleSendOffer = (offerId: string) => {
    setOffers((prev) =>
      prev.map((o) => {
        if (o.id !== offerId) return o;
        return {
          ...o,
          status: 'sent',
          offeredDate: new Date().toISOString().slice(0, 10),
        };
      }),
    );
    setBannerNotice(`Formal offer letter for ${offerId} has been dispatched to candidate.`);
  };

  const handleInitiateHandoff = (offer: JobOffer) => {
    // Navigate to Onboarding Handoff section
    navigate(
      `/hrms/recruitment/onboarding-handoff?candidateId=${offer.candidateId}&offerId=${offer.id}&jobId=${offer.jobId}`,
    );
  };

  const handleCreateOffer = (newOffer: JobOffer) => {
    setOffers((prev) => [newOffer, ...prev]);
    setBannerNotice(
      `Created new offer ${newOffer.offerNumber} for ${newOffer.candidateName}. Routed for internal sign-off.`,
    );
  };

  return (
    <Page>
      <PageHeader
        title="Job Offers"
        subtitle="Manage offer letters, compensation packages, multi-tier approvals, and track acceptance before onboarding handoff."
        actions={
          <Inline gap="sm">
            <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
              <Inline align="center" gap="xs">
                <BezentIcon name="add" size="action" />
                <span>Draft New Offer</span>
              </Inline>
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="info" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {/* 1. Metrics */}
        <OfferMetrics offers={offers} />

        {/* 2. Tabs */}
        <Tabs
          items={[
            { id: 'all', label: `All Offers (${counts.all})` },
            { id: 'pending', label: `Pending Sign-Off (${counts.pending})` },
            { id: 'sent', label: `Sent to Candidate (${counts.sent})` },
            { id: 'accepted', label: `Accepted (${counts.accepted})` },
            { id: 'declined', label: `Declined / Expired (${counts.declined})` },
          ]}
          activeId={tabFilter}
          onChange={(id) => setTabFilter(id as typeof tabFilter)}
        />

        {/* 3. Toolbar */}
        <Toolbar>
          <Inline justify="between" align="center" className="w-full">
            <Inline align="center" gap="md">
              <SearchInput
                placeholder="Search candidate name, offer number..."
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
                  { value: 'Operations', label: 'Operations' },
                ]}
              />
            </Inline>

            <span className="bezent-text-xs bezent-text-secondary">
              Showing {filteredOffers.length} of {offers.length} offers
            </span>
          </Inline>
        </Toolbar>

        {/* 4. Table */}
        <OffersTable
          offers={filteredOffers}
          onSelectOffer={handleSelectOffer}
          onApproveOffer={handleApproveClick}
          onSendOffer={(o) => handleSendOffer(o.id)}
          onInitiateHandoff={handleInitiateHandoff}
        />
      </Stack>

      {/* Details Modal */}
      <OfferDetailsModal
        offer={selectedOffer}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOffer(null);
        }}
        onApprove={(id, comments) => handleConfirmApproval(id, 'approved', comments)}
        onSendOffer={handleSendOffer}
        onInitiateHandoff={handleInitiateHandoff}
      />

      {/* Approve Modal */}
      <ApproveOfferModal
        offer={selectedOffer}
        isOpen={isApproveOpen}
        onClose={() => {
          setIsApproveOpen(false);
          setSelectedOffer(null);
        }}
        onConfirmApproval={handleConfirmApproval}
      />

      {/* Create Modal */}
      <CreateOfferModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateOffer={handleCreateOffer}
        candidates={INITIAL_CANDIDATES}
      />
    </Page>
  );
}

export default OffersPage;

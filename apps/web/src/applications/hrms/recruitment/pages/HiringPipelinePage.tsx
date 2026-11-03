import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Grid,
  Inline,
  Page,
  PageHeader,
  SearchInput,
  Select,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';
import type { Candidate, CandidateStage } from '../types/candidate';
import { ACTIVE_PIPELINE_STAGES, TERMINAL_PIPELINE_STAGES } from '../types/pipeline';
import { PipelineColumn } from '../components/PipelineColumn';
import { CandidateProfileDrawer } from '../components/CandidateProfileDrawer';
import { AddCandidateModal } from '../components/AddCandidateModal';

export function HiringPipelinePage() {
  const navigate = useNavigate();

  // State
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Conversion & Summary Metrics
  const metrics = useMemo(() => {
    const total = candidates.length;
    const active = candidates.filter(
      (c) => c.currentStage !== 'rejected' && c.currentStage !== 'withdrawn',
    ).length;
    const interviewing = candidates.filter(
      (c) => c.currentStage === 'interview' || c.currentStage === 'assessment',
    ).length;
    const offers = candidates.filter((c) => c.currentStage === 'offer').length;
    const hired = candidates.filter((c) => c.currentStage === 'hired').length;
    const conversionRate = total > 0 ? (((offers + hired) / total) * 100).toFixed(0) : '0';

    return { total, active, interviewing, offers, hired, conversionRate };
  }, [candidates]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((cand) => {
      // Job Filter
      if (selectedJobId !== 'all' && cand.appliedJobId !== selectedJobId) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = cand.fullName.toLowerCase().includes(q);
        const matchesNumber = cand.candidateNumber.toLowerCase().includes(q);
        const matchesSkill = cand.skills.some((s) => s.toLowerCase().includes(q));
        const matchesCompany = cand.currentCompany?.toLowerCase().includes(q);
        if (!matchesName && !matchesNumber && !matchesSkill && !matchesCompany) {
          return false;
        }
      }

      return true;
    });
  }, [candidates, selectedJobId, searchQuery]);

  // Actions
  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsProfileOpen(true);
  };

  const handleStageChange = (candidateId: string, newStage: CandidateStage) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, currentStage: newStage } : c)),
    );
    const updated = candidates.find((c) => c.id === candidateId);
    if (updated) {
      setBannerNotice(`Advanced "${updated.fullName}" to stage: ${newStage.toUpperCase()}.`);
    }
  };

  const handleAddCandidate = (newCand: Candidate) => {
    setCandidates((prev) => [newCand, ...prev]);
    setBannerNotice(`Successfully added candidate "${newCand.fullName}" into pipeline.`);
  };

  const handleHandoffToOnboarding = (cand: Candidate) => {
    navigate(
      `/hrms/workforce/onboarding?action=register&candidateName=${encodeURIComponent(cand.fullName)}&candidateEmail=${encodeURIComponent(cand.email)}`,
    );
  };

  return (
    <Page>
      <PageHeader
        title="Hiring Pipeline"
        subtitle="Visual stage progression, stage velocity, and requisition pipeline health."
        actions={
          <Inline align="center" gap="sm">
            <Button variant="secondary" onClick={() => navigate('/hrms/recruitment/candidates')}>
              <Inline align="center" gap="xs">
                <BezentIcon name="candidates" size="action" />
                <span>Directory View</span>
              </Inline>
            </Button>
            <Button variant="primary" onClick={() => setIsAddOpen(true)}>
              <Inline align="center" gap="xs">
                <BezentIcon name="add" size="action" />
                <span>Add Candidate</span>
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

        {/* 1. Summary Metrics Banner */}
        <Grid columns={4} gap="md">
          <Card variant="flat" padding="md">
            <CardBody>
              <Stack gap="xs">
                <Inline justify="between" align="center">
                  <span className="bezent-text-secondary bezent-text-sm">Active In Pipeline</span>
                  <BezentIcon
                    name="pipeline"
                    size="nav"
                    color="var(--color-primary-600, #4F46E5)"
                  />
                </Inline>
                <Inline align="baseline" gap="xs">
                  <span className="bezent-text-2xl bezent-font-semibold">{metrics.active}</span>
                  <span className="bezent-text-xs bezent-text-secondary">active applicants</span>
                </Inline>
              </Stack>
            </CardBody>
          </Card>

          <Card variant="tint-blue" padding="md">
            <CardBody>
              <Stack gap="xs">
                <Inline justify="between" align="center">
                  <span className="bezent-text-secondary bezent-text-sm">In Evaluation</span>
                  <BezentIcon name="interviews" size="nav" color="var(--color-info-600, #0284C7)" />
                </Inline>
                <Inline align="baseline" gap="xs">
                  <span className="bezent-text-2xl bezent-font-semibold">
                    {metrics.interviewing}
                  </span>
                  <span className="bezent-text-xs bezent-text-secondary">
                    interview / assessment
                  </span>
                </Inline>
              </Stack>
            </CardBody>
          </Card>

          <Card variant="tint-green" padding="md">
            <CardBody>
              <Stack gap="xs">
                <Inline justify="between" align="center">
                  <span className="bezent-text-secondary bezent-text-sm">Offers & Hires</span>
                  <BezentIcon name="offers" size="nav" color="var(--color-success-600, #16A34A)" />
                </Inline>
                <Inline align="baseline" gap="xs">
                  <span className="bezent-text-2xl bezent-font-semibold">
                    {metrics.offers} / {metrics.hired}
                  </span>
                  <span className="bezent-text-xs bezent-text-secondary">offers / hired</span>
                </Inline>
              </Stack>
            </CardBody>
          </Card>

          <Card variant="flat" padding="md">
            <CardBody>
              <Stack gap="xs">
                <Inline justify="between" align="center">
                  <span className="bezent-text-secondary bezent-text-sm">Conversion Rate</span>
                  <BezentIcon name="reports" size="nav" color="var(--color-warning-600, #D97706)" />
                </Inline>
                <Inline align="baseline" gap="xs">
                  <span className="bezent-text-2xl bezent-font-semibold">
                    {metrics.conversionRate}%
                  </span>
                  <span className="bezent-text-xs bezent-text-secondary">pipeline-to-offer</span>
                </Inline>
              </Stack>
            </CardBody>
          </Card>
        </Grid>

        {/* 2. Toolbar */}
        <Toolbar>
          <Inline justify="between" align="center" wrap gap="md">
            <Inline align="center" gap="md" wrap>
              <Select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                options={[
                  { value: 'all', label: 'All Job Requisitions (All Positions)' },
                  ...INITIAL_JOB_OPENINGS.map((j) => ({
                    value: j.id,
                    label: `${j.title} (${j.jobCode})`,
                  })),
                ]}
              />

              <SearchInput
                placeholder="Search candidates in pipeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </Inline>

            <Inline align="center" gap="sm">
              <Button
                size="sm"
                variant={showArchived ? 'primary' : 'ghost'}
                onClick={() => setShowArchived(!showArchived)}
              >
                <Inline align="center" gap="xs">
                  <span>Archived / Rejected</span>
                  <Badge variant="neutral" size="sm">
                    {
                      candidates.filter(
                        (c) => c.currentStage === 'rejected' || c.currentStage === 'withdrawn',
                      ).length
                    }
                  </Badge>
                </Inline>
              </Button>
            </Inline>
          </Inline>
        </Toolbar>

        {/* 3. Kanban Stage Board (Horizontal Scrollable Flow) */}
        <div className="overflow-x-auto pb-4 pt-1">
          <div className="flex gap-4 items-start min-w-max">
            {ACTIVE_PIPELINE_STAGES.map((stage) => {
              const stageCandidates = filteredCandidates.filter((c) => c.currentStage === stage.id);
              return (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  candidates={stageCandidates}
                  onSelectCandidate={handleSelectCandidate}
                  onStageChange={handleStageChange}
                />
              );
            })}

            {/* Optional Terminal Columns */}
            {showArchived &&
              TERMINAL_PIPELINE_STAGES.map((stage) => {
                const stageCandidates = filteredCandidates.filter(
                  (c) => c.currentStage === stage.id,
                );
                return (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    candidates={stageCandidates}
                    onSelectCandidate={handleSelectCandidate}
                    onStageChange={handleStageChange}
                  />
                );
              })}
          </div>
        </div>
      </Stack>

      {/* Candidate Profile Drawer */}
      <CandidateProfileDrawer
        candidate={selectedCandidate}
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setSelectedCandidate(null);
        }}
        onStageChange={handleStageChange}
        onHandoffToOnboarding={handleHandoffToOnboarding}
      />

      {/* Add Candidate Modal */}
      <AddCandidateModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddCandidate={handleAddCandidate}
        jobs={INITIAL_JOB_OPENINGS}
        existingCount={candidates.length}
      />
    </Page>
  );
}

export default HiringPipelinePage;

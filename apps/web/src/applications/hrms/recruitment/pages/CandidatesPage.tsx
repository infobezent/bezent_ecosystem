import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Inline,
  Page,
  PageHeader,
  Select,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';
import type { Candidate, CandidateStage } from '../types/candidate';
import { CandidateMetrics } from '../components/CandidateMetrics';
import { CandidatesTable } from '../components/CandidatesTable';
import { CandidateProfileDrawer } from '../components/CandidateProfileDrawer';
import { AddCandidateModal } from '../components/AddCandidateModal';

export function CandidatesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected job from URL if arrived from Job Openings
  const urlJobId = searchParams.get('jobId') || 'all';

  // State
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [stageFilter, setStageFilter] = useState<
    'all' | 'screening' | 'interview' | 'assessment' | 'offer' | 'hired' | 'rejected'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState<string>(urlJobId);
  const [experienceFilter, setExperienceFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Status Tabs definitions matching recruitment stages
  const statusTabs: Array<{ id: typeof stageFilter; label: string }> = [
    { id: 'all', label: 'All Candidates' },
    { id: 'screening', label: 'Screening' },
    { id: 'interview', label: 'Interview' },
    { id: 'assessment', label: 'Assessment' },
    { id: 'offer', label: 'Offers' },
    { id: 'hired', label: 'Hired' },
    { id: 'rejected', label: 'Rejected' },
  ];

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((cand) => {
      // Stage Filter
      if (stageFilter === 'screening') {
        if (cand.currentStage !== 'screening' && cand.currentStage !== 'applied') return false;
      } else if (stageFilter === 'interview') {
        if (cand.currentStage !== 'interview' && cand.currentStage !== 'shortlisted') return false;
      } else if (stageFilter === 'assessment') {
        if (cand.currentStage !== 'assessment') return false;
      } else if (stageFilter === 'offer') {
        if (cand.currentStage !== 'offer') return false;
      } else if (stageFilter === 'hired') {
        if (cand.currentStage !== 'hired' && cand.currentStage !== 'selected') return false;
      } else if (stageFilter === 'rejected') {
        if (cand.currentStage !== 'rejected' && cand.currentStage !== 'withdrawn') return false;
      }

      // Job Filter
      if (jobFilter !== 'all' && cand.appliedJobId !== jobFilter) {
        return false;
      }

      // Experience Filter
      if (experienceFilter === 'junior' && cand.totalExperienceYears > 3) {
        return false;
      } else if (
        experienceFilter === 'mid' &&
        (cand.totalExperienceYears <= 3 || cand.totalExperienceYears > 7)
      ) {
        return false;
      } else if (experienceFilter === 'senior' && cand.totalExperienceYears <= 7) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = cand.fullName.toLowerCase().includes(q);
        const matchesNumber = cand.candidateNumber.toLowerCase().includes(q);
        const matchesEmail = cand.email.toLowerCase().includes(q);
        const matchesCompany = cand.currentCompany?.toLowerCase().includes(q);
        const matchesJob = cand.appliedJobTitle.toLowerCase().includes(q);
        const matchesSkills = cand.skills.some((s) => s.toLowerCase().includes(q));

        if (
          !matchesName &&
          !matchesNumber &&
          !matchesEmail &&
          !matchesCompany &&
          !matchesJob &&
          !matchesSkills
        ) {
          return false;
        }
      }

      return true;
    });
  }, [candidates, stageFilter, jobFilter, experienceFilter, searchQuery]);

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
      setBannerNotice(
        `Candidate "${updated.fullName}" transitioned to stage: ${newStage.toUpperCase()}.`,
      );
    }
  };

  const handleAddCandidate = (newCand: Candidate) => {
    setCandidates((prev) => [newCand, ...prev]);
    setBannerNotice(
      `Successfully added candidate "${newCand.fullName}" (${newCand.candidateNumber}).`,
    );
  };

  const handleHandoffToOnboarding = (cand: Candidate) => {
    navigate(`/hrms/recruitment/onboarding-handoff?candidateId=${cand.id}`);
  };

  return (
    <Page>
      <PageHeader title="Candidate Directory" />

      <Stack gap="md">
        {bannerNotice && (
          <Alert variant="info" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {/* 1. Exact Unified Metrics Card from Screenshot */}
        <CandidateMetrics candidates={candidates} />

        {/* 2. Exact Filter Bar & Toolbar from Screenshot */}
        <Toolbar
          left={
            <Inline align="center" gap="sm" wrap>
              {/* Compact Search Bar */}
              <div className="bezent-search-bar">
                <BezentIcon name="search" size={16} color="var(--text-secondary, #64748b)" />
                <input
                  type="search"
                  placeholder="Search candidates, skills, roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bezent-search-bar__input"
                  aria-label="Search candidates"
                />
              </div>

              {/* Filter Button right next to Search */}
              <Button
                variant={showFilters ? 'dark' : 'outline'}
                size="md"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <Inline align="center" gap="xs">
                  <BezentIcon name="filter" size="action" />
                  <span>Filter</span>
                </Inline>
              </Button>

              {/* View Mode Toggle: List vs Grid */}
              <div className="bezent-view-toggle" role="group" aria-label="View layout switcher">
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'list' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                  aria-label="List View"
                >
                  <BezentIcon name="viewList" size={18} />
                </button>
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'grid' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <BezentIcon name="viewGrid" size={18} />
                </button>
              </div>

              {/* Horizontal Status Filter Tabs */}
              <div className="bezent-filter-tabs">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`bezent-filter-tab ${stageFilter === tab.id ? 'is-active' : ''}`}
                    onClick={() => setStageFilter(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </Inline>
          }
          right={
            <Inline align="center" gap="sm">
              <Button variant="dark" size="md" onClick={() => setIsAddOpen(true)}>
                <Inline align="center" gap="xs">
                  <BezentIcon name="add" size="action" />
                  <span>Add Candidate</span>
                </Inline>
              </Button>
            </Inline>
          }
        />

        {/* Collapsible Filter Row when "Filter" button is clicked */}
        {showFilters && (
          <Inline align="center" gap="md" wrap>
            <Select
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Experience Levels' },
                { value: 'junior', label: '0 - 3 Years (Junior)' },
                { value: 'mid', label: '4 - 7 Years (Mid-Level)' },
                { value: 'senior', label: '8+ Years (Senior / Lead)' },
              ]}
            />

            <Select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Job Roles' },
                ...INITIAL_JOB_OPENINGS.map((j) => ({
                  value: j.id,
                  label: `${j.title} (${j.jobCode})`,
                })),
              ]}
            />
          </Inline>
        )}

        {/* 3. Table / Grid Area */}
        <CandidatesTable
          candidates={filteredCandidates}
          onSelectCandidate={handleSelectCandidate}
          onStageChange={handleStageChange}
          viewMode={viewMode}
        />
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

export default CandidatesPage;

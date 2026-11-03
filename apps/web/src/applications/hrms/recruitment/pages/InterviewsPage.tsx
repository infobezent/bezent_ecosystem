import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Inline,
  LoadingState,
  Page,
  PageHeader,
  Select,
  Stack,
  Toolbar,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  InterviewFeedback,
  InterviewSchedule,
  InterviewType,
  ScheduleInterviewInput,
} from '../types/interview';
import type { Candidate } from '../types/candidate';
import type { JobOpening } from '../types/jobOpening';
import { InterviewMetrics } from '../components/InterviewMetrics';
import { InterviewScheduleTable } from '../components/InterviewScheduleTable';
import { InterviewCalendarView } from '../components/InterviewCalendarView';
import { ScorecardModal } from '../components/ScorecardModal';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { RescheduleCancelModal } from '../components/RescheduleCancelModal';
import {
  fetchInterviews,
  fetchApplications,
  fetchCandidates,
  fetchJobRequisitions,
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  recordInterviewFeedback,
  adaptInterviewToSchedule,
  adaptCandidateToFrontend,
  adaptRequisitionToJobOpening,
  adaptFrontendToScheduleInterviewDto,
} from '../api';

export interface InterviewsPageProps {
  initialInterviews?: InterviewSchedule[];
  initialCandidates?: Candidate[];
  initialJobs?: JobOpening[];
}

export function InterviewsPage({
  initialInterviews,
  initialCandidates,
  initialJobs,
}: InterviewsPageProps = {}) {
  const today = '2026-10-30';

  // State
  const [interviews, setInterviews] = useState<InterviewSchedule[]>(initialInterviews ?? []);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates ?? []);
  const [jobs, setJobs] = useState<JobOpening[]>(initialJobs ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialInterviews);
  const [error, setError] = useState<string | null>(null);

  const [tabFilter, setTabFilter] = useState<
    'all' | 'today' | 'upcoming' | 'completed' | 'archived'
  >('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | InterviewType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Modal states
  const [selectedInterview, setSelectedInterview] = useState<InterviewSchedule | null>(null);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [isScorecardLoggingMode, setIsScorecardLoggingMode] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [rescheduleModalData, setRescheduleModalData] = useState<{
    interview: InterviewSchedule | null;
    mode: 'reschedule' | 'cancel';
    isOpen: boolean;
  }>({
    interview: null,
    mode: 'reschedule',
    isOpen: false,
  });

  const loadInterviewsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [interviewsRes, appsRes, candsRes, reqsRes] = await Promise.all([
        fetchInterviews({ limit: 500 }),
        fetchApplications({ limit: 1000 }).catch(() => ({ items: [] })),
        fetchCandidates({ limit: 1000 }).catch(() => ({ items: [] })),
        fetchJobRequisitions({ limit: 100 }).catch(() => ({ items: [] })),
      ]);

      const candItems = candsRes?.items ?? [];
      const candMap: Record<string, (typeof candItems)[0]> = {};
      for (const c of candItems) {
        candMap[c.id] = c;
      }

      const reqItems = reqsRes?.items ?? [];
      const reqMap: Record<string, (typeof reqItems)[0]> = {};
      for (const r of reqItems) {
        reqMap[r.id] = r;
      }

      const appItems = appsRes?.items ?? [];
      const appMap: Record<string, (typeof appItems)[0]> = {};
      for (const a of appItems) {
        appMap[a.id] = a;
      }

      const interviewItems = interviewsRes?.items ?? [];
      const adaptedInterviews = interviewItems.map((item) => {
        const app = item.application || appMap[item.applicationId];
        const cand = app?.candidate || (app ? candMap[app.candidateId] : undefined);
        const req = app?.requisition || (app ? reqMap[app.requisitionId] : undefined);

        return adaptInterviewToSchedule(item, {
          candidateName: cand ? `${cand.firstName} ${cand.lastName}`.trim() : undefined,
          candidateNumber: cand?.candidateNumber,
          candidateEmail: cand?.email,
          jobTitle: req?.jobTitle,
          jobCode: req?.requisitionCode || req?.requisitionNumber,
          jobId: req?.id,
        });
      });

      const adaptedCandidates = candItems.map((c) =>
        adaptCandidateToFrontend(c, appMap[c.id]),
      );

      const adaptedJobs = reqItems.map((r) => adaptRequisitionToJobOpening(r));

      setInterviews(adaptedInterviews);
      setCandidates(adaptedCandidates);
      setJobs(adaptedJobs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load interviews';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialInterviews) {
      void loadInterviewsData();
    }
  }, [initialInterviews, loadInterviewsData]);

  // Tab Counts
  const counts = useMemo(() => {
    return {
      all: interviews.length,
      today: interviews.filter((i) => i.scheduledDate === today && i.status !== 'cancelled').length,
      upcoming: interviews.filter((i) => i.scheduledDate > today && i.status === 'scheduled')
        .length,
      completed: interviews.filter((i) => i.status === 'completed').length,
      archived: interviews.filter((i) => i.status === 'rescheduled' || i.status === 'cancelled')
        .length,
    };
  }, [interviews, today]);

  const tabItems = useMemo(
    () => [
      { id: 'all', label: 'All Rounds', count: counts.all },
      { id: 'today', label: "Today's Schedule", count: counts.today },
      { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
      { id: 'completed', label: 'Completed', count: counts.completed },
      { id: 'archived', label: 'Cancelled', count: counts.archived },
    ],
    [counts],
  );

  // Filtered Interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter((item) => {
      // Tab filter
      if (tabFilter === 'today') {
        if (item.scheduledDate !== today || item.status === 'cancelled') return false;
      } else if (tabFilter === 'upcoming') {
        if (item.scheduledDate <= today || item.status !== 'scheduled') return false;
      } else if (tabFilter === 'completed') {
        if (item.status !== 'completed') return false;
      } else if (tabFilter === 'archived') {
        if (item.status !== 'rescheduled' && item.status !== 'cancelled') return false;
      }

      // Job filter
      if (jobFilter !== 'all' && item.jobId !== jobFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && item.interviewType !== typeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCandidate = item.candidateName.toLowerCase().includes(q);
        const matchRole = item.jobTitle.toLowerCase().includes(q);
        const matchRound = item.roundName.toLowerCase().includes(q);
        const matchPanel = item.panel.some((p) => p.name.toLowerCase().includes(q));
        if (!matchCandidate && !matchRole && !matchRound && !matchPanel) {
          return false;
        }
      }

      return true;
    });
  }, [interviews, tabFilter, jobFilter, typeFilter, searchQuery, today]);

  // Actions
  const handleOpenScorecard = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);
    setIsScorecardLoggingMode(false);
    setIsScorecardOpen(true);
  };

  const handleLogScorecard = (interview: InterviewSchedule) => {
    setSelectedInterview(interview);
    setIsScorecardLoggingMode(true);
    setIsScorecardOpen(true);
  };

  const handleSubmitScorecard = async (interviewId: string, feedback: InterviewFeedback) => {
    try {
      await recordInterviewFeedback(interviewId, {
        recommendation: feedback.recommendation,
        score: feedback.overallScore,
        notes: feedback.summaryNotes,
      });

      setInterviews((prev) =>
        prev.map((i) =>
          i.id === interviewId ? { ...i, status: 'completed', scorecard: feedback } : i,
        ),
      );
      setBannerNotice(
        `Successfully logged scorecard for ${selectedInterview?.candidateName}! Recommendation: ${feedback.recommendation.toUpperCase()}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record feedback';
      setBannerNotice(`Error: ${msg}`);
    }
  };

  const handleOpenReschedule = (interview: InterviewSchedule) => {
    setRescheduleModalData({
      interview,
      mode: 'reschedule',
      isOpen: true,
    });
  };

  const handleOpenCancel = (interview: InterviewSchedule) => {
    setRescheduleModalData({
      interview,
      mode: 'cancel',
      isOpen: true,
    });
  };

  const handleConfirmReschedule = async (
    interviewId: string,
    newDate: string,
    newStart: string,
    newEnd: string,
    reason: string,
  ) => {
    try {
      await rescheduleInterview(interviewId, {
        scheduledDate: newDate,
        startTime: newStart,
        endTime: newEnd,
        reason,
      });

      setInterviews((prev) =>
        prev.map((i) =>
          i.id === interviewId
            ? {
                ...i,
                status: 'rescheduled',
                scheduledDate: newDate,
                startTime: newStart,
                endTime: newEnd,
                rescheduleReason: reason,
              }
            : i,
        ),
      );
      setBannerNotice(`Interview rescheduled to ${newDate} at ${newStart}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reschedule interview';
      setBannerNotice(`Error: ${msg}`);
    }
  };

  const handleConfirmCancel = async (interviewId: string, reason: string) => {
    try {
      await cancelInterview(interviewId, reason);

      setInterviews((prev) =>
        prev.map((i) =>
          i.id === interviewId ? { ...i, status: 'cancelled', cancellationReason: reason } : i,
        ),
      );
      setBannerNotice('Interview round has been cancelled.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel interview';
      setBannerNotice(`Error: ${msg}`);
    }
  };

  const handleScheduleNew = async (newInterview: InterviewSchedule) => {
    try {
      const cand = candidates.find((c) => c.id === newInterview.candidateId);
      const appId = cand?.applicationHistory?.[0]?.id || `app-${newInterview.candidateId}`;

      const dto = adaptFrontendToScheduleInterviewDto(
        {
          candidateId: newInterview.candidateId,
          roundName: newInterview.roundName,
          interviewType: newInterview.interviewType,
          scheduledDate: newInterview.scheduledDate,
          startTime: newInterview.startTime,
          endTime: newInterview.endTime,
          meetingLink: newInterview.meetingLink,
          panelNamesRaw: newInterview.panel.map((p) => p.name).join(', '),
        } as ScheduleInterviewInput,
        appId,
      );

      const created = await scheduleInterview(dto);
      const adapted = adaptInterviewToSchedule(created, {
        candidateName: newInterview.candidateName,
        candidateNumber: newInterview.candidateNumber,
        candidateEmail: newInterview.candidateEmail,
        jobTitle: newInterview.jobTitle,
        jobCode: newInterview.jobCode,
        jobId: newInterview.jobId,
      });

      setInterviews((prev) => [adapted, ...prev]);
      setBannerNotice(
        `Interview booked for ${adapted.candidateName} on ${adapted.scheduledDate} at ${adapted.startTime}.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule interview';
      setBannerNotice(`Error: ${msg}`);
    }
  };

  return (
    <Page>
      <PageHeader title="Interviews" />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="info" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {error && (
          <Alert variant="danger">
            <Inline justify="between" align="center">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={loadInterviewsData}>
                Retry
              </Button>
            </Inline>
          </Alert>
        )}

        {/* 1. Metrics Banner */}
        <InterviewMetrics interviews={interviews} todayDate={today} />

        {/* 2. Unified Toolbar: Search, View Mode, Status Tabs & Actions */}
        <Toolbar
          left={
            <Inline align="center" gap="sm" wrap>
              {/* Search Bar */}
              <div className="bezent-search-bar">
                <BezentIcon name="search" size={16} color="var(--text-secondary, #64748b)" />
                <input
                  type="search"
                  placeholder="Search candidate, role, round, panel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bezent-search-bar__input"
                  aria-label="Search interviews"
                />
              </div>

              {/* Filter Button right next to Search */}
              <Button
                variant={showFilters ? 'dark' : 'outline'}
                size="md"
                onClick={() => setShowFilters((prev) => !prev)}
                aria-expanded={showFilters}
                aria-controls="interviews-filter-panel"
                aria-label="Toggle interview filters"
              >
                <Inline align="center" gap="xs">
                  <BezentIcon name="filter" size="action" />
                  <span>Filter</span>
                </Inline>
              </Button>

              {/* View Mode Toggle: Table vs Calendar */}
              <div className="bezent-view-toggle" role="group" aria-label="Interview view layout switcher">
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'table' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  aria-label="Table View"
                  aria-pressed={viewMode === 'table'}
                >
                  <BezentIcon name="viewList" size={18} />
                </button>
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('calendar')}
                  title="Calendar View"
                  aria-label="Calendar View"
                  aria-pressed={viewMode === 'calendar'}
                >
                  <BezentIcon name="calendar" size={18} />
                </button>
              </div>

              {/* Segmented Status Tabs */}
              <div className="bezent-filter-tabs" role="tablist" aria-label="Filter interviews by status">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={tabFilter === tab.id}
                    className={`bezent-filter-tab ${tabFilter === tab.id ? 'is-active' : ''}`}
                    onClick={() => setTabFilter(tab.id as typeof tabFilter)}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="bezent-filter-tab-count">{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </Inline>
          }
          right={
            <Inline align="center" gap="sm">
              <Button variant="dark" size="md" onClick={() => setIsScheduleOpen(true)}>
                <Inline align="center" gap="xs">
                  <BezentIcon name="add" size="action" />
                  <span>Schedule Interview</span>
                </Inline>
              </Button>
            </Inline>
          }
        />

        {/* Collapsible Filter Row when "Filter" button is clicked */}
        {showFilters && (
          <div id="interviews-filter-panel" role="region" aria-label="Interview filters">
            <Inline align="center" gap="md" wrap>
              <Select
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Job Requisitions' },
                  ...jobs.map((j) => ({
                    value: j.id,
                    label: `${j.title} (${j.jobCode})`,
                  })),
                ]}
              />

              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                options={[
                  { value: 'all', label: 'All Interview Types' },
                  { value: 'technical', label: 'Technical Coding' },
                  { value: 'system_design', label: 'System Design' },
                  { value: 'managerial', label: 'Managerial' },
                  { value: 'cultural_fit', label: 'Cultural Fit' },
                ]}
              />
            </Inline>
          </div>
        )}

        {/* 3. Content: Table or Calendar */}
        {isLoading ? (
          <LoadingState label="Loading interviews…" />
        ) : viewMode === 'table' ? (
          <InterviewScheduleTable
            interviews={filteredInterviews}
            todayDate={today}
            onViewScorecard={handleOpenScorecard}
            onLogScorecard={handleLogScorecard}
            onReschedule={handleOpenReschedule}
            onCancel={handleOpenCancel}
          />
        ) : (
          <InterviewCalendarView
            interviews={filteredInterviews}
            todayDate={today}
            onViewScorecard={handleOpenScorecard}
            onLogScorecard={handleLogScorecard}
          />
        )}
      </Stack>

      {/* Scorecard Modal */}
      <ScorecardModal
        interview={selectedInterview}
        isOpen={isScorecardOpen}
        onClose={() => {
          setIsScorecardOpen(false);
          setSelectedInterview(null);
        }}
        onSubmitScorecard={handleSubmitScorecard}
        isLoggingMode={isScorecardLoggingMode}
      />

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSchedule={handleScheduleNew}
        candidates={candidates}
      />

      {/* Reschedule / Cancel Modal */}
      <RescheduleCancelModal
        interview={rescheduleModalData.interview}
        mode={rescheduleModalData.mode}
        isOpen={rescheduleModalData.isOpen}
        onClose={() =>
          setRescheduleModalData({ interview: null, mode: 'reschedule', isOpen: false })
        }
        onConfirmReschedule={handleConfirmReschedule}
        onConfirmCancel={handleConfirmCancel}
      />
    </Page>
  );
}

export default InterviewsPage;

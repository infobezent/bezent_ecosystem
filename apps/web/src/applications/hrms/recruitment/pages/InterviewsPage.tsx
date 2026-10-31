import { useMemo, useState } from 'react';
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
import { INITIAL_INTERVIEWS } from '../data/mockInterviews';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';
import type {
  InterviewFeedback,
  InterviewSchedule,
  InterviewType,
} from '../types/interview';
import { InterviewMetrics } from '../components/InterviewMetrics';
import { InterviewScheduleTable } from '../components/InterviewScheduleTable';
import { InterviewCalendarView } from '../components/InterviewCalendarView';
import { ScorecardModal } from '../components/ScorecardModal';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';
import { RescheduleCancelModal } from '../components/RescheduleCancelModal';

export function InterviewsPage() {
  const today = '2026-10-30';

  // State
  const [interviews, setInterviews] = useState<InterviewSchedule[]>(INITIAL_INTERVIEWS);
  const [tabFilter, setTabFilter] = useState<'all' | 'today' | 'upcoming' | 'completed' | 'archived'>('all');
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

  // Tab Counts
  const counts = useMemo(() => {
    return {
      all: interviews.length,
      today: interviews.filter((i) => i.scheduledDate === today && i.status !== 'cancelled').length,
      upcoming: interviews.filter((i) => i.scheduledDate > today && i.status === 'scheduled').length,
      completed: interviews.filter((i) => i.status === 'completed').length,
      archived: interviews.filter((i) => i.status === 'rescheduled' || i.status === 'cancelled').length,
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

  const handleSubmitScorecard = (interviewId: string, feedback: InterviewFeedback) => {
    setInterviews((prev) =>
      prev.map((i) =>
        i.id === interviewId
          ? { ...i, status: 'completed', scorecard: feedback }
          : i,
      ),
    );
    setBannerNotice(`Successfully logged scorecard for ${selectedInterview?.candidateName}! Recommendation: ${feedback.recommendation.toUpperCase()}`);
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

  const handleConfirmReschedule = (
    interviewId: string,
    newDate: string,
    newStart: string,
    newEnd: string,
    reason: string,
  ) => {
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
  };

  const handleConfirmCancel = (interviewId: string, reason: string) => {
    setInterviews((prev) =>
      prev.map((i) =>
        i.id === interviewId
          ? { ...i, status: 'cancelled', cancellationReason: reason }
          : i,
      ),
    );
    setBannerNotice('Interview round has been cancelled.');
  };

  const handleScheduleNew = (newInterview: InterviewSchedule) => {
    setInterviews((prev) => [newInterview, ...prev]);
    setBannerNotice(`Interview booked for ${newInterview.candidateName} on ${newInterview.scheduledDate} at ${newInterview.startTime}.`);
  };

  return (
    <Page>
      <PageHeader
        title="Interviews"
      />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="info" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {/* 1. 3D Clay Metrics Banner */}
        <InterviewMetrics interviews={interviews} todayDate={today} />

        {/* 2. Unified 3D Toolbar: Search, View Mode, Status Tabs & Actions */}
        <Toolbar
          left={
            <Inline align="center" gap="sm" wrap>
              {/* 3D Search Bar */}
              <div className="bezent-search-bar">
                <BezentIcon name="search" size={16} color="var(--text-secondary, #64748b)" />
                <input
                  type="search"
                  placeholder="Search candidate, role, round, or panel member..."
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
              >
                <Inline align="center" gap="xs">
                  <BezentIcon name="filter" size="action" />
                  <span>Filter</span>
                </Inline>
              </Button>

              {/* View Mode Toggle: Table vs Calendar */}
              <div className="bezent-view-toggle" role="group" aria-label="View layout switcher">
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'table' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  aria-label="Table View"
                >
                  <BezentIcon name="viewList" size={18} />
                </button>
                <button
                  type="button"
                  className={`bezent-view-toggle__btn ${viewMode === 'calendar' ? 'is-active' : ''}`}
                  onClick={() => setViewMode('calendar')}
                  title="Calendar View"
                  aria-label="Calendar View"
                >
                  <BezentIcon name="calendar" size={18} />
                </button>
              </div>

              {/* 3D Recessed Segmented Status Tabs */}
              <div className="bezent-filter-tabs">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
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
              <Button
                variant="dark"
                size="md"
                onClick={() => setIsScheduleOpen(true)}
              >
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
          <Inline align="center" gap="md" wrap>
            <Select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Job Requisitions' },
                ...INITIAL_JOB_OPENINGS.map((j) => ({
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
        )}

        {/* 3. Content: Table or Calendar */}
        {viewMode === 'table' ? (
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
        candidates={INITIAL_CANDIDATES}
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

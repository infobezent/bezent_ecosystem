import { useMemo, useState } from 'react';
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
import { INITIAL_ASSESSMENTS } from '../data/mockAssessments';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';
import type { AssessmentAssignment, AssessmentDecision, AssessmentType } from '../types/assessment';
import { AssessmentMetrics } from '../components/AssessmentMetrics';
import { AssessmentsTable } from '../components/AssessmentsTable';
import { AssessmentDetailModal } from '../components/AssessmentDetailModal';
import { AssignAssessmentModal } from '../components/AssignAssessmentModal';

export function AssessmentsPage() {
  // State
  const [assessments, setAssessments] = useState<AssessmentAssignment[]>(INITIAL_ASSESSMENTS);
  const [tabFilter, setTabFilter] = useState<
    'all' | 'in_progress' | 'under_review' | 'passed' | 'failed'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AssessmentType>('all');
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentAssignment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isGradingMode, setIsGradingMode] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Tab Counts
  const counts = useMemo(() => {
    return {
      all: assessments.length,
      in_progress: assessments.filter((a) => a.status === 'assigned' || a.status === 'in_progress')
        .length,
      under_review: assessments.filter(
        (a) => a.status === 'submitted' || a.status === 'under_review',
      ).length,
      passed: assessments.filter((a) => a.status === 'evaluated' && a.decision === 'passed').length,
      failed: assessments.filter((a) => a.status === 'evaluated' && a.decision === 'failed').length,
    };
  }, [assessments]);

  const tabItems = useMemo(
    () => [
      { id: 'all', label: 'All Tests', count: counts.all },
      { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
      { id: 'under_review', label: 'Under Review', count: counts.under_review },
      { id: 'passed', label: 'Passed & Cleared', count: counts.passed },
      { id: 'failed', label: 'Needs Attention / Failed', count: counts.failed },
    ],
    [counts],
  );

  // Filtered Assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      // Tab filter
      if (tabFilter === 'in_progress') {
        if (item.status !== 'assigned' && item.status !== 'in_progress') return false;
      } else if (tabFilter === 'under_review') {
        if (item.status !== 'submitted' && item.status !== 'under_review') return false;
      } else if (tabFilter === 'passed') {
        if (item.status !== 'evaluated' || item.decision !== 'passed') return false;
      } else if (tabFilter === 'failed') {
        if (item.status !== 'evaluated' || item.decision !== 'failed') return false;
      }

      // Job filter
      if (jobFilter !== 'all' && item.jobId !== jobFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCandidate = item.candidateName.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchPlatform = item.platform.toLowerCase().includes(q);
        const matchEvaluator = item.evaluatorName?.toLowerCase().includes(q);
        if (!matchCandidate && !matchTitle && !matchPlatform && !matchEvaluator) {
          return false;
        }
      }

      return true;
    });
  }, [assessments, tabFilter, jobFilter, typeFilter, searchQuery]);

  // Actions
  const handleSelectAssessment = (item: AssessmentAssignment) => {
    setSelectedAssessment(item);
    setIsGradingMode(false);
    setIsDetailOpen(true);
  };

  const handleGradeAssessment = (item: AssessmentAssignment) => {
    setSelectedAssessment(item);
    setIsGradingMode(true);
    setIsDetailOpen(true);
  };

  const handleSaveGrade = (
    assessmentId: string,
    score: number,
    decision: AssessmentDecision,
    feedback: string,
  ) => {
    setAssessments((prev) =>
      prev.map((a) =>
        a.id === assessmentId
          ? {
              ...a,
              status: 'evaluated',
              score,
              decision,
              evaluatorFeedback: feedback,
              evaluatedDate: new Date().toISOString().slice(0, 10),
            }
          : a,
      ),
    );
    setBannerNotice(
      `Successfully graded assessment for ${selectedAssessment?.candidateName}! Score: ${score}/100 (${decision.toUpperCase()})`,
    );
  };

  const handleAssignNew = (newAssignment: AssessmentAssignment) => {
    setAssessments((prev) => [newAssignment, ...prev]);
    setBannerNotice(
      `Assigned "${newAssignment.title}" to ${newAssignment.candidateName} (Due: ${newAssignment.dueDate}).`,
    );
  };

  return (
    <Page>
      <PageHeader
        title="Assessments"
        subtitle="Assessment assignments, test status, candidate submissions, and evaluation results."
        actions={
          <Button variant="primary" onClick={() => setIsAssignOpen(true)}>
            <Inline align="center" gap="xs">
              <BezentIcon name="tasks" size="action" />
              <span>Assign Assessment</span>
            </Inline>
          </Button>
        }
      />

      <Stack gap="lg">
        {bannerNotice && (
          <Alert variant="info" onDismiss={() => setBannerNotice(null)}>
            {bannerNotice}
          </Alert>
        )}

        {/* 1. Summary Metrics */}
        <AssessmentMetrics assessments={assessments} />

        {/* 2. Tabs */}
        <Tabs
          items={tabItems}
          activeId={tabFilter}
          onChange={(id) => setTabFilter(id as typeof tabFilter)}
        />

        {/* 3. Toolbar */}
        <Toolbar>
          <Inline justify="between" align="center" wrap gap="md">
            <Inline align="center" gap="md" wrap>
              <SearchInput
                placeholder="Search candidate, test title, platform, evaluator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />

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
                  { value: 'all', label: 'All Assessment Categories' },
                  { value: 'coding_challenge', label: 'Coding Challenge' },
                  { value: 'design_project', label: 'Design Project' },
                  { value: 'take_home_assignment', label: 'Take-Home Project' },
                  { value: 'domain_case_study', label: 'Case Study' },
                ]}
              />
            </Inline>

            <span className="bezent-text-xs bezent-text-secondary">
              Showing {filteredAssessments.length} of {assessments.length} tests
            </span>
          </Inline>
        </Toolbar>

        {/* 4. Table */}
        <AssessmentsTable
          assessments={filteredAssessments}
          onSelectAssessment={handleSelectAssessment}
          onGradeAssessment={handleGradeAssessment}
        />
      </Stack>

      {/* Detail / Grade Modal */}
      <AssessmentDetailModal
        assessment={selectedAssessment}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedAssessment(null);
        }}
        onSaveGrade={handleSaveGrade}
        isGradingMode={isGradingMode}
      />

      {/* Assign Modal */}
      <AssignAssessmentModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onAssign={handleAssignNew}
        candidates={INITIAL_CANDIDATES}
      />
    </Page>
  );
}

export default AssessmentsPage;

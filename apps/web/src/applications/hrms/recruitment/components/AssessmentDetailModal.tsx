import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  FormField,
  FormGrid,
  Grid,
  Inline,
  Input,
  Modal,
  Select,
  Stack,
  Tabs,
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  AssessmentAssignment,
  AssessmentDecision,
} from '../types/assessment';
import {
  formatAssessmentStatusBadge,
  formatAssessmentTypeLabel,
  formatDecisionBadge,
} from './AssessmentsTable';

export interface AssessmentDetailModalProps {
  assessment: AssessmentAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveGrade?: (assessmentId: string, score: number, decision: AssessmentDecision, feedback: string) => void;
  isGradingMode?: boolean;
}

export function AssessmentDetailModal({
  assessment,
  isOpen,
  onClose,
  onSaveGrade,
  isGradingMode = false,
}: AssessmentDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'submission' | 'evaluation' | 'grade'>('overview');
  const [gradeScore, setGradeScore] = useState('90');
  const [gradeDecision, setGradeDecision] = useState<AssessmentDecision>('passed');
  const [gradeFeedback, setGradeFeedback] = useState(
    'Strong implementation. Architecture adheres strictly to repository standards, tenant company isolation is respected, and tests are passing.',
  );

  if (!assessment) return null;

  const tabItems = [
    { id: 'overview', label: 'Brief & Instructions' },
    { id: 'submission', label: 'Candidate Submission' },
    { id: 'evaluation', label: assessment.score !== undefined ? `Evaluation (Score: ${assessment.score})` : 'Evaluation' },
    ...(isGradingMode || assessment.status === 'submitted' || assessment.status === 'under_review'
      ? [{ id: 'grade', label: 'Grade & Review' }]
      : []),
  ];

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveGrade) return;
    onSaveGrade(assessment.id, parseFloat(gradeScore) || 0, gradeDecision, gradeFeedback.trim());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="tasks" size="action" />
          <span>{assessment.title}</span>
          {formatAssessmentStatusBadge(assessment.status)}
          {formatDecisionBadge(assessment.decision)}
        </Inline>
      }
      description={
        <Inline align="center" gap="md" wrap>
          <span>Candidate: <strong>{assessment.candidateName}</strong> ({assessment.candidateNumber})</span>
          <span>•</span>
          <span>{assessment.jobTitle}</span>
          <span>•</span>
          <Badge variant="neutral" size="sm">{formatAssessmentTypeLabel(assessment.type)}</Badge>
        </Inline>
      }
      footer={
        <Inline justify="between" align="center">
          <span className="bezent-text-xs bezent-text-secondary">
            Assigned: {assessment.assignedDate} • Due: {assessment.dueDate}
          </span>
          <Inline gap="sm">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {activeTab === 'grade' && onSaveGrade && (
              <Button variant="primary" onClick={handleGradeSubmit}>
                Submit Evaluation
              </Button>
            )}
          </Inline>
        </Inline>
      }
    >
      <Stack gap="lg">
        {/* Navigation Tabs */}
        <Tabs
          items={tabItems}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {/* Tab 1: Brief & Instructions */}
        {activeTab === 'overview' && (
          <Stack gap="md">
            <Grid columns={3} gap="sm">
              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Testing Platform</span>
                    <span className="bezent-font-semibold bezent-text-sm">{assessment.platform}</span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Lead Evaluator</span>
                    <span className="bezent-font-semibold bezent-text-sm">
                      {assessment.evaluatorName || 'Unassigned'}
                    </span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Total Weight</span>
                    <span className="bezent-font-semibold bezent-text-sm">{assessment.maxScore} points</span>
                  </Stack>
                </CardBody>
              </Card>
            </Grid>

            <Divider />

            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Challenge Description & Expectations</h4>
              <p className="bezent-text-sm bezent-text-secondary leading-relaxed">
                This practical assessment tests candidate problem decomposition, architecture fidelity, and mastery of domain principles under realistic constraints.
              </p>
            </Stack>

            {assessment.testLink && (
              <Card variant="tint-blue" padding="md">
                <CardBody>
                  <Inline justify="between" align="center">
                    <Inline align="center" gap="sm">
                      <BezentIcon name="explore" size="action" color="var(--color-info-600, #0284C7)" />
                      <Stack gap="none">
                        <span className="bezent-font-semibold bezent-text-sm">Challenge Repository / Workspace</span>
                        <span className="bezent-text-xs bezent-text-secondary">{assessment.testLink}</span>
                      </Stack>
                    </Inline>
                    <a
                      href={assessment.testLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bezent-btn bezent-btn--secondary bezent-btn--sm"
                    >
                      Open Workspace
                    </a>
                  </Inline>
                </CardBody>
              </Card>
            )}
          </Stack>
        )}

        {/* Tab 2: Candidate Submission */}
        {activeTab === 'submission' && (
          <Stack gap="md">
            {assessment.submissionUrl ? (
              <>
                <Card variant="tint-green" padding="md">
                  <CardBody>
                    <Inline justify="between" align="center">
                      <Inline align="center" gap="sm">
                        <BezentIcon name="check" size="action" color="var(--color-success-600, #16A34A)" />
                        <Stack gap="none">
                          <span className="bezent-font-semibold bezent-text-sm">Submitted by Candidate</span>
                          <span className="bezent-text-xs bezent-text-secondary">
                            Timestamp: {assessment.submittedDate || 'Recently submitted'}
                          </span>
                        </Stack>
                      </Inline>
                      <a
                        href={assessment.submissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bezent-btn bezent-btn--primary bezent-btn--sm"
                      >
                        Inspect Submission
                      </a>
                    </Inline>
                  </CardBody>
                </Card>

                {assessment.submissionNotes && (
                  <Stack gap="xs">
                    <h4 className="bezent-font-semibold bezent-text-sm">Candidate Submission Notes</h4>
                    <p className="bezent-text-sm bezent-text-secondary bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                      {assessment.submissionNotes}
                    </p>
                  </Stack>
                )}
              </>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <Stack gap="xs" align="center">
                  <BezentIcon name="clock" size="nav" color="var(--color-warning-600, #D97706)" />
                  <span className="bezent-font-semibold bezent-text-sm">Awaiting Candidate Submission</span>
                  <span className="bezent-text-xs bezent-text-secondary">
                    Due on {assessment.dueDate}. Candidate has not submitted their solution yet.
                  </span>
                </Stack>
              </div>
            )}
          </Stack>
        )}

        {/* Tab 3: Evaluation & Scores */}
        {activeTab === 'evaluation' && (
          <Stack gap="md">
            {assessment.score !== undefined ? (
              <>
                {/* Score Banner */}
                <Card variant={assessment.decision === 'passed' ? 'tint-green' : 'flat'} padding="md">
                  <CardBody>
                    <Grid columns={3} gap="md">
                      <Stack gap="none">
                        <span className="bezent-text-xs bezent-text-secondary">Final Score</span>
                        <span className="bezent-text-3xl bezent-font-bold">
                          {assessment.score} <span className="bezent-text-sm bezent-font-normal text-gray-500">/ {assessment.maxScore}</span>
                        </span>
                      </Stack>

                      <Stack gap="none">
                        <span className="bezent-text-xs bezent-text-secondary">Hiring Decision</span>
                        <div className="pt-1">
                          {formatDecisionBadge(assessment.decision)}
                        </div>
                      </Stack>

                      <Stack gap="none">
                        <span className="bezent-text-xs bezent-text-secondary">Evaluated By</span>
                        <span className="bezent-font-semibold bezent-text-sm">{assessment.evaluatorName}</span>
                        <span className="bezent-text-xs bezent-text-secondary">{assessment.evaluatedDate}</span>
                      </Stack>
                    </Grid>
                  </CardBody>
                </Card>

                {/* Criteria Breakdown */}
                {assessment.criteriaScores && (
                  <Stack gap="xs">
                    <h4 className="bezent-font-semibold bezent-text-sm">Evaluation Criteria</h4>
                    <Stack gap="sm">
                      {assessment.criteriaScores.map((crit) => (
                        <Card key={crit.id} variant="flat" padding="sm">
                          <CardBody>
                            <Inline justify="between" align="center">
                              <Stack gap="none">
                                <span className="bezent-font-semibold bezent-text-sm">{crit.name}</span>
                                {crit.notes && (
                                  <span className="bezent-text-xs bezent-text-secondary">{crit.notes}</span>
                                )}
                              </Stack>
                              <Badge variant="info" size="md">
                                {crit.score} / {crit.maxScore}
                              </Badge>
                            </Inline>
                          </CardBody>
                        </Card>
                      ))}
                    </Stack>
                  </Stack>
                )}

                {/* Feedback */}
                {assessment.evaluatorFeedback && (
                  <>
                    <Divider />
                    <Stack gap="xs">
                      <h4 className="bezent-font-semibold bezent-text-sm">Evaluator Feedback</h4>
                      <p className="bezent-text-sm bezent-text-secondary bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed">
                        {assessment.evaluatorFeedback}
                      </p>
                    </Stack>
                  </>
                )}
              </>
            ) : (
              <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <span className="bezent-text-xs bezent-text-secondary">
                  Assessment has not been evaluated yet. Click &quot;Grade &amp; Review&quot; to record scores.
                </span>
              </div>
            )}
          </Stack>
        )}

        {/* Tab 4: Grade Form */}
        {activeTab === 'grade' && (
          <form onSubmit={handleGradeSubmit}>
            <Stack gap="md">
              <FormGrid columns={2} gap="md">
                <FormField label="Score (0 - 100)" required>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                  />
                </FormField>

                <FormField label="Evaluation Decision" required>
                  <Select
                    value={gradeDecision}
                    onChange={(e) => setGradeDecision(e.target.value as AssessmentDecision)}
                    options={[
                      { value: 'passed', label: 'Passed (Clear for next round)' },
                      { value: 'failed', label: 'Failed (Below benchmark)' },
                      { value: 'needs_follow_up', label: 'Needs Follow-up Discussion' },
                    ]}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Evaluator Detailed Review & Feedback" required>
                <Textarea
                  rows={4}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                />
              </FormField>
            </Stack>
          </form>
        )}
      </Stack>
    </Modal>
  );
}

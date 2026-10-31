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
  Textarea,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  InterviewFeedback,
  InterviewRecommendation,
  InterviewSchedule,
} from '../types/interview';
import { formatRecommendationBadge } from './InterviewScheduleTable';

export interface ScorecardModalProps {
  interview: InterviewSchedule | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitScorecard?: (interviewId: string, feedback: InterviewFeedback) => void;
  isLoggingMode?: boolean;
}

export function ScorecardModal({
  interview,
  isOpen,
  onClose,
  onSubmitScorecard,
  isLoggingMode = false,
}: ScorecardModalProps) {
  const [overallScore, setOverallScore] = useState('4.5');
  const [recommendation, setRecommendation] = useState<InterviewRecommendation>('hire');
  const [strengthsRaw, setStrengthsRaw] = useState(
    'Strong problem decomposition\nClear communication and code organization',
  );
  const [improvementsRaw, setImprovementsRaw] = useState(
    'Deepen familiarity with enterprise distributed messaging',
  );
  const [summaryNotes, setSummaryNotes] = useState(
    'Candidate demonstrated solid engineering fundamentals and strong design sensibility.',
  );

  if (!interview) return null;

  const existing = interview.scorecard;
  const isForm = isLoggingMode || !existing;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmitScorecard) return;

    const feedback: InterviewFeedback = {
      interviewerName: interview.panel[0]?.name || 'Interviewer',
      interviewerRole: interview.panel[0]?.role || 'Evaluator',
      submittedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      overallScore: parseFloat(overallScore) || 4.0,
      recommendation,
      criteria: [
        { id: 'c1', name: 'Domain Mastery & Technical Depth', score: 4.5, maxScore: 5 },
        { id: 'c2', name: 'Problem Solving & System Design', score: 4.0, maxScore: 5 },
        { id: 'c3', name: 'Communication & Culture Alignment', score: 4.5, maxScore: 5 },
      ],
      strengths: strengthsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
      areasForImprovement: improvementsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
      summaryNotes: summaryNotes.trim(),
    };

    onSubmitScorecard(interview.id, feedback);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="interviews" size="action" />
          <span>{existing ? 'Evaluation Scorecard' : 'Log Interview Scorecard'}</span>
          {existing && formatRecommendationBadge(existing.recommendation)}
        </Inline>
      }
      description={
        <Inline align="center" gap="md" wrap>
          <span>Candidate: <strong>{interview.candidateName}</strong> ({interview.candidateNumber})</span>
          <span>•</span>
          <span>{interview.roundName}</span>
          <span>•</span>
          <span>{interview.jobTitle}</span>
        </Inline>
      }
      footer={
        <Inline justify="between" align="center">
          <span className="bezent-text-xs bezent-text-secondary">
            Conducted on: {interview.scheduledDate} ({interview.startTime} - {interview.endTime})
          </span>
          <Inline gap="sm">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {isForm && onSubmitScorecard && (
              <Button variant="primary" onClick={handleSubmit}>
                Submit Scorecard
              </Button>
            )}
          </Inline>
        </Inline>
      }
    >
      <Stack gap="lg">
        {/* Existing View Mode */}
        {existing && !isLoggingMode ? (
          <Stack gap="md">
            {/* Top Score Banner */}
            <Card variant="tint-green" padding="md">
              <CardBody>
                <Grid columns={3} gap="md">
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Overall Score</span>
                    <span className="bezent-text-3xl bezent-font-bold">
                      ★ {existing.overallScore.toFixed(1)} <span className="bezent-text-sm bezent-font-normal text-gray-500">/ 5.0</span>
                    </span>
                  </Stack>

                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Hiring Recommendation</span>
                    <div className="pt-1">
                      {formatRecommendationBadge(existing.recommendation)}
                    </div>
                  </Stack>

                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Evaluated By</span>
                    <span className="bezent-font-semibold bezent-text-sm">{existing.interviewerName}</span>
                    <span className="bezent-text-xs bezent-text-secondary">{existing.submittedAt}</span>
                  </Stack>
                </Grid>
              </CardBody>
            </Card>

            {/* Criteria Breakdown */}
            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Evaluation Criteria Scores</h4>
              <Stack gap="sm">
                {existing.criteria.map((crit) => (
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

            <Divider />

            {/* Strengths & Improvements */}
            <Grid columns={2} gap="md">
              <Stack gap="xs">
                <h4 className="bezent-font-semibold bezent-text-sm text-success-700">Key Strengths</h4>
                <ul className="bezent-text-xs bezent-text-secondary list-disc pl-5 space-y-1">
                  {existing.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </Stack>

              <Stack gap="xs">
                <h4 className="bezent-font-semibold bezent-text-sm text-warning-700">Areas for Growth</h4>
                <ul className="bezent-text-xs bezent-text-secondary list-disc pl-5 space-y-1">
                  {existing.areasForImprovement.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              </Stack>
            </Grid>

            <Divider />

            {/* Summary Narrative */}
            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Evaluator Summary & Verdict</h4>
              <p className="bezent-text-sm bezent-text-secondary leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                {existing.summaryNotes}
              </p>
            </Stack>
          </Stack>
        ) : (
          /* Form Mode */
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <FormGrid columns={2} gap="md">
                <FormField label="Overall Score (1 - 5)" required>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={overallScore}
                    onChange={(e) => setOverallScore(e.target.value)}
                  />
                </FormField>

                <FormField label="Hiring Recommendation" required>
                  <Select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value as InterviewRecommendation)}
                    options={[
                      { value: 'strong_hire', label: 'Strong Hire (Definite Yes)' },
                      { value: 'hire', label: 'Hire (Meets Expectations)' },
                      { value: 'lean_hire', label: 'Lean Hire (Acceptable)' },
                      { value: 'lean_no_hire', label: 'Lean No Hire (Reservations)' },
                      { value: 'no_hire', label: 'No Hire (Clear Reject)' },
                    ]}
                  />
                </FormField>
              </FormGrid>

              <FormField label="Key Strengths (one per line)">
                <Textarea
                  rows={2}
                  value={strengthsRaw}
                  onChange={(e) => setStrengthsRaw(e.target.value)}
                />
              </FormField>

              <FormField label="Areas for Improvement (one per line)">
                <Textarea
                  rows={2}
                  value={improvementsRaw}
                  onChange={(e) => setImprovementsRaw(e.target.value)}
                />
              </FormField>

              <FormField label="Detailed Evaluator Feedback & Justification" required>
                <Textarea
                  rows={3}
                  value={summaryNotes}
                  onChange={(e) => setSummaryNotes(e.target.value)}
                />
              </FormField>
            </Stack>
          </form>
        )}
      </Stack>
    </Modal>
  );
}

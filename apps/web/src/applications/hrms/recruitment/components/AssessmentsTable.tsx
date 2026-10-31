import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  AssessmentAssignment,
  AssessmentDecision,
  AssessmentStatus,
  AssessmentType,
} from '../types/assessment';

export interface AssessmentsTableProps {
  assessments: AssessmentAssignment[];
  onSelectAssessment: (assessment: AssessmentAssignment) => void;
  onGradeAssessment?: (assessment: AssessmentAssignment) => void;
}

export function formatAssessmentTypeLabel(type: AssessmentType): string {
  switch (type) {
    case 'coding_challenge':
      return 'Coding Challenge';
    case 'design_project':
      return 'Design Project';
    case 'take_home_assignment':
      return 'Take-Home Project';
    case 'aptitude_cognitive':
      return 'Aptitude / Cognitive';
    case 'domain_case_study':
      return 'Case Study';
    default:
      return type;
  }
}

export function formatAssessmentStatusBadge(status: AssessmentStatus) {
  switch (status) {
    case 'assigned':
      return <Badge variant="neutral">Assigned</Badge>;
    case 'in_progress':
      return <Badge variant="info">In Progress</Badge>;
    case 'submitted':
      return <Badge variant="warning">Submitted</Badge>;
    case 'under_review':
      return <Badge variant="warning">Under Review</Badge>;
    case 'evaluated':
      return <Badge variant="success">Evaluated</Badge>;
    case 'expired':
      return <Badge variant="danger">Expired</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function formatDecisionBadge(decision?: AssessmentDecision) {
  if (!decision) return null;
  switch (decision) {
    case 'passed':
      return <Badge variant="success">Passed</Badge>;
    case 'failed':
      return <Badge variant="danger">Failed</Badge>;
    case 'needs_follow_up':
      return <Badge variant="warning">Follow-up</Badge>;
    default:
      return <Badge variant="neutral">{decision}</Badge>;
  }
}

export function AssessmentsTable({
  assessments,
  onSelectAssessment,
  onGradeAssessment,
}: AssessmentsTableProps) {
  if (assessments.length === 0) {
    return (
      <EmptyState
        title="No assessments found"
        description="Try adjusting your status tab, job filter, or search query."
        variant="recruitment"
      />
    );
  }

  return (
    <Table hoverable>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Candidate</TableHeaderCell>
          <TableHeaderCell>Assessment Challenge</TableHeaderCell>
          <TableHeaderCell>Job Requisition</TableHeaderCell>
          <TableHeaderCell>Timeline</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Score & Result</TableHeaderCell>
          <TableHeaderCell>Evaluator</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {assessments.map((item) => {
          const initials = item.candidateName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          return (
            <TableRow key={item.id}>
              {/* Candidate Info */}
              <TableCell>
                <Inline align="center" gap="sm">
                  <Avatar
                    initials={initials}
                    size="md"
                    color={item.candidateAvatarColor || 'blue'}
                  />
                  <Stack gap="none">
                    <span className="bezent-font-semibold bezent-text-sm">
                      {item.candidateName}
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {item.candidateNumber}
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {item.candidateEmail}
                    </span>
                  </Stack>
                </Inline>
              </TableCell>

              {/* Assessment Title & Platform */}
              <TableCell>
                <Stack gap="xs">
                  <span className="bezent-font-semibold bezent-text-sm leading-snug">
                    {item.title}
                  </span>
                  <Inline align="center" gap="xs">
                    <Badge variant="neutral" size="sm">
                      {formatAssessmentTypeLabel(item.type)}
                    </Badge>
                    <span className="bezent-text-xs bezent-text-secondary">
                      via {item.platform}
                    </span>
                  </Inline>
                  {item.submissionUrl && (
                    <a
                      href={item.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bezent-text-xs text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <BezentIcon name="documents" size={12} />
                      <span>View Submission Link</span>
                    </a>
                  )}
                </Stack>
              </TableCell>

              {/* Job Requisition */}
              <TableCell>
                <Stack gap="none">
                  <span className="bezent-font-medium bezent-text-sm">{item.jobTitle}</span>
                  <span className="bezent-text-xs bezent-text-secondary">{item.jobCode}</span>
                </Stack>
              </TableCell>

              {/* Timeline */}
              <TableCell>
                <Stack gap="none">
                  <span className="bezent-text-xs bezent-text-secondary">
                    Assigned: {item.assignedDate}
                  </span>
                  <span className="bezent-text-xs bezent-font-semibold">Due: {item.dueDate}</span>
                  {item.submittedDate && (
                    <span className="bezent-text-xs text-success-700">
                      Submitted: {item.submittedDate}
                    </span>
                  )}
                </Stack>
              </TableCell>

              {/* Status */}
              <TableCell>{formatAssessmentStatusBadge(item.status)}</TableCell>

              {/* Score & Result */}
              <TableCell>
                {item.score !== undefined ? (
                  <Stack gap="none">
                    <Inline align="center" gap="xs">
                      <span className="bezent-font-bold bezent-text-base">
                        {item.score}{' '}
                        <span className="bezent-text-xs bezent-font-normal text-gray-500">
                          / {item.maxScore}
                        </span>
                      </span>
                      {formatDecisionBadge(item.decision)}
                    </Inline>
                    <span className="bezent-text-xs bezent-text-secondary">
                      Evaluated on {item.evaluatedDate}
                    </span>
                  </Stack>
                ) : item.status === 'submitted' || item.status === 'under_review' ? (
                  <Badge variant="warning" size="sm">
                    Awaiting Grading
                  </Badge>
                ) : (
                  <span className="bezent-text-xs bezent-text-secondary">In progress</span>
                )}
              </TableCell>

              {/* Evaluator */}
              <TableCell>
                {item.evaluatorName ? (
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-font-medium">{item.evaluatorName}</span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {item.evaluatorRole}
                    </span>
                  </Stack>
                ) : (
                  <span className="bezent-text-xs bezent-text-secondary">Unassigned</span>
                )}
              </TableCell>

              {/* Actions */}
              <TableCell>
                <Inline gap="xs" align="center">
                  <Button size="sm" variant="secondary" onClick={() => onSelectAssessment(item)}>
                    View Details
                  </Button>
                  {(item.status === 'submitted' || item.status === 'under_review') &&
                    onGradeAssessment && (
                      <Button size="sm" variant="primary" onClick={() => onGradeAssessment(item)}>
                        Grade
                      </Button>
                    )}
                </Inline>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

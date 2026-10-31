import {
  Avatar,
  Badge,
  EmptyState,
  Inline,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type {
  InterviewRecommendation,
  InterviewSchedule,
  InterviewStatus,
} from '../types/interview';

export interface InterviewScheduleTableProps {
  interviews: InterviewSchedule[];
  todayDate?: string;
  onViewScorecard: (interview: InterviewSchedule) => void;
  onLogScorecard: (interview: InterviewSchedule) => void;
  onReschedule: (interview: InterviewSchedule) => void;
  onCancel: (interview: InterviewSchedule) => void;
}

export function formatInterviewStatusBadge(status: InterviewStatus) {
  switch (status) {
    case 'scheduled':
      return (
        <Badge variant="info" showDot>
          Scheduled
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="warning" showDot>
          In Progress
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="success" showDot>
          Completed
        </Badge>
      );
    case 'rescheduled':
      return (
        <Badge variant="warning" showDot>
          Rescheduled
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="neutral" showDot>
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" showDot>
          {status}
        </Badge>
      );
  }
}

export function formatRecommendationBadge(rec: InterviewRecommendation) {
  switch (rec) {
    case 'strong_hire':
      return <Badge variant="success">Strong Hire</Badge>;
    case 'hire':
      return <Badge variant="success">Hire</Badge>;
    case 'lean_hire':
      return <Badge variant="info">Lean Hire</Badge>;
    case 'lean_no_hire':
      return <Badge variant="warning">Lean No Hire</Badge>;
    case 'no_hire':
      return <Badge variant="danger">No Hire</Badge>;
    default:
      return <Badge variant="neutral">{rec}</Badge>;
  }
}

export function InterviewScheduleTable({
  interviews,
  todayDate = '2026-10-30',
  onViewScorecard,
  onLogScorecard,
  onReschedule,
  onCancel,
}: InterviewScheduleTableProps) {
  if (interviews.length === 0) {
    return (
      <EmptyState
        title="No interviews found"
        description="Try adjusting your date filters, status tab, or candidate search."
        variant="recruitment"
      />
    );
  }

  // Standard Clean 1-Line Table View (matching Candidate Directory & Job Openings)
  return (
    <Table hoverable>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Candidate ⇅</TableHeaderCell>
          <TableHeaderCell>Applied Role ⇅</TableHeaderCell>
          <TableHeaderCell>Interview Round ⇅</TableHeaderCell>
          <TableHeaderCell>Scheduled Slot ⇅</TableHeaderCell>
          <TableHeaderCell>Interviewer ⇅</TableHeaderCell>
          <TableHeaderCell>Status ⇅</TableHeaderCell>
          <TableHeaderCell>Evaluation ⇅</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {interviews.map((item) => {
          const initials = item.candidateName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2);

          const isToday = item.scheduledDate === todayDate;

          return (
            <TableRow
              key={item.id}
              onClick={() => {
                if (item.scorecard) {
                  onViewScorecard(item);
                } else if (item.status === 'completed' || isToday) {
                  onLogScorecard(item);
                } else {
                  onViewScorecard(item);
                }
              }}
              className="cursor-pointer"
            >
              {/* 1. Candidate Info */}
              <TableCell>
                <Inline align="center" gap="sm">
                  <Avatar
                    initials={initials}
                    size="sm"
                    color={item.candidateAvatarColor || 'blue'}
                  />
                  <span className="bezent-table-meta-title">{item.candidateName}</span>
                </Inline>
              </TableCell>

              {/* 2. Applied Role */}
              <TableCell>
                <span className="bezent-table-meta-title">{item.jobTitle}</span>
              </TableCell>

              {/* 3. Interview Round */}
              <TableCell>
                <span className="bezent-table-meta-title">{item.roundName}</span>
              </TableCell>

              {/* 4. Scheduled Slot */}
              <TableCell>
                <Inline align="center" gap="xs">
                  <span className="bezent-table-meta-title">
                    {item.scheduledDate} • {item.startTime}
                  </span>
                  {isToday && (
                    <Badge variant="success" size="sm">
                      Today
                    </Badge>
                  )}
                </Inline>
              </TableCell>

              {/* 5. Interviewer */}
              <TableCell>
                <Inline align="center" gap="sm">
                  <Avatar
                    initials={
                      item.panel[0]?.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2) || 'IN'
                    }
                    size="sm"
                    color={item.panel[0]?.avatarColor || 'blue'}
                  />
                  <span className="bezent-table-meta-title">
                    {item.panel[0]?.name || 'Interviewer'}
                  </span>
                </Inline>
              </TableCell>

              {/* 6. Status */}
              <TableCell>{formatInterviewStatusBadge(item.status)}</TableCell>

              {/* 7. Evaluation / Scorecard */}
              <TableCell>
                {item.scorecard ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewScorecard(item);
                    }}
                    className="cursor-pointer inline-flex"
                    title="View Scorecard"
                  >
                    <Badge variant="success" size="sm" showDot>
                      View Scorecard ({item.scorecard.overallScore.toFixed(1)} ★)
                    </Badge>
                  </span>
                ) : item.status === 'completed' ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogScorecard(item);
                    }}
                    className="cursor-pointer inline-flex"
                    title="Log Scorecard"
                  >
                    <Badge variant="warning" size="sm" showDot>
                      Log Scorecard
                    </Badge>
                  </span>
                ) : (
                  <span className="bezent-table-meta-dim">—</span>
                )}
              </TableCell>

              {/* 8. Actions */}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="bezent-table-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.scorecard) {
                      onViewScorecard(item);
                    } else if (item.status === 'completed' || isToday) {
                      onLogScorecard(item);
                    } else {
                      onViewScorecard(item);
                    }
                  }}
                  title="View Scorecard"
                  aria-label="View Scorecard"
                >
                  <BezentIcon name="more" size={16} />
                </button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

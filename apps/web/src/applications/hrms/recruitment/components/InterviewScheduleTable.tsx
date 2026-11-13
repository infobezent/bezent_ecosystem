import { useMemo, useState } from 'react';
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

export type InterviewSortField =
  'candidate' | 'role' | 'round' | 'slot' | 'interviewer' | 'status' | 'evaluation';

export type InterviewSortDirection = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<InterviewSortField>('slot');
  const [sortDirection, setSortDirection] = useState<InterviewSortDirection>('asc');

  const handleSort = (field: InterviewSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedInterviews = useMemo(() => {
    const list = [...interviews];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'candidate':
          comparison = (a.candidateName || '').localeCompare(b.candidateName || '');
          break;
        case 'role':
          comparison = (a.jobTitle || '').localeCompare(b.jobTitle || '');
          break;
        case 'round':
          comparison = (a.roundName || '').localeCompare(b.roundName || '');
          break;
        case 'slot': {
          const dateA = `${a.scheduledDate} ${a.startTime || ''}`;
          const dateB = `${b.scheduledDate} ${b.startTime || ''}`;
          comparison = dateA.localeCompare(dateB);
          break;
        }
        case 'interviewer': {
          const nameA = a.panel[0]?.name || '';
          const nameB = b.panel[0]?.name || '';
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'evaluation': {
          const scoreA = a.scorecard?.overallScore ?? -1;
          const scoreB = b.scorecard?.overallScore ?? -1;
          comparison = scoreA - scoreB;
          break;
        }
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [interviews, sortField, sortDirection]);

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
          <TableHeaderCell
            aria-sort={
              sortField === 'candidate'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'candidate' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('candidate')}
              aria-label={`Sort by Candidate ${
                sortField === 'candidate' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Candidate</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'candidate' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'candidate' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'role' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'role' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('role')}
              aria-label={`Sort by Applied Role ${
                sortField === 'role' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Applied Role</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'role' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'role' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'round'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'round' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('round')}
              aria-label={`Sort by Interview Round ${
                sortField === 'round' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Interview Round</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'round' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'round' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'slot' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'slot' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('slot')}
              aria-label={`Sort by Scheduled Slot ${
                sortField === 'slot' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Scheduled Slot</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'slot' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'slot' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'interviewer'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'interviewer' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('interviewer')}
              aria-label={`Sort by Interviewer ${
                sortField === 'interviewer' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Interviewer</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'interviewer' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'interviewer' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'status'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'status' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('status')}
              aria-label={`Sort by Status ${
                sortField === 'status' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Status</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'status' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'status' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell
            aria-sort={
              sortField === 'evaluation'
                ? sortDirection === 'asc'
                  ? 'ascending'
                  : 'descending'
                : 'none'
            }
          >
            <button
              type="button"
              className={`bezent-table-th-sortable ${
                sortField === 'evaluation' ? 'bezent-table-th-sortable--active' : ''
              }`}
              onClick={() => handleSort('evaluation')}
              aria-label={`Sort by Evaluation ${
                sortField === 'evaluation' && sortDirection === 'asc' ? 'descending' : 'ascending'
              }`}
            >
              <span>Evaluation</span>
              <span
                className={`bezent-table-sort-arrow ${
                  sortField === 'evaluation' ? 'bezent-table-sort-arrow--active' : ''
                }`}
                aria-hidden="true"
              >
                {sortField === 'evaluation' ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
              </span>
            </button>
          </TableHeaderCell>

          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedInterviews.map((item) => {
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
              className="bezent-hiring-clickable"
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
                    className="bezent-hiring-inline-trigger"
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
                    className="bezent-hiring-inline-trigger"
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

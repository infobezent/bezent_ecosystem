import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { InterviewSchedule } from '../types/interview';
import { formatInterviewStatusBadge, formatRecommendationBadge } from './InterviewScheduleTable';

export interface InterviewCalendarViewProps {
  interviews: InterviewSchedule[];
  todayDate?: string;
  onViewScorecard: (interview: InterviewSchedule) => void;
  onLogScorecard: (interview: InterviewSchedule) => void;
}

export function InterviewCalendarView({
  interviews,
  todayDate = '2026-10-30',
  onViewScorecard,
  onLogScorecard,
}: InterviewCalendarViewProps) {
  if (interviews.length === 0) {
    return (
      <EmptyState
        title="No interviews scheduled"
        description="Try clearing your filters or schedule a new interview round."
        variant="recruitment"
      />
    );
  }

  // Group by date
  const grouped = interviews.reduce<Record<string, InterviewSchedule[]>>((acc, item) => {
    const key = item.scheduledDate;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <Stack gap="lg">
      {sortedDates.map((date) => {
        const items = grouped[date] || [];
        const isToday = date === todayDate;

        return (
          <Stack key={date} gap="sm">
            {/* Date Header Banner */}
            <Inline align="center" gap="sm">
              <span className="bezent-font-bold bezent-text-base text-gray-900">{date}</span>
              {isToday && (
                <Badge variant="success" size="sm">
                  Today&apos;s Schedule
                </Badge>
              )}
              <span className="bezent-text-xs bezent-text-secondary">
                ({items.length} {items.length === 1 ? 'interview' : 'interviews'})
              </span>
            </Inline>

            {/* Timeline Cards */}
            <Stack gap="sm">
              {items.map((item) => (
                <Card key={item.id} variant="clay" hoverable padding="md">
                  <CardBody>
                    <Inline justify="between" align="start" wrap gap="md">
                      {/* Left: Time + Candidate Info */}
                      <Inline align="start" gap="md">
                        {/* Time slot pill */}
                        <div className="bg-gray-100 rounded-lg px-3 py-2 text-center min-w-[90px]">
                          <span className="bezent-font-bold bezent-text-sm text-gray-800 block">
                            {item.startTime}
                          </span>
                          <span className="bezent-text-xs text-gray-500 block">
                            to {item.endTime}
                          </span>
                        </div>

                        {/* Candidate & Round details */}
                        <Stack gap="xs">
                          <Inline align="center" gap="xs">
                            <Avatar
                              initials={item.candidateName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                              size="sm"
                              color={item.candidateAvatarColor || 'blue'}
                            />
                            <span className="bezent-font-bold bezent-text-base text-gray-900">
                              {item.candidateName}
                            </span>
                            <span className="bezent-text-xs bezent-text-secondary">
                              ({item.candidateNumber})
                            </span>
                            {formatInterviewStatusBadge(item.status)}
                          </Inline>

                          <span className="bezent-font-medium bezent-text-sm text-gray-800">
                            {item.roundName}
                          </span>

                          <Inline align="center" gap="md" wrap>
                            <span className="bezent-text-xs bezent-text-secondary">
                              Role: {item.jobTitle}
                            </span>
                            <span>•</span>
                            <span className="bezent-text-xs bezent-text-secondary">
                              Panel: {item.panel.map((p) => p.name).join(', ')}
                            </span>
                          </Inline>

                          {item.meetingLink && item.status !== 'cancelled' && (
                            <a
                              href={item.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bezent-text-xs text-primary-600 hover:underline flex items-center gap-1 pt-1"
                            >
                              <BezentIcon name="calendar" size={14} />
                              <span>Join Google Meet ({item.meetingLink})</span>
                            </a>
                          )}
                        </Stack>
                      </Inline>

                      {/* Right: Scorecard / Actions */}
                      <Inline align="center" gap="sm">
                        {item.scorecard ? (
                          <Inline align="center" gap="xs">
                            <span className="bezent-font-bold bezent-text-sm">
                              ★ {item.scorecard.overallScore.toFixed(1)}
                            </span>
                            {formatRecommendationBadge(item.scorecard.recommendation)}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onViewScorecard(item)}
                            >
                              View Scorecard
                            </Button>
                          </Inline>
                        ) : (
                          <Button
                            size="sm"
                            variant={isToday ? 'primary' : 'secondary'}
                            onClick={() => onLogScorecard(item)}
                          >
                            Log Scorecard
                          </Button>
                        )}
                      </Inline>
                    </Inline>
                  </CardBody>
                </Card>
              ))}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}

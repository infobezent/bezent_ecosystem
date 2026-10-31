import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { InterviewSchedule } from '../types/interview';

export interface TodayInterviewsWidgetProps {
  interviews: InterviewSchedule[];
  todayDate: string;
}

export function TodayInterviewsWidget({
  interviews,
  todayDate,
}: TodayInterviewsWidgetProps) {
  const navigate = useNavigate();
  const todayList = interviews.filter((i) => i.scheduledDate === todayDate);

  return (
    <Card variant="flat" padding="md">
      <CardBody>
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline align="center" gap="sm">
              <BezentIcon name="interviews" size="action" color="var(--color-primary-600)" />
              <Stack gap="none">
                <span className="bezent-font-semibold bezent-text-base">
                  Today&apos;s Interviews ({todayList.length})
                </span>
                <span className="bezent-text-xs bezent-text-secondary">
                  Scheduled panel rounds for {todayDate}.
                </span>
              </Stack>
            </Inline>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/hrms/recruitment/interviews')}
            >
              Calendar View
            </Button>
          </Inline>

          <Divider />

          {todayList.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-500">
              No interview rounds scheduled for today.
            </div>
          ) : (
            <Stack gap="sm">
              {todayList.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 border border-gray-100 rounded p-3"
                >
                  <Inline justify="between" align="center">
                    <Inline align="center" gap="sm">
                      <Avatar
                        initials={item.candidateName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        color={item.candidateAvatarColor}
                        size="md"
                      />
                      <Stack gap="none">
                        <span className="bezent-font-semibold bezent-text-sm">
                          {item.candidateName}
                        </span>
                        <span className="bezent-text-xs text-primary-700 font-medium">
                          {item.roundName}
                        </span>
                        <span className="bezent-text-xs bezent-text-secondary">
                          Panel: {item.panel.map((p) => p.name).join(', ')}
                        </span>
                      </Stack>
                    </Inline>

                    <Stack gap="xs" align="end">
                      <Badge variant="neutral" size="sm">
                        {item.startTime} - {item.endTime}
                      </Badge>
                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noreferrer"
                          className="bezent-text-xs text-primary-600 hover:underline flex items-center gap-1"
                        >
                          Join Google Meet
                        </a>
                      )}
                    </Stack>
                  </Inline>
                </div>
              ))}
            </Stack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}

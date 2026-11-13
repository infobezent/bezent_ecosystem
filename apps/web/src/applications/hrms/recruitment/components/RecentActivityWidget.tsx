import {
  Badge,
  Card,
  CardBody,
  Divider,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

export interface ActivityEvent {
  id: string;
  type:
    | 'offer_accepted'
    | 'interview_completed'
    | 'assessment_passed'
    | 'handoff_done'
    | 'candidate_applied';
  title: string;
  subtitle: string;
  timestamp: string;
  actor: string;
  badgeLabel: string;
  badgeVariant: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
}

export const INITIAL_HIRING_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'act-1',
    type: 'offer_accepted',
    title: 'Offer Accepted: Shreya Sengupta',
    subtitle: 'Signed formal offer for Full-Stack Tech Lead (L6). Handoff passport ready.',
    timestamp: '25m ago',
    actor: 'Priya Sundaram',
    badgeLabel: 'Offer Accepted',
    badgeVariant: 'success',
  },
  {
    id: 'act-2',
    type: 'assessment_passed',
    title: 'Assessment Cleared: Vignesh Balaji',
    subtitle: 'Director of UX rated Navigation Challenge 94/100 (Strong Pass).',
    timestamp: '2h ago',
    actor: 'Sabin Rahul',
    badgeLabel: 'Assessment Cleared',
    badgeVariant: 'success',
  },
  {
    id: 'act-3',
    type: 'interview_completed',
    title: 'Scorecard Submitted: Deepak Sundaram',
    subtitle: 'Staff Engineer rated System Design 4.8/5.0 with Strong Hire recommendation.',
    timestamp: '4h ago',
    actor: 'Mukesh Murugesan',
    badgeLabel: 'Interview Scored',
    badgeVariant: 'info',
  },
  {
    id: 'act-4',
    type: 'handoff_done',
    title: 'Onboarding Case Initialized: Arvind Krishnan',
    subtitle: 'Candidate converted to Case ONB-2026-088. Employee Code EMP-2026-142 designated.',
    timestamp: 'Yesterday',
    actor: 'Arun Kumar',
    badgeLabel: 'Onboarding Case',
    badgeVariant: 'info',
  },
  {
    id: 'act-5',
    type: 'candidate_applied',
    title: 'Silver Medalist Re-Engaged: Rajesh Kannan',
    subtitle: 'Personalized outreach email sent for Staff Engineer opening.',
    timestamp: 'Yesterday',
    actor: 'Priya Sundaram',
    badgeLabel: 'Re-Engaged',
    badgeVariant: 'warning',
  },
];

export function RecentActivityWidget({
  activities = INITIAL_HIRING_ACTIVITIES,
}: {
  activities?: ActivityEvent[];
}) {
  return (
    <Card variant="flat" padding="md">
      <CardBody>
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline align="center" gap="sm">
              <BezentIcon name="tasks" size="action" color="var(--color-primary-600)" />
              <Stack gap="none">
                <span className="bezent-font-semibold bezent-text-base">
                  Recent Hiring Activity
                </span>
                <span className="bezent-text-xs bezent-text-secondary">
                  ATS timeline events across applicants, evaluations, and offers.
                </span>
              </Stack>
            </Inline>
            <span className="bezent-text-xs bezent-text-secondary">Live Audit Stream</span>
          </Inline>

          <Divider />

          <Stack gap="sm">
            {activities.map((act) => (
              <div key={act.id} className="bg-gray-50 border border-gray-100 rounded p-2.5">
                <Inline justify="between" align="start">
                  <Stack gap="none">
                    <Inline align="center" gap="xs">
                      <span className="bezent-font-semibold bezent-text-sm text-gray-900">
                        {act.title}
                      </span>
                      <Badge variant={act.badgeVariant} size="sm">
                        {act.badgeLabel}
                      </Badge>
                    </Inline>
                    <span className="bezent-text-xs text-gray-600 mt-0.5">{act.subtitle}</span>
                    <span className="bezent-text-xs bezent-text-secondary mt-1">
                      By {act.actor} • {act.timestamp}
                    </span>
                  </Stack>
                </Inline>
              </div>
            ))}
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}

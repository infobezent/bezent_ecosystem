import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Grid,
  Inline,
  Page,
  PageHeader,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import { INITIAL_JOB_OPENINGS } from '../data/mockJobOpenings';
import { INITIAL_CANDIDATES } from '../data/mockCandidates';
import { INITIAL_INTERVIEWS } from '../data/mockInterviews';
import { INITIAL_OFFERS } from '../data/mockOffers';
import { INITIAL_HANDOFFS } from '../data/mockHandoffs';
import { OverviewMetrics } from '../components/OverviewMetrics';
import { ActiveJobsSpotlight } from '../components/ActiveJobsSpotlight';
import { TodayInterviewsWidget } from '../components/TodayInterviewsWidget';
import { RecentActivityWidget } from '../components/RecentActivityWidget';

export function HiringOverviewPage() {
  const navigate = useNavigate();

  const openJobs = INITIAL_JOB_OPENINGS.filter((j) => j.status === 'open');
  const totalVacancies = openJobs.reduce((acc, j) => acc + j.positionsCount, 0);
  const activeCandidates = INITIAL_CANDIDATES.filter(
    (c) => c.currentStage !== 'rejected' && c.currentStage !== 'withdrawn',
  );
  const interviewsToday = INITIAL_INTERVIEWS.filter((i) => i.scheduledDate === '2026-10-30');
  const offersPending = INITIAL_OFFERS.filter(
    (o) => o.status === 'pending_approval' || o.status === 'sent',
  );
  const handoffsReady = INITIAL_HANDOFFS.filter((h) => h.status === 'ready_for_handoff');

  const navigationShortcuts = [
    {
      title: 'Job Openings',
      desc: 'Requisitions, vacancies & teams',
      path: '/hrms/recruitment/job-openings',
      icon: 'jobOpenings' as const,
    },
    {
      title: 'Candidate Directory',
      desc: 'Applicants, resumes & skills',
      path: '/hrms/recruitment/candidates',
      icon: 'candidates' as const,
    },
    {
      title: 'Hiring Pipeline',
      desc: '8-stage visual Kanban board',
      path: '/hrms/recruitment/pipeline',
      icon: 'pipeline' as const,
    },
    {
      title: 'Interviews & Panels',
      desc: 'Calendar slots & scorecards',
      path: '/hrms/recruitment/interviews',
      icon: 'interviews' as const,
    },
    {
      title: 'Technical Assessments',
      desc: 'Coding tests & design projects',
      path: '/hrms/recruitment/assessments',
      icon: 'tasks' as const,
    },
    {
      title: 'Job Offers & Approvals',
      desc: 'Compensation bands & sign-offs',
      path: '/hrms/recruitment/offers',
      icon: 'offers' as const,
    },
    {
      title: 'Onboarding Handoff',
      desc: 'Bridge to workforce onboarding',
      path: '/hrms/recruitment/onboarding-handoff',
      icon: 'onboarding' as const,
    },
    {
      title: 'Talent Pool & Network',
      desc: 'Silver medalists & consent',
      path: '/hrms/recruitment/talent-pool',
      icon: 'candidates' as const,
    },
    {
      title: 'Hiring Reports & Analytics',
      desc: 'Time to hire & channel ROI',
      path: '/hrms/recruitment/reports',
      icon: 'reports' as const,
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Hiring Overview"
        subtitle="Enterprise talent acquisition command center: open requisitions, candidate pipeline, interviews today, and offer lifecycle."
        actions={
          <Inline gap="sm">
            <Button variant="secondary" onClick={() => navigate('/hrms/recruitment/pipeline')}>
              <Inline align="center" gap="xs">
                <BezentIcon name="pipeline" size="action" />
                <span>View Kanban Pipeline</span>
              </Inline>
            </Button>

            <Button variant="primary" onClick={() => navigate('/hrms/recruitment/job-openings')}>
              <Inline align="center" gap="xs">
                <BezentIcon name="add" size="action" />
                <span>Post Job Opening</span>
              </Inline>
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {/* 1. Top Metrics */}
        <OverviewMetrics
          openJobsCount={openJobs.length}
          totalVacancies={totalVacancies}
          activeCandidatesCount={activeCandidates.length}
          interviewsTodayCount={interviewsToday.length}
          offersPendingCount={offersPending.length}
          handoffsReadyCount={handoffsReady.length}
        />

        {/* 2. Main Two-Column Layout */}
        <Grid columns={2} gap="lg">
          {/* Left Column: Spotlight + Shortcuts */}
          <Stack gap="lg">
            <ActiveJobsSpotlight jobs={INITIAL_JOB_OPENINGS} />

            {/* Quick Navigation Directory */}
            <Card variant="flat" padding="md">
              <CardBody>
                <Stack gap="md">
                  <Inline justify="between" align="center">
                    <span className="bezent-font-semibold bezent-text-base">
                      Talent Acquisition Modules
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      Comprehensive 10-Domain ATS Suite
                    </span>
                  </Inline>

                  <Grid columns={3} gap="sm">
                    {navigationShortcuts.map((s) => (
                      <div
                        key={s.path}
                        className="p-3 bg-gray-50 border border-gray-100 rounded hover:border-primary-400 hover:bg-white transition-all cursor-pointer"
                        onClick={() => navigate(s.path)}
                      >
                        <Stack gap="xs">
                          <Inline align="center" gap="xs">
                            <BezentIcon
                              name={s.icon}
                              size="action"
                              color="var(--color-primary-600)"
                            />
                            <span className="bezent-font-semibold bezent-text-xs text-gray-900">
                              {s.title}
                            </span>
                          </Inline>
                          <span className="bezent-text-xs text-gray-500">{s.desc}</span>
                        </Stack>
                      </div>
                    ))}
                  </Grid>
                </Stack>
              </CardBody>
            </Card>
          </Stack>

          {/* Right Column: Today's Schedule + Live Activity */}
          <Stack gap="lg">
            <TodayInterviewsWidget interviews={INITIAL_INTERVIEWS} todayDate="2026-10-30" />

            <RecentActivityWidget />
          </Stack>
        </Grid>
      </Stack>
    </Page>
  );
}

export default HiringOverviewPage;

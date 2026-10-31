import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { JobOpening } from '../types/jobOpening';

export interface ActiveJobsSpotlightProps {
  jobs: JobOpening[];
}

export function ActiveJobsSpotlight({ jobs }: ActiveJobsSpotlightProps) {
  const navigate = useNavigate();
  const openJobs = jobs.filter((j) => j.status === 'open').slice(0, 4);

  return (
    <Card variant="flat" padding="md">
      <CardBody>
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline align="center" gap="sm">
              <BezentIcon name="jobOpenings" size="action" color="var(--color-primary-600)" />
              <Stack gap="none">
                <span className="bezent-font-semibold bezent-text-base">
                  Active Requisitions Spotlight
                </span>
                <span className="bezent-text-xs bezent-text-secondary">
                  Key open requisitions with active candidate pipelines.
                </span>
              </Stack>
            </Inline>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/hrms/recruitment/job-openings')}
            >
              All Openings ({jobs.length})
            </Button>
          </Inline>

          <Divider />

          <Stack gap="sm">
            {openJobs.map((job) => (
              <div
                key={job.id}
                className="bg-gray-50 border border-gray-100 rounded p-3 hover:border-primary-300 transition-colors cursor-pointer"
                onClick={() => navigate(`/hrms/recruitment/pipeline?jobId=${job.id}`)}
              >
                <Inline justify="between" align="center">
                  <Stack gap="none">
                    <Inline align="center" gap="xs">
                      <span className="bezent-font-semibold bezent-text-sm text-gray-900">
                        {job.title}
                      </span>
                      <Badge variant="success">Active</Badge>
                    </Inline>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {job.jobCode} • {job.department} • {job.location}
                    </span>
                  </Stack>

                  <Inline align="center" gap="md">
                    <Stack gap="none" align="end">
                      <span className="bezent-font-bold bezent-text-sm text-primary-700">
                        {job.positionsCount} {job.positionsCount === 1 ? 'vacancy' : 'vacancies'}
                      </span>
                      <span className="bezent-text-xs bezent-text-secondary">
                        Pipeline: <strong>{job.totalApplicants}</strong> candidates
                      </span>
                    </Stack>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/hrms/recruitment/pipeline?jobId=${job.id}`);
                      }}
                    >
                      Kanban Board →
                    </Button>
                  </Inline>
                </Inline>
              </div>
            ))}
          </Stack>
        </Stack>
      </CardBody>
    </Card>
  );
}

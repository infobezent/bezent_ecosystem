import { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  Divider,
  Grid,
  Inline,
  Modal,
  Stack,
  Tabs,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { JobOpening } from '../types/jobOpening';
import { formatStatusBadge, formatWorkplace } from './JobOpeningsTable';

export interface JobDetailsModalProps {
  job: JobOpening | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToCandidates?: (jobId: string) => void;
}

export function JobDetailsModal({
  job,
  isOpen,
  onClose,
  onNavigateToCandidates,
}: JobDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'team' | 'requirements' | 'pipeline'>('details');

  if (!job) return null;

  const tabItems = [
    { id: 'details', label: 'Job Details & Role' },
    { id: 'team', label: `Hiring Team (${1 + 1 + job.interviewers.length})` },
    { id: 'requirements', label: `Requirements & Skills (${job.skills.length})` },
    { id: 'pipeline', label: `Pipeline (${job.totalApplicants})` },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <Inline align="center" gap="sm">
          <BezentIcon name="jobOpenings" size="action" />
          <span>{job.title}</span>
          {formatStatusBadge(job.status)}
        </Inline>
      }
      description={
        <Inline align="center" gap="md" wrap>
          <span>{job.jobCode}</span>
          <span>•</span>
          <span>{job.department}</span>
          <span>•</span>
          <span>{job.location}</span>
          <span>•</span>
          <Badge variant="neutral" size="sm">{formatWorkplace(job.workplaceType)}</Badge>
        </Inline>
      }
      footer={
        <Inline justify="between" align="center">
          <span className="bezent-text-xs bezent-text-secondary">
            Target closing date: {job.targetCloseDate}
          </span>
          <Inline gap="sm">
            {onNavigateToCandidates && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onNavigateToCandidates(job.id);
                }}
              >
                View Candidates ({job.totalApplicants})
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
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

        {/* Tab 1: Job Details & Role */}
        {activeTab === 'details' && (
          <Stack gap="md">
            {/* Quick Metrics */}
            <Grid columns={3} gap="sm">
              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="xs">
                    <span className="bezent-text-xs bezent-text-secondary">Vacancies</span>
                    <span className="bezent-font-semibold bezent-text-base">
                      {job.filledCount} of {job.positionsCount} filled
                    </span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="xs">
                    <span className="bezent-text-xs bezent-text-secondary">Employment Type</span>
                    <span className="bezent-font-semibold bezent-text-base capitalize">
                      {job.employmentType.replace('_', ' ')}
                    </span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="xs">
                    <span className="bezent-text-xs bezent-text-secondary">Offered Compensation</span>
                    <span className="bezent-font-semibold bezent-text-base">
                      {job.salaryMin && job.salaryMax
                        ? `${job.currency || 'INR'} ${(job.salaryMin / 100000).toFixed(1)}L - ${(job.salaryMax / 100000).toFixed(1)}L`
                        : 'Competitive / Undisclosed'}
                    </span>
                  </Stack>
                </CardBody>
              </Card>
            </Grid>

            <Divider />

            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Job Description</h4>
              <p className="bezent-text-secondary bezent-text-sm leading-relaxed">{job.description}</p>
            </Stack>

            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Key Responsibilities</h4>
              <ul className="bezent-text-secondary bezent-text-sm list-disc pl-5 space-y-1">
                {job.responsibilities.map((resp, idx) => (
                  <li key={idx}>{resp}</li>
                ))}
              </ul>
            </Stack>
          </Stack>
        )}

        {/* Tab 2: Hiring Team */}
        {activeTab === 'team' && (
          <Stack gap="md">
            <h4 className="bezent-font-semibold bezent-text-sm">Assigned Hiring Committee</h4>
            <Grid columns={2} gap="md">
              {/* Hiring Manager Card */}
              <Card variant="flat" padding="md">
                <CardBody>
                  <Stack gap="xs">
                    <span className="bezent-text-xs bezent-text-secondary">Hiring Manager (Final Approver)</span>
                    <Inline align="center" gap="sm">
                      <Avatar
                        initials={job.hiringManager.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        color={job.hiringManager.avatarColor || 'purple'}
                        size="md"
                      />
                      <Stack gap="none">
                        <span className="bezent-font-semibold bezent-text-sm">{job.hiringManager.name}</span>
                        <span className="bezent-text-xs bezent-text-secondary">{job.hiringManager.role}</span>
                        <span className="bezent-text-xs bezent-text-secondary">{job.hiringManager.email}</span>
                      </Stack>
                    </Inline>
                  </Stack>
                </CardBody>
              </Card>

              {/* Lead Recruiter Card */}
              <Card variant="flat" padding="md">
                <CardBody>
                  <Stack gap="xs">
                    <span className="bezent-text-xs bezent-text-secondary">Lead Talent Partner / Recruiter</span>
                    <Inline align="center" gap="sm">
                      <Avatar
                        initials={job.recruiter.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        color={job.recruiter.avatarColor || 'blue'}
                        size="md"
                      />
                      <Stack gap="none">
                        <span className="bezent-font-semibold bezent-text-sm">{job.recruiter.name}</span>
                        <span className="bezent-text-xs bezent-text-secondary">{job.recruiter.role}</span>
                        <span className="bezent-text-xs bezent-text-secondary">{job.recruiter.email}</span>
                      </Stack>
                    </Inline>
                  </Stack>
                </CardBody>
              </Card>
            </Grid>

            <Divider />

            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">
                Interview Panel Evaluators ({job.interviewers.length})
              </h4>
              {job.interviewers.length === 0 ? (
                <p className="bezent-text-xs bezent-text-secondary">
                  No additional interviewers assigned yet.
                </p>
              ) : (
                <Grid columns={2} gap="sm">
                  {job.interviewers.map((inv, idx) => (
                    <Card key={idx} variant="flat" padding="sm">
                      <CardBody>
                        <Inline align="center" gap="sm">
                          <Avatar
                            initials={inv.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            color={inv.avatarColor || 'cyan'}
                            size="sm"
                          />
                          <Stack gap="none">
                            <span className="bezent-font-medium bezent-text-xs">{inv.name}</span>
                            <span className="bezent-text-xs bezent-text-secondary">{inv.role}</span>
                          </Stack>
                        </Inline>
                      </CardBody>
                    </Card>
                  ))}
                </Grid>
              )}
            </Stack>
          </Stack>
        )}

        {/* Tab 3: Requirements & Skills */}
        {activeTab === 'requirements' && (
          <Stack gap="md">
            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Key Technical & Domain Skills</h4>
              <Inline gap="xs" wrap>
                {job.skills.map((skill, idx) => (
                  <Badge key={idx} variant="info" size="md">
                    {skill}
                  </Badge>
                ))}
              </Inline>
            </Stack>

            <Divider />

            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Minimum Requirements & Qualifications</h4>
              <ul className="bezent-text-secondary bezent-text-sm list-disc pl-5 space-y-1">
                {job.requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </Stack>
          </Stack>
        )}

        {/* Tab 4: Pipeline Snapshot */}
        {activeTab === 'pipeline' && (
          <Stack gap="md">
            <h4 className="bezent-font-semibold bezent-text-sm">Candidate Stage Breakdown</h4>
            <Grid columns={3} gap="sm">
              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">1. Applied</span>
                    <span className="bezent-font-bold bezent-text-xl">{job.pipeline.applied}</span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">2. Screening</span>
                    <span className="bezent-font-bold bezent-text-xl">{job.pipeline.screening}</span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="tint-blue" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">3. Interview</span>
                    <span className="bezent-font-bold bezent-text-xl">{job.pipeline.interview}</span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="flat" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">4. Assessment</span>
                    <span className="bezent-font-bold bezent-text-xl">{job.pipeline.assessment}</span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="tint-green" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">5. Offer Extended</span>
                    <span className="bezent-font-bold bezent-text-xl">{job.pipeline.offer}</span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="tint-green" padding="sm">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">6. Hired</span>
                    <span className="bezent-font-bold bezent-text-xl">{job.pipeline.hired}</span>
                  </Stack>
                </CardBody>
              </Card>
            </Grid>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}

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
  Select,
  Stack,
  Tabs,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { Candidate, CandidateStage } from '../types/candidate';
import { formatSourceLabel, formatStageBadge } from './CandidatesTable';

export interface CandidateProfileDrawerProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onStageChange?: (candidateId: string, newStage: CandidateStage) => void;
  onHandoffToOnboarding?: (candidate: Candidate) => void;
}

export function CandidateProfileDrawer({
  candidate,
  isOpen,
  onClose,
  onStageChange,
  onHandoffToOnboarding,
}: CandidateProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'resume' | 'history' | 'actions'>(
    'profile',
  );
  const [targetStage, setTargetStage] = useState<CandidateStage>('interview');

  if (!candidate) return null;

  const initials = candidate.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  const tabItems = [
    { id: 'profile', label: 'Profile & Contact' },
    { id: 'resume', label: `Resume & Experience (${candidate.experienceHistory.length})` },
    { id: 'history', label: `Application History (${candidate.applicationHistory.length})` },
    { id: 'actions', label: 'Stage Actions' },
  ];

  const handleAdvanceStage = () => {
    if (onStageChange) {
      onStageChange(candidate.id, targetStage);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <Inline align="center" gap="sm">
          <Avatar initials={initials} size="md" color="blue" />
          <Stack gap="none">
            <Inline align="center" gap="xs">
              <span className="bezent-font-bold bezent-text-lg">{candidate.fullName}</span>
              {formatStageBadge(candidate.currentStage)}
            </Inline>
            <span className="bezent-text-xs bezent-text-secondary">
              {candidate.candidateNumber} •{' '}
              {candidate.currentCompany ? `${candidate.currentCompany} • ` : ''}
              {candidate.location}
            </span>
          </Stack>
        </Inline>
      }
      description={
        <Inline align="center" gap="md" wrap>
          <span>
            Applied for: <strong>{candidate.appliedJobTitle}</strong> ({candidate.appliedJobCode})
          </span>
          <span>•</span>
          <span>Source: {formatSourceLabel(candidate.source)}</span>
          <span>•</span>
          <span>Rating: ★ {candidate.rating.toFixed(1)} / 5</span>
        </Inline>
      }
      footer={
        <Inline justify="between" align="center">
          <span className="bezent-text-xs bezent-text-secondary">
            Applied on: {candidate.appliedDate}
          </span>
          <Inline gap="sm">
            {candidate.currentStage === 'hired' && onHandoffToOnboarding && (
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  onHandoffToOnboarding(candidate);
                }}
              >
                <Inline align="center" gap="xs">
                  <BezentIcon name="onboarding" size="action" />
                  <span>Convert to Onboarding</span>
                </Inline>
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

        {/* Tab 1: Profile & Contact Details */}
        {activeTab === 'profile' && (
          <Stack gap="md">
            {/* Quick Metrics */}
            <Grid columns={4} gap="sm">
              <Card variant="clay" padding="none" className="bezent-clay-card--compact">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Experience</span>
                    <span className="bezent-font-semibold bezent-text-sm">
                      {candidate.totalExperienceYears} yrs ({candidate.relevantExperienceYears} yrs
                      rel.)
                    </span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="clay" padding="none" className="bezent-clay-card--compact">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Current Company</span>
                    <span className="bezent-font-semibold bezent-text-sm">
                      {candidate.currentCompany || '—'}
                    </span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="clay" padding="none" className="bezent-clay-card--compact">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">Notice Period</span>
                    <span className="bezent-font-semibold bezent-text-sm">
                      {candidate.noticePeriodDays === 0
                        ? 'Immediate'
                        : `${candidate.noticePeriodDays} days`}
                    </span>
                  </Stack>
                </CardBody>
              </Card>

              <Card variant="clay" padding="none" className="bezent-clay-card--compact">
                <CardBody>
                  <Stack gap="none">
                    <span className="bezent-text-xs bezent-text-secondary">
                      CTC (Current / Exp.)
                    </span>
                    <span className="bezent-font-semibold bezent-text-sm">
                      ₹{candidate.currentCtcLpa || '—'} / ₹{candidate.expectedCtcLpa || '—'} LPA
                    </span>
                  </Stack>
                </CardBody>
              </Card>
            </Grid>

            {/* Contact Details */}
            <Card variant="flat" padding="md">
              <CardBody>
                <Stack gap="xs">
                  <h4 className="bezent-font-semibold bezent-text-sm">Contact Information</h4>
                  <Grid columns={3} gap="sm">
                    <Stack gap="none">
                      <span className="bezent-text-xs bezent-text-secondary">Email</span>
                      <span className="bezent-text-sm bezent-font-medium">{candidate.email}</span>
                    </Stack>
                    <Stack gap="none">
                      <span className="bezent-text-xs bezent-text-secondary">Phone</span>
                      <span className="bezent-text-sm bezent-font-medium">{candidate.phone}</span>
                    </Stack>
                    <Stack gap="none">
                      <span className="bezent-text-xs bezent-text-secondary">Current Location</span>
                      <span className="bezent-text-sm bezent-font-medium">
                        {candidate.location}
                      </span>
                    </Stack>
                  </Grid>
                </Stack>
              </CardBody>
            </Card>

            {/* Summary */}
            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Candidate Pitch & Summary</h4>
              <p className="bezent-text-sm bezent-text-secondary leading-relaxed">
                {candidate.summary}
              </p>
            </Stack>

            {/* Skills & Tags */}
            <Grid columns={2} gap="md">
              <Stack gap="xs">
                <h4 className="bezent-font-semibold bezent-text-sm">Verified Skills</h4>
                <Inline gap="xs" wrap>
                  {candidate.skills.map((skill, idx) => (
                    <Badge key={idx} variant="info" size="sm">
                      {skill}
                    </Badge>
                  ))}
                </Inline>
              </Stack>

              <Stack gap="xs">
                <h4 className="bezent-font-semibold bezent-text-sm">Candidate Tags</h4>
                <Inline gap="xs" wrap>
                  {candidate.tags.map((tag, idx) => (
                    <Badge key={idx} variant="neutral" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Inline>
              </Stack>
            </Grid>
          </Stack>
        )}

        {/* Tab 2: Resume & Experience History */}
        {activeTab === 'resume' && (
          <Stack gap="md">
            {/* Resume File Banner */}
            <Card variant="tint-blue" padding="md">
              <CardBody>
                <Inline justify="between" align="center">
                  <Inline align="center" gap="sm">
                    <BezentIcon
                      name="documents"
                      size="action"
                      color="var(--color-info-600, #0284C7)"
                    />
                    <Stack gap="none">
                      <span className="bezent-font-semibold bezent-text-sm">
                        {candidate.resumeFileName}
                      </span>
                      <span className="bezent-text-xs bezent-text-secondary">
                        PDF Document • 2.4 MB • Uploaded on {candidate.appliedDate}
                      </span>
                    </Stack>
                  </Inline>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => alert(`Opening resume: ${candidate.resumeFileName}`)}
                  >
                    View Resume
                  </Button>
                </Inline>
              </CardBody>
            </Card>

            <Divider />

            {/* Experience History */}
            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Work Experience Timeline</h4>
              <Stack gap="sm">
                {candidate.experienceHistory.map((exp, idx) => (
                  <Card key={idx} variant="flat" padding="sm">
                    <CardBody>
                      <Inline justify="between" align="center">
                        <Stack gap="none">
                          <span className="bezent-font-semibold bezent-text-sm">{exp.role}</span>
                          <span className="bezent-text-xs bezent-text-secondary">
                            {exp.company}
                          </span>
                        </Stack>
                        <Inline align="center" gap="xs">
                          {exp.current && (
                            <Badge variant="success" size="sm">
                              Current
                            </Badge>
                          )}
                          <span className="bezent-text-xs bezent-text-secondary">
                            {exp.duration}
                          </span>
                        </Inline>
                      </Inline>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            </Stack>

            <Divider />

            {/* Education History */}
            <Stack gap="xs">
              <h4 className="bezent-font-semibold bezent-text-sm">Education</h4>
              <Stack gap="sm">
                {candidate.educationHistory.map((edu, idx) => (
                  <Card key={idx} variant="flat" padding="sm">
                    <CardBody>
                      <Inline justify="between" align="center">
                        <Stack gap="none">
                          <span className="bezent-font-semibold bezent-text-sm">{edu.degree}</span>
                          <span className="bezent-text-xs bezent-text-secondary">
                            {edu.institution}
                          </span>
                        </Stack>
                        <span className="bezent-text-xs bezent-text-secondary">
                          Class of {edu.year}
                        </span>
                      </Inline>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            </Stack>
          </Stack>
        )}

        {/* Tab 3: Application History & Evaluator Notes */}
        {activeTab === 'history' && (
          <Stack gap="md">
            <h4 className="bezent-font-semibold bezent-text-sm">Applications to BEZENT</h4>
            <Stack gap="sm">
              {candidate.applicationHistory.map((app) => (
                <Card key={app.id} variant="flat" padding="md">
                  <CardBody>
                    <Stack gap="xs">
                      <Inline justify="between" align="center">
                        <Stack gap="none">
                          <span className="bezent-font-semibold bezent-text-sm">
                            {app.jobTitle}
                          </span>
                          <span className="bezent-text-xs bezent-text-secondary">
                            {app.jobCode} • {app.department} • Applied on {app.appliedDate}
                          </span>
                        </Stack>
                        <Inline align="center" gap="xs">
                          {formatStageBadge(app.stage)}
                          {app.rating && (
                            <Badge variant="neutral" size="sm">
                              ★ {app.rating.toFixed(1)}
                            </Badge>
                          )}
                        </Inline>
                      </Inline>
                      {app.feedbackNotes && (
                        <p className="bezent-text-xs bezent-text-secondary bg-gray-50 p-2 rounded">
                          <strong>Feedback:</strong> {app.feedbackNotes}
                        </p>
                      )}
                    </Stack>
                  </CardBody>
                </Card>
              ))}
            </Stack>

            {candidate.hiringNotes && candidate.hiringNotes.length > 0 && (
              <>
                <Divider />
                <Stack gap="xs">
                  <h4 className="bezent-font-semibold bezent-text-sm">Internal Hiring Notes</h4>
                  <ul className="bezent-text-xs bezent-text-secondary list-disc pl-5 space-y-1">
                    {candidate.hiringNotes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </Stack>
              </>
            )}
          </Stack>
        )}

        {/* Tab 4: Stage Action */}
        {activeTab === 'actions' && (
          <Stack gap="md">
            <Card variant="flat" padding="md">
              <CardBody>
                <Stack gap="md">
                  <Stack gap="xs">
                    <span className="bezent-font-semibold bezent-text-sm">
                      Transition Candidate Stage
                    </span>
                    <span className="bezent-text-xs bezent-text-secondary">
                      Current stage: <strong>{candidate.currentStage.toUpperCase()}</strong>. Select
                      a target stage to advance this applicant.
                    </span>
                  </Stack>

                  <Inline align="center" gap="sm">
                    <Select
                      value={targetStage}
                      onChange={(e) => setTargetStage(e.target.value as CandidateStage)}
                      options={[
                        { value: 'screening', label: 'Screening' },
                        { value: 'shortlisted', label: 'Shortlisted' },
                        { value: 'interview', label: 'Interview' },
                        { value: 'assessment', label: 'Assessment' },
                        { value: 'selected', label: 'Selected' },
                        { value: 'offer', label: 'Offer Extended' },
                        { value: 'hired', label: 'Hired' },
                        { value: 'rejected', label: 'Rejected' },
                      ]}
                    />
                    <Button variant="primary" onClick={handleAdvanceStage}>
                      Update Stage
                    </Button>
                  </Inline>
                </Stack>
              </CardBody>
            </Card>

            {candidate.currentStage === 'hired' && onHandoffToOnboarding && (
              <Card variant="tint-green" padding="md">
                <CardBody>
                  <Stack gap="xs">
                    <Inline align="center" gap="xs">
                      <BezentIcon
                        name="onboarding"
                        size="action"
                        color="var(--color-success-600, #16A34A)"
                      />
                      <span className="bezent-font-semibold bezent-text-sm">
                        Ready for Onboarding Handoff
                      </span>
                    </Inline>
                    <p className="bezent-text-xs bezent-text-secondary">
                      This candidate is marked as Hired. You can directly convert them into an
                      Onboarding Case in BEZENT HRMS without re-entering their data.
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => {
                        onClose();
                        onHandoffToOnboarding(candidate);
                      }}
                    >
                      Begin Employee Onboarding
                    </Button>
                  </Stack>
                </CardBody>
              </Card>
            )}
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}

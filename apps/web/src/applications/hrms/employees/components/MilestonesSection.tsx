import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Inline,
  Section,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import {
  milestonesApi,
  type EmployeeMilestoneOverview,
} from '../../milestones/api/milestonesApi';

export interface MilestonesSectionProps {
  employeeId: string;
}

export function MilestonesSection({ employeeId }: MilestonesSectionProps) {
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [overview, setOverview] = useState<EmployeeMilestoneOverview | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await milestonesApi.getEmployeeMilestones(employeeId);
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load milestone data');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEvaluate = async () => {
    try {
      setEvaluating(true);
      setError(null);
      setSuccessMessage(null);
      const updated = await milestonesApi.evaluateEmployeeMilestones(employeeId);
      setOverview(updated);
      setSuccessMessage('Working hours recalculated and milestones evaluated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate working hours');
    } finally {
      setEvaluating(false);
    }
  };

  const handlePublishPoster = async (achievementId: string) => {
    try {
      setPublishing(achievementId);
      setError(null);
      const res = await milestonesApi.publishAchievementPoster(achievementId);
      setSuccessMessage(res.message || 'Recognition poster published to company feed!');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish poster to feed');
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return (
      <Card variant="flat">
        <Stack gap="md" align="center">
          <span>Loading lifetime hours and milestone achievements...</span>
        </Stack>
      </Card>
    );
  }

  if (!overview) {
    return (
      <Alert variant="error" title="Unable to load milestones">
        {error || 'No milestone data available for this employee.'}
      </Alert>
    );
  }

  const { workingHours, milestones, achievements, rewardAssignments } = overview;

  return (
    <Stack gap="xl">
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Success">
          {successMessage}
        </Alert>
      )}

      {/* ── 1. Lifetime Working Hours Control Card ─────────────────────── */}
      <Section
        title="Verified Lifetime Working Hours"
        subtitle="Authoritative cumulative working-hours record derived from attendance punches and approved timesheets."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<BezentIcon name="clock" size={14} />}
            disabled={evaluating}
            onClick={handleEvaluate}
          >
            {evaluating ? 'Recalculating...' : 'Recalculate & Evaluate'}
          </Button>
        }
      >
        <Grid columns={4} gap="md">
          <Card variant="default">
            <Stack gap="xs">
              <span className="bezent-text-muted">Total Verified Hours</span>
              <h2>{workingHours.lifetimeHours.toLocaleString()} hrs</h2>
              <Badge variant="success" size="sm">
                Verified & Audited
              </Badge>
            </Stack>
          </Card>

          <Card variant="default">
            <Stack gap="xs">
              <span className="bezent-text-muted">Attendance Punches</span>
              <h3>{workingHours.attendanceHours.toLocaleString()} hrs</h3>
              <span>Authoritative physical presence</span>
            </Stack>
          </Card>

          <Card variant="default">
            <Stack gap="xs">
              <span className="bezent-text-muted">Approved Project Timesheets</span>
              <h3>{workingHours.timesheetDedupedHours.toLocaleString()} hrs</h3>
              <span>Non-overlapping approved work</span>
            </Stack>
          </Card>

          <Card variant="default">
            <Stack gap="xs">
              <span className="bezent-text-muted">Deduplication Prevention</span>
              <h3>{workingHours.preventedDuplicateHours.toLocaleString()} hrs</h3>
              <Badge variant="neutral" size="sm">
                Double-counting blocked
              </Badge>
            </Stack>
          </Card>
        </Grid>

        <Card variant="flat">
          <Inline gap="sm" align="center">
            <BezentIcon name="info" size={16} />
            <span>
              <strong>Deduplication Audit Rule:</strong> {workingHours.calculationExplanation}
            </span>
          </Inline>
        </Card>
      </Section>

      {/* ── 2. Milestone Progress & Recognition Badges ─────────────────── */}
      <Section
        title="Career Milestones & Recognition"
        subtitle="Configurable enterprise achievements celebrating verified service hours."
      >
        <Grid columns={2} gap="lg">
          {milestones.map((m) => {
            return (
              <Card key={m.milestoneKey} variant="default">
                <Stack gap="md">
                  <Inline justify="between" align="center">
                    <Inline gap="sm" align="center">
                      <BezentIcon name="award" size={24} />
                      <Stack gap="xs">
                        <strong>{m.title}</strong>
                        <span>{m.description}</span>
                      </Stack>
                    </Inline>
                    <Badge variant={m.isAchieved ? 'success' : 'info'} size="sm">
                      {m.isAchieved ? 'ACHIEVED' : `${m.percentComplete}% COMPLETE`}
                    </Badge>
                  </Inline>

                  <Divider />

                  <Grid columns={3} gap="sm">
                    <Stack gap="xs">
                      <span className="bezent-text-muted">Required Target</span>
                      <strong>{m.requiredHours.toLocaleString()} hrs</strong>
                    </Stack>
                    <Stack gap="xs">
                      <span className="bezent-text-muted">Current Progress</span>
                      <strong>{m.currentHours.toLocaleString()} hrs</strong>
                    </Stack>
                    <Stack gap="xs">
                      <span className="bezent-text-muted">Remaining</span>
                      <strong>
                        {m.isAchieved
                          ? '0 hrs'
                          : `${(m.requiredHours - m.currentHours).toLocaleString()} hrs`}
                      </strong>
                    </Stack>
                  </Grid>

                  {m.isAchieved && (
                    <Badge variant="success" size="md">
                      <Inline gap="xs" align="center">
                        <BezentIcon name="checkCircle" size={14} />
                        <span>Milestone Unlocked! Official Recognition Active</span>
                      </Inline>
                    </Badge>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Grid>
      </Section>

      {/* ── 3. Commemorative Recognition Posters ──────────────────────── */}
      {achievements.length > 0 && (
        <Section
          title="Recognition Posters & Feed Publication"
          subtitle="Enterprise celebration posters generated upon reaching milestone targets."
        >
          <Stack gap="md">
            {achievements.map((ach) => {
              const poster = ach.posterData;
              const isPublished = ach.status === 'published';

              return (
                <Card key={ach.id} variant="default">
                  <Stack gap="md">
                    <Inline justify="between" align="center">
                      <Inline gap="sm" align="center">
                        <BezentIcon name="star" size={20} />
                        <strong>
                          {poster?.milestoneTitle || ach.milestoneTitle} Recognition Poster
                        </strong>
                      </Inline>
                      <Badge variant={isPublished ? 'success' : 'warning'} size="sm">
                        {isPublished ? 'Published to Company Feed' : 'Draft / Ready for Review'}
                      </Badge>
                    </Inline>

                    <Card variant="flat">
                      <Grid columns={3} gap="md">
                        <Stack gap="xs">
                          <span className="bezent-text-muted">Honoree</span>
                          <strong>{poster?.employeeName || 'Honoree'}</strong>
                          <span>
                            {poster?.designation} • {poster?.department}
                          </span>
                        </Stack>

                        <Stack gap="xs">
                          <span className="bezent-text-muted">Enterprise Milestone</span>
                          <strong>{ach.milestoneHours.toLocaleString()} Verified Working Hours</strong>
                          <span>{poster?.companyName}</span>
                        </Stack>

                        <Stack gap="xs">
                          <span className="bezent-text-muted">Achieved Date</span>
                          <strong>{ach.achievedAt.slice(0, 10)}</strong>
                          <span>Audited & Stamped</span>
                        </Stack>
                      </Grid>
                    </Card>

                    <Inline justify="between" align="center">
                      <span>
                        {isPublished
                          ? `Published on ${ach.posterPublishedAt?.slice(0, 10) || 'Company Feed'}`
                          : 'Review template and publish to the company-wide feed.'}
                      </span>

                      {!isPublished && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={<BezentIcon name="send" size={14} />}
                          disabled={publishing === ach.id}
                          onClick={() => handlePublishPoster(ach.id)}
                        >
                          {publishing === ach.id ? 'Publishing...' : 'Approve & Publish to Feed'}
                        </Button>
                      )}
                    </Inline>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </Section>
      )}

      {/* ── 4. Assigned Rewards & Fulfilment ────────────────────────────── */}
      <Section
        title="Milestone Rewards & Fulfilment"
        subtitle="Catalog gifts, executive recognition tokens, and sabbatical grants."
      >
        {rewardAssignments.length === 0 ? (
          <Card variant="flat">
            <span className="bezent-text-muted">
              No rewards currently assigned. Rewards are triggered upon milestone crossing.
            </span>
          </Card>
        ) : (
          <Stack gap="sm">
            {rewardAssignments.map((rw) => (
              <Card key={rw.id} variant="default">
                <Inline justify="between" align="center">
                  <Inline gap="md" align="center">
                    <BezentIcon name="gift" size={24} />
                    <Stack gap="xs">
                      <strong>{rw.rewardName}</strong>
                      <span>{rw.notes || 'Milestone reward assignment'}</span>
                    </Stack>
                  </Inline>

                  <Stack gap="xs" align="end">
                    <Badge
                      variant={
                        rw.status === 'fulfilled'
                          ? 'success'
                          : rw.status === 'approved'
                            ? 'info'
                            : 'neutral'
                      }
                      size="sm"
                    >
                      {rw.status.toUpperCase()}
                    </Badge>
                    {rw.fulfilledAt && (
                      <span className="bezent-text-muted">
                        Fulfilled: {rw.fulfilledAt.slice(0, 10)}
                      </span>
                    )}
                  </Stack>
                </Inline>
              </Card>
            ))}
          </Stack>
        )}
      </Section>

      {/* ── 5. Historical Working Hours Yearly Breakdown ─────────────────── */}
      <Section
        title="Historical Annual Working Hours"
        subtitle="Auditable breakdown of verified attendance and approved timesheets by calendar year."
      >
        <Card variant="default">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Year</TableHeaderCell>
                <TableHeaderCell>Verified Workdays</TableHeaderCell>
                <TableHeaderCell>Attendance Hours</TableHeaderCell>
                <TableHeaderCell>Timesheet Hours</TableHeaderCell>
                <TableHeaderCell>Total Verified Hours</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workingHours.yearlySummaries.map((y) => (
                <TableRow key={y.year}>
                  <TableCell>
                    <strong>{y.year}</strong>
                  </TableCell>
                  <TableCell>{y.workdaysCount} days</TableCell>
                  <TableCell>{y.attendanceHours.toLocaleString()} hrs</TableCell>
                  <TableCell>{y.timesheetHours.toLocaleString()} hrs</TableCell>
                  <TableCell>
                    <strong>{y.totalHours.toLocaleString()} hrs</strong>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Section>
    </Stack>
  );
}

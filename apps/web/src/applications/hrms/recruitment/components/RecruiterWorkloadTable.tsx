import {
  Avatar,
  Badge,
  Card,
  CardBody,
  Divider,
  Inline,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';
import type { RecruiterWorkloadItem } from '../types/report';

export interface RecruiterWorkloadTableProps {
  workload: RecruiterWorkloadItem[];
}

export function RecruiterWorkloadTable({ workload }: RecruiterWorkloadTableProps) {
  return (
    <Card variant="flat" padding="md">
      <CardBody>
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline align="center" gap="sm">
              <BezentIcon name="workforce" size="action" color="var(--color-primary-600)" />
              <Stack gap="none">
                <span className="bezent-font-semibold bezent-text-base">
                  Recruiter Throughput &amp; Talent Team Workload
                </span>
                <span className="bezent-text-xs bezent-text-secondary">
                  Active requisitions under management, pipeline volume, and hire velocity per recruiter.
                </span>
              </Stack>
            </Inline>
            <Badge variant="neutral" size="sm">3 Active TA Partners</Badge>
          </Inline>

          <Divider />

          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Recruiter / Talent Partner</TableHeaderCell>
                <TableHeaderCell>Active Requisitions</TableHeaderCell>
                <TableHeaderCell>Pipeline In Flight</TableHeaderCell>
                <TableHeaderCell>Interviews Facilitated</TableHeaderCell>
                <TableHeaderCell>Offers Released</TableHeaderCell>
                <TableHeaderCell>Hires Closed</TableHeaderCell>
                <TableHeaderCell>Avg Time to Hire</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {workload.map((rec) => {
                const initials = rec.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2);

                return (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <Inline align="center" gap="sm">
                        <Avatar
                          initials={initials}
                          color={rec.avatarColor}
                          size="md"
                        />
                        <Stack gap="none">
                          <span className="bezent-font-semibold bezent-text-sm">{rec.name}</span>
                          <span className="bezent-text-xs bezent-text-secondary">{rec.role}</span>
                        </Stack>
                      </Inline>
                    </TableCell>

                    <TableCell>
                      <Inline align="center" gap="xs">
                        <span className="bezent-font-bold bezent-text-sm">{rec.activeRequisitions}</span>
                        <span className="bezent-text-xs bezent-text-secondary">jobs</span>
                      </Inline>
                    </TableCell>

                    <TableCell>
                      <Inline align="center" gap="xs">
                        <span className="bezent-font-semibold bezent-text-sm text-primary-700">
                          {rec.activePipelineCandidates}
                        </span>
                        <span className="bezent-text-xs bezent-text-secondary">candidates</span>
                      </Inline>
                    </TableCell>

                    <TableCell>
                      <span className="bezent-text-sm text-gray-700">{rec.interviewsFacilitated}</span>
                    </TableCell>

                    <TableCell>
                      <span className="bezent-text-sm text-gray-700">{rec.offersReleased}</span>
                    </TableCell>

                    <TableCell>
                      <span className="bezent-font-bold bezent-text-sm text-success-700">
                        {rec.hiresClosed}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {rec.avgTimeToHireDays} days
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Stack>
      </CardBody>
    </Card>
  );
}

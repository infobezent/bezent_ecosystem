import {
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
import type { SourceEffectivenessItem } from '../types/report';

export interface SourceEffectivenessCardProps {
  sources: SourceEffectivenessItem[];
}

export function SourceEffectivenessCard({ sources }: SourceEffectivenessCardProps) {
  return (
    <Card variant="flat" padding="md">
      <CardBody>
        <Stack gap="md">
          <Inline justify="between" align="center">
            <Inline align="center" gap="sm">
              <BezentIcon name="reports" size="action" color="var(--color-primary-600)" />
              <Stack gap="none">
                <span className="bezent-font-semibold bezent-text-base">
                  Candidate Source Effectiveness &amp; Channel ROI
                </span>
                <span className="bezent-text-xs bezent-text-secondary">
                  Analysis of pipeline volume, interview yield, and ultimate hire conversion rate.
                </span>
              </Stack>
            </Inline>
            <Badge variant="success" size="sm">
              Top Source: Referrals (19% Conversion)
            </Badge>
          </Inline>

          <Divider />

          <Table hoverable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Acquisition Channel</TableHeaderCell>
                <TableHeaderCell>Sourced</TableHeaderCell>
                <TableHeaderCell>Interviewed</TableHeaderCell>
                <TableHeaderCell>Offers Made</TableHeaderCell>
                <TableHeaderCell>Hires</TableHeaderCell>
                <TableHeaderCell>Conversion Rate</TableHeaderCell>
                <TableHeaderCell>Speed to Hire</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sources.map((s) => (
                <TableRow key={s.source}>
                  <TableCell>
                    <Stack gap="none">
                      <span className="bezent-font-semibold bezent-text-sm">{s.source}</span>
                      <span className="bezent-text-xs bezent-text-secondary">{s.channel}</span>
                    </Stack>
                  </TableCell>

                  <TableCell>
                    <span className="bezent-font-semibold bezent-text-sm">{s.candidatesCount}</span>
                  </TableCell>

                  <TableCell>
                    <span className="bezent-text-sm text-gray-700">{s.interviewedCount}</span>
                  </TableCell>

                  <TableCell>
                    <span className="bezent-text-sm text-gray-700">{s.offeredCount}</span>
                  </TableCell>

                  <TableCell>
                    <span className="bezent-font-bold bezent-text-sm text-success-700">
                      {s.hiredCount}
                    </span>
                  </TableCell>

                  <TableCell>
                    <Inline align="center" gap="xs">
                      <span className="bezent-font-semibold bezent-text-sm text-primary-700">
                        {s.conversionRate}%
                      </span>
                      {s.conversionRate >= 15 && (
                        <Badge variant="success" size="sm">
                          High ROI
                        </Badge>
                      )}
                    </Inline>
                  </TableCell>

                  <TableCell>
                    <span className="bezent-text-xs bezent-text-secondary">
                      {s.avgDaysToHire} days avg
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </CardBody>
    </Card>
  );
}

import type { ReactNode } from 'react';
import {
  Badge,
  Card,
  CardDescription,
  CardTitle,
  Grid,
  Stack,
} from '../../../../design-system/components';

export type LeaveStatTone = 'blue' | 'green' | 'purple' | 'red';

export interface LeaveStat {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: string;
  tone?: LeaveStatTone;
}

const BADGE_VARIANT = {
  blue: 'info',
  green: 'success',
  purple: 'neutral',
  red: 'warning',
} as const;

/** Metrics row shared by the Leave Settings tabs, matching the Attendance Settings metrics. */
export function LeaveStatGrid({ stats }: { stats: LeaveStat[] }) {
  return (
    <Grid columns={stats.length >= 4 ? 4 : stats.length === 3 ? 3 : 2} gap="md">
      {stats.map((stat) => (
        <Card key={stat.label} variant="flat" padding="md">
          <Stack gap="xs">
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle>{stat.value}</CardTitle>
            {stat.caption && (
              <span>
                <Badge variant={BADGE_VARIANT[stat.tone ?? 'purple']}>{stat.caption}</Badge>
              </span>
            )}
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}

export default LeaveStatGrid;

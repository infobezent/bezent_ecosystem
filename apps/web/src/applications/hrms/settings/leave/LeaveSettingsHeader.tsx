import type { ReactNode } from 'react';
import {
  Card,
  CardDescription,
  CardIcon,
  CardTitle,
  Inline,
  Stack,
} from '../../../../design-system/components';
import { BezentIcon } from '../../../../design-system/icons';

export interface LeaveSettingsHeaderProps {
  icon: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}

/** Tab header card, matching the Attendance Settings section headers. */
export function LeaveSettingsHeader({
  icon,
  title,
  subtitle,
  badge,
  actions,
}: LeaveSettingsHeaderProps) {
  return (
    <Card variant="flat" padding="lg">
      <Inline justify="between" align="center" gap="md">
        <Inline gap="md" align="center">
          <CardIcon>
            <BezentIcon name={icon} size={24} />
          </CardIcon>
          <Stack gap="xs">
            <Inline gap="sm" align="center" wrap>
              <CardTitle>{title}</CardTitle>
              {badge}
            </Inline>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </Stack>
        </Inline>
        {actions}
      </Inline>
    </Card>
  );
}

export default LeaveSettingsHeader;

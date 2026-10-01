import { Card, EmptyState } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';

/**
 * Employee Configuration section in HRMS Administration.
 * Houses Employee Numbering and employee profile settings.
 */
export function EmployeeConfigurationSection() {
  return (
    <Card variant="flat" padding="lg">
      <EmptyState
        size="compact"
        hideIllustration={false}
        illustration={<BezentIcon name="settings" size={32} color="var(--text-tertiary)" />}
        title="Employee Configuration"
        description="Configuring employee categories, custom fields, and profile settings will be available in a future release."
      />
    </Card>
  );
}

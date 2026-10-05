import { Card, EmptyState } from '../../../../../design-system/components';
import { BezentIcon } from '../../../../../design-system/icons';

/**
 * Employee Numbering configuration placeholder / section.
 * Aligns with Administration → Employee Configuration → Employee Numbering.
 */
export function EmployeeNumberingSection() {
  return (
    <Card variant="flat" padding="lg">
      <EmptyState
        size="compact"
        hideIllustration={false}
        illustration={<BezentIcon name="settings" size={32} color="var(--text-tertiary)" />}
        title="Employee Numbering"
        description="Configure automated employee ID sequences, prefixes, and numbering series."
      />
    </Card>
  );
}

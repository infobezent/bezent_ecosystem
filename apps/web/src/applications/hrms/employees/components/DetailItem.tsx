import type { ReactNode } from 'react';
import { Label, Stack } from '../../../../design-system/components';

/** Label/value pair for read-only record views, composed from Design System primitives. */
export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <Label as="span" size="sm">
        {label}
      </Label>
      <span>{children}</span>
    </Stack>
  );
}

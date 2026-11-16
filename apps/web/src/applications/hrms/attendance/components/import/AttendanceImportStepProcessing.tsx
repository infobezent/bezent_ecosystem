import React from 'react';
import { Card, Stack, Inline, Spinner, ProgressBar } from '../../../../../design-system';

interface AttendanceImportStepProcessingProps {
  validCount: number;
}

export const AttendanceImportStepProcessing: React.FC<AttendanceImportStepProcessingProps> = ({
  validCount,
}) => {
  return (
    <Card variant="default" padding="lg">
      <Stack align="center" gap="lg">
        <Spinner size="lg" />

        <Stack align="center" gap="xs">
          <h3 className="bezent-heading-md">Importing Punch Records...</h3>
          <p className="bezent-text-secondary">
            Writing {validCount} verified biometric punches and deriving daily attendance in BEZENT.
          </p>
        </Stack>

        <ProgressBar value={80} />

        <Stack gap="sm">
          <Inline gap="sm" align="center">
            <span className="bezent-text-success">✓</span>
            <span className="bezent-text-sm">Verified file format and employee identities</span>
          </Inline>
          <Inline gap="sm" align="center">
            <span className="bezent-text-success">✓</span>
            <span className="bezent-text-sm">Enforced duplicate and locked-period checks</span>
          </Inline>
          <Inline gap="sm" align="center">
            <Spinner size="sm" />
            <span className="bezent-text-sm">
              Creating raw punch logs and updating daily attendance...
            </span>
          </Inline>
          <Inline gap="sm" align="center">
            <span className="bezent-text-muted">○</span>
            <span className="bezent-text-sm bezent-text-muted">
              Finalizing audit batch tracking
            </span>
          </Inline>
        </Stack>
      </Stack>
    </Card>
  );
};

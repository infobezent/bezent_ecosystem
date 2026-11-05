import React from 'react';
import { Card, Stack, Inline, Spinner, ProgressBar } from '../../../../../design-system';

interface ImportStepProcessingProps {
  validCount: number;
}

export const ImportStepProcessing: React.FC<ImportStepProcessingProps> = ({ validCount }) => {
  return (
    <Card variant="default" padding="lg">
      <Stack align="center" gap="lg">
        <Spinner size="lg" />

        <Stack align="center" gap="xs">
          <h3 className="bezent-heading-md">Importing Employee Records...</h3>
          <p className="bezent-text-secondary">
            Creating {validCount} employee records in BEZENT MySQL database with strict company
            isolation.
          </p>
        </Stack>

        <ProgressBar value={75} />

        <Stack gap="sm">
          <Inline gap="sm" align="center">
            <span className="bezent-text-success">✓</span>
            <span className="bezent-text-sm">
              Verified file structure & company master references
            </span>
          </Inline>
          <Inline gap="sm" align="center">
            <span className="bezent-text-success">✓</span>
            <span className="bezent-text-sm">Enforced duplicate email and ID isolation checks</span>
          </Inline>
          <Inline gap="sm" align="center">
            <Spinner size="sm" />
            <span className="bezent-text-sm">
              Inserting employee workforce records and profile details...
            </span>
          </Inline>
          <Inline gap="sm" align="center">
            <span className="bezent-text-muted">○</span>
            <span className="bezent-text-sm bezent-text-muted">
              Finalizing transaction and audit history logs
            </span>
          </Inline>
        </Stack>
      </Stack>
    </Card>
  );
};

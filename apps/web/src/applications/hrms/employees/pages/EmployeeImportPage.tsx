import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  PageHeader,
  Card,
  Button,
  Stack,
  Inline,
  Badge,
  BezentIcon,
} from '../../../../design-system';
import { ImportStepDownloadTemplate } from '../components/import/ImportStepDownloadTemplate';
import { ImportStepUpload } from '../components/import/ImportStepUpload';
import { ImportStepValidationPreview } from '../components/import/ImportStepValidationPreview';
import { ImportStepProcessing } from '../components/import/ImportStepProcessing';
import { ImportStepResults } from '../components/import/ImportStepResults';
import {
  validateImportFile,
  processImport,
  type ValidationSummary,
  type ProcessImportResult,
  type ImportOptions,
} from '../api/employeeImportApi';

type StepId = 'template' | 'upload' | 'preview' | 'processing' | 'results';

export const EmployeeImportPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<StepId>('template');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [result, setResult] = useState<ProcessImportResult | null>(null);

  const handleFileValidated = async (file: File, options: ImportOptions) => {
    try {
      setIsValidating(true);
      setValidationError(null);
      const res = await validateImportFile(file, options);
      setSummary(res);
      setStep('preview');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Validation failed. Please verify file format.';
      setValidationError(msg);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!summary) return;
    try {
      setStep('processing');
      const res = await processImport(summary.id, summary.options);
      setResult(res);
      setStep('results');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed during database insertion.';
      setValidationError(msg);
      setStep('preview');
    }
  };

  const handleReset = () => {
    setSummary(null);
    setResult(null);
    setValidationError(null);
    setStep('template');
  };

  return (
    <Page>
      <PageHeader
        title="Import Employees"
        subtitle="Easily import multiple employee records into BEZENT using the official employee import template."
        actions={
          <Inline gap="sm">
            <Button
              variant={step === 'template' ? 'secondary' : 'ghost'}
              onClick={() => setStep('template')}
            >
              <BezentIcon name="download" size={16} />
              Download Template
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/hrms/workforce/employees/import/history')}
            >
              <BezentIcon name="history" size={16} />
              Import History
            </Button>
            <Button variant="outline" onClick={() => navigate('/hrms/workforce/employees')}>
              <BezentIcon name="close" size={16} />
              Close
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {/* Import Info Banner */}
        <Card variant="flat" padding="sm">
          <Inline justify="between" align="center" wrap>
            <Inline gap="md" align="center" wrap>
              <span className="bezent-text-sm bezent-font-semibold">Import Information:</span>
              <span className="bezent-text-sm bezent-text-secondary">
                Supported Formats: <strong>XLSX, CSV</strong>
              </span>
              <span>•</span>
              <span className="bezent-text-sm bezent-text-secondary">
                Max File Size: <strong>10 MB</strong>
              </span>
              <span>•</span>
              <span className="bezent-text-sm bezent-text-secondary">
                Max Records: <strong>1,000 per import</strong>
              </span>
              <span>•</span>
              <span className="bezent-text-sm bezent-text-secondary">
                Scope: <strong>Selected Company</strong>
              </span>
            </Inline>

            <Badge variant="neutral">Predefined Template Approach</Badge>
          </Inline>
        </Card>

        {/* Step Indicator Pills */}
        <Card variant="default" padding="sm">
          <Inline justify="between" align="center">
            <Inline gap="sm" align="center">
              <Badge variant={step === 'template' ? 'info' : 'neutral'}>
                1. Template & Guidelines
              </Badge>
              <span className="bezent-text-muted">→</span>
              <Badge variant={step === 'upload' ? 'info' : summary ? 'success' : 'neutral'}>
                2. Upload File
              </Badge>
              <span className="bezent-text-muted">→</span>
              <Badge variant={step === 'preview' ? 'info' : result ? 'success' : 'neutral'}>
                3. Validation & Preview
              </Badge>
              <span className="bezent-text-muted">→</span>
              <Badge variant={step === 'results' ? 'success' : 'neutral'}>4. Import Results</Badge>
            </Inline>

            {step !== 'template' && (
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                Back to Upload
              </Button>
            )}
          </Inline>
        </Card>

        {/* Dynamic Step Content */}
        {step === 'template' && (
          <ImportStepDownloadTemplate onContinueToUpload={() => setStep('upload')} />
        )}

        {step === 'upload' && (
          <ImportStepUpload
            onFileValidated={handleFileValidated}
            isValidating={isValidating}
            error={validationError}
          />
        )}

        {step === 'preview' && summary && (
          <ImportStepValidationPreview
            summary={summary}
            onReplaceFile={() => setStep('upload')}
            onConfirmImport={handleConfirmImport}
            isProcessing={false}
          />
        )}

        {step === 'processing' && <ImportStepProcessing validCount={summary?.validRecords ?? 0} />}

        {step === 'results' && result && (
          <ImportStepResults
            result={result}
            onReset={handleReset}
            onNavigateDirectory={() => navigate('/hrms/workforce/employees')}
            onNavigateHistory={() => navigate('/hrms/workforce/employees/import/history')}
          />
        )}
      </Stack>
    </Page>
  );
};

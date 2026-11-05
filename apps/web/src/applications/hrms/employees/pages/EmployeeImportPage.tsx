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
        subtitle="Bulk create employee profiles using the official BEZENT employee import spreadsheet."
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
        {/* Import Information Bar */}
        <Card variant="flat" padding="sm">
          <Inline justify="between" align="center" wrap>
            <Inline gap="md" align="center" wrap>
              <span className="bezent-text-sm bezent-font-semibold">Import Specifications:</span>
              <span className="bezent-text-sm bezent-text-secondary">
                Supported Formats: <strong>XLSX, CSV</strong>
              </span>
              <span>•</span>
              <span className="bezent-text-sm bezent-text-secondary">
                Max File Size: <strong>10 MB</strong>
              </span>
              <span>•</span>
              <span className="bezent-text-sm bezent-text-secondary">
                Max Capacity: <strong>1,000 records / batch</strong>
              </span>
              <span>•</span>
              <span className="bezent-text-sm bezent-text-secondary">
                Scope: <strong>Active Company</strong>
              </span>
            </Inline>

            <Badge variant="neutral">Unified Predefined Template</Badge>
          </Inline>
        </Card>

        {/* Interactive Stepper Navigation (Zoho People Style) */}
        <Card variant="default" padding="sm">
          <Inline justify="between" align="center" wrap>
            <Inline gap="xs" align="center" wrap>
              <Button
                variant={step === 'template' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStep('template')}
              >
                1. Download Template
              </Button>
              <span className="bezent-text-muted">→</span>
              <Button
                variant={step === 'upload' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStep('upload')}
              >
                2. Upload File
              </Button>
              <span className="bezent-text-muted">→</span>
              <Button
                variant={step === 'preview' ? 'secondary' : 'ghost'}
                size="sm"
                disabled={!summary}
                onClick={() => summary && setStep('preview')}
              >
                3. Validation & Preview
              </Button>
              <span className="bezent-text-muted">→</span>
              <Badge variant={step === 'results' ? 'success' : 'neutral'}>
                4. Results & Summary
              </Badge>
            </Inline>

            {step === 'preview' && (
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <BezentIcon name="chevron-left" size={14} />
                Back to Upload
              </Button>
            )}
            {step === 'upload' && (
              <Button variant="ghost" size="sm" onClick={() => setStep('template')}>
                <BezentIcon name="documents" size={14} />
                Template Guidelines
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
            onNavigateToTemplate={() => setStep('template')}
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

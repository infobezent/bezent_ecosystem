import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, Button, Stack, Inline, BezentIcon } from '../../../../design-system';
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

type StepId = 'upload' | 'preview' | 'processing' | 'results';

export const EmployeeImportPage: React.FC = () => {
  const navigate = useNavigate();

  // Initial step directly lands on the clean Upload workspace (matching Zoho People)
  const [step, setStep] = useState<StepId>('upload');
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
    setStep('upload');
  };

  return (
    <Page>
      {/* Clean, distraction-free header matching Zoho People */}
      <PageHeader
        title={step === 'preview' ? 'Import — Data Validation & Preview' : 'Import'}
        subtitle={
          step === 'preview'
            ? 'Review automated validation results and verify workforce records before importing.'
            : undefined
        }
        actions={
          <Inline gap="sm" align="center">
            {step === 'preview' && (
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <BezentIcon name="chevron-left" size={14} />
                Back to Upload
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/hrms/workforce/employees/import/history')}
            >
              <BezentIcon name="history" size={14} />
              Import History
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/hrms/workforce/employees')}
              aria-label="Close import"
            >
              <BezentIcon name="close" size={14} />
              Close
            </Button>
          </Inline>
        }
      />

      <Stack gap="lg">
        {/* Dynamic Step Content */}
        {step === 'upload' && (
          <ImportStepUpload
            onFileValidated={handleFileValidated}
            isValidating={isValidating}
            error={validationError}
            onCancel={() => navigate('/hrms/workforce/employees')}
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

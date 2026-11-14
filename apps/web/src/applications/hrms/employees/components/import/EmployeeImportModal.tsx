import React, { useState } from 'react';
import { Modal, Button, IconButton, Inline, BezentIcon } from '../../../../../design-system';
import { ImportStepUpload } from './ImportStepUpload';
import { ImportStepValidationPreview } from './ImportStepValidationPreview';
import { ImportStepProcessing } from './ImportStepProcessing';
import { ImportStepResults } from './ImportStepResults';
import {
  validateImportFile,
  processImport,
  type ValidationSummary,
  type ProcessImportResult,
  type ImportOptions,
} from '../../api/employeeImportApi';

export interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (result: ProcessImportResult) => void;
  onNavigateHistory?: () => void;
}

type StepId = 'upload' | 'preview' | 'processing' | 'results';

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onNavigateHistory,
}) => {
  const [step, setStep] = useState<StepId>('upload');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [result, setResult] = useState<ProcessImportResult | null>(null);

  const handleClose = () => {
    // Reset state on modal close
    setStep('upload');
    setValidationError(null);
    setSummary(null);
    setResult(null);
    onClose();
  };

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
      onImportSuccess?.(res);
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

  const getTitle = () => {
    switch (step) {
      case 'upload':
        return 'Import';
      case 'preview':
        return 'Import — Data Validation & Preview';
      case 'processing':
        return 'Importing Employees...';
      case 'results':
        return 'Import Results & Summary';
    }
  };

  const getDescription = () => {
    switch (step) {
      case 'upload':
        return undefined;
      case 'preview':
        return 'Review automated validation results and verify workforce records before importing.';
      case 'processing':
        return 'Inserting validated employee records into organization database.';
      case 'results':
        return 'Summary of created profiles and skipped duplicates.';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getTitle()}
      description={getDescription()}
      size="2xl"
      headerActions={
        <Inline gap="xs" align="center">
          {step === 'preview' && (
            <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
              <BezentIcon name="chevron-left" size={14} />
              Back
            </Button>
          )}
          {onNavigateHistory && (
            <IconButton
              label="Import History"
              variant="ghost"
              tooltipDirection="down"
              onClick={onNavigateHistory}
            >
              <BezentIcon name="history" size={18} />
            </IconButton>
          )}
        </Inline>
      }
    >
      {step === 'upload' && (
        <ImportStepUpload
          onFileValidated={handleFileValidated}
          isValidating={isValidating}
          error={validationError}
          onCancel={handleClose}
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
          onNavigateDirectory={handleClose}
          onNavigateHistory={onNavigateHistory ?? handleClose}
        />
      )}
    </Modal>
  );
};

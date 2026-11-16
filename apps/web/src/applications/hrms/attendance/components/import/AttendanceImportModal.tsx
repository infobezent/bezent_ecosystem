import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../../../design-system';
import { AttendanceImportStepUpload } from './AttendanceImportStepUpload';
import { AttendanceImportStepValidationPreview } from './AttendanceImportStepValidationPreview';
import { AttendanceImportStepProcessing } from './AttendanceImportStepProcessing';
import { AttendanceImportStepResults } from './AttendanceImportStepResults';
import {
  validatePunchImportFile,
  processPunchImport,
  type PunchValidationSummary,
  type ProcessPunchImportResult,
} from '../../api/attendanceImportApi';

export interface AttendanceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: (result: ProcessPunchImportResult) => void;
}

type StepId = 'upload' | 'preview' | 'processing' | 'results';

export const AttendanceImportModal: React.FC<AttendanceImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>('upload');
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PunchValidationSummary | null>(null);
  const [result, setResult] = useState<ProcessPunchImportResult | null>(null);

  const handleClose = () => {
    // Reset state on modal close
    setStep('upload');
    setValidationError(null);
    setSummary(null);
    setResult(null);
    onClose();
  };

  const handleFileValidated = async (file: File) => {
    try {
      setIsValidating(true);
      setValidationError(null);
      const res = await validatePunchImportFile(file);
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
      setIsProcessing(true);
      setStep('processing');
      const res = await processPunchImport(summary.fileName, summary.rows);
      setResult(res);
      setStep('results');
      onImportSuccess?.(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed during processing.';
      setValidationError(msg);
      setStep('preview');
    } finally {
      setIsProcessing(false);
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
        return 'Import Attendance Punches';
      case 'preview':
        return 'Punch Import — Validation & Preview';
      case 'processing':
        return 'Importing Punches...';
      case 'results':
        return 'Import Results & Summary';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getTitle()}
      size={step === 'preview' ? 'lg' : 'md'}
    >
      {step === 'upload' && (
        <AttendanceImportStepUpload
          onFileValidated={handleFileValidated}
          isValidating={isValidating}
          error={validationError}
          onCancel={handleClose}
        />
      )}

      {step === 'preview' && summary && (
        <AttendanceImportStepValidationPreview
          summary={summary}
          onReplaceFile={handleReset}
          onConfirmImport={handleConfirmImport}
          isProcessing={isProcessing}
        />
      )}

      {step === 'processing' && summary && (
        <AttendanceImportStepProcessing validCount={summary.validRecords} />
      )}

      {step === 'results' && result && (
        <AttendanceImportStepResults
          result={result}
          onReset={handleReset}
          onNavigateDaily={() => {
            handleClose();
            navigate('/hrms/attendance/daily');
          }}
          onNavigatePunchLogs={() => {
            handleClose();
            navigate('/hrms/attendance/punch-logs');
          }}
        />
      )}
    </Modal>
  );
};

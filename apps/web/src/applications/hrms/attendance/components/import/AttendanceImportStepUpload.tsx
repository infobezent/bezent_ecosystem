import React, { useRef, useState } from 'react';
import {
  Card,
  Button,
  Stack,
  Inline,
  Badge,
  BezentIcon,
  Alert,
} from '../../../../../design-system';
import { downloadPunchTemplate } from '../../api/attendanceImportApi';

interface AttendanceImportStepUploadProps {
  onFileValidated: (file: File) => void;
  isValidating: boolean;
  error?: string | null;
  onCancel?: () => void;
}

export const AttendanceImportStepUpload: React.FC<AttendanceImportStepUploadProps> = ({
  onFileValidated,
  isValidating,
  error,
  onCancel,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = () => {
    try {
      setIsDownloading(true);
      const blob = downloadPunchTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bezent-attendance-punches-template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    setLocalError(null);
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      setLocalError('Unsupported file format. Please upload an official CSV punch file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setLocalError('File size exceeds the maximum allowed limit of 10 MB.');
      return;
    }

    if (file.size === 0) {
      setLocalError('The uploaded file contains no data (empty file).');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0] ?? null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleNext = () => {
    if (!selectedFile) {
      setLocalError('Please upload a CSV punch log file to continue.');
      return;
    }
    onFileValidated(selectedFile);
  };

  const combinedError = error || localError;

  return (
    <Stack gap="lg">
      {combinedError && (
        <Alert variant="danger" dismissible onDismiss={() => setLocalError(null)}>
          {combinedError}
        </Alert>
      )}

      {/* Hero Drag & Drop Area (Workforce / Zoho People Clean Card) */}
      <Card
        variant={isDragOver ? 'interactive' : 'flat'}
        padding="lg"
        onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <Stack align="center" gap="md">
          {!selectedFile ? (
            <>
              <div className="bezent-att-action-icon">
                <BezentIcon name="upload" size={32} />
              </div>

              <Stack align="center" gap="xs">
                <h4 className="bezent-heading-sm">Drag and drop punch CSV file here</h4>
                <p className="bezent-text-secondary bezent-text-sm">
                  [only standard comma-separated .csv format is supported]
                </p>
              </Stack>

              <Button
                variant="primary"
                size="md"
                shape="rounded"
                onClick={() => fileInputRef.current?.click()}
              >
                <BezentIcon name="upload" size={16} />
                Upload CSV File
              </Button>

              <Stack align="center" gap="xs">
                <span className="bezent-text-muted bezent-text-xs">
                  Maximum upload file size is 10 MB (up to 5,000 punch rows).
                </span>

                <Inline gap="sm" align="center">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDownloading}
                    onClick={handleDownloadSample}
                  >
                    <BezentIcon name="download" size={14} />
                    Download sample punch CSV template
                  </Button>
                </Inline>
              </Stack>
            </>
          ) : (
            /* Selected File State */
            <Stack align="center" gap="md">
              <BezentIcon name="documents" size={48} />
              <Stack align="center" gap="none">
                <h4 className="bezent-heading-sm">{selectedFile.name}</h4>
                <p className="bezent-text-secondary bezent-text-sm">
                  {formatFileSize(selectedFile.size)} • CSV Document
                </p>
              </Stack>

              <Badge variant="success">File Ready for Validation</Badge>

              <Inline gap="sm">
                <Button
                  variant="outline"
                  size="sm"
                  shape="rounded"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <BezentIcon name="edit" size={14} />
                  Replace File
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setLocalError(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <BezentIcon name="trash" size={14} />
                  Remove
                </Button>
              </Inline>
            </Stack>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </Stack>
      </Card>

      {/* Guidelines Box */}
      <Card variant="default" padding="md">
        <Stack gap="xs">
          <span className="bezent-font-semibold bezent-text-sm bezent-text-primary">
            Import Format Guidelines
          </span>
          <Stack gap="xs">
            <span className="bezent-text-secondary bezent-text-xs">
              • <strong>employee_id:</strong> Matches standard Employee Number (e.g.{' '}
              <code>EMP-0001</code>).
            </span>
            <span className="bezent-text-secondary bezent-text-xs">
              • <strong>punch_time:</strong> Standard timestamp format{' '}
              <code>YYYY-MM-DD HH:mm:ss</code>.
            </span>
            <span className="bezent-text-secondary bezent-text-xs">
              • <strong>punch_type:</strong> Direction of punch: <code>IN</code> (entry) or{' '}
              <code>OUT</code> (exit).
            </span>
            <span className="bezent-text-secondary bezent-text-xs">
              • Daily attendance is automatically reconciled upon import without modifying manually
              finalized records.
            </span>
          </Stack>
        </Stack>
      </Card>

      {/* Footer Actions */}
      <Inline justify="between" align="center">
        {onCancel ? (
          <Button variant="ghost" size="md" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <div />
        )}
        <Button
          variant="primary"
          size="md"
          shape="rounded"
          disabled={!selectedFile || isValidating}
          onClick={handleNext}
        >
          {isValidating ? 'Validating File...' : 'Validate & Preview'}
        </Button>
      </Inline>
    </Stack>
  );
};

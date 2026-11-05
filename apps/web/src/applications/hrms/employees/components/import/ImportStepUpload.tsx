import React, { useRef, useState } from 'react';
import {
  Card,
  Button,
  Stack,
  Inline,
  Grid,
  Badge,
  BezentIcon,
  Switch,
  Alert,
} from '../../../../../design-system';
import { downloadTemplate, type ImportOptions } from '../../api/employeeImportApi';

interface ImportStepUploadProps {
  onFileValidated: (file: File, options: ImportOptions) => void;
  isValidating: boolean;
  error?: string | null;
  onNavigateToTemplate?: () => void;
}

export const ImportStepUpload: React.FC<ImportStepUploadProps> = ({
  onFileValidated,
  isValidating,
  error,
  onNavigateToTemplate,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Configuration options
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [sendInvitations, setSendInvitations] = useState(false);
  const [autoGenerateId, setAutoGenerateId] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = async () => {
    try {
      setIsDownloading(true);
      const blob = await downloadTemplate('complete', 'xlsx');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bezent-employee-template.xlsx`;
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
    if (ext !== 'xlsx' && ext !== 'csv') {
      setLocalError('Unsupported file format. Please upload an official XLSX or CSV file.');
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

  const handleValidate = () => {
    if (!selectedFile) {
      setLocalError('Please upload an employee file to continue.');
      return;
    }

    onFileValidated(selectedFile, {
      skipDuplicates,
      sendInvitations,
      autoGenerateId,
    });
  };

  return (
    <Stack gap="xl">
      {/* Step Header & Quick Download Action */}
      <Inline justify="between" align="start" wrap>
        <Stack gap="xs">
          <h3 className="bezent-heading-md">Step 02 – Upload Employee File</h3>
          <p className="bezent-text-secondary">
            Upload your completed BEZENT employee template to begin automated data verification.
          </p>
        </Stack>

        <Inline gap="xs" align="center">
          <Button variant="ghost" size="sm" disabled={isDownloading} onClick={handleDownloadSample}>
            <BezentIcon name="download" size={16} />
            {isDownloading ? 'Downloading...' : 'Download Template (XLSX)'}
          </Button>
          {onNavigateToTemplate && (
            <Button variant="ghost" size="sm" onClick={onNavigateToTemplate}>
              <BezentIcon name="documents" size={16} />
              View Guidelines
            </Button>
          )}
        </Inline>
      </Inline>

      {(localError || error) && (
        <Alert variant="danger" title="Upload Validation Error">
          {localError || error}
        </Alert>
      )}

      {/* Upload Drop Zone */}
      {!selectedFile ? (
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
            <BezentIcon name="upload" size={48} />
            <Stack align="center" gap="xs">
              <h4 className="bezent-heading-sm">Drag and drop your completed file here</h4>
              <p className="bezent-text-secondary">or browse files from your computer</p>
            </Stack>

            <Inline gap="xs">
              <Badge variant="neutral">XLSX</Badge>
              <Badge variant="neutral">CSV</Badge>
              <Badge variant="neutral">Max 10 MB</Badge>
              <Badge variant="neutral">Max 1,000 Records</Badge>
            </Inline>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              hidden
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0] ?? null);
                }
              }}
            />

            <Button variant="secondary" size="lg" onClick={() => fileInputRef.current?.click()}>
              <BezentIcon name="folder" size={18} />
              Browse Files
            </Button>
          </Stack>
        </Card>
      ) : (
        /* Selected File Card */
        <Card variant="default" padding="lg">
          <Stack gap="md">
            <Inline justify="between" align="center" wrap>
              <Inline gap="md" align="center">
                <BezentIcon name="documents" size={32} />
                <Stack gap="xs">
                  <h4 className="bezent-heading-sm">{selectedFile.name}</h4>
                  <Inline gap="sm" wrap>
                    <span className="bezent-text-secondary bezent-text-sm">
                      Size: <strong>{formatFileSize(selectedFile.size)}</strong>
                    </span>
                    <span>•</span>
                    <span className="bezent-text-secondary bezent-text-sm">
                      Format: <strong>{selectedFile.name.split('.').pop()?.toUpperCase()}</strong>
                    </span>
                    <span>•</span>
                    <Badge variant="success">Ready for Automated Validation</Badge>
                  </Inline>
                </Stack>
              </Inline>

              <Inline gap="sm">
                <Button
                  variant="ghost"
                  disabled={isValidating}
                  onClick={() => {
                    setSelectedFile(null);
                    setLocalError(null);
                  }}
                >
                  <BezentIcon name="delete" size={16} />
                  Remove
                </Button>
                <Button
                  variant="secondary"
                  disabled={isValidating}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <BezentIcon name="add" size={16} />
                  Replace File
                </Button>
              </Inline>
            </Inline>
          </Stack>
        </Card>
      )}

      {/* Upload Configuration & Options */}
      <Card variant="default" padding="lg">
        <Stack gap="lg">
          <Stack gap="xs">
            <h4 className="bezent-heading-sm">Import Configuration</h4>
            <p className="bezent-text-secondary bezent-text-sm">
              Configure how BEZENT handles duplicates, employee IDs, and onboarding invitations.
            </p>
          </Stack>

          <Grid columns={3} gap="lg">
            <Card variant="flat" padding="md">
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <strong className="bezent-text-sm">Skip duplicate records</strong>
                  <Switch
                    checked={skipDuplicates}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSkipDuplicates(e.target.checked)
                    }
                  />
                </Inline>
                <p className="bezent-text-secondary bezent-text-sm">
                  Automatically skip employees that already exist in the database without
                  overwriting.
                </p>
              </Stack>
            </Card>

            <Card variant="flat" padding="md">
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <strong className="bezent-text-sm">Auto-generate IDs</strong>
                  <Switch
                    checked={autoGenerateId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setAutoGenerateId(e.target.checked)
                    }
                  />
                </Inline>
                <p className="bezent-text-secondary bezent-text-sm">
                  Generate next sequential Employee ID when the ID column is left blank in template.
                </p>
              </Stack>
            </Card>

            <Card variant="flat" padding="md">
              <Stack gap="sm">
                <Inline justify="between" align="center">
                  <strong className="bezent-text-sm">Send invitations</strong>
                  <Switch
                    checked={sendInvitations}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSendInvitations(e.target.checked)
                    }
                  />
                </Inline>
                <p className="bezent-text-secondary bezent-text-sm">
                  Send welcome email invitation to created employees after successful import.
                </p>
              </Stack>
            </Card>
          </Grid>
        </Stack>
      </Card>

      {/* Validate Button */}
      {selectedFile && (
        <Inline justify="end" gap="md">
          <Button variant="primary" size="lg" loading={isValidating} onClick={handleValidate}>
            <BezentIcon name="check" size={18} />
            {isValidating ? 'Validating Employee Data...' : 'Validate File & Preview Records'}
          </Button>
        </Inline>
      )}
    </Stack>
  );
};

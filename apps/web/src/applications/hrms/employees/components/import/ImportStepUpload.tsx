import React, { useRef, useState } from 'react';
import {
  Card,
  Button,
  Stack,
  Inline,
  Grid,
  Badge,
  BezentIcon,
  Checkbox,
  Select,
  Alert,
  Modal,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Divider,
} from '../../../../../design-system';
import { downloadTemplate, type ImportOptions } from '../../api/employeeImportApi';

interface ImportStepUploadProps {
  onFileValidated: (file: File, options: ImportOptions) => void;
  isValidating: boolean;
  error?: string | null;
  onCancel?: () => void;
}

/**
 * Clean SVG illustration representing stacked document/profile cards
 * with XLSX, XLS, and CSV badges + download indicator matching Zoho People.
 */
function ZohoStyleImportIllustration() {
  return (
    <svg
      width="240"
      height="145"
      viewBox="0 0 240 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background shadow glow */}
      <ellipse cx="120" cy="138" rx="85" ry="7" fill="rgba(0, 0, 0, 0.04)" />

      {/* Left Card: XLSX */}
      <g transform="translate(18, 20) rotate(-7 45 60)">
        <rect
          x="0"
          y="0"
          width="85"
          height="110"
          rx="8"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        {/* Avatar sketch */}
        <circle cx="42.5" cy="40" r="16" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.2" />
        <circle cx="37" cy="38" r="1.5" fill="#64748B" />
        <circle cx="48" cy="38" r="1.5" fill="#64748B" />
        <path
          d="M39 46 Q42.5 49 46 46"
          stroke="#64748B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M26 68 Q42.5 56 59 68" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
        <rect x="18" y="76" width="49" height="3" rx="1.5" fill="#E2E8F0" />
        {/* XLSX Pill */}
        <rect x="22" y="85" width="41" height="16" rx="4" fill="#FFEDD5" />
        <text
          x="42.5"
          y="97"
          textAnchor="middle"
          fill="#EA580C"
          fontSize="9"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          XLSX
        </text>
      </g>

      {/* Right Card: CSV */}
      <g transform="translate(138, 22) rotate(6 45 60)">
        <rect
          x="0"
          y="0"
          width="85"
          height="110"
          rx="8"
          fill="#FFFFFF"
          stroke="#E2E8F0"
          strokeWidth="1.5"
        />
        {/* Avatar sketch */}
        <circle cx="42.5" cy="40" r="16" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.2" />
        <circle cx="37" cy="38" r="1.5" fill="#64748B" />
        <circle cx="48" cy="38" r="1.5" fill="#64748B" />
        <path
          d="M39 46 Q42.5 49 46 46"
          stroke="#64748B"
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M26 68 Q42.5 56 59 68" stroke="#94A3B8" strokeWidth="1.2" fill="none" />
        <rect x="18" y="76" width="49" height="3" rx="1.5" fill="#E2E8F0" />
        {/* CSV Pill */}
        <rect x="25" y="85" width="35" height="16" rx="4" fill="#DCFCE7" />
        <text
          x="42.5"
          y="97"
          textAnchor="middle"
          fill="#16A34A"
          fontSize="9"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          CSV
        </text>
      </g>

      {/* Center Card: Primary Profile */}
      <g transform="translate(75, 12)">
        <rect
          x="0"
          y="0"
          width="90"
          height="116"
          rx="8"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="1.5"
        />
        {/* Hair / Head sketch */}
        <circle cx="45" cy="42" r="18" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.2" />
        <circle cx="39" cy="40" r="1.5" fill="#334155" />
        <circle cx="51" cy="40" r="1.5" fill="#334155" />
        <path
          d="M41 48 Q45 52 49 48"
          stroke="#334155"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M27 72 Q45 58 63 72" stroke="#64748B" strokeWidth="1.2" fill="none" />
        <rect x="20" y="79" width="50" height="3" rx="1.5" fill="#E2E8F0" />
        {/* XLS / Primary Badge */}
        <rect x="27" y="88" width="36" height="17" rx="4" fill="#2563EB" />
        <text
          x="45"
          y="100"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="9"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          XLS
        </text>

        {/* Download circle badge */}
        <circle cx="78" cy="12" r="12" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1.5" />
        <path
          d="M78 7 V15 M74 12 L78 16 L82 12"
          stroke="#2563EB"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export const ImportStepUpload: React.FC<ImportStepUploadProps> = ({
  onFileValidated,
  isValidating,
  error,
  onCancel,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);

  // Configuration options (matching Zoho People)
  const [importBasedOn, setImportBasedOn] = useState('auto');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoGenerateId, setAutoGenerateId] = useState(true);
  const [sendInvitations, setSendInvitations] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = async (format: 'xlsx' | 'csv') => {
    try {
      setIsDownloading(true);
      const blob = await downloadTemplate('complete', format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bezent-employee-template.${format}`;
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

  const handleNext = () => {
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
    <Stack gap="md">
      {/* Top Configuration Bar (Matches Zoho People Clean Header Row) */}
      <Card variant="flat" padding="sm">
        <Stack gap="sm">
          <Grid columns={2} gap="md">
            <Select
              label="Import data for:"
              value="employee"
              disabled
              options={[{ value: 'employee', label: 'Employee' }]}
            />

            <Select
              label="Import based on:"
              value={importBasedOn}
              onChange={(e) => setImportBasedOn(e.target.value)}
              options={[
                { value: 'auto', label: 'Auto Detect (ID or Work Email)' },
                { value: 'employee_id', label: 'Employee ID' },
                { value: 'email', label: 'Work Email' },
              ]}
            />
          </Grid>

          <Inline gap="lg" align="center" wrap>
            <Checkbox
              label="Skip validation of duplicate records (recommended)"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
            />
            <Checkbox
              label="Auto-generate Employee IDs if missing"
              checked={autoGenerateId}
              onChange={(e) => setAutoGenerateId(e.target.checked)}
            />
            <Checkbox
              label="Send employee portal invitations upon import"
              checked={sendInvitations}
              onChange={(e) => setSendInvitations(e.target.checked)}
            />
          </Inline>
        </Stack>
      </Card>

      {(localError || error) && (
        <Alert variant="danger" title="Validation Note">
          {localError || error}
        </Alert>
      )}

      {/* Hero Drag & Drop Area (Zoho People Clean Central Card) */}
      <Card
        variant={isDragOver ? 'interactive' : 'flat'}
        padding="md"
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
              {/* Stacked Cards Illustration */}
              <ZohoStyleImportIllustration />

              <Stack align="center" gap="xs">
                <h4 className="bezent-heading-sm">Drag and drop attachment here</h4>
                <p className="bezent-text-secondary bezent-text-sm">
                  [only xls, xlsx and csv formats are supported]
                </p>
              </Stack>

              <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()}>
                <BezentIcon name="upload" size={16} />
                Upload File
              </Button>

              <Stack align="center" gap="xs">
                <span className="bezent-text-muted bezent-text-xs">
                  Maximum upload file size is 10 MB.
                </span>

                <Inline gap="sm" align="center">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDownloading}
                    onClick={() => handleDownloadSample('xlsx')}
                  >
                    <BezentIcon name="download" size={14} />
                    Download sample template
                  </Button>
                  <span className="bezent-text-muted">•</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDownloading}
                    onClick={() => handleDownloadSample('csv')}
                  >
                    CSV format
                  </Button>
                  <span className="bezent-text-muted">•</span>
                  <Button variant="ghost" size="sm" onClick={() => setIsGuidelinesOpen(true)}>
                    <BezentIcon name="documents" size={14} />
                    View instructions & guidelines
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
                  {formatFileSize(selectedFile.size)} •{' '}
                  {selectedFile.name.endsWith('.csv') ? 'CSV Document' : 'Excel Workbook'}
                </p>
              </Stack>

              <Badge variant="success">File Ready for Validation</Badge>

              <Inline gap="sm">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <BezentIcon name="edit" size={14} />
                  Replace File
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setLocalError(null);
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
            hidden
            accept=".xlsx, .csv"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileChange(e.target.files[0] ?? null);
              }
            }}
          />
        </Stack>
      </Card>

      {/* Fixed Bottom Action Bar (Zoho People Standard: Cancel on Left, Next on Right) */}
      <Card variant="flat" padding="sm">
        <Inline justify="between" align="center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            disabled={!selectedFile || isValidating}
            onClick={handleNext}
          >
            {isValidating ? (
              <Inline gap="xs" align="center">
                <BezentIcon name="loader" size={16} />
                <span>Validating File...</span>
              </Inline>
            ) : (
              'Next'
            )}
          </Button>
        </Inline>
      </Card>

      {/* Template Reference Guidelines Modal */}
      <Modal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
        title="BEZENT Employee Import Template Reference"
        description="Official column definitions, required fields, and supported company masters."
        size="lg"
        footer={
          <Inline justify="between" align="center">
            <Inline gap="xs">
              <Button
                variant="outline"
                size="sm"
                disabled={isDownloading}
                onClick={() => handleDownloadSample('xlsx')}
              >
                <BezentIcon name="download" size={14} />
                Download XLSX
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDownloading}
                onClick={() => handleDownloadSample('csv')}
              >
                Download CSV
              </Button>
            </Inline>
            <Button variant="primary" size="sm" onClick={() => setIsGuidelinesOpen(false)}>
              Got it
            </Button>
          </Inline>
        }
      >
        <Stack gap="lg">
          <Stack gap="xs">
            <h4 className="bezent-heading-xs">Predefined Workbook Structure</h4>
            <p className="bezent-text-secondary bezent-text-sm">
              The downloaded Excel template contains 3 dedicated sheets:
            </p>
          </Stack>

          <Table hoverable compact>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Sheet Name</TableHeaderCell>
                <TableHeaderCell>Purpose</TableHeaderCell>
                <TableHeaderCell>Details</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <strong>Employee Data</strong>
                </TableCell>
                <TableCell>Data Entry</TableCell>
                <TableCell>Enter employee records with predefined column headers.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <strong>Instructions</strong>
                </TableCell>
                <TableCell>Field Guidelines</TableCell>
                <TableCell>Descriptions, mandatory rules, and accepted formats.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <strong>Reference Data</strong>
                </TableCell>
                <TableCell>Lookup Values</TableCell>
                <TableCell>Active Departments, Designations, and Work Locations.</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Divider />

          <Stack gap="xs">
            <h4 className="bezent-heading-xs">Field Categories</h4>
            <p className="bezent-text-secondary bezent-text-sm">
              <strong>Mandatory (*):</strong> First Name, Date of Joining, Employment Type, Status.
            </p>
            <p className="bezent-text-secondary bezent-text-sm">
              <strong>Master References:</strong> Department, Designation, Work Location (must match
              active company masters).
            </p>
            <p className="bezent-text-secondary bezent-text-sm">
              <strong>Optional:</strong> Middle Name, Last Name, Personal Email, Emergency Contact,
              Address, Contract Dates.
            </p>
          </Stack>
        </Stack>
      </Modal>
    </Stack>
  );
};

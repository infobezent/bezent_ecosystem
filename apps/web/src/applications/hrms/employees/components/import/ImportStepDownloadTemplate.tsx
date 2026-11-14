import React, { useState } from 'react';
import {
  Card,
  Button,
  Stack,
  Inline,
  Grid,
  Badge,
  BezentIcon,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  Divider,
} from '../../../../../design-system';
import { downloadTemplate } from '../../api/employeeImportApi';

interface ImportStepDownloadTemplateProps {
  onContinueToUpload?: () => void;
}

interface SheetStructureRow {
  sheet: string;
  purpose: string;
  fields: string;
}

const STRUCTURE_DATA: SheetStructureRow[] = [
  {
    sheet: 'Employee Data',
    purpose: 'Enter and review workforce records',
    fields: 'All employee columns with standard headers',
  },
  {
    sheet: 'Instructions',
    purpose: 'Field descriptions and format rules',
    fields: 'Validation criteria, mandatory tags, examples',
  },
  {
    sheet: 'Reference Data',
    purpose: 'Live company lookup values',
    fields: 'Departments, Designations, Locations, Types',
  },
];

export const ImportStepDownloadTemplate: React.FC<ImportStepDownloadTemplateProps> = ({
  onContinueToUpload,
}) => {
  const [downloadingFormat, setDownloadingFormat] = useState<'xlsx' | 'csv' | null>(null);

  const handleDownload = async (format: 'xlsx' | 'csv') => {
    try {
      setDownloadingFormat(format);
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
      console.error('Template download error:', err);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <Stack gap="xl">
      {/* Step Header */}
      <Stack gap="xs">
        <h3 className="bezent-heading-md">Step 01 – Download Employee Template</h3>
        <p className="bezent-text-secondary">
          Download the official BEZENT employee import spreadsheet, fill in employee details, and
          upload it to create employee profiles in bulk.
        </p>
      </Stack>

      {/* Modern Zoho People Style Hero Card */}
      <Card variant="default" padding="lg">
        <Stack gap="lg">
          {/* Card Header */}
          <Inline justify="between" align="center" wrap>
            <Inline gap="md" align="center">
              <BezentIcon name="documents" size={32} />
              <Stack gap="none">
                <h4 className="bezent-heading-sm">Official BEZENT Employee Import Template</h4>
                <p className="bezent-text-secondary bezent-text-sm">
                  Standardized template with predefined column headers, validation rules, and live
                  company masters.
                </p>
              </Stack>
            </Inline>

            <Badge variant="success">Official Standard Template</Badge>
          </Inline>

          <Divider />

          {/* Field Breakdown Categories */}
          <Stack gap="md">
            <span className="bezent-text-sm bezent-font-semibold">Template Fields Overview:</span>

            <Grid columns={3} gap="md">
              {/* Mandatory Fields */}
              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <Inline justify="between" align="center">
                    <strong className="bezent-text-sm">Mandatory Fields</strong>
                    <Badge variant="danger">Required (*)</Badge>
                  </Inline>
                  <p className="bezent-text-secondary bezent-text-sm">
                    Must be present for every employee record:
                  </p>
                  <Inline gap="xs" wrap>
                    <Badge variant="neutral">First Name *</Badge>
                    <Badge variant="neutral">Date of Joining *</Badge>
                    <Badge variant="neutral">Employment Type *</Badge>
                    <Badge variant="neutral">Employee Status *</Badge>
                  </Inline>
                </Stack>
              </Card>

              {/* Master References */}
              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <Inline justify="between" align="center">
                    <strong className="bezent-text-sm">Company References</strong>
                    <Badge variant="info">Master Data</Badge>
                  </Inline>
                  <p className="bezent-text-secondary bezent-text-sm">
                    Validated against live company settings:
                  </p>
                  <Inline gap="xs" wrap>
                    <Badge variant="neutral">Department</Badge>
                    <Badge variant="neutral">Designation</Badge>
                    <Badge variant="neutral">Work Location</Badge>
                    <Badge variant="neutral">Reporting Manager ID</Badge>
                  </Inline>
                </Stack>
              </Card>

              {/* Optional Extended Fields */}
              <Card variant="flat" padding="md">
                <Stack gap="xs">
                  <Inline justify="between" align="center">
                    <strong className="bezent-text-sm">Optional Sections</strong>
                    <Badge variant="neutral">Leave Blank if Empty</Badge>
                  </Inline>
                  <p className="bezent-text-secondary bezent-text-sm">
                    Fill if available or leave empty:
                  </p>
                  <Inline gap="xs" wrap>
                    <Badge variant="neutral">Middle & Last Name</Badge>
                    <Badge variant="neutral">Personal Contacts</Badge>
                    <Badge variant="neutral">Address & City</Badge>
                    <Badge variant="neutral">Emergency Contacts</Badge>
                    <Badge variant="neutral">Job Level & Skills</Badge>
                  </Inline>
                </Stack>
              </Card>
            </Grid>
          </Stack>

          <Divider />

          {/* Download Action Strip */}
          <Inline justify="between" align="center" wrap>
            <Inline gap="sm" align="center">
              <Button
                variant="primary"
                size="md"
                disabled={downloadingFormat !== null}
                onClick={() => handleDownload('xlsx')}
              >
                <BezentIcon name="download" size={16} />
                {downloadingFormat === 'xlsx'
                  ? 'Downloading Excel...'
                  : 'Download Template (Excel XLSX)'}
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={downloadingFormat !== null}
                onClick={() => handleDownload('csv')}
              >
                <BezentIcon name="download" size={16} />
                {downloadingFormat === 'csv' ? 'Downloading CSV...' : 'Download CSV Template'}
              </Button>
            </Inline>

            <span className="bezent-text-secondary bezent-text-sm">
              Works with Microsoft Excel, Google Sheets, LibreOffice, and Apple Numbers.
            </span>
          </Inline>
        </Stack>
      </Card>

      {/* Two Column Layout: Guidelines & Structure */}
      <Grid columns={2} gap="lg">
        {/* Important Guidelines */}
        <Card variant="flat" padding="lg">
          <Stack gap="md">
            <Inline gap="sm" align="center">
              <BezentIcon name="tasks" size={20} />
              <h4 className="bezent-heading-sm">Essential Import Guidelines</h4>
            </Inline>

            <Stack gap="sm" className="bezent-text-sm">
              <p>
                <strong>1. Do not rename or remove column headers:</strong> BEZENT relies on
                predefined headers in row 1 for instant matching without manual field mapping.
              </p>
              <p>
                <strong>2. Enter one employee per row:</strong> Add employee records starting from
                row 2 onwards. Avoid empty gap rows.
              </p>
              <p>
                <strong>3. Date format:</strong> All date columns (Joining Date, Birth Date,
                Confirmation Date) must strictly follow <code>YYYY-MM-DD</code> (e.g.{' '}
                <code>2026-01-15</code>).
              </p>
              <p>
                <strong>4. Optional columns can be left blank:</strong> If information is
                unavailable, leave the cell empty. BEZENT will safely skip empty optional fields.
              </p>
              <p>
                <strong>5. Master data matching:</strong> Department, Designation, and Work Location
                must match your active company records or will be flagged during validation.
              </p>
            </Stack>
          </Stack>
        </Card>

        {/* Structure Breakdown */}
        <Card variant="flat" padding="lg">
          <Stack gap="md">
            <Inline gap="sm" align="center">
              <BezentIcon name="organization" size={20} />
              <h4 className="bezent-heading-sm">Workbook Structure</h4>
            </Inline>

            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Sheet Name</TableHeaderCell>
                  <TableHeaderCell>Purpose</TableHeaderCell>
                  <TableHeaderCell>Contents</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {STRUCTURE_DATA.map((row) => (
                  <TableRow key={row.sheet}>
                    <TableCell>
                      <strong>{row.sheet}</strong>
                    </TableCell>
                    <TableCell>{row.purpose}</TableCell>
                    <TableCell>{row.fields}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <p className="bezent-text-secondary bezent-text-sm">
              Note: Do not delete or rename the <em>Instructions</em> or <em>Reference Data</em>{' '}
              sheets inside the workbook.
            </p>
          </Stack>
        </Card>
      </Grid>

      {/* Bottom Navigation */}
      {onContinueToUpload && (
        <Inline justify="end">
          <Button variant="primary" size="lg" onClick={onContinueToUpload}>
            Next: Upload Employee File
            <BezentIcon name="chevron-right" size={18} />
          </Button>
        </Inline>
      )}
    </Stack>
  );
};

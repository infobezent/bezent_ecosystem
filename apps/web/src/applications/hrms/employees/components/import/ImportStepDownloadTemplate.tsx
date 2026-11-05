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
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  const handleDownload = async (type: 'basic' | 'complete', format: 'xlsx' | 'csv') => {
    try {
      setDownloadingType(`${type}-${format}`);
      const blob = await downloadTemplate(type, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bezent-employee-template-${type}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download error:', err);
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <Stack gap="xl">
      <Stack gap="xs">
        <h3 className="bezent-heading-md">Step 01 – Download Employee Template</h3>
        <p className="bezent-text-secondary">
          Get the official BEZENT employee import template, fill in employee details, and upload it
          to create employee profiles in bulk.
        </p>
      </Stack>

      {/* Template Cards */}
      <Grid columns={2} gap="lg">
        {/* Basic Template Card */}
        <Card variant="default" padding="lg">
          <Stack gap="md">
            <Inline justify="between" align="center">
              <Inline gap="sm" align="center">
                <BezentIcon name="file" size={24} />
                <h4 className="bezent-heading-sm">Basic Employee Template</h4>
              </Inline>
              <Badge variant="success">Recommended for Quick Import</Badge>
            </Inline>

            <p className="bezent-text-secondary">
              Essential employee information for fast bulk workforce creation with core identity,
              department, and joining date details.
            </p>

            <Stack gap="xs">
              <span className="bezent-text-muted bezent-font-semibold">Included Fields:</span>
              <Inline gap="xs" wrap>
                <Badge variant="neutral">Employee ID</Badge>
                <Badge variant="neutral">First Name</Badge>
                <Badge variant="neutral">Middle Name</Badge>
                <Badge variant="neutral">Last Name</Badge>
                <Badge variant="neutral">Work Email</Badge>
                <Badge variant="neutral">Phone Number</Badge>
                <Badge variant="neutral">Department</Badge>
                <Badge variant="neutral">Designation</Badge>
                <Badge variant="neutral">Work Location</Badge>
                <Badge variant="neutral">Date of Joining</Badge>
                <Badge variant="neutral">Employment Type</Badge>
              </Inline>
            </Stack>

            <Inline gap="sm">
              <Button
                variant="primary"
                disabled={downloadingType !== null}
                onClick={() => handleDownload('basic', 'xlsx')}
              >
                <BezentIcon name="download" size={16} />
                {downloadingType === 'basic-xlsx' ? 'Downloading...' : 'Download Basic (XLSX)'}
              </Button>
              <Button
                variant="secondary"
                disabled={downloadingType !== null}
                onClick={() => handleDownload('basic', 'csv')}
              >
                <BezentIcon name="download" size={16} />
                {downloadingType === 'basic-csv' ? 'Downloading...' : 'Download CSV'}
              </Button>
            </Inline>
          </Stack>
        </Card>

        {/* Complete Template Card */}
        <Card variant="default" padding="lg">
          <Stack gap="md">
            <Inline justify="between" align="center">
              <Inline gap="sm" align="center">
                <BezentIcon name="folder" size={24} />
                <h4 className="bezent-heading-sm">Complete Employee Template</h4>
              </Inline>
              <Badge variant="info">Comprehensive</Badge>
            </Inline>

            <p className="bezent-text-secondary">
              Full lifecycle workforce template supporting employment terms, personal contacts,
              emergency contacts, probation and additional custom HR attributes.
            </p>

            <Stack gap="xs">
              <span className="bezent-text-muted bezent-font-semibold">Included Sections:</span>
              <Inline gap="xs" wrap>
                <Badge variant="neutral">Basic Information</Badge>
                <Badge variant="neutral">Employment & Dates</Badge>
                <Badge variant="neutral">Address & Residence</Badge>
                <Badge variant="neutral">Emergency Contacts</Badge>
                <Badge variant="neutral">Job Level & Skills</Badge>
              </Inline>
            </Stack>

            <Inline gap="sm">
              <Button
                variant="primary"
                disabled={downloadingType !== null}
                onClick={() => handleDownload('complete', 'xlsx')}
              >
                <BezentIcon name="download" size={16} />
                {downloadingType === 'complete-xlsx'
                  ? 'Downloading...'
                  : 'Download Complete (XLSX)'}
              </Button>
              <Button
                variant="secondary"
                disabled={downloadingType !== null}
                onClick={() => handleDownload('complete', 'csv')}
              >
                <BezentIcon name="download" size={16} />
                {downloadingType === 'complete-csv' ? 'Downloading...' : 'Download CSV'}
              </Button>
            </Inline>
          </Stack>
        </Card>
      </Grid>

      {/* Template Instructions & Rules */}
      <Card variant="flat" padding="lg">
        <Stack gap="md">
          <h4 className="bezent-heading-sm">Before Filling the Template:</h4>
          <Grid columns={2} gap="md">
            <Stack gap="xs">
              <p>
                <strong>1. Do not rename or remove column headers:</strong> BEZENT relies on
                predefined headers for instant matching without manual mapping.
              </p>
              <p>
                <strong>2. Enter one employee per row:</strong> Each row represents a single
                independent employee record.
              </p>
              <p>
                <strong>3. Follow the specified date format:</strong> Dates must strictly adhere to{' '}
                <code>YYYY-MM-DD</code> (e.g. 2026-01-15).
              </p>
            </Stack>
            <Stack gap="xs">
              <p>
                <strong>4. Use valid master names:</strong> Department, Designation, and Work
                Location must match the Reference Data sheet.
              </p>
              <p>
                <strong>5. Leave optional fields blank:</strong> If information is unavailable or
                employee ID is auto-generated, leave cell empty.
              </p>
              <p>
                <strong>6. Preserve reference sheets:</strong> Do not modify or delete the
                Instructions or Reference Data sheets.
              </p>
            </Stack>
          </Grid>
        </Stack>
      </Card>

      {/* Structure Table */}
      <Stack gap="sm">
        <h4 className="bezent-heading-sm">Template Workbook Structure</h4>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Sheet Name</TableHeaderCell>
              <TableHeaderCell>Purpose</TableHeaderCell>
              <TableHeaderCell>Contents / Rules</TableHeaderCell>
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
      </Stack>

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

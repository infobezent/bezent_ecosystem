import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AttendanceImportModal } from '../components/import/AttendanceImportModal';
import { downloadPunchTemplate, validatePunchImportFile } from '../api/attendanceImportApi';

describe('HRMS Attendance — Bulk Punch Import Suite', () => {
  it('renders AttendanceImportModal when open without crashing', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AttendanceImportModal isOpen={true} onClose={() => {}} />
      </MemoryRouter>,
    );

    expect(html).toContain('Import Attendance Punches');
    expect(html).toContain('Download sample punch CSV template');
    expect(html).toContain('Validate &amp; Preview');
  });

  it('generates a valid CSV sample template Blob with required columns', async () => {
    const blob = downloadPunchTemplate();
    expect(blob).toBeDefined();
    expect(blob.type).toContain('text/csv');

    const text = await blob.text();
    expect(text).toContain('employee_id,punch_time,punch_type');
    expect(text).toContain('EMP-0001,2026-11-16 09:00:00,IN');
    expect(text).toContain('EMP-0001,2026-11-16 18:00:00,OUT');
  });

  it('correctly validates well-formed CSV punch data', async () => {
    const validCsv = `employee_id,punch_time,punch_type
EMP-0001,2026-11-14 09:00:00,IN
EMP-0001,2026-11-14 18:00:00,OUT
EMP-0002,2026-11-14 09:30:00,IN`;

    const file = new File([validCsv], 'test-punches.csv', { type: 'text/csv' });
    const summary = await validatePunchImportFile(file);

    expect(summary.totalRecords).toBe(3);
    expect(summary.validRecords).toBe(3);
    expect(summary.errorRecords).toBe(0);
    expect(summary.duplicateRecords).toBe(0);
    expect(summary.rows[0]?.employeeId).toBe('EMP-0001');
    expect(summary.rows[0]?.punchType).toBe('in');
  });

  it('flags invalid timestamps and missing employee IDs as errors', async () => {
    const invalidCsv = `employee_id,punch_time,punch_type
,2026-11-16 09:00:00,IN
EMP-0002,invalid-date,IN
EMP-0003,2026-11-16 09:30:00,INVALID_TYPE`;

    const file = new File([invalidCsv], 'invalid-punches.csv', { type: 'text/csv' });
    const summary = await validatePunchImportFile(file);

    expect(summary.totalRecords).toBe(3);
    expect(summary.validRecords).toBe(0);
    expect(summary.errorRecords).toBe(3);
    expect(summary.rows[0]?.issues).toContain('Missing employee ID');
    expect(summary.rows[1]?.issues.some((i) => i.includes('Invalid timestamp'))).toBe(true);
    expect(summary.rows[2]?.issues.some((i) => i.includes('Invalid punch type'))).toBe(true);
  });
});

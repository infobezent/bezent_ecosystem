import { appConfig } from '../../../../app/config/env';
import { authorizedFetch } from '../../../../platform/auth';

export interface PunchImportRowItem {
  rowNumber: number;
  employeeId: string;
  punchTime: string;
  punchType: 'in' | 'out';
  status: 'valid' | 'error' | 'duplicate';
  issues: string[];
}

export interface PunchValidationSummary {
  fileName: string;
  fileSize: number;
  totalRecords: number;
  validRecords: number;
  errorRecords: number;
  duplicateRecords: number;
  rows: PunchImportRowItem[];
}

export interface ProcessPunchImportResult {
  batchId: string;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errorRecords: number;
  status: 'completed' | 'completed_with_errors' | 'failed';
  message: string;
  errorLog?: Array<{ row: number; reason: string }>;
}

export class AttendanceImportApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'AttendanceImportApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Download sample CSV punch template pre-formatted with valid columns and example rows.
 */
export function downloadPunchTemplate(): Blob {
  const csvContent = [
    'employee_id,punch_time,punch_type',
    'EMP-0001,2026-11-16 09:00:00,IN',
    'EMP-0001,2026-11-16 13:00:00,OUT',
    'EMP-0001,2026-11-16 14:00:00,IN',
    'EMP-0001,2026-11-16 18:00:00,OUT',
    'EMP-0002,2026-11-16 09:15:00,IN',
    'EMP-0002,2026-11-16 18:30:00,OUT',
    'EMP-0003,2026-11-16 08:50:00,IN',
    'EMP-0003,2026-11-16 17:45:00,OUT',
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Parses raw CSV text into an array of object key-value records.
 */
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = (lines[0] || '').split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const records: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    if (!currentLine) continue;
    // Simple comma split handling basic quoted commas
    const values = currentLine.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    records.push(record);
  }

  return records;
}

const FIELD_ALIASES = {
  employeeId: ['employeeId', 'employee_id', 'employeeNumber', 'employee_number', 'empId', 'emp_id'],
  timestamp: ['timestamp', 'date', 'punchTime', 'punch_time', 'datetime', 'time'],
  punchType: ['punchType', 'punch_type', 'type', 'direction', 'mode'],
};

function extractField(row: Record<string, string>, field: keyof typeof FIELD_ALIASES): string {
  const aliases = FIELD_ALIASES[field];
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias].trim() !== '') {
      return row[alias].trim();
    }
  }
  // Case-insensitive fallback
  const lowerRow: Record<string, string> = {};
  for (const key of Object.keys(row)) {
    lowerRow[key.toLowerCase()] = row[key] ?? '';
  }
  for (const alias of aliases) {
    const val = lowerRow[alias.toLowerCase()];
    if (val !== undefined && val.trim() !== '') {
      return val.trim();
    }
  }
  return '';
}

function parsePunchTimestamp(value: string): Date | null {
  const plain = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(value);
  const parsed = plain
    ? new Date(`${plain[1]}T${plain[2]}${plain[3] ?? ':00'}Z`)
    : /(Z|[+-]\d{2}:?\d{2})$/.test(value)
      ? new Date(value)
      : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function normalizePunchDirection(value: string): 'in' | 'out' | null {
  const v = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (['in', 'check_in', 'checkin', 'i', 'entry'].includes(v)) return 'in';
  if (['out', 'check_out', 'checkout', 'o', 'exit'].includes(v)) return 'out';
  return null;
}

/**
 * Validate punch import file on client side before uploading to backend.
 */
export async function validatePunchImportFile(file: File): Promise<PunchValidationSummary> {
  const text = await file.text();
  const rawRows = parseCsv(text);

  if (rawRows.length === 0) {
    throw new AttendanceImportApiError(
      'The uploaded CSV file is empty or missing headers.',
      400,
      'EMPTY_FILE',
    );
  }

  const seenPunches = new Set<string>();
  const rows: PunchImportRowItem[] = [];
  let validRecords = 0;
  let errorRecords = 0;
  let duplicateRecords = 0;

  const now = Date.now() + 5 * 60 * 1000; // 5 min future tolerance

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 1;
    const issues: string[] = [];

    const empId = extractField(raw, 'employeeId');
    const timeStr = extractField(raw, 'timestamp');
    const typeStr = extractField(raw, 'punchType');

    if (!empId) {
      issues.push('Missing employee ID');
    }

    if (!timeStr) {
      issues.push('Missing punch timestamp');
    }

    const parsedDate = timeStr ? parsePunchTimestamp(timeStr) : null;
    if (timeStr && !parsedDate) {
      issues.push(`Invalid timestamp '${timeStr}'. Use YYYY-MM-DD HH:mm:ss`);
    } else if (parsedDate && parsedDate.getTime() > now) {
      issues.push('Punch timestamp is in the future');
    }

    const punchType = typeStr ? normalizePunchDirection(typeStr) : null;
    if (typeStr && !punchType) {
      issues.push(`Invalid punch type '${typeStr}'. Use IN or OUT`);
    } else if (!typeStr) {
      issues.push('Missing punch direction (IN or OUT)');
    }

    let status: 'valid' | 'error' | 'duplicate' = 'valid';

    if (issues.length > 0) {
      status = 'error';
      errorRecords++;
    } else if (empId && timeStr && punchType) {
      const punchKey = `${empId.toUpperCase()}_${timeStr}_${punchType}`;
      if (seenPunches.has(punchKey)) {
        status = 'duplicate';
        issues.push('Duplicate punch record within the same file');
        duplicateRecords++;
      } else {
        seenPunches.add(punchKey);
        validRecords++;
      }
    }

    rows.push({
      rowNumber,
      employeeId: empId,
      punchTime: timeStr,
      punchType: punchType ?? 'in',
      status,
      issues,
    });
  });

  return {
    fileName: file.name,
    fileSize: file.size,
    totalRecords: rawRows.length,
    validRecords,
    errorRecords,
    duplicateRecords,
    rows,
  };
}

/**
 * Submit validated punch rows to backend attendance import API.
 */
export async function processPunchImport(
  fileName: string,
  rows: PunchImportRowItem[],
): Promise<ProcessPunchImportResult> {
  const payloadRows = rows
    .filter((r) => r.status === 'valid')
    .map((r) => ({
      employeeId: r.employeeId,
      timestamp: r.punchTime,
      punchType: r.punchType,
    }));

  if (payloadRows.length === 0) {
    throw new AttendanceImportApiError(
      'There are no valid punch rows to import.',
      400,
      'NO_VALID_ROWS',
    );
  }

  const res = await authorizedFetch(`${appConfig.apiBaseUrl}/hrms/attendance/settings/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batchType: 'raw_punches',
      fileName,
      rows: payloadRows,
    }),
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const errorMsg =
      (body as { message?: string; error?: { message?: string } })?.message ||
      (body as { message?: string; error?: { message?: string } })?.error?.message ||
      `Import failed with status ${res.status}`;
    throw new AttendanceImportApiError(errorMsg, res.status, 'IMPORT_FAILED');
  }

  const batch = (
    body as {
      data: {
        id: string;
        totalRows: number;
        successRows: number;
        failedRows: number;
        duplicateRows: number;
        status: string;
        errorLog?: Array<{ row: number; reason: string }>;
      };
    }
  ).data;

  return {
    batchId: batch.id,
    totalRecords: batch.totalRows,
    importedRecords: batch.successRows,
    skippedRecords: batch.duplicateRows,
    errorRecords: batch.failedRows,
    status:
      batch.failedRows === 0
        ? 'completed'
        : batch.successRows > 0
          ? 'completed_with_errors'
          : 'failed',
    message: `Import processed: ${batch.successRows} punches created successfully.`,
    errorLog: batch.errorLog,
  };
}

/**
 * Download CSV error report for rows that failed during validation or processing.
 */
export function downloadPunchErrorReport(
  rows: Array<{ rowNumber: number; employeeId: string; punchTime: string; issues: string[] }>,
): Blob {
  const header = 'Row,Employee ID,Timestamp,Error Reasons\n';
  const csvBody = rows
    .map(
      (r) =>
        `${r.rowNumber},"${r.employeeId}","${r.punchTime}","${r.issues.join('; ').replace(/"/g, '""')}"`,
    )
    .join('\n');

  return new Blob([header + csvBody], { type: 'text/csv;charset=utf-8;' });
}

import { BadRequestError, ConflictError, NotFoundError } from '../../../../app/errors/AppError.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import type { AttendanceImportBatch } from '../../../../db/schema.js';
import {
  attendanceRepository,
  type AttendanceRepository,
} from '../repository/attendance.repository.js';
import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';
import { attendanceService, type AttendanceService } from './attendance.service.js';

/**
 * Bulk punch import (HR Settings -> Attendance -> Capture & Devices).
 *
 * Every accepted row becomes a real raw punch (`source = 'import'`, tagged with
 * the batch id in `deviceMetadata`). Daily attendance is then derived through
 * the same recalculation used by the Daily Log, but only for employee-days that
 * have no daily record yet, so an import never overwrites existing or corrected
 * attendance. Reversing a batch removes exactly the punches and the daily
 * records that the batch created.
 *
 * Timestamps without an explicit zone are read as UTC, the same convention the
 * punch/daily-log engine uses today.
 */

export const MAX_IMPORT_ROWS = 5000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export type ImportColumnMapping = Record<string, string>;

export interface BulkImportInput {
  batchType: 'raw_punches' | 'historical_summary';
  fileName: string;
  rows: Array<Record<string, unknown>>;
  columnMapping?: ImportColumnMapping;
}

const FIELD_ALIASES = {
  employeeId: ['employeeId', 'employee_id', 'employeeNumber', 'employee_number', 'empId'],
  timestamp: ['timestamp', 'date', 'punchTime', 'punch_time', 'datetime'],
  punchType: ['punchType', 'punch_type', 'type', 'direction'],
} as const;

type FieldName = keyof typeof FIELD_ALIASES;

export function readImportField(
  row: Record<string, unknown>,
  field: FieldName,
  mapping?: ImportColumnMapping,
): string {
  const keys = [...(mapping?.[field] ? [mapping[field]!] : []), ...FIELD_ALIASES[field]];
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

/** `YYYY-MM-DD HH:mm[:ss]` (no zone) is read as UTC; ISO strings with a zone are honoured. */
export function parseImportTimestamp(value: string): Date | null {
  const plain = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(value);
  const parsed = plain
    ? new Date(`${plain[1]}T${plain[2]}${plain[3] ?? ':00'}Z`)
    : /(Z|[+-]\d{2}:?\d{2})$/.test(value)
      ? new Date(value)
      : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

export function normalizePunchType(value: string): 'in' | 'out' | null {
  const v = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (['in', 'check_in', 'checkin', 'i', 'entry'].includes(v)) return 'in';
  if (['out', 'check_out', 'checkout', 'o', 'exit'].includes(v)) return 'out';
  return null;
}

interface AcceptedPunch {
  rowNumber: number;
  employeeId: string;
  punchTime: Date;
  punchType: 'in' | 'out';
  workday: string;
}

export class AttendanceImportService {
  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
    private readonly attendanceRepo: AttendanceRepository = attendanceRepository,
    private readonly attendance: AttendanceService = attendanceService,
  ) {}

  async processBulkImport(
    tenantId: string,
    companyId: string,
    data: BulkImportInput,
    userId?: string,
  ): Promise<AttendanceImportBatch> {
    if (data.batchType !== 'raw_punches') {
      throw new BadRequestError(
        'Only raw punch imports are supported. Historical daily summary import is not available yet.',
      );
    }
    if (data.rows.length === 0) {
      throw new BadRequestError('The import contains no data rows.');
    }
    if (data.rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestError(`An import can contain at most ${MAX_IMPORT_ROWS} rows.`);
    }

    const batch = await this.settingsRepo.createImportBatch(tenantId, companyId, {
      batchType: data.batchType,
      fileName: data.fileName,
      totalRows: data.rows.length,
      successRows: 0,
      failedRows: 0,
      duplicateRows: 0,
      status: 'processing',
      importedByUserId: userId,
      columnMapping: data.columnMapping,
    });

    const errorLog: Array<{ row: number; reason: string }> = [];
    let duplicateRows = 0;

    // 1. Parse and validate each row on its own.
    const parsed: Array<{
      rowNumber: number;
      identifier: string;
      punchTime: Date;
      punchType: 'in' | 'out';
    }> = [];
    const now = Date.now();
    data.rows.forEach((row, index) => {
      const rowNumber = index + 1;
      const identifier = readImportField(row, 'employeeId', data.columnMapping);
      const rawTime = readImportField(row, 'timestamp', data.columnMapping);
      const rawType = readImportField(row, 'punchType', data.columnMapping);
      if (!identifier)
        return void errorLog.push({ row: rowNumber, reason: 'Missing employee identifier' });
      if (!rawTime)
        return void errorLog.push({ row: rowNumber, reason: 'Missing date or timestamp' });
      const punchTime = parseImportTimestamp(rawTime);
      if (!punchTime) {
        return void errorLog.push({
          row: rowNumber,
          reason: `Invalid timestamp '${rawTime}' (use YYYY-MM-DD HH:mm:ss)`,
        });
      }
      if (punchTime.getTime() > now + FUTURE_TOLERANCE_MS) {
        return void errorLog.push({ row: rowNumber, reason: 'Timestamp is in the future' });
      }
      const punchType = normalizePunchType(rawType);
      if (!punchType) {
        return void errorLog.push({
          row: rowNumber,
          reason: `Missing or invalid punch type '${rawType}' (use in or out)`,
        });
      }
      parsed.push({ rowNumber, identifier, punchTime, punchType });
    });

    // 2. Resolve employees, locked periods and duplicates.
    const employeeByIdentifier = await this.attendanceRepo.findEmployeesByIdentifiers(
      tenantId,
      companyId,
      [...new Set(parsed.map((p) => p.identifier))],
    );
    const lockedByDate = new Map<string, boolean>();
    const accepted: AcceptedPunch[] = [];
    for (const p of parsed) {
      const employeeId = employeeByIdentifier.get(p.identifier);
      if (!employeeId) {
        errorLog.push({ row: p.rowNumber, reason: `Unknown employee '${p.identifier}'` });
        continue;
      }
      const workday = p.punchTime.toISOString().slice(0, 10);
      if (!lockedByDate.has(workday)) {
        lockedByDate.set(
          workday,
          await this.attendanceRepo.checkDateInLockedPeriod(tenantId, companyId, workday, workday),
        );
      }
      if (lockedByDate.get(workday)) {
        errorLog.push({ row: p.rowNumber, reason: `${workday} is in a locked payroll period` });
        continue;
      }
      accepted.push({
        rowNumber: p.rowNumber,
        employeeId,
        punchTime: p.punchTime,
        punchType: p.punchType,
        workday,
      });
    }

    const seen = new Set<string>();
    const unique: AcceptedPunch[] = [];
    if (accepted.length > 0) {
      const times = accepted.map((a) => a.punchTime.getTime());
      const existing = await this.attendanceRepo.findExistingPunchKeys(
        tenantId,
        companyId,
        [...new Set(accepted.map((a) => a.employeeId))],
        new Date(Math.min(...times)),
        new Date(Math.max(...times)),
      );
      for (const a of accepted) {
        const key = `${a.employeeId}|${a.punchTime.getTime()}|${a.punchType}`;
        if (seen.has(key) || existing.has(key)) {
          duplicateRows++;
          continue;
        }
        seen.add(key);
        unique.push(a);
      }
    }

    // 3. Store the raw punches.
    await this.attendanceRepo.insertPunches(
      unique.map((a) => ({
        id: generateSurrogateId('punch'),
        tenantId,
        companyId,
        employeeId: a.employeeId,
        punchTime: a.punchTime,
        workday: a.workday,
        punchType: a.punchType,
        source: 'import' as const,
        deviceMetadata: { importBatchId: batch.id, importRow: a.rowNumber },
        workLocation: 'office',
        notes: `Imported from ${data.fileName}`.slice(0, 500),
        isDuplicate: false,
        validationStatus: 'valid' as const,
        processingState: 'processed' as const,
      })),
    );

    // 4. Derive daily attendance for employee-days that have none yet.
    const derivedDays = await this.deriveNewDailyRecords(
      tenantId,
      companyId,
      batch.id,
      unique,
      userId ?? 'system',
      errorLog,
    );

    const failedRows = data.rows.length - unique.length - duplicateRows;
    const finalized = await this.settingsRepo.finalizeImportBatch(tenantId, companyId, batch.id, {
      status: unique.length === 0 && duplicateRows === 0 ? 'failed' : 'completed',
      successRows: unique.length,
      failedRows,
      duplicateRows,
      errorLog: errorLog.length > 0 ? errorLog.slice(0, 200) : undefined,
    });

    await this.settingsRepo.recordAuditLog(tenantId, companyId, {
      category: 'capture_device',
      action: 'import_batch_processed',
      entityId: batch.id,
      entityType: 'attendance_import_batches',
      newValues: {
        total: data.rows.length,
        success: unique.length,
        failed: failedRows,
        duplicates: duplicateRows,
        derivedDays,
      },
      changedByUserId: userId,
    });

    return finalized;
  }

  async rollbackImportBatch(
    tenantId: string,
    companyId: string,
    batchId: string,
    userId?: string,
  ): Promise<void> {
    const batch = await this.settingsRepo.getImportBatch(tenantId, companyId, batchId);
    if (!batch) throw new NotFoundError(`Import batch ${batchId} not found`);
    if (batch.status === 'reversed')
      throw new ConflictError('This import batch is already reversed');
    if (batch.status !== 'completed') {
      throw new BadRequestError(
        `Only completed import batches can be reversed (status: ${batch.status})`,
      );
    }

    const days = await this.attendanceRepo.listPunchDaysByImportBatch(tenantId, companyId, batchId);
    for (const workday of new Set(days.map((d) => d.workday))) {
      if (
        await this.attendanceRepo.checkDateInLockedPeriod(tenantId, companyId, workday, workday)
      ) {
        throw new BadRequestError(
          `Cannot reverse this batch: ${workday} is now in a locked payroll period.`,
        );
      }
    }

    await this.attendanceRepo.deleteDailyRecordsByImportBatch(tenantId, companyId, batchId);
    await this.attendanceRepo.deletePunchesByImportBatch(tenantId, companyId, batchId);
    await this.settingsRepo.updateImportBatchStatus(tenantId, companyId, batchId, 'reversed');
    await this.settingsRepo.recordAuditLog(tenantId, companyId, {
      category: 'capture_device',
      action: 'import_batch_reversed',
      entityId: batchId,
      entityType: 'attendance_import_batches',
      changedByUserId: userId,
    });
  }

  private async deriveNewDailyRecords(
    tenantId: string,
    companyId: string,
    batchId: string,
    punches: AcceptedPunch[],
    actorUserId: string,
    errorLog: Array<{ row: number; reason: string }>,
  ): Promise<number> {
    const employeesByDay = new Map<string, Set<string>>();
    for (const p of punches) {
      const set = employeesByDay.get(p.workday) ?? new Set<string>();
      set.add(p.employeeId);
      employeesByDay.set(p.workday, set);
    }

    let derived = 0;
    for (const [workday, employeeIds] of employeesByDay) {
      const needDerivation: string[] = [];
      for (const employeeId of employeeIds) {
        const existing = await this.attendanceRepo.getTodayAttendance(
          tenantId,
          companyId,
          employeeId,
          workday,
        );
        if (!existing) needDerivation.push(employeeId);
      }
      if (needDerivation.length === 0) continue;

      const result = await this.attendance.recalculateEmployeeAttendance(
        tenantId,
        companyId,
        needDerivation,
        workday,
        actorUserId,
      );
      for (const failure of result.failures) {
        errorLog.push({
          row: 0,
          reason: `Daily record not derived for ${failure.employeeId} on ${workday}: ${failure.error}`,
        });
      }
      for (const employeeId of needDerivation) {
        const record = await this.attendanceRepo.getTodayAttendance(
          tenantId,
          companyId,
          employeeId,
          workday,
        );
        if (!record) continue;
        await this.attendanceRepo.updateDailyAttendance(record.id, {
          calculationMetadata: { ...(record.calculationMetadata ?? {}), importBatchId: batchId },
        });
        derived++;
      }
    }
    return derived;
  }
}

export const attendanceImportService = new AttendanceImportService();

import { randomUUID } from 'crypto';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../../app/errors/AppError.js';
import {
  REPORT_LIST,
  getReportDefinition,
} from './attendanceReportRegistry.js';
import {
  attendanceReportsRepository,
  AttendanceReportsRepository,
} from '../repository/attendanceReports.repository.js';
import {
  generateCsvExport,
  generateExcelExport,
  generatePdfExport,
} from './attendanceReportExporter.js';
import type {
  ReportDefinition,
  ReportId,
  ReportPreviewResult,
  ReportQueryOptions,
  ReportExportInput,
  ReportExportResult,
  ReportAnalyticsResult,
  CreateSavedReportInput,
  UpdateSavedReportInput,
  SavedReportConfiguration,
  ReportGenerationHistoryItem,
} from '../types/attendanceReports.types.js';
import { buildReportAnalytics } from './attendanceReportAnalytics.service.js';
import type { AuthenticatedUser } from '../../../../platform/auth/types/auth.types.js';
import type { CompanyAccess } from '../../../../platform/access/types/access.types.js';
import { getDb } from '../../../../db/connection.js';
import { auditLogs } from '../../../../db/schema.js';

export class AttendanceReportsService {
  constructor(
    private readonly repo: AttendanceReportsRepository = attendanceReportsRepository,
  ) {}

  // ════════════════════════════════════════════════════════════════════════
  // 1. CATALOG & DEFINITIONS
  // ════════════════════════════════════════════════════════════════════════

  getCatalog(access?: CompanyAccess): ReportDefinition[] {
    const held = access?.permissions ?? [];
    return REPORT_LIST.map((def) => {
      // For R15, mark whether user holds the specific audit permission
      const isPermitted = def.id === 'R15'
        ? held.includes('hrms.attendance.audit') || held.includes('hrms.attendance.audit.view')
        : true; // other reports covered by standard attendance read/view
      return {
        ...def,
        isPermitted,
      } as ReportDefinition;
    });
  }

  getDefinition(reportId: string): ReportDefinition {
    const def = getReportDefinition(reportId);
    if (!def) {
      throw new NotFoundError(`Attendance report '${reportId}' not found in registry`);
    }
    return def;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. AUTHORIZATION & SCOPING
  // ════════════════════════════════════════════════════════════════════════

  private checkReportAuthorization(def: ReportDefinition, access?: CompanyAccess) {
    if (!access) return; // In test environments or when bypassed
    const held = access.permissions;

    if (def.id === 'R15') {
      const canViewAudit =
        held.includes('hrms.attendance.audit') ||
        held.includes('hrms.attendance.audit.view') ||
        held.includes('hrms.attendance.audit.read');
      if (!canViewAudit) {
        throw new ForbiddenError(
          `Permission '${def.requiredPermission}' is required to access sensitive attendance audit reports`,
          'FORBIDDEN_AUDIT_REPORT',
        );
      }
    } else {
      const canView =
        held.includes('hrms.attendance.view') ||
        held.includes('hrms.attendance.read') ||
        held.includes('hrms.attendance.reports') ||
        held.includes('hrms.attendance.reports.view');
      if (!canView) {
        throw new ForbiddenError(
          `Permission '${def.requiredPermission}' is required to generate this report`,
          'FORBIDDEN_REPORT',
        );
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3. EXECUTION & PREVIEW
  // ════════════════════════════════════════════════════════════════════════

  async previewReport(
    tenantId: string,
    companyId: string,
    reportId: string,
    options: ReportQueryOptions,
    actorUser?: AuthenticatedUser,
    access?: CompanyAccess,
  ): Promise<ReportPreviewResult> {
    const def = this.getDefinition(reportId);
    this.checkReportAuthorization(def, access);

    // Validate required filters
    for (const filterDef of def.allowedFilters) {
      if (filterDef.required && !options.filters[filterDef.id]) {
        throw new BadRequestError(`Filter '${filterDef.label}' (${filterDef.id}) is required`);
      }
    }

    // Resolve Organizational Scoping
    let scopedEmployeeIds: string[] | undefined = undefined;
    if (access?.employeeId && !access.permissions.includes('hrms.attendance.view')) {
      // Restricted to own employee record
      scopedEmployeeIds = [access.employeeId];
    }

    // Query Data based on Report ID
    let rawRows: Record<string, unknown>[] = [];
    switch (def.id) {
      case 'R01':
        rawRows = await this.repo.queryR01DailyAttendance(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R02':
        rawRows = await this.repo.queryR02MonthlyAttendance(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R03':
        rawRows = await this.repo.queryR03AttendanceTrend(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R04':
        rawRows = await this.repo.queryR04WorkingHours(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R05':
        rawRows = await this.repo.queryR05LateAndEarlyExit(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R06':
        rawRows = await this.repo.queryR06Overtime(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R07':
        rawRows = await this.repo.queryR07Absenteeism(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R08':
        rawRows = await this.repo.queryR08LeaveImpact(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R09':
        rawRows = await this.repo.queryR09MissingPunch(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R10':
        rawRows = await this.repo.queryR10AttendanceExceptions(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R11':
        rawRows = await this.repo.queryR11Regularization(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R12':
        rawRows = await this.repo.queryR12OnDuty(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R13':
        rawRows = await this.repo.queryR13PayrollReadiness(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R14':
        rawRows = await this.repo.queryR14MonthlyReview(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R15':
        rawRows = await this.repo.queryR15AttendanceAudit(tenantId, companyId, options);
        break;
      default:
        throw new BadRequestError(`Execution handler for report '${reportId}' not implemented`);
    }

    // Apply Sorting
    const sortCol = options.sorting?.column || def.defaultSorting.column;
    const sortDir = options.sorting?.direction || def.defaultSorting.direction;
    rawRows.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      const compare = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortDir === 'asc' ? compare : -compare;
    });

    const totalRows = rawRows.length;
    const page = options.pagination?.page || 1;
    const pageSize = options.pagination?.pageSize || 25;
    const startIndex = (page - 1) * pageSize;
    const paginatedRows = rawRows.slice(startIndex, startIndex + pageSize);

    // Filter Selected Columns if provided
    let columns = def.columns;
    if (options.selectedColumns && options.selectedColumns.length > 0) {
      const selectedSet = new Set(options.selectedColumns);
      columns = def.columns.filter((c) => selectedSet.has(c.id));
    }

    return {
      reportId: def.id,
      reportName: def.name,
      category: def.category,
      appliedFilters: options.filters,
      columns,
      rows: paginatedRows,
      totalRows,
      page,
      pageSize,
      generatedAt: new Date().toISOString(),
      timezone: 'UTC',
      reportingCutoff: new Date().toISOString().slice(0, 10),
      limitations: def.limitations,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // 3.5. REPORT ANALYTICS & KPIS
  // ════════════════════════════════════════════════════════════════════════

  async getReportAnalytics(
    tenantId: string,
    companyId: string,
    reportId: string,
    filters: Record<string, unknown> = {},
    actorUser?: AuthenticatedUser,
    access?: CompanyAccess,
  ): Promise<ReportAnalyticsResult> {
    const def = this.getDefinition(reportId);
    this.checkReportAuthorization(def, access);

    let scopedEmployeeIds: string[] | undefined = undefined;
    if (access?.employeeId && !access.permissions.includes('hrms.attendance.view')) {
      scopedEmployeeIds = [access.employeeId];
    }

    const options: ReportQueryOptions = {
      filters,
    };

    let rawRows: Record<string, unknown>[] = [];
    switch (def.id) {
      case 'R01':
        rawRows = await this.repo.queryR01DailyAttendance(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R02':
        rawRows = await this.repo.queryR02MonthlyAttendance(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R03':
        rawRows = await this.repo.queryR03AttendanceTrend(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R04':
        rawRows = await this.repo.queryR04WorkingHours(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R05':
        rawRows = await this.repo.queryR05LateAndEarlyExit(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R06':
        rawRows = await this.repo.queryR06Overtime(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R07':
        rawRows = await this.repo.queryR07Absenteeism(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R08':
        rawRows = await this.repo.queryR08LeaveImpact(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R09':
        rawRows = await this.repo.queryR09MissingPunch(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R10':
        rawRows = await this.repo.queryR10AttendanceExceptions(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R11':
        rawRows = await this.repo.queryR11Regularization(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R12':
        rawRows = await this.repo.queryR12OnDuty(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R13':
        rawRows = await this.repo.queryR13PayrollReadiness(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R14':
        rawRows = await this.repo.queryR14MonthlyReview(tenantId, companyId, options, scopedEmployeeIds);
        break;
      case 'R15':
        rawRows = await this.repo.queryR15AttendanceAudit(tenantId, companyId, options);
        break;
      default:
        throw new BadRequestError(`Analytics handler for report '${reportId}' not implemented`);
    }

    return buildReportAnalytics(def, rawRows, filters, 'UTC');
  }

  // ════════════════════════════════════════════════════════════════════════
  // 4. EXPORT
  // ════════════════════════════════════════════════════════════════════════

  async exportReport(
    tenantId: string,
    companyId: string,
    reportId: string,
    exportInput: ReportExportInput,
    actorUser?: AuthenticatedUser,
    access?: CompanyAccess,
  ): Promise<ReportExportResult> {
    const def = this.getDefinition(reportId);
    this.checkReportAuthorization(def, access);

    if (!def.supportedExportFormats.includes(exportInput.format)) {
      throw new BadRequestError(
        `Format '${exportInput.format}' is not supported for report '${reportId}'`,
      );
    }

    // Retrieve company metadata for export header
    const companyMeta = await this.repo.getCompanyMetadata(companyId);

    // Query full dataset without pagination limits (up to safe enterprise limit 10,000)
    const preview = await this.previewReport(
      tenantId,
      companyId,
      reportId,
      {
        filters: exportInput.filters,
        sorting: exportInput.sorting,
        selectedColumns: exportInput.selectedColumns,
        pagination: { page: 1, pageSize: 10000 },
      },
      actorUser,
      access,
    );

    let analyticsData: ReportAnalyticsResult | undefined = undefined;
    if (exportInput.format === 'pdf' && exportInput.includeAnalytics !== false) {
      analyticsData = await this.getReportAnalytics(
        tenantId,
        companyId,
        reportId,
        exportInput.filters,
        actorUser,
        access,
      );
    }

    const generatedTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const meta = {
      companyName: companyMeta.name,
      generatedAt: generatedTimestamp,
      timezone: preview.timezone,
      appliedFilters: exportInput.filters,
      analytics: analyticsData,
    };

    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    switch (exportInput.format) {
      case 'csv':
        buffer = generateCsvExport(def, preview.columns, preview.rows, meta);
        mimeType = 'text/csv; charset=utf-8';
        extension = 'csv';
        break;
      case 'xlsx':
        buffer = generateExcelExport(def, preview.columns, preview.rows, meta);
        mimeType = 'application/vnd.ms-excel';
        extension = 'xls';
        break;
      case 'pdf':
        buffer = generatePdfExport(def, preview.columns, preview.rows, meta);
        mimeType = 'application/pdf';
        extension = 'pdf';
        break;
    }

    const safeReportCode = def.code.toLowerCase();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `bezent_${safeReportCode}_${dateStamp}.${extension}`;

    // Record Generation History
    const historyId = randomUUID();
    await this.repo.createGeneration({
      id: historyId,
      tenantId,
      companyId,
      actorUserId: actorUser?.id ?? 'system',
      reportId: def.id,
      filtersSnapshot: exportInput.filters,
      selectedColumnsSnapshot: exportInput.selectedColumns,
      outputFormat: exportInput.format,
      generationStatus: 'completed',
      rowCount: preview.totalRows,
      fileReference: fileName,
      reportingCutoff: preview.reportingCutoff,
    });

    // Record Audit Log
    try {
      await getDb().insert(auditLogs).values({
        id: randomUUID(),
        tenantId,
        companyId,
        actorUserId: actorUser?.id ?? 'system',
        actorEmail: actorUser?.email ?? 'system',
        action: 'attendance_report.exported',
        targetType: 'attendance_report',
        targetId: def.id,
        metadata: {
          reportId: def.id,
          format: exportInput.format,
          rowCount: preview.totalRows,
          fileName,
        },
      });
    } catch {
      // Audit fail non-blocking
    }

    return {
      buffer,
      mimeType,
      fileName,
      rowCount: preview.totalRows,
      historyId,
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // 5. SAVED CONFIGURATIONS
  // ════════════════════════════════════════════════════════════════════════

  async listSavedConfigurations(
    tenantId: string,
    companyId: string,
    ownerUserId: string,
    reportId?: ReportId,
  ): Promise<SavedReportConfiguration[]> {
    const list = await this.repo.listSavedReports(tenantId, companyId, ownerUserId, reportId);
    return list.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      companyId: item.companyId,
      ownerUserId: item.ownerUserId,
      reportId: item.reportId as ReportId,
      configurationName: item.configurationName,
      filters: (item.filters as Record<string, unknown>) || {},
      selectedColumns: item.selectedColumns || undefined,
      sorting: item.sorting || undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  async createSavedConfiguration(
    tenantId: string,
    companyId: string,
    ownerUserId: string,
    input: CreateSavedReportInput,
  ): Promise<SavedReportConfiguration> {
    if (!input.configurationName || input.configurationName.trim().length === 0) {
      throw new BadRequestError('Configuration name is required');
    }
    this.getDefinition(input.reportId); // Validate report existence

    const id = randomUUID();
    const created = await this.repo.createSavedReport({
      id,
      tenantId,
      companyId,
      ownerUserId,
      reportId: input.reportId,
      configurationName: input.configurationName.trim(),
      filters: input.filters || {},
      selectedColumns: input.selectedColumns || null,
      sorting: input.sorting || null,
    });

    return {
      id: created.id,
      tenantId: created.tenantId,
      companyId: created.companyId,
      ownerUserId: created.ownerUserId,
      reportId: created.reportId as ReportId,
      configurationName: created.configurationName,
      filters: (created.filters as Record<string, unknown>) || {},
      selectedColumns: created.selectedColumns || undefined,
      sorting: created.sorting || undefined,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateSavedConfiguration(
    tenantId: string,
    companyId: string,
    ownerUserId: string,
    id: string,
    input: UpdateSavedReportInput,
  ): Promise<SavedReportConfiguration> {
    const existing = await this.repo.findSavedReportById(tenantId, companyId, id, ownerUserId);
    if (!existing) {
      throw new NotFoundError(`Saved report configuration '${id}' not found`);
    }

    const updated = await this.repo.updateSavedReport(tenantId, companyId, id, ownerUserId, {
      configurationName: input.configurationName !== undefined ? input.configurationName.trim() : existing.configurationName,
      filters: input.filters !== undefined ? input.filters : existing.filters,
      selectedColumns: input.selectedColumns !== undefined ? input.selectedColumns : existing.selectedColumns,
      sorting: input.sorting !== undefined ? input.sorting : existing.sorting,
    });

    return {
      id: updated!.id,
      tenantId: updated!.tenantId,
      companyId: updated!.companyId,
      ownerUserId: updated!.ownerUserId,
      reportId: updated!.reportId as ReportId,
      configurationName: updated!.configurationName,
      filters: (updated!.filters as Record<string, unknown>) || {},
      selectedColumns: updated!.selectedColumns || undefined,
      sorting: updated!.sorting || undefined,
      createdAt: updated!.createdAt.toISOString(),
      updatedAt: updated!.updatedAt.toISOString(),
    };
  }

  async deleteSavedConfiguration(
    tenantId: string,
    companyId: string,
    ownerUserId: string,
    id: string,
  ): Promise<void> {
    const existing = await this.repo.findSavedReportById(tenantId, companyId, id, ownerUserId);
    if (!existing) {
      throw new NotFoundError(`Saved report configuration '${id}' not found`);
    }
    await this.repo.deleteSavedReport(tenantId, companyId, id, ownerUserId);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 6. GENERATION HISTORY & DOWNLOADS
  // ════════════════════════════════════════════════════════════════════════

  async listHistory(
    tenantId: string,
    companyId: string,
    actorUserId?: string,
    reportId?: ReportId,
  ): Promise<ReportGenerationHistoryItem[]> {
    const rows = await this.repo.listGenerations(tenantId, companyId, actorUserId, reportId);
    return rows.map((r) => {
      const def = getReportDefinition(r.reportId);
      return {
        id: r.id,
        tenantId: r.tenantId,
        companyId: r.companyId,
        actorUserId: r.actorUserId,
        reportId: r.reportId as ReportId,
        reportName: def?.name ?? r.reportId,
        filtersSnapshot: (r.filtersSnapshot as Record<string, unknown>) || {},
        selectedColumnsSnapshot: r.selectedColumnsSnapshot || undefined,
        outputFormat: r.outputFormat,
        generationStatus: r.generationStatus,
        generatedAt: r.generatedAt.toISOString(),
        reportingCutoff: r.reportingCutoff || undefined,
        rowCount: r.rowCount,
        fileReference: r.fileReference || undefined,
      };
    });
  }

  async downloadHistoryFile(
    tenantId: string,
    companyId: string,
    id: string,
    actorUser?: AuthenticatedUser,
    access?: CompanyAccess,
  ): Promise<ReportExportResult> {
    const historyItem = await this.repo.findGenerationById(tenantId, companyId, id);
    if (!historyItem) {
      throw new NotFoundError(`Report generation history record '${id}' not found`);
    }

    // Revalidate permissions on download
    const def = this.getDefinition(historyItem.reportId);
    this.checkReportAuthorization(def, access);

    // Re-generate export stream with current authorization scope
    const exportResult = await this.exportReport(
      tenantId,
      companyId,
      historyItem.reportId,
      {
        format: historyItem.outputFormat,
        filters: (historyItem.filtersSnapshot as Record<string, unknown>) || {},
        selectedColumns: historyItem.selectedColumnsSnapshot || undefined,
      },
      actorUser,
      access,
    );

    // Record audit of download
    try {
      await getDb().insert(auditLogs).values({
        id: randomUUID(),
        tenantId,
        companyId,
        actorUserId: actorUser?.id ?? 'system',
        actorEmail: actorUser?.email ?? 'system',
        action: 'attendance_report.downloaded',
        targetType: 'attendance_report',
        targetId: historyItem.id,
        metadata: {
          reportId: historyItem.reportId,
          historyId: historyItem.id,
          format: historyItem.outputFormat,
        },
      });
    } catch {
      // Non-blocking
    }

    return exportResult;
  }
}

export const attendanceReportsService = new AttendanceReportsService();

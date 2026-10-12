import {
  attendanceMonthlySummaryRepository,
  type AttendanceMonthlySummaryRepository,
} from '../repository/attendanceMonthlySummary.repository.js';
import {
  attendanceMonthlySummaryEngineService,
  type AttendanceMonthlySummaryEngineService,
} from './attendanceMonthlySummaryEngine.service.js';
import {
  attendanceMonthlyReadinessService,
  type AttendanceMonthlyReadinessService,
} from './attendanceMonthlyReadiness.service.js';
import { generateMonthlySummaryPdf } from './monthlySummaryPdfGenerator.js';
import type {
  MonthlySummaryFilter,
  MonthlySummaryRow,
  MonthlySummaryQueryResult,
  MonthlySummaryDailyRecord,
  MonthlySummaryReadinessReport,
  MonthlySummaryReviewHistoryItem,
  MonthlySummaryBulkActionInput,
  MonthlySummaryBulkActionResult,
  MonthlySummaryBulkPreviewResult,
  MonthlySummaryExportInput,
} from '../types/attendanceMonthlySummary.types.js';
import { BadRequestError, NotFoundError } from '../../../../app/errors/AppError.js';
import type { AttendanceMonthlySummary } from '../../../../db/schema.js';

export class AttendanceMonthlySummaryService {
  constructor(
    private readonly repo: AttendanceMonthlySummaryRepository = attendanceMonthlySummaryRepository,
    private readonly engine: AttendanceMonthlySummaryEngineService = attendanceMonthlySummaryEngineService,
    private readonly readiness: AttendanceMonthlyReadinessService = attendanceMonthlyReadinessService,
  ) {}

  /**
   * Retrieves workspace data including summaries, counters, and pagination
   */
  async getWorkspace(
    tenantId: string,
    companyId: string,
    filter: MonthlySummaryFilter,
  ): Promise<MonthlySummaryQueryResult> {
    const month = filter.month || new Date().toISOString().slice(0, 7);
    const normalizedFilter: MonthlySummaryFilter = {
      ...filter,
      month,
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 20,
    };

    // Ensure initial calculation for active employees if no summaries exist yet
    await this.ensureMonthlySummariesCalculated(tenantId, companyId, month);

    const [{ items, totalCount }, counters] = await Promise.all([
      this.repo.listSummaries(tenantId, companyId, normalizedFilter),
      this.repo.getCounters(tenantId, companyId, month),
    ]);

    const pageSize = normalizedFilter.pageSize!;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      items,
      counters,
      totalCount,
      page: normalizedFilter.page!,
      pageSize,
      totalPages,
    };
  }

  /**
   * Generates initial monthly summaries for active employees if not already generated
   */
  async ensureMonthlySummariesCalculated(
    tenantId: string,
    companyId: string,
    month: string,
  ): Promise<void> {
    try {
      const activeEmployees = await this.repo.getActiveEmployeesForMonth(
        tenantId,
        companyId,
        month,
      );
      for (const emp of activeEmployees) {
        const existing = await this.repo.getSummaryByEmployeeMonth(
          tenantId,
          companyId,
          emp.id,
          month,
        );
        if (!existing) {
          const calcResult = await this.engine.calculateEmployeeMonth(
            tenantId,
            companyId,
            emp.id,
            month,
          );
          await this.repo.upsertSummary(calcResult.summaryData);
          await this.readiness.evaluateAndPersist(
            calcResult.summaryData as AttendanceMonthlySummary,
            calcResult.dailyRecords,
          );
        }
      }
    } catch {
      // Non-blocking in case of isolated database failures
    }
  }

  /**
   * Employee Monthly Drilldown Tab 1: Overview
   */
  async getSummaryById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<MonthlySummaryRow> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) {
      throw new NotFoundError('Monthly summary not found');
    }
    return summary;
  }

  /**
   * Employee Monthly Drilldown Tab 2: Daily Breakdown
   */
  async getDailyBreakdown(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<MonthlySummaryDailyRecord[]> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) {
      throw new NotFoundError('Monthly summary not found');
    }

    const calcResult = await this.engine.calculateEmployeeMonth(
      tenantId,
      companyId,
      summary.employeeId,
      summary.month,
      { timezone: summary.timezone },
    );

    return calcResult.dailyRecords;
  }

  /**
   * Employee Monthly Drilldown Tab 3: Issues & Readiness
   */
  async getReadinessReport(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<MonthlySummaryReadinessReport> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) {
      throw new NotFoundError('Monthly summary not found');
    }

    const calcResult = await this.engine.calculateEmployeeMonth(
      tenantId,
      companyId,
      summary.employeeId,
      summary.month,
      { timezone: summary.timezone },
    );

    return this.readiness.evaluateAndPersist(
      calcResult.summaryData as AttendanceMonthlySummary,
      calcResult.dailyRecords,
    );
  }

  /**
   * Employee Monthly Drilldown Tab 4: Review History
   */
  async getReviewHistory(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<MonthlySummaryReviewHistoryItem[]> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) {
      throw new NotFoundError('Monthly summary not found');
    }

    const reviews = await this.repo.getReviewHistory(id);
    return reviews.map((r) => ({
      id: r.id,
      reviewerUserId: r.reviewerUserId,
      reviewerName: r.reviewerName,
      reviewStatus: r.reviewStatus,
      reviewedSummaryVersion: r.reviewedSummaryVersion,
      reviewNotes: r.reviewNotes,
      reopenReason: r.reopenReason,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Assign or Reassign Reviewer
   */
  async assignReviewer(
    tenantId: string,
    companyId: string,
    id: string,
    reviewerId: string,
    actorUserId?: string,
  ): Promise<MonthlySummaryRow> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) throw new NotFoundError('Monthly summary not found');

    await this.repo.updateSummary(id, {
      assignedReviewerId: reviewerId,
      assignedAt: new Date(),
    });

    await this.repo.createAudit({
      id: `att_ma_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      action: 'assigned',
      actorUserId: actorUserId ?? null,
      oldState: { assignedReviewerId: summary.assignedReviewerId },
      newState: { assignedReviewerId: reviewerId },
      notes: `Reviewer assigned to ${reviewerId}`,
      summaryVersion: summary.version,
      createdAt: new Date(),
    });

    await this.repo.sendNotification(
      tenantId,
      companyId,
      summary.employeeId,
      'Reviewer Assigned',
      `Your attendance summary for ${summary.month} has been assigned for review.`,
      'info',
    );

    return this.getSummaryById(tenantId, companyId, id);
  }

  /**
   * Start Monthly Review
   */
  async startReview(
    tenantId: string,
    companyId: string,
    id: string,
    actorUserId: string,
  ): Promise<MonthlySummaryRow> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) throw new NotFoundError('Monthly summary not found');

    await this.repo.updateSummary(id, {
      reviewState: 'in_review',
    });

    await this.repo.createReview({
      id: `att_mr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      reviewerUserId: actorUserId,
      reviewStatus: 'in_review',
      reviewedSummaryVersion: summary.version,
      reviewNotes: 'Review initiated',
      createdAt: new Date(),
    });

    await this.repo.createAudit({
      id: `att_ma_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      action: 'review_started',
      actorUserId,
      oldState: { reviewState: summary.reviewState },
      newState: { reviewState: 'in_review' },
      notes: 'Review initiated',
      summaryVersion: summary.version,
      createdAt: new Date(),
    });

    return this.getSummaryById(tenantId, companyId, id);
  }

  /**
   * Request Correction during Review
   */
  async requestCorrection(
    tenantId: string,
    companyId: string,
    id: string,
    notes: string,
    actorUserId: string,
  ): Promise<MonthlySummaryRow> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) throw new NotFoundError('Monthly summary not found');

    if (!notes || notes.trim().length === 0) {
      throw new BadRequestError('Correction notes are mandatory');
    }

    await this.repo.updateSummary(id, {
      reviewState: 'needs_correction',
      correctionRequestNotes: notes,
    });

    await this.repo.createReview({
      id: `att_mr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      reviewerUserId: actorUserId,
      reviewStatus: 'needs_correction',
      reviewedSummaryVersion: summary.version,
      reviewNotes: notes,
      createdAt: new Date(),
    });

    await this.repo.createAudit({
      id: `att_ma_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      action: 'correction_requested',
      actorUserId,
      oldState: { reviewState: summary.reviewState },
      newState: { reviewState: 'needs_correction', notes },
      notes,
      summaryVersion: summary.version,
      createdAt: new Date(),
    });

    await this.repo.sendNotification(
      tenantId,
      companyId,
      summary.employeeId,
      'Correction Requested',
      `Correction requested for monthly attendance: ${notes}`,
      'action_required',
    );

    return this.getSummaryById(tenantId, companyId, id);
  }

  /**
   * Mark Summary as Reviewed (Version-Aware Sign-off)
   */
  async markReviewed(
    tenantId: string,
    companyId: string,
    id: string,
    notes: string | undefined,
    actorUserId: string,
  ): Promise<MonthlySummaryRow> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) throw new NotFoundError('Monthly summary not found');

    // Self-review restriction: prevent employees from signing off their own monthly summary
    if (summary.employeeId === actorUserId) {
      throw new BadRequestError('Self-review is prohibited. A designated reviewer must sign off.');
    }

    // Version-bound sign-off
    const signOffVersion = summary.version;

    await this.repo.updateSummary(id, {
      reviewState: 'reviewed',
      reviewedByUserId: actorUserId,
      reviewedAt: new Date(),
      reviewedVersion: signOffVersion,
      reviewNotes: notes ?? null,
    });

    await this.repo.createReview({
      id: `att_mr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      reviewerUserId: actorUserId,
      reviewStatus: 'reviewed',
      reviewedSummaryVersion: signOffVersion,
      reviewNotes: notes ?? null,
      createdAt: new Date(),
    });

    await this.repo.createAudit({
      id: `att_ma_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      action: 'reviewed',
      actorUserId,
      oldState: { reviewState: summary.reviewState, version: summary.version },
      newState: { reviewState: 'reviewed', reviewedVersion: signOffVersion },
      notes: notes ?? 'Monthly review signed off',
      summaryVersion: signOffVersion,
      createdAt: new Date(),
    });

    // Re-evaluate readiness
    const dailyRecords = await this.getDailyBreakdown(tenantId, companyId, id);
    const updatedSummary = await this.repo.getSummaryById(tenantId, companyId, id);
    await this.readiness.evaluateAndPersist(
      {
        ...(updatedSummary || summary),
        reviewState: 'reviewed',
        reviewedVersion: signOffVersion,
      } as unknown as AttendanceMonthlySummary,
      dailyRecords,
    );

    await this.repo.sendNotification(
      tenantId,
      companyId,
      summary.employeeId,
      'Monthly Review Complete',
      `Your attendance summary for ${summary.month} has been reviewed and signed off.`,
      'success',
    );

    return this.getSummaryById(tenantId, companyId, id);
  }

  /**
   * Reopen Review
   */
  async reopenReview(
    tenantId: string,
    companyId: string,
    id: string,
    reason: string,
    actorUserId: string,
  ): Promise<MonthlySummaryRow> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) throw new NotFoundError('Monthly summary not found');

    if (!reason || reason.trim().length === 0) {
      throw new BadRequestError('Reopen reason is mandatory');
    }

    await this.repo.updateSummary(id, {
      reviewState: 'reopened',
      reopenReason: reason,
    });

    await this.repo.createReview({
      id: `att_mr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      reviewerUserId: actorUserId,
      reviewStatus: 'reopened',
      reviewedSummaryVersion: summary.version,
      reopenReason: reason,
      createdAt: new Date(),
    });

    await this.repo.createAudit({
      id: `att_ma_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      action: 'reopened',
      actorUserId,
      oldState: { reviewState: summary.reviewState },
      newState: { reviewState: 'reopened', reopenReason: reason },
      notes: reason,
      summaryVersion: summary.version,
      createdAt: new Date(),
    });

    // Re-evaluate readiness
    const dailyRecords = await this.getDailyBreakdown(tenantId, companyId, id);
    await this.readiness.evaluateAndPersist(
      { ...summary, reviewState: 'reopened' } as unknown as AttendanceMonthlySummary,
      dailyRecords,
    );

    return this.getSummaryById(tenantId, companyId, id);
  }

  /**
   * Force Recalculate Monthly Summary
   */
  async recalculateSummary(
    tenantId: string,
    companyId: string,
    id: string,
    actorUserId?: string,
  ): Promise<MonthlySummaryRow> {
    const summary = await this.repo.getSummaryById(tenantId, companyId, id);
    if (!summary) throw new NotFoundError('Monthly summary not found');

    const calcResult = await this.engine.calculateEmployeeMonth(
      tenantId,
      companyId,
      summary.employeeId,
      summary.month,
      { timezone: summary.timezone, actorUserId },
    );

    await this.repo.upsertSummary(calcResult.summaryData);

    await this.readiness.evaluateAndPersist(
      calcResult.summaryData as AttendanceMonthlySummary,
      calcResult.dailyRecords,
    );

    await this.repo.createAudit({
      id: `att_ma_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tenantId,
      companyId,
      monthlySummaryId: id,
      action: 'recalculated',
      actorUserId: actorUserId ?? null,
      oldState: { version: summary.version, fingerprint: summary.sourceFingerprint },
      newState: {
        version: calcResult.summaryData.version,
        fingerprint: calcResult.summaryData.sourceFingerprint,
      },
      notes: calcResult.isStaleReview
        ? 'Recalculation detected source modifications; review marked reopened'
        : 'Monthly summary recalculated',
      summaryVersion: calcResult.summaryData.version ?? 1,
      createdAt: new Date(),
    });

    if (calcResult.isStaleReview) {
      await this.repo.sendNotification(
        tenantId,
        companyId,
        summary.employeeId,
        'Attendance Review Invalidated',
        `Attendance source changes occurred after your review for ${summary.month}. Re-verification required.`,
        'warning',
      );
    }

    return this.getSummaryById(tenantId, companyId, id);
  }

  /**
   * Preview bulk action eligibility
   */
  async bulkPreview(
    tenantId: string,
    companyId: string,
    action: string,
    summaryIds: string[],
  ): Promise<MonthlySummaryBulkPreviewResult> {
    let eligibleCount = 0;
    let notEligibleCount = 0;
    const items: MonthlySummaryBulkPreviewResult['items'] = [];

    for (const id of summaryIds) {
      const summary = await this.repo.getSummaryById(tenantId, companyId, id);
      if (!summary) continue;

      let isEligible = true;
      let reason: string | undefined;

      switch (action) {
        case 'mark_reviewed':
          if (summary.reviewState === 'reviewed' && summary.reviewedVersion === summary.version) {
            isEligible = false;
            reason = 'Already signed off for current version';
          }
          break;
        case 'start_review':
          if (summary.reviewState === 'in_review' || summary.reviewState === 'reviewed') {
            isEligible = false;
            reason = `Summary is already ${summary.reviewState.replace('_', ' ')}`;
          }
          break;
        case 'recalculate':
          isEligible = true;
          break;
        case 'assign':
          isEligible = true;
          break;
      }

      if (isEligible) {
        eligibleCount++;
      } else {
        notEligibleCount++;
      }

      items.push({
        id: summary.id,
        employeeName: summary.employeeName,
        employeeCode: summary.employeeCode,
        currentStatus: summary.reviewState,
        isEligible,
        reason,
      });
    }

    return {
      totalSelected: summaryIds.length,
      eligibleCount,
      notEligibleCount,
      items,
    };
  }

  /**
   * Execute controlled bulk operations
   */
  async bulkExecute(
    tenantId: string,
    companyId: string,
    input: MonthlySummaryBulkActionInput,
    actorUserId: string,
  ): Promise<MonthlySummaryBulkActionResult> {
    const succeeded: string[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of input.summaryIds) {
      try {
        const summary = await this.repo.getSummaryById(tenantId, companyId, id);
        if (!summary) {
          skipped.push({ id, reason: 'Record not found' });
          continue;
        }

        switch (input.action) {
          case 'mark_reviewed':
            if (summary.employeeId === actorUserId) {
              skipped.push({ id, reason: 'Self-review is prohibited' });
              continue;
            }
            if (summary.reviewState === 'reviewed' && summary.reviewedVersion === summary.version) {
              skipped.push({ id, reason: 'Already reviewed' });
              continue;
            }
            await this.markReviewed(tenantId, companyId, id, input.reviewNotes, actorUserId);
            succeeded.push(id);
            break;

          case 'start_review':
            if (summary.reviewState === 'in_review') {
              skipped.push({ id, reason: 'Already in review' });
              continue;
            }
            await this.startReview(tenantId, companyId, id, actorUserId);
            succeeded.push(id);
            break;

          case 'request_correction':
            await this.requestCorrection(
              tenantId,
              companyId,
              id,
              input.correctionNotes || 'Bulk correction request',
              actorUserId,
            );
            succeeded.push(id);
            break;

          case 'recalculate':
            await this.recalculateSummary(tenantId, companyId, id, actorUserId);
            succeeded.push(id);
            break;

          case 'assign':
            if (!input.reviewerId) {
              failed.push({ id, error: 'Reviewer ID required' });
              continue;
            }
            await this.assignReviewer(tenantId, companyId, id, input.reviewerId, actorUserId);
            succeeded.push(id);
            break;

          default:
            skipped.push({ id, reason: `Unsupported bulk action: ${input.action}` });
        }
      } catch (err: unknown) {
        failed.push({
          id,
          error: err instanceof Error ? err.message : 'Execution error',
        });
      }
    }

    return {
      action: input.action,
      totalRequested: input.summaryIds.length,
      succeeded,
      skipped,
      failed,
    };
  }

  /**
   * Export Monthly Summary Data (CSV, Excel, PDF)
   */
  async exportSummaries(
    tenantId: string,
    companyId: string,
    input: MonthlySummaryExportInput,
    _actorUserId: string,
  ): Promise<{ filename: string; mimeType: string; content: string | Buffer }> {
    const listResult = await this.repo.listSummaries(tenantId, companyId, {
      month: input.month,
      departmentId: input.departmentId,
      payrollReadiness: input.payrollReadiness,
      reviewState: input.reviewState,
      search: input.search,
      page: 1,
      pageSize: 5000,
    });

    let records = listResult.items;
    if (input.selectedIds && input.selectedIds.length > 0) {
      records = records.filter((r) => input.selectedIds!.includes(r.id));
    }

    if (input.format === 'pdf') {
      const pdfBuffer = generateMonthlySummaryPdf({
        companyName: companyId,
        month: input.month,
        records,
      });

      const filename = `attendance_monthly_summary_${input.month}_${Date.now()}.pdf`;
      return {
        filename,
        mimeType: 'application/pdf',
        content: pdfBuffer,
      };
    }

    // Formula injection protection helper
    const sanitize = (val: unknown): string => {
      const str = String(val ?? '');
      if (/^[=+\-@\t\r]/.test(str)) {
        return `'${str}`;
      }
      return str.replace(/"/g, '""');
    };

    const headers = [
      'Employee Code',
      'Employee Name',
      'Department',
      'Month',
      'Scheduled Days',
      'Present Days',
      'Absent Days',
      'Leave Days',
      'On-Duty Days',
      'Weekly Off Days',
      'Holiday Days',
      'Worked Hours',
      'Credited Hours',
      'Late Occurrences',
      'Early Exits',
      'Exceptions',
      'Review Status',
      'Payroll Readiness',
      'Locked',
      'Version',
    ];

    const rows = records.map((r) => [
      sanitize(r.employeeCode),
      sanitize(r.employeeName),
      sanitize(r.departmentName),
      sanitize(r.month),
      r.scheduledDays,
      r.presentDays,
      r.absentDays,
      r.leaveDays,
      r.onDutyDays,
      r.weeklyOffDays,
      r.holidayDays,
      r.actualWorkedHours,
      r.policyCreditedHours,
      r.lateOccurrences,
      r.earlyExitOccurrences,
      r.unresolvedExceptions,
      sanitize(r.reviewState),
      sanitize(r.payrollReadiness),
      r.isLocked ? 'Yes' : 'No',
      r.version,
    ]);

    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\r\n');

    const ext = input.format === 'excel' ? 'csv' : 'csv';
    const filename = `attendance_monthly_summary_${input.month}_${Date.now()}.${ext}`;

    return {
      filename,
      mimeType: 'text/csv; charset=utf-8',
      content: csvContent,
    };
  }
}

export const attendanceMonthlySummaryService = new AttendanceMonthlySummaryService();

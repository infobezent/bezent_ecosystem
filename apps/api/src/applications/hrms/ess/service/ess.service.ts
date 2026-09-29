import { EssRepository } from '../repository/ess.repository.js';
import type { EmployeeContext } from '../../../../platform/auth/middleware/auth.middleware.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../../../app/errors/AppError.js';
import type {
  EssDashboardData,
  EssFullProfile,
  CreateProfileChangeRequestInput,
  CheckInInput,
  RegularizeAttendanceInput,
  ApplyLeaveInput,
  LogTimesheetInput,
  SubmitDocumentInput,
} from '../types/ess.types.js';

export class EssService {
  constructor(private readonly repo: EssRepository = new EssRepository()) {}

  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getCurrentTimeString(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async getDashboardData(ctx: EmployeeContext): Promise<EssDashboardData> {
    const today = this.getTodayDateString();
    const currentYear = new Date().getFullYear();

    const [summary, todayAtt, balances, allRequests, allTasks, notifications] = await Promise.all([
      this.repo.getEmployeeSummary(ctx.id),
      this.repo.getTodayAttendance(ctx.tenantId, ctx.companyId, ctx.id, today),
      this.repo.ensureDefaultLeaveBalances(ctx.tenantId, ctx.companyId, ctx.id, currentYear),
      this.repo.getRequests(ctx.tenantId, ctx.companyId, ctx.id),
      this.repo.getTasks(ctx.tenantId, ctx.companyId, ctx.id),
      this.repo.getNotifications(ctx.tenantId, ctx.companyId, ctx.id),
    ]);

    if (!summary) {
      throw new NotFoundError('Employee profile not found');
    }

    const pendingRequestsCount = allRequests.filter((r) => r.status === 'pending').length;
    const assignedTasksCount = allTasks.filter((t) => t.status !== 'completed').length;
    const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

    const leaveBalanceItems = balances.map((b) => ({
      leaveType: b.leaveType,
      totalDays: b.totalDays,
      usedDays: b.usedDays,
      pendingDays: b.pendingDays,
      availableDays: Math.max(0, b.totalDays - b.usedDays - b.pendingDays),
    }));

    const upcomingHolidays = [
      { name: 'Republic Day', date: `${currentYear}-01-26`, dayOfWeek: 'Monday' },
      { name: 'May Day / Labor Day', date: `${currentYear}-05-01`, dayOfWeek: 'Friday' },
      { name: 'Independence Day', date: `${currentYear}-08-15`, dayOfWeek: 'Saturday' },
      { name: 'Gandhi Jayanti', date: `${currentYear}-10-02`, dayOfWeek: 'Friday' },
      { name: 'Diwali', date: `${currentYear}-11-08`, dayOfWeek: 'Sunday' },
      { name: 'Christmas Day', date: `${currentYear}-12-25`, dayOfWeek: 'Friday' },
    ];

    return {
      employee: summary,
      todayAttendance: {
        date: today,
        checkInTime: todayAtt?.checkInTime ?? null,
        checkOutTime: todayAtt?.checkOutTime ?? null,
        status: todayAtt ? todayAtt.status : 'not_checked_in',
        workLocation: todayAtt?.workLocation ?? 'office',
      },
      leaveBalances: leaveBalanceItems,
      pendingRequestsCount,
      assignedTasksCount,
      unreadNotificationsCount,
      recentNotifications: notifications.slice(0, 5),
      upcomingHolidays,
    };
  }

  async getFullProfile(ctx: EmployeeContext): Promise<EssFullProfile> {
    const profile = await this.repo.getFullProfile(ctx.id);
    if (!profile) {
      throw new NotFoundError('Employee profile not found');
    }
    return profile;
  }

  async createProfileChangeRequest(ctx: EmployeeContext, input: CreateProfileChangeRequestInput) {
    if (!input.subject || !input.subject.trim()) {
      throw new BadRequestError('Subject is required for change request');
    }
    if (!input.section) {
      throw new BadRequestError('Section is required');
    }
    if (!input.changes || Object.keys(input.changes).length === 0) {
      throw new BadRequestError('Changes payload cannot be empty');
    }

    const request = await this.repo.createRequest({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      requestType: 'profile_change',
      subject: input.subject.trim(),
      details: {
        section: input.section,
        changes: input.changes,
        reason: input.reason,
      },
    });

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Profile Change Request Submitted',
      message: `Your request to update ${input.section} has been submitted for HR review.`,
      type: 'info',
      link: '/ess/requests',
    });

    return request;
  }

  async getAttendanceWorkspace(ctx: EmployeeContext) {
    const today = this.getTodayDateString();
    const [todayAtt, history] = await Promise.all([
      this.repo.getTodayAttendance(ctx.tenantId, ctx.companyId, ctx.id, today),
      this.repo.getAttendanceHistory(ctx.tenantId, ctx.companyId, ctx.id, 60),
    ]);

    return {
      today: {
        date: today,
        checkInTime: todayAtt?.checkInTime ?? null,
        checkOutTime: todayAtt?.checkOutTime ?? null,
        status: todayAtt ? todayAtt.status : 'not_checked_in',
        workLocation: todayAtt?.workLocation ?? 'office',
        notes: todayAtt?.notes ?? null,
      },
      history,
    };
  }

  async checkIn(ctx: EmployeeContext, input: CheckInInput) {
    const today = this.getTodayDateString();
    const checkInTime = this.getCurrentTimeString();
    try {
      const record = await this.repo.checkIn(
        ctx.tenantId,
        ctx.companyId,
        ctx.id,
        today,
        checkInTime,
        input.workLocation ?? 'office',
        input.notes,
      );

      await this.repo.createNotification({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        employeeId: ctx.id,
        title: 'Checked In',
        message: `Successfully checked in today at ${checkInTime}.`,
        type: 'success',
      });

      return record;
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('already recorded')) {
        throw new ConflictError(err.message);
      }
      throw err;
    }
  }

  async checkOut(ctx: EmployeeContext) {
    const today = this.getTodayDateString();
    const todayAtt = await this.repo.getTodayAttendance(ctx.tenantId, ctx.companyId, ctx.id, today);
    if (!todayAtt || !todayAtt.checkInTime) {
      throw new BadRequestError('Cannot check out before checking in today');
    }
    if (todayAtt.checkOutTime) {
      throw new ConflictError('Check out already recorded for today');
    }

    const checkOutTime = this.getCurrentTimeString();
    const updated = await this.repo.checkOut(todayAtt.id, checkOutTime);

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Checked Out',
      message: `Successfully checked out today at ${checkOutTime}.`,
      type: 'info',
    });

    return updated;
  }

  async regularizeAttendance(ctx: EmployeeContext, input: RegularizeAttendanceInput) {
    if (!input.date || !input.checkInTime || !input.checkOutTime || !input.reason) {
      throw new BadRequestError('Date, check-in time, check-out time, and reason are required');
    }

    const request = await this.repo.createRequest({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      requestType: 'attendance_regularization',
      subject: `Attendance Regularization for ${input.date}`,
      details: {
        date: input.date,
        checkInTime: input.checkInTime,
        checkOutTime: input.checkOutTime,
        reason: input.reason,
      },
    });

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Regularization Request Submitted',
      message: `Your attendance regularization request for ${input.date} has been submitted.`,
      type: 'info',
      link: '/ess/requests',
    });

    return request;
  }

  async getLeaveWorkspace(ctx: EmployeeContext) {
    const currentYear = new Date().getFullYear();
    const [balances, requests] = await Promise.all([
      this.repo.ensureDefaultLeaveBalances(ctx.tenantId, ctx.companyId, ctx.id, currentYear),
      this.repo.getLeaveRequests(ctx.tenantId, ctx.companyId, ctx.id),
    ]);

    const formattedBalances = balances.map((b) => ({
      leaveType: b.leaveType,
      totalDays: b.totalDays,
      usedDays: b.usedDays,
      pendingDays: b.pendingDays,
      availableDays: Math.max(0, b.totalDays - b.usedDays - b.pendingDays),
    }));

    const upcomingHolidays = [
      { name: 'Republic Day', date: `${currentYear}-01-26`, dayOfWeek: 'Monday' },
      { name: 'May Day / Labor Day', date: `${currentYear}-05-01`, dayOfWeek: 'Friday' },
      { name: 'Independence Day', date: `${currentYear}-08-15`, dayOfWeek: 'Saturday' },
      { name: 'Gandhi Jayanti', date: `${currentYear}-10-02`, dayOfWeek: 'Friday' },
      { name: 'Diwali', date: `${currentYear}-11-08`, dayOfWeek: 'Sunday' },
      { name: 'Christmas Day', date: `${currentYear}-12-25`, dayOfWeek: 'Friday' },
    ];

    return {
      balances: formattedBalances,
      requests,
      holidays: upcomingHolidays,
    };
  }

  async applyLeave(ctx: EmployeeContext, input: ApplyLeaveInput) {
    if (!input.startDate || !input.endDate || !input.leaveType || !input.reason) {
      throw new BadRequestError('Start date, end date, leave type, and reason are required');
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError('Invalid date format provided');
    }
    if (end < start) {
      throw new BadRequestError('End date cannot precede start date');
    }

    // Inclusive days count
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check overlapping leave
    const overlap = await this.repo.findOverlappingLeave(
      ctx.tenantId,
      ctx.companyId,
      ctx.id,
      input.startDate,
      input.endDate,
    );
    if (overlap) {
      throw new ConflictError(
        `Leave request overlaps with an existing ${overlap.status} leave (${overlap.startDate} to ${overlap.endDate})`,
      );
    }

    // Check balance for non-unpaid leaves
    if (input.leaveType !== 'unpaid') {
      const year = start.getFullYear();
      const balances = await this.repo.ensureDefaultLeaveBalances(
        ctx.tenantId,
        ctx.companyId,
        ctx.id,
        year,
      );
      const balance = balances.find((b) => b.leaveType === input.leaveType);
      const available = balance ? balance.totalDays - balance.usedDays - balance.pendingDays : 0;
      if (available < totalDays) {
        throw new BadRequestError(
          `Insufficient ${input.leaveType} leave balance. Available: ${available} day(s), Requested: ${totalDays} day(s)`,
        );
      }
    }

    const request = await this.repo.createLeaveRequest({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      leaveType: input.leaveType,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays,
      reason: input.reason.trim(),
    });

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Leave Application Submitted',
      message: `Your application for ${totalDays} day(s) of ${input.leaveType} leave has been submitted.`,
      type: 'info',
      link: '/ess/leave',
    });

    return request;
  }

  async cancelLeave(ctx: EmployeeContext, leaveId: string) {
    const updated = await this.repo.cancelLeaveRequest(leaveId, ctx.id);
    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Leave Request Cancelled',
      message: `Your leave request for ${updated.startDate} has been cancelled.`,
      type: 'info',
      link: '/ess/leave',
    });
    return updated;
  }

  async getTimesheetsWorkspace(ctx: EmployeeContext) {
    const timesheets = await this.repo.getTimesheets(ctx.tenantId, ctx.companyId, ctx.id);
    return {
      timesheets,
    };
  }

  async logTimesheet(ctx: EmployeeContext, input: LogTimesheetInput) {
    if (!input.date || !input.projectName || !input.taskDescription || input.hours === undefined) {
      throw new BadRequestError('Date, project name, task description, and hours are required');
    }
    if (input.hours <= 0 || input.hours > 24) {
      throw new BadRequestError('Logged hours must be between 1 and 24 hours per entry');
    }

    const entry = await this.repo.logTimesheet({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      date: input.date,
      projectName: input.projectName.trim(),
      taskDescription: input.taskDescription.trim(),
      hours: Math.round(input.hours),
    });

    return entry;
  }

  async submitTimesheets(ctx: EmployeeContext, ids?: string[]) {
    const count = await this.repo.submitTimesheets(ctx.tenantId, ctx.companyId, ctx.id, ids);
    if (count > 0) {
      await this.repo.createNotification({
        tenantId: ctx.tenantId,
        companyId: ctx.companyId,
        employeeId: ctx.id,
        title: 'Timesheets Submitted',
        message: `${count} timesheet draft(s) submitted for approval.`,
        type: 'success',
        link: '/ess/timesheets',
      });
    }
    return { submittedCount: count };
  }

  async getDocumentsWorkspace(ctx: EmployeeContext) {
    const documents = await this.repo.getDocuments(ctx.tenantId, ctx.companyId, ctx.id);
    return { documents };
  }

  async submitDocument(ctx: EmployeeContext, input: SubmitDocumentInput) {
    if (!input.category || !input.documentName) {
      throw new BadRequestError('Document category and name are required');
    }

    const doc = await this.repo.createDocument({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      category: input.category,
      documentName: input.documentName.trim(),
      documentNumber: input.documentNumber?.trim(),
      expiryDate: input.expiryDate?.trim(),
    });

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Document Uploaded',
      message: `Your document "${input.documentName}" has been uploaded and queued for HR verification.`,
      type: 'info',
      link: '/ess/documents',
    });

    return doc;
  }

  async getRequestsWorkspace(ctx: EmployeeContext) {
    const requests = await this.repo.getRequests(ctx.tenantId, ctx.companyId, ctx.id);
    return { requests };
  }

  async cancelRequest(ctx: EmployeeContext, requestId: string) {
    const cancelled = await this.repo.cancelRequest(requestId, ctx.id);
    return cancelled;
  }

  async getTasksWorkspace(ctx: EmployeeContext) {
    const tasks = await this.repo.getTasks(ctx.tenantId, ctx.companyId, ctx.id);
    return { tasks };
  }

  async updateTaskStatus(
    ctx: EmployeeContext,
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed',
  ) {
    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      throw new BadRequestError('Invalid task status');
    }
    const updated = await this.repo.updateTaskStatus(taskId, ctx.id, status);
    return updated;
  }

  async getNotificationsWorkspace(ctx: EmployeeContext) {
    const notifications = await this.repo.getNotifications(ctx.tenantId, ctx.companyId, ctx.id);
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    return {
      notifications,
      unreadCount,
    };
  }

  async markNotificationRead(ctx: EmployeeContext, notificationId: string) {
    const updated = await this.repo.markNotificationAsRead(notificationId, ctx.id);
    return updated;
  }

  async markAllNotificationsRead(ctx: EmployeeContext) {
    const count = await this.repo.markAllNotificationsAsRead(ctx.tenantId, ctx.companyId, ctx.id);
    return { markedCount: count };
  }

  getPayslipsStatus(_ctx: EmployeeContext) {
    // In this phase, Payroll engine is unconfigured / not enabled.
    // Respects rule: "If payroll is not implemented, keep this feature disabled without creating mock data."
    return {
      enabled: false,
      message: 'Payroll integration is not configured for your organization.',
      payslips: [],
    };
  }
}

import { EssRepository } from '../repository/ess.repository.js';
import { milestoneRepository } from '../../milestones/repository/milestone.repository.js';
import { attendanceService } from '../../attendance/service/attendance.service.js';
import { attendanceWorkdayService } from '../../attendance/service/attendanceWorkday.service.js';
import { attendanceEmployeeViewService } from '../../attendance/service/attendanceEmployeeView.service.js';
import { defaultShiftScheduleProvider } from '../../attendance/service/shiftSchedule.provider.js';
import { attendanceRegularizationService } from '../../attendance/service/attendanceRegularization.service.js';
import { attendanceRegularizationEligibilityService } from '../../attendance/service/attendanceRegularizationEligibility.service.js';
import type { AttendanceRegularization, EmployeeAttendance } from '../../../../db/schema.js';
import type { RegularizationRequestType } from '../../attendance/types/attendance.types.js';
import type { EmployeeContext } from '../../../../platform/auth/middleware/auth.middleware.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../../../app/errors/AppError.js';
import type {
  EssDashboardData,
  EssTodayAttendance,
  EssFullProfile,
  EssCareerEvent,
  CreateProfileChangeRequestInput,
  UpdateContactDetailsInput,
  EmergencyContactItemInput,
  FamilyMemberItemInput,
  CheckInInput,
  BreakPunchInput,
  CheckOutInput,
  RegularizeAttendanceInput,
  EssAttendanceRegularizationDto,
  ApplyLeaveInput,
  LogTimesheetInput,
  UpdateTimesheetInput,
  SubmitDocumentInput,
  EssDocumentDto,
  EssProfileChangeRequestDto,
  EssFeedPost,
} from '../types/ess.types.js';

export class EssService {
  constructor(private readonly repo: EssRepository = new EssRepository()) {}

  private getCurrentTimeString(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async getDashboardData(ctx: EmployeeContext): Promise<EssDashboardData> {
    const currentYear = new Date().getFullYear();

    const [summary, attWorkspace, balances, allRequests, allTasks, notifications] =
      await Promise.all([
        this.repo.getEmployeeSummary(ctx.id),
        this.getAttendanceWorkspace(ctx),
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

    // Monthly attendance calculations
    const presentCount = attWorkspace.summary.presentDays;
    const absentCount = attWorkspace.summary.absentDays;
    const lateCount = attWorkspace.summary.lateMarksCount;
    const totalWorkingDays = Math.max(
      1,
      presentCount + absentCount + attWorkspace.summary.halfDays,
    );
    const attendancePercent = Math.min(
      100,
      Math.round(((presentCount + attWorkspace.summary.halfDays * 0.5) / totalWorkingDays) * 100),
    );

    const monthlyAttendance = {
      presentDays: presentCount,
      absentDays: absentCount,
      lateDays: lateCount,
      attendancePercent: attWorkspace.summary.attendancePercent ?? attendancePercent ?? 0,
      totalWorkingDays,
      history: attWorkspace.history,
    };

    // Action center tasks (combining pending items and assigned tasks)
    const actionCenterTasks = [
      {
        id: 'act-att-corr',
        title: 'Missed Punch Correction',
        category: 'attendance' as const,
        subtitle: 'Attendance • Needs attention',
        priority: 'urgent' as const,
        link: '/ess/attendance',
        dueDate: 'Today',
      },
      {
        id: 'act-policy-ack',
        title: 'Policy Acknowledgment',
        category: 'documents' as const,
        subtitle: 'Documents • Action required',
        priority: 'action_required' as const,
        link: '/ess/documents',
        dueDate: 'In 3 days',
      },
      {
        id: 'act-learn-train',
        title: 'Mandatory Information Security Training',
        category: 'learning' as const,
        subtitle: 'Learning • Due soon',
        priority: 'due_soon' as const,
        link: '/ess/tasks',
        dueDate: 'Oct 25',
      },
    ];

    const shiftTiming =
      attWorkspace.today.shift?.isAssigned !== false &&
      attWorkspace.today.shift?.startTime &&
      attWorkspace.today.shift?.endTime
        ? `${attWorkspace.today.shift.startTime}–${attWorkspace.today.shift.endTime}`
        : attWorkspace.today.shift?.name || 'Unassigned';

    const dailyBriefing = {
      pendingActionsCount: 3 + pendingRequestsCount,
      actionsSummary:
        'You have 1 attendance correction, 1 policy acknowledgment and 1 assigned training pending.',
      todayShift: shiftTiming,
      workLocation: attWorkspace.today.workLocation || 'Office',
      upcomingEventTitle: 'Engineering All-Hands Meeting',
    };

    // Published milestone achievement posters & Social Company Feed posts
    const publishedFeed = await milestoneRepository
      .getCompanyFeedPosts(ctx.tenantId, ctx.companyId, 10)
      .catch(() => []);

    const milestoneFeedPosts: EssFeedPost[] = publishedFeed.map((post) => ({
      id: post.id,
      type: 'milestone_poster' as const,
      title: post.title,
      subtitle: post.subtitle ?? 'Milestone Recognition',
      message: post.message,
      date: new Date(post.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      badge: post.badge || 'Milestone',
      likesCount: post.likesCount ?? 0,
      commentsCount: post.commentsCount ?? 0,
      hasLiked: false,
      posterData: (post.metadata as Record<string, unknown> | null)?.posterData as EssFeedPost['posterData'],
    }));

    const defaultCompanyFeed: EssFeedPost[] = [
      {
        id: 'feed-1',
        type: 'birthday' as const,
        title: 'Happy Birthday, Priya! 🎂',
        subtitle: 'Birthday • Today',
        message: 'Wishing you a fantastic year filled with happiness and success!',
        date: 'Today',
        badge: 'Birthday',
        likesCount: 14,
        commentsCount: 6,
        hasLiked: false,
      },
      {
        id: 'feed-2',
        type: 'new_joiner' as const,
        title: 'Welcome our new teammate, Karthik Raja!',
        subtitle: 'New Joiner • Engineering Department',
        message: 'Karthik joins us as Senior Frontend Engineer. Welcome aboard and happy building!',
        date: 'Yesterday',
        badge: 'New Joiner',
        likesCount: 22,
        commentsCount: 9,
        hasLiked: true,
      },
      {
        id: 'feed-3',
        type: 'event' as const,
        title: 'Annual Innovation Hackathon 2026',
        subtitle: 'Company Event • Oct 28',
        message:
          'Registration is now open for our annual hackathon. Form your team and register before Friday!',
        date: 'Oct 28, 2026',
        badge: 'Event',
        likesCount: 31,
        commentsCount: 12,
        hasLiked: false,
      },
    ];

    const companyFeed = [...milestoneFeedPosts, ...defaultCompanyFeed];

    // Upcoming calendar events
    const upcomingEvents = [
      {
        id: 'evt-1',
        title: 'Company Celebration & Townhall',
        dateStr: `${currentYear}-10-20`,
        dayNumber: 20,
        monthShort: 'OCT',
        category: 'Company Event',
        teamOrVenue: 'Main Auditorium / Hybrid',
      },
      {
        id: 'evt-2',
        title: 'Engineering Team Sprint Planning',
        dateStr: `${currentYear}-10-24`,
        dayNumber: 24,
        monthShort: 'OCT',
        category: 'Team Meeting',
        teamOrVenue: 'Engineering Team Room',
      },
      {
        id: 'evt-3',
        title: 'Diwali Holiday Celebration',
        dateStr: `${currentYear}-10-30`,
        dayNumber: 30,
        monthShort: 'OCT',
        category: 'Holiday Reminder',
        teamOrVenue: 'Company Calendar',
      },
    ];

    const growth = {
      learningProgressPercent: 65,
      activeCoursesCount: 2,
      activeGoalsCount: 3,
      pendingReviewsCount: 1,
      nextDeadline: 'Oct 31, 2026',
    };

    const myTeam = {
      reportingManagerName: 'Vikram Rathore',
      reportingManagerDesignation: 'VP of Engineering',
      teamMembers: [
        {
          id: 'tm-1',
          name: 'Priya Sharma',
          designation: 'Senior UI/UX Designer',
          status: 'working' as const,
          workLocation: 'Office',
        },
        {
          id: 'tm-2',
          name: 'Karthik Raja',
          designation: 'Frontend Engineer',
          status: 'working' as const,
          workLocation: 'Office',
        },
        {
          id: 'tm-3',
          name: 'Ananya Deshmukh',
          designation: 'Backend Architect',
          status: 'on_break' as const,
          workLocation: 'WFH',
        },
        {
          id: 'tm-4',
          name: 'Rahul Nair',
          designation: 'DevOps Engineer',
          status: 'on_leave' as const,
          workLocation: 'Office',
        },
      ],
    };

    const latestPayslip = {
      month: 'September 2026',
      released: true,
      maskedAmount: '₹ ••••••',
      actualAmount: 84500,
    };

    return {
      employee: summary,
      todayAttendance: attWorkspace.today,
      monthlyAttendance,
      dailyBriefing,
      leaveBalances: leaveBalanceItems,
      nextApprovedLeave: 'No upcoming leave',
      pendingRequestsCount,
      assignedTasksCount,
      unreadNotificationsCount,
      actionCenterTasks,
      companyFeed,
      upcomingEvents,
      growth,
      myTeam,
      latestPayslip,
      profileCompleteness: 85,
      recentNotifications: notifications.slice(0, 5),
      upcomingHolidays,
    };
  }

  async getFullProfile(ctx: EmployeeContext): Promise<EssFullProfile> {
    const profile = await this.repo.getFullProfile(ctx.id, ctx.tenantId, ctx.companyId);
    if (!profile) {
      throw new NotFoundError('Employee profile not found');
    }
    return profile;
  }

  async getCareerHistory(ctx: EmployeeContext): Promise<EssCareerEvent[]> {
    return this.repo.getCareerHistory(ctx.tenantId, ctx.companyId, ctx.id);
  }

  async createProfileChangeRequest(
    ctx: EmployeeContext,
    input: CreateProfileChangeRequestInput,
  ): Promise<EssProfileChangeRequestDto> {
    if (!input.subject || !input.subject.trim()) {
      throw new BadRequestError('Subject is required for change request');
    }
    if (!input.section) {
      throw new BadRequestError('Section is required');
    }
    const validSections = ['personal', 'address', 'emergency_contact', 'bank_account'];
    if (!validSections.includes(input.section)) {
      throw new BadRequestError(`Invalid section. Must be one of: ${validSections.join(', ')}`);
    }

    // Security Gate: Reject unencrypted bank account updates through generic change-requests
    if (input.section === 'bank_account') {
      throw new BadRequestError(
        'Bank account modifications cannot be submitted through generic change requests. Salary bank account changes require official physical or verified proof submission to HR Administration for statutory compliance.',
      );
    }

    if (
      !input.changes ||
      typeof input.changes !== 'object' ||
      Object.keys(input.changes).length === 0
    ) {
      throw new BadRequestError('Changes payload cannot be empty');
    }

    // Validate fields inside changes based on section to prevent arbitrary junk injection
    const allowedFieldsBySection: Record<string, string[]> = {
      personal: [
        'field',
        'fieldLabel',
        'proposedValue',
        'name',
        'firstName',
        'lastName',
        'dateOfBirth',
        'gender',
        'maritalStatus',
        'bloodGroup',
        'nationality',
        'nativeLanguage',
      ],
      address: [
        'field',
        'fieldLabel',
        'proposedValue',
        'addressStreet',
        'addressLine2',
        'addressCity',
        'addressDistrict',
        'addressState',
        'addressPostalCode',
        'addressCountry',
        'permanentAddressStreet',
        'permanentAddressLine2',
        'permanentAddressCity',
        'permanentAddressDistrict',
        'permanentAddressState',
        'permanentAddressPostalCode',
        'permanentAddressCountry',
      ],
      emergency_contact: [
        'field',
        'fieldLabel',
        'proposedValue',
        'name',
        'emergencyContactName',
        'relationship',
        'emergencyContactRelationship',
        'phone',
        'emergencyContactPhone',
        'email',
        'address',
        'priority',
      ],
    };

    const allowed = allowedFieldsBySection[input.section] || [];
    const changeKeys = Object.keys(input.changes);
    const hasValidKey = changeKeys.some((k) => allowed.includes(k));
    if (!hasValidKey) {
      throw new BadRequestError(`No recognized fields provided for section '${input.section}'`);
    }

    // If explicit field key is passed in structured payload, validate against allowed section fields
    if (typeof input.changes.field === 'string') {
      const allowedSpecific = allowed.filter(
        (k) => !['field', 'fieldLabel', 'proposedValue'].includes(k),
      );
      if (!allowedSpecific.includes(input.changes.field)) {
        throw new BadRequestError(
          `Invalid field key '${input.changes.field}' for section '${input.section}'`,
        );
      }
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
        reason: input.reason?.trim() || null,
      },
    });

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Profile Change Request Submitted',
      message: `Your request to update ${input.section} has been submitted for HR review.`,
      type: 'info',
      link: '/ess/profile',
    });

    return {
      id: request.id,
      requestType: request.requestType,
      subject: request.subject,
      section: input.section,
      reason: input.reason?.trim() || null,
      changes: this.sanitizeRequestChanges(input.section, input.changes),
      details: request.details as EssProfileChangeRequestDto['details'],
      status: request.status,
      reviewerNotes: request.reviewerNotes ?? null,
      createdAt:
        request.createdAt instanceof Date
          ? request.createdAt.toISOString()
          : new Date(request.createdAt).toISOString(),
      updatedAt:
        request.updatedAt instanceof Date
          ? request.updatedAt.toISOString()
          : new Date(request.updatedAt).toISOString(),
    };
  }

  async updateContactDetails(
    ctx: EmployeeContext,
    input: UpdateContactDetailsInput,
  ): Promise<EssFullProfile> {
    if (input.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.personalEmail.trim())) {
      throw new BadRequestError('Invalid personal email format');
    }

    await this.repo.updateContactDetails(ctx.tenantId, ctx.companyId, ctx.id, {
      personalEmail: input.personalEmail?.trim() || null,
      homePhone: input.homePhone?.trim() || null,
      businessPhone: input.businessPhone?.trim() || null,
      workPhone: input.workPhone?.trim() || null,
      addressStreet: input.addressStreet?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      addressCity: input.addressCity?.trim() || null,
      addressDistrict: input.addressDistrict?.trim() || null,
      addressState: input.addressState?.trim() || null,
      addressPostalCode: input.addressPostalCode?.trim() || null,
      addressCountry: input.addressCountry?.trim() || null,
      isPermanentSameAsCurrent: input.isPermanentSameAsCurrent ?? true,
      permanentAddressStreet: input.isPermanentSameAsCurrent
        ? input.addressStreet?.trim() || null
        : input.permanentAddressStreet?.trim() || null,
      permanentAddressLine2: input.isPermanentSameAsCurrent
        ? input.addressLine2?.trim() || null
        : input.permanentAddressLine2?.trim() || null,
      permanentAddressCity: input.isPermanentSameAsCurrent
        ? input.addressCity?.trim() || null
        : input.permanentAddressCity?.trim() || null,
      permanentAddressDistrict: input.isPermanentSameAsCurrent
        ? input.addressDistrict?.trim() || null
        : input.permanentAddressDistrict?.trim() || null,
      permanentAddressState: input.isPermanentSameAsCurrent
        ? input.addressState?.trim() || null
        : input.permanentAddressState?.trim() || null,
      permanentAddressPostalCode: input.isPermanentSameAsCurrent
        ? input.addressPostalCode?.trim() || null
        : input.permanentAddressPostalCode?.trim() || null,
      permanentAddressCountry: input.isPermanentSameAsCurrent
        ? input.addressCountry?.trim() || null
        : input.permanentAddressCountry?.trim() || null,
    });

    return this.getFullProfile(ctx);
  }

  async updateEmergencyContacts(ctx: EmployeeContext, items: EmergencyContactItemInput[]) {
    if (!Array.isArray(items)) {
      throw new BadRequestError('Emergency contacts must be an array');
    }
    if (items.length > 2) {
      throw new BadRequestError(
        'At most two emergency contacts (one primary, one secondary) are allowed',
      );
    }

    const priorities = items.map((i) => i.priority);
    if (new Set(priorities).size !== priorities.length) {
      throw new BadRequestError('At most one primary and one secondary contact are allowed');
    }
    if (items.length > 0 && !priorities.includes('primary')) {
      throw new BadRequestError('A primary emergency contact is required');
    }

    for (const [i, item] of items.entries()) {
      if (!item) continue;
      if (!item.name || !item.name.trim()) {
        throw new BadRequestError(`Emergency contact [${i}] name is required`);
      }
      if (!item.relationship || !item.relationship.trim()) {
        throw new BadRequestError(`Emergency contact [${i}] relationship is required`);
      }
      if (!item.phone || !item.phone.trim()) {
        throw new BadRequestError(`Emergency contact [${i}] phone is required`);
      }
      if (item.priority !== 'primary' && item.priority !== 'secondary') {
        throw new BadRequestError(
          `Emergency contact [${i}] priority must be 'primary' or 'secondary'`,
        );
      }
    }

    await this.repo.updateEmergencyContacts(ctx.tenantId, ctx.companyId, ctx.id, items);
    return this.getFullProfile(ctx);
  }

  async updateFamilyMembers(ctx: EmployeeContext, items: FamilyMemberItemInput[]) {
    if (!Array.isArray(items)) {
      throw new BadRequestError('Family members must be an array');
    }
    if (items.length > 20) {
      throw new BadRequestError('Cannot exceed 20 family members');
    }

    const todayStr = this.getTodayDateString();
    for (const [i, item] of items.entries()) {
      if (!item) continue;
      if (!item.name || !item.name.trim()) {
        throw new BadRequestError(`Family member [${i}] name is required`);
      }
      if (!item.relationship || !item.relationship.trim()) {
        throw new BadRequestError(`Family member [${i}] relationship is required`);
      }
      if (item.dateOfBirth) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.dateOfBirth)) {
          throw new BadRequestError(`Family member [${i}] date of birth must be YYYY-MM-DD`);
        }
        if (item.dateOfBirth > todayStr) {
          throw new BadRequestError(`Family member [${i}] date of birth cannot be in the future`);
        }
      }
    }

    await this.repo.updateFamilyMembers(ctx.tenantId, ctx.companyId, ctx.id, items);
    return this.getFullProfile(ctx);
  }

  async getProfileChangeRequests(ctx: EmployeeContext): Promise<EssProfileChangeRequestDto[]> {
    const rawList = await this.repo.getProfileChangeRequests(ctx.tenantId, ctx.companyId, ctx.id);
    return rawList.map((r) => {
      const details = (r.details || {}) as Record<string, unknown>;
      const section = typeof details.section === 'string' ? details.section : 'personal';
      const rawChanges = (details.changes || {}) as Record<string, unknown>;
      const sanitizedChanges = this.sanitizeRequestChanges(section, rawChanges);

      return {
        id: r.id,
        requestType: r.requestType,
        subject: r.subject,
        section,
        reason: typeof details.reason === 'string' ? details.reason : null,
        changes: sanitizedChanges,
        details: {
          ...details,
          section,
          changes: sanitizedChanges,
        },
        status: r.status,
        reviewerNotes: r.reviewerNotes ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  private sanitizeRequestChanges(
    section: string,
    rawChanges: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!rawChanges || typeof rawChanges !== 'object') return {};
    const sanitized: Record<string, unknown> = { ...rawChanges };

    const fieldName = String(rawChanges.field || '').toLowerCase();
    if (
      section === 'bank_account' ||
      fieldName.includes('bank') ||
      fieldName.includes('account') ||
      'accountNumber' in sanitized
    ) {
      if (typeof sanitized.proposedValue === 'string') {
        const val = sanitized.proposedValue.trim();
        sanitized.proposedValue = val.length > 4 ? `••••••••${val.slice(-4)}` : '••••••••';
      }
      if (typeof sanitized.accountNumber === 'string') {
        const val = sanitized.accountNumber.trim();
        sanitized.accountNumber = val.length > 4 ? `••••••••${val.slice(-4)}` : '••••••••';
      }
    }

    if (fieldName.includes('aadhaar')) {
      if (typeof sanitized.proposedValue === 'string') {
        const digits = sanitized.proposedValue.replace(/\D/g, '');
        sanitized.proposedValue = `•••• •••• ${digits.slice(-4) || '••••'}`;
      }
    } else if (fieldName.includes('pan')) {
      if (typeof sanitized.proposedValue === 'string') {
        const clean = sanitized.proposedValue.toUpperCase().replace(/\s/g, '');
        sanitized.proposedValue = clean.length >= 4 ? `••••••${clean.slice(-4)}` : '••••••••';
      }
    }

    return sanitized;
  }

  async getAttendanceWorkspace(ctx: EmployeeContext, month?: string) {
    const today = await attendanceWorkdayService.currentWorkday(
      ctx.tenantId,
      ctx.companyId,
      new Date(),
      ctx.id,
    );
    const [todayAtt, history, rawPunches, employeeView] = await Promise.all([
      this.repo.getTodayAttendance(ctx.tenantId, ctx.companyId, ctx.id, today),
      this.repo.getAttendanceHistory(ctx.tenantId, ctx.companyId, ctx.id, 90),
      this.repo.getEmployeeDayPunches(ctx.tenantId, ctx.companyId, ctx.id, today),
      attendanceEmployeeViewService.getView(ctx.tenantId, ctx.companyId, ctx.id, today),
    ]);

    // Parse punches and break state
    const punches = rawPunches.map((p) => ({
      id: p.id,
      punchType: p.punchType,
      punchTime: p.punchTime.toISOString(),
      source: p.source,
      workLocation: p.workLocation,
      notes: p.notes,
    }));

    let isOnBreak = false;
    let currentBreakType: string | null = null;
    let currentBreakStartTime: string | null = null;
    let totalBreakMinutes = 0;
    let lastBreakOut: Date | null = null;

    for (const p of rawPunches) {
      if (p.punchType === 'break_out') {
        isOnBreak = true;
        currentBreakType = p.notes?.split(':')[0]?.trim() ?? 'Break';
        currentBreakStartTime = p.punchTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        lastBreakOut = p.punchTime;
      } else if (p.punchType === 'break_in') {
        isOnBreak = false;
        currentBreakType = null;
        currentBreakStartTime = null;
        if (lastBreakOut) {
          const diffMs = p.punchTime.getTime() - lastBreakOut.getTime();
          totalBreakMinutes += Math.max(0, Math.round(diffMs / 60000));
          lastBreakOut = null;
        }
      }
    }

    // Calculate monthly summary counters for target month
    const targetMonthPrefix = month || today.slice(0, 7); // YYYY-MM
    let targetMonthRecords: EmployeeAttendance[] = [];
    if (month) {
      targetMonthRecords = await this.repo.getEmployeeAttendanceForMonth(
        ctx.tenantId,
        ctx.companyId,
        ctx.id,
        month,
      );
    }

    const recordsMap = new Map<string, EmployeeAttendance>();
    for (const h of history) {
      recordsMap.set(h.date, h);
    }
    for (const h of targetMonthRecords) {
      recordsMap.set(h.date, h);
    }
    const combinedRecords = Array.from(recordsMap.values());
    const currentMonthRecords = combinedRecords.filter((h) => h.date.startsWith(targetMonthPrefix));

    const presentDays = currentMonthRecords.filter((r) => r.status === 'present').length;
    const absentDays = currentMonthRecords.filter((r) => r.status === 'absent').length;
    const halfDays = currentMonthRecords.filter((r) => r.status === 'half_day').length;
    const leaveDays = currentMonthRecords.filter((r) => r.status === 'on_leave').length;
    const lateMarksCount = currentMonthRecords.filter((r) => r.isLate).length;
    const regularizationQuotaUsed = currentMonthRecords.filter((r) => r.isRegularized).length;
    const workedMinutes = currentMonthRecords.reduce((acc, r) => acc + (r.workedMinutes || 0), 0);
    const missingPunchesCount = currentMonthRecords.filter((r) => r.isMissingPunch).length;

    const totalWorkingDays = Math.max(0, presentDays + absentDays + halfDays);
    const attendancePercent =
      totalWorkingDays > 0
        ? Math.min(100, Math.round(((presentDays + halfDays * 0.5) / totalWorkingDays) * 100))
        : 0;

    const summary = {
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      payableDays: presentDays + leaveDays + halfDays * 0.5,
      lateMarksCount,
      regularizationQuotaUsed,
      regularizationQuotaLimit: 3,
      workedMinutes,
      missingPunchesCount,
      attendancePercent,
      totalWorkingDays,
    };

    const shift = await defaultShiftScheduleProvider.getAssignedShiftDetails(
      ctx.tenantId,
      ctx.companyId,
      ctx.id,
    );

    let returnedHistory = employeeView?.history ?? history;
    if (month && targetMonthRecords.length > 0) {
      const historyMap = new Map<string, EmployeeAttendance>();
      for (const rec of returnedHistory) {
        historyMap.set(rec.date, rec);
      }
      for (const rec of targetMonthRecords) {
        historyMap.set(rec.date, rec);
      }
      returnedHistory = Array.from(historyMap.values()).sort((a, b) =>
        b.date.localeCompare(a.date),
      );
    }

    return {
      today: {
        date: today,
        checkInTime: todayAtt?.checkInTime ?? null,
        checkOutTime: todayAtt?.checkOutTime ?? null,
        status: (todayAtt ? todayAtt.status : 'not_checked_in') as EssTodayAttendance['status'],
        workLocation: todayAtt?.workLocation ?? 'office',
        notes: todayAtt?.notes ?? null,
        workedMinutes: todayAtt?.workedMinutes ?? 0,
        breakMinutes: totalBreakMinutes,
        isOnBreak,
        currentBreakType,
        currentBreakStartTime,
        shift,
        punches,
      },
      summary,
      history: returnedHistory,
      monthlySummary: employeeView?.monthlySummary,
      view: employeeView?.view,
    };
  }

  async startBreak(ctx: EmployeeContext, input: BreakPunchInput) {
    const today = await attendanceWorkdayService.currentWorkday(
      ctx.tenantId,
      ctx.companyId,
      new Date(),
      ctx.id,
    );
    const result = await attendanceService.recordBreakStart(
      ctx.tenantId,
      ctx.companyId,
      ctx.id,
      today,
      input.breakType ?? 'tea',
      input.notes,
    );

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Break Started',
      message: `Break (${input.breakType ?? 'tea'}) started at ${result.startTime}.`,
      type: 'info',
      link: '/ess/attendance',
    });

    return result;
  }

  async endBreak(ctx: EmployeeContext, input?: { notes?: string }) {
    const today = await attendanceWorkdayService.currentWorkday(
      ctx.tenantId,
      ctx.companyId,
      new Date(),
      ctx.id,
    );
    const result = await attendanceService.recordBreakEnd(
      ctx.tenantId,
      ctx.companyId,
      ctx.id,
      today,
      input?.notes,
    );

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Break Ended',
      message: `Break ended at ${result.endTime}. Resumed work.`,
      type: 'success',
      link: '/ess/attendance',
    });

    return result;
  }

  async checkIn(ctx: EmployeeContext, input: CheckInInput) {
    const today = await attendanceWorkdayService.currentWorkday(
      ctx.tenantId,
      ctx.companyId,
      new Date(),
      ctx.id,
    );
    const { record, checkInTime } = await attendanceService.recordCheckIn(
      ctx.tenantId,
      ctx.companyId,
      ctx.id,
      today,
      input,
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
  }

  async checkOut(ctx: EmployeeContext, input?: CheckOutInput) {
    const today = await attendanceWorkdayService.currentWorkday(
      ctx.tenantId,
      ctx.companyId,
      new Date(),
      ctx.id,
    );
    const { updated, checkOutTime } = await attendanceService.recordCheckOut(
      ctx.tenantId,
      ctx.companyId,
      ctx.id,
      today,
      input,
    );

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

  private mapToRegularizationDto(reg: AttendanceRegularization): EssAttendanceRegularizationDto {
    const formatProposedCorrection = () => {
      if (reg.proposedCheckIn && reg.proposedCheckOut) {
        return `${reg.proposedCheckIn} – ${reg.proposedCheckOut}`;
      }
      if (reg.proposedCheckIn) {
        return `Check-in: ${reg.proposedCheckIn}`;
      }
      if (reg.proposedCheckOut) {
        return `Check-out: ${reg.proposedCheckOut}`;
      }
      if (reg.proposedStatus) {
        return `Status: ${reg.proposedStatus}`;
      }
      if (reg.claimedHours) {
        return `Claimed Hours: ${reg.claimedHours}h`;
      }
      return reg.requestType.replace(/_/g, ' ');
    };

    return {
      id: reg.id,
      requestNumber: reg.requestNumber,
      workday: reg.workday,
      date: reg.workday,
      requestType: reg.requestType,
      category: reg.requestType,
      approvalStatus: reg.approvalStatus,
      status: reg.approvalStatus === 'submitted' ? 'pending' : reg.approvalStatus,
      applicationStatus: reg.applicationStatus,
      proposedCorrection: formatProposedCorrection(),
      proposedCheckIn: reg.proposedCheckIn ?? null,
      proposedCheckOut: reg.proposedCheckOut ?? null,
      proposedStatus: reg.proposedStatus ?? null,
      claimedHours: reg.claimedHours ? Number(reg.claimedHours) : null,
      reason: reg.reason,
      decisionRemarks: reg.decisionReason ?? null,
      decisionReason: reg.decisionReason ?? null,
      decidedAt: reg.decidedAt ? reg.decidedAt.toISOString() : null,
      submittedAt: reg.submittedAt.toISOString(),
      createdAt: reg.createdAt.toISOString(),
    };
  }

  async regularizeAttendance(
    ctx: EmployeeContext,
    input: RegularizeAttendanceInput,
    actorUserId?: string,
  ): Promise<EssAttendanceRegularizationDto> {
    const workday = input.workday || input.date;
    if (!workday) {
      throw new BadRequestError('Date is required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workday)) {
      throw new BadRequestError('Date must be in YYYY-MM-DD format');
    }

    // Resolve proposed times
    const proposedCheckIn = (input.proposedCheckIn || input.checkInTime || '').trim() || undefined;
    const proposedCheckOut =
      (input.proposedCheckOut || input.checkOutTime || '').trim() || undefined;

    let requestType: RegularizationRequestType = 'incorrect_time';
    if (input.requestType) {
      const validTypes: RegularizationRequestType[] = [
        'missing_in',
        'missing_out',
        'incorrect_time',
        'status_correction',
        'worked_hours',
        'both_missing',
        'wrong_direction',
      ];
      if (!validTypes.includes(input.requestType as RegularizationRequestType)) {
        throw new BadRequestError(`Invalid regularization request type: ${input.requestType}`);
      }
      requestType = input.requestType as RegularizationRequestType;
    } else if (proposedCheckIn && !proposedCheckOut) {
      requestType = 'missing_in';
    } else if (!proposedCheckIn && proposedCheckOut) {
      requestType = 'missing_out';
    } else if (input.proposedStatus) {
      requestType = 'status_correction';
    } else if (input.claimedHours !== undefined && input.claimedHours !== null) {
      requestType = 'worked_hours';
    }

    const workflow = await attendanceRegularizationEligibilityService.getWorkflowSettings(
      ctx.tenantId,
      ctx.companyId,
    );
    const reason = input.reason?.trim();
    if (workflow.requireReason && (!reason || reason.length === 0)) {
      throw new BadRequestError('Reason is required for attendance regularization');
    }

    const record = await attendanceRegularizationService.submitRequest(
      ctx.tenantId,
      ctx.companyId,
      {
        employeeId: ctx.id,
        workday,
        requestType,
        proposedCheckIn,
        proposedCheckOut,
        proposedStatus: input.proposedStatus || undefined,
        claimedHours:
          input.claimedHours !== undefined && input.claimedHours !== null
            ? Number(input.claimedHours)
            : undefined,
        reason: reason || 'No reason provided',
        evidenceAttachments: input.evidenceAttachments,
      },
      actorUserId || ctx.id,
      true, // isSelfService
    );

    return this.mapToRegularizationDto(record);
  }

  async getAttendanceRegularizations(
    ctx: EmployeeContext,
  ): Promise<EssAttendanceRegularizationDto[]> {
    const records = await this.repo.getAttendanceRegularizations(
      ctx.tenantId,
      ctx.companyId,
      ctx.id,
    );
    return records.map((r) => this.mapToRegularizationDto(r));
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

  async updateTimesheet(ctx: EmployeeContext, id: string, input: UpdateTimesheetInput) {
    if (input.hours !== undefined && (input.hours <= 0 || input.hours > 24)) {
      throw new BadRequestError('Logged hours must be between 1 and 24 hours per entry');
    }
    const updated = await this.repo.updateTimesheet(ctx.tenantId, ctx.companyId, ctx.id, id, {
      ...(input.date ? { date: input.date } : {}),
      ...(input.projectName ? { projectName: input.projectName.trim() } : {}),
      ...(input.taskDescription ? { taskDescription: input.taskDescription.trim() } : {}),
      ...(input.hours !== undefined ? { hours: Math.round(input.hours) } : {}),
    });
    if (!updated) {
      throw new BadRequestError(
        'Timesheet entry not found or cannot be modified because it is not in draft status',
      );
    }
    return updated;
  }

  async deleteTimesheet(ctx: EmployeeContext, id: string) {
    const deleted = await this.repo.deleteTimesheet(ctx.tenantId, ctx.companyId, ctx.id, id);
    if (!deleted) {
      throw new BadRequestError(
        'Timesheet entry not found or cannot be deleted because it is not in draft status',
      );
    }
    return { success: true };
  }

  private maskDocumentIdentifier(
    documentName: string,
    rawNumber: string | null | undefined,
  ): string | null {
    if (!rawNumber || typeof rawNumber !== 'string') return null;
    const trimmed = rawNumber.trim();
    if (trimmed.length === 0) return null;

    const docNameLower = documentName.toLowerCase();

    // 1. Aadhaar Card (12 digits) - standard UIDAI masking: •••• •••• 1234
    if (docNameLower.includes('aadhaar') || docNameLower.includes('aadhar')) {
      const digitsOnly = trimmed.replace(/\D/g, '');
      const last4 = digitsOnly.slice(-4);
      return `•••• •••• ${last4.length === 4 ? last4 : '••••'}`;
    }

    // 2. PAN Card (10 chars, e.g. ABCDE1234F) - standard financial masking: ••••••1234F
    if (docNameLower.includes('pan')) {
      const clean = trimmed.toUpperCase().replace(/\s/g, '');
      if (clean.length >= 5) {
        return `••••••${clean.slice(-4)}`;
      }
      return '••••••••';
    }

    // 3. Passport (e.g. P1234567) - mask middle: P••••567
    if (docNameLower.includes('passport')) {
      const clean = trimmed.toUpperCase().replace(/\s/g, '');
      if (clean.length > 4) {
        return `${clean[0]}••••${clean.slice(-3)}`;
      }
      return '••••••••';
    }

    // 4. UAN, PF, ESI, Bank Account / Cheque
    if (
      docNameLower.includes('uan') ||
      docNameLower.includes('pf') ||
      docNameLower.includes('provident') ||
      docNameLower.includes('esi') ||
      docNameLower.includes('cheque') ||
      docNameLower.includes('passbook') ||
      docNameLower.includes('account')
    ) {
      const clean = trimmed.replace(/\s/g, '');
      if (clean.length > 4) {
        return `••••••••${clean.slice(-4)}`;
      }
      return '••••••••';
    }

    // 5. Generic fallback for other sensitive numbers
    const clean = trimmed.replace(/\s/g, '');
    if (clean.length > 4) {
      return `••••••••${clean.slice(-4)}`;
    }
    return '••••••••';
  }

  async getDocumentsWorkspace(ctx: EmployeeContext): Promise<{ documents: EssDocumentDto[] }> {
    const documents = await this.repo.getDocuments(ctx.tenantId, ctx.companyId, ctx.id);
    const safeDocuments: EssDocumentDto[] = documents.map((doc) => {
      const maskedNumber = this.maskDocumentIdentifier(doc.documentName, doc.documentNumber);
      // Only expose remarks if employee action/clarification is needed (rejected/resubmission)
      const safeRemarks =
        doc.status === 'resubmission_required' || doc.status === 'rejected'
          ? doc.verificationRemarks
          : null;

      return {
        id: doc.id,
        category: doc.category,
        documentName: doc.documentName,
        documentNumber: maskedNumber,
        status: doc.status,
        expiryDate: doc.expiryDate ?? null,
        verificationRemarks: safeRemarks,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      };
    });
    return { documents: safeDocuments };
  }

  async submitDocument(ctx: EmployeeContext, input: SubmitDocumentInput): Promise<EssDocumentDto> {
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

    return {
      id: doc.id,
      category: doc.category,
      documentName: doc.documentName,
      documentNumber: this.maskDocumentIdentifier(doc.documentName, doc.documentNumber),
      status: doc.status,
      expiryDate: doc.expiryDate ?? null,
      verificationRemarks: null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async getRequestsWorkspace(ctx: EmployeeContext) {
    const [generalRequests, regularizations] = await Promise.all([
      this.repo.getRequests(ctx.tenantId, ctx.companyId, ctx.id),
      this.repo.getAttendanceRegularizations(ctx.tenantId, ctx.companyId, ctx.id),
    ]);
    const mappedRegs = regularizations.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      companyId: r.companyId,
      employeeId: r.employeeId,
      requestType: 'attendance_regularization',
      subject: `Attendance Regularization for ${r.workday} (${r.requestNumber})`,
      status: (r.approvalStatus === 'submitted' ? 'pending' : r.approvalStatus) as
        'pending' | 'approved' | 'rejected' | 'cancelled',
      reviewerNotes: r.decisionReason ?? null,
      details: {
        requestNumber: r.requestNumber,
        workday: r.workday,
        regularizationType: r.requestType,
        proposedCheckIn: r.proposedCheckIn,
        proposedCheckOut: r.proposedCheckOut,
        reason: r.reason,
        decisionRemarks: r.decisionReason,
      },
      createdAt: r.submittedAt,
      updatedAt: r.updatedAt,
    }));
    return { requests: [...generalRequests, ...mappedRegs] };
  }

  async createServiceRequest(
    ctx: EmployeeContext,
    input: {
      requestType: 'document_request' | 'general_service';
      subject: string;
      details?: Record<string, unknown>;
    },
  ) {
    if (!input.requestType || !input.subject) {
      throw new BadRequestError('Request type and subject are required');
    }
    const request = await this.repo.createRequest({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      requestType: input.requestType,
      subject: input.subject.trim(),
      details: input.details || {},
    });

    await this.repo.createNotification({
      tenantId: ctx.tenantId,
      companyId: ctx.companyId,
      employeeId: ctx.id,
      title: 'Request Submitted',
      message: `Your request "${input.subject}" has been submitted for review.`,
      type: 'info',
      link: '/ess/requests',
    });

    return request;
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

  private getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
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

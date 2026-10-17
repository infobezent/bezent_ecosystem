import { eq, and, desc, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employees,
  departments,
  designations,
  locations,
  employeePersonalDetails,
  employeeFamilyMembers,
  employeeEmergencyContacts,
  employeeBankAccounts,
  employeeSkills,
  employeeWorkSchedules,
  employeeDocuments,
  employeeTimesheets,
  employeeRequests,
  employeeTasks,
  employeeNotifications,
  employeeActions,
  attendanceRegularizations,
  type EmployeeAttendance,
  type EmployeeLeaveBalance,
  type EmployeeLeaveRequest,
  type EmployeeTimesheet,
  type EmployeeDocument,
  type EmployeeRequest,
  type EmployeeTask,
  type EmployeeNotification,
  type AttendanceRegularization,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { NotFoundError, ConflictError } from '../../../../app/errors/AppError.js';
import type {
  EssEmployeeSummary,
  EssFullProfile,
  EssCareerEvent,
  UpdateContactDetailsInput,
  EmergencyContactItemInput,
  FamilyMemberItemInput,
} from '../types/ess.types.js';
import {
  attendanceRepository,
  AttendanceRepository,
} from '../../attendance/repository/attendance.repository.js';
import { leaveRepository, LeaveRepository } from '../../leave/repository/leave.repository.js';
import { alias } from 'drizzle-orm/mysql-core';

export class EssRepository {
  constructor(
    private readonly attendanceRepo: AttendanceRepository = attendanceRepository,
    private readonly leaveRepo: LeaveRepository = leaveRepository,
  ) {}
  async getEmployeeSummary(employeeId: string): Promise<EssEmployeeSummary | null> {
    const db = getDb();
    const manager = alias(employees, 'reporting_manager');
    const mgrDesig = alias(designations, 'reporting_manager_desig');
    const rows = await db
      .select({
        emp: employees,
        dept: departments,
        desig: designations,
        loc: locations,
        gender: employeePersonalDetails.gender,
        mgrFirstName: manager.firstName,
        mgrLastName: manager.lastName,
        mgrDesigName: mgrDesig.name,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .leftJoin(employeePersonalDetails, eq(employees.id, employeePersonalDetails.employeeId))
      .leftJoin(manager, eq(employees.reportingManagerId, manager.id))
      .leftJoin(mgrDesig, eq(manager.designationId, mgrDesig.id))
      .where(eq(employees.id, employeeId));

    const row = rows[0];
    if (!row) return null;

    const reportingManagerName = row.mgrFirstName
      ? `${row.mgrFirstName} ${row.mgrLastName ?? ''}`.trim()
      : null;

    return {
      id: row.emp.id,
      tenantId: row.emp.tenantId,
      companyId: row.emp.companyId,
      employeeNumber: row.emp.employeeNumber,
      firstName: row.emp.firstName,
      lastName: row.emp.lastName,
      email: row.emp.email,
      workPhone: row.emp.phone ?? null,
      departmentId: row.emp.departmentId,
      departmentName: row.dept?.name ?? null,
      departmentCode: row.dept?.code ?? null,
      designationId: row.emp.designationId,
      designationTitle: row.desig?.name ?? null,
      designationCode: row.desig?.code ?? null,
      locationId: row.emp.locationId,
      locationName: row.loc?.name ?? null,
      reportingManagerId: row.emp.reportingManagerId ?? null,
      reportingManagerName,
      reportingManagerDesignation: row.mgrDesigName ?? null,
      employmentType: row.emp.employmentType,
      employmentStatus: row.emp.employmentStatus,
      joiningDate: row.emp.joiningDate,
      probationEndDate: row.emp.probationEndDate ?? null,
      confirmationDate: row.emp.confirmationDate ?? null,
      confirmedJoiningDate: row.emp.confirmedJoiningDate ?? null,
      contractEndDate: row.emp.contractEndDate ?? null,
      noticePeriodDays: row.emp.noticePeriodDays ?? null,
      gender: row.gender ?? null,
      avatarPreference: null,
    };
  }

  private sanitizeDisplayLabel(val: unknown): string | null {
    if (!val || typeof val !== 'string') return null;
    const trimmed = val.trim();
    if (trimmed.length === 0) return null;

    // Reject UUIDs
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      return null;
    }

    // Reject surrogate IDs (e.g. desig_..., dept_..., loc_..., emp_..., usr_...)
    if (/^(desig|dept|loc|emp|usr|comp|tnt|action)_[0-9a-zA-Z_]+$/i.test(trimmed)) {
      return null;
    }

    return trimmed;
  }

  async getCareerHistory(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EssCareerEvent[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: employeeActions.id,
        actionType: employeeActions.actionType,
        effectiveDate: employeeActions.effectiveDate,
        changeData: employeeActions.changeData,
        appliedAt: employeeActions.appliedAt,
        createdAt: employeeActions.createdAt,
      })
      .from(employeeActions)
      .where(
        and(
          eq(employeeActions.tenantId, tenantId),
          eq(employeeActions.companyId, companyId),
          eq(employeeActions.employeeId, employeeId),
          eq(employeeActions.status, 'applied'),
          inArray(employeeActions.actionType, [
            'designation_change',
            'department_change',
            'location_transfer',
            'employment_type_change',
            'confirm_employee',
          ]),
        ),
      )
      .orderBy(desc(employeeActions.effectiveDate), desc(employeeActions.createdAt));

    const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contract: 'Contract',
      intern: 'Intern',
      probation: 'Probation',
      temporary: 'Temporary',
    };

    return rows.map((row) => {
      let eventLabel = 'Career Update';
      let previousValue: string | null = null;
      let newValue: string | null = null;

      // Extract safe labels from changeData without exposing raw internal json or reasons
      const changeSet = row.changeData as {
        changes?: Array<{
          field: string;
          from?: string | null;
          to?: string | null;
          fromLabel?: string | null;
          toLabel?: string | null;
        }>;
      } | null;

      const changes = Array.isArray(changeSet?.changes) ? changeSet!.changes : [];

      switch (row.actionType) {
        case 'designation_change': {
          eventLabel = 'Designation Change';
          const desigChange = changes.find((c) => c.field === 'designationId');
          if (desigChange) {
            previousValue = this.sanitizeDisplayLabel(desigChange.fromLabel);
            newValue = this.sanitizeDisplayLabel(desigChange.toLabel);
          }
          break;
        }
        case 'department_change': {
          eventLabel = 'Department Transfer';
          const deptChange = changes.find((c) => c.field === 'departmentId');
          if (deptChange) {
            previousValue = this.sanitizeDisplayLabel(deptChange.fromLabel);
            newValue = this.sanitizeDisplayLabel(deptChange.toLabel);
          }
          break;
        }
        case 'location_transfer': {
          eventLabel = 'Location Transfer';
          const locChange = changes.find((c) => c.field === 'locationId');
          if (locChange) {
            previousValue = this.sanitizeDisplayLabel(locChange.fromLabel);
            newValue = this.sanitizeDisplayLabel(locChange.toLabel);
          }
          break;
        }
        case 'employment_type_change': {
          eventLabel = 'Employment Type Change';
          const typeChange = changes.find((c) => c.field === 'employmentType');
          if (typeChange) {
            previousValue =
              this.sanitizeDisplayLabel(typeChange.fromLabel) ??
              (typeChange.from && EMPLOYMENT_TYPE_MAP[typeChange.from]
                ? (EMPLOYMENT_TYPE_MAP[typeChange.from] ?? null)
                : null);
            newValue =
              this.sanitizeDisplayLabel(typeChange.toLabel) ??
              (typeChange.to && EMPLOYMENT_TYPE_MAP[typeChange.to]
                ? (EMPLOYMENT_TYPE_MAP[typeChange.to] ?? null)
                : null);
          }
          break;
        }
        case 'confirm_employee': {
          eventLabel = 'Probation Confirmation';
          previousValue = 'Probation';
          newValue = 'Confirmed (Active)';
          break;
        }
      }

      return {
        id: row.id,
        eventType: row.actionType as EssCareerEvent['eventType'],
        eventLabel,
        effectiveDate: row.effectiveDate,
        previousValue,
        newValue,
        appliedAt: row.appliedAt ? row.appliedAt.toISOString() : null,
      };
    });
  }

  async getFullProfile(
    employeeId: string,
    tenantId?: string,
    companyId?: string,
  ): Promise<EssFullProfile | null> {
    const summary = await this.getEmployeeSummary(employeeId);
    if (!summary) return null;

    const db = getDb();
    const effectiveTenantId = tenantId ?? summary.tenantId;
    const effectiveCompanyId = companyId ?? summary.companyId;

    const [
      personalRows,
      familyRows,
      emergencyRows,
      bankRows,
      skillRows,
      scheduleRows,
      careerHistory,
    ] = await Promise.all([
      db
        .select()
        .from(employeePersonalDetails)
        .where(eq(employeePersonalDetails.employeeId, employeeId)),
      db
        .select()
        .from(employeeFamilyMembers)
        .where(eq(employeeFamilyMembers.employeeId, employeeId))
        .orderBy(employeeFamilyMembers.sortOrder),
      db
        .select()
        .from(employeeEmergencyContacts)
        .where(eq(employeeEmergencyContacts.employeeId, employeeId)),
      db.select().from(employeeBankAccounts).where(eq(employeeBankAccounts.employeeId, employeeId)),
      db
        .select()
        .from(employeeSkills)
        .where(eq(employeeSkills.employeeId, employeeId))
        .orderBy(employeeSkills.sortOrder),
      db
        .select()
        .from(employeeWorkSchedules)
        .where(eq(employeeWorkSchedules.employeeId, employeeId)),
      this.getCareerHistory(effectiveTenantId, effectiveCompanyId, employeeId),
    ]);

    const bank = bankRows[0];
    let maskedBank: EssFullProfile['bankAccount'] = null;
    if (bank) {
      const rawNum = (bank.accountNumber ?? '').trim();
      // Masking: account numbers with 4 or fewer characters must NOT be returned unmasked
      let masked = '••••••••';
      if (rawNum.length > 4) {
        masked = `••••••••${rawNum.slice(-4)}`;
      } else if (rawNum.length > 0) {
        masked = '••••••••';
      } else {
        masked = '—';
      }
      maskedBank = {
        bankName: bank.bankName,
        accountHolderName: bank.accountHolderName,
        maskedAccountNumber: masked,
        ifscCode: bank.ifscCode,
        branchName: bank.branchName ?? null,
        bankLocation: bank.bankLocation ?? null,
      };
    }

    return {
      employee: summary,
      personal: personalRows[0] ?? null,
      familyMembers: familyRows,
      emergencyContacts: emergencyRows,
      bankAccount: maskedBank,
      skills: skillRows,
      workSchedule: scheduleRows[0] ?? null,
      careerHistory,
    };
  }

  async updateContactDetails(
    tenantId: string,
    companyId: string,
    employeeId: string,
    data: UpdateContactDetailsInput,
  ): Promise<void> {
    const db = getDb();
    const [existing] = await db
      .select({ employeeId: employeePersonalDetails.employeeId })
      .from(employeePersonalDetails)
      .where(
        and(
          eq(employeePersonalDetails.tenantId, tenantId),
          eq(employeePersonalDetails.companyId, companyId),
          eq(employeePersonalDetails.employeeId, employeeId),
        ),
      );

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (data.personalEmail !== undefined) updatePayload.personalEmail = data.personalEmail;
    if (data.homePhone !== undefined) updatePayload.homePhone = data.homePhone;
    if (data.businessPhone !== undefined) updatePayload.businessPhone = data.businessPhone;
    if (data.workPhone !== undefined) updatePayload.workPhone = data.workPhone;
    if (data.addressStreet !== undefined) updatePayload.addressStreet = data.addressStreet;
    if (data.addressLine2 !== undefined) updatePayload.addressLine2 = data.addressLine2;
    if (data.addressCity !== undefined) updatePayload.addressCity = data.addressCity;
    if (data.addressDistrict !== undefined) updatePayload.addressDistrict = data.addressDistrict;
    if (data.addressState !== undefined) updatePayload.addressState = data.addressState;
    if (data.addressPostalCode !== undefined)
      updatePayload.addressPostalCode = data.addressPostalCode;
    if (data.addressCountry !== undefined) updatePayload.addressCountry = data.addressCountry;
    if (data.isPermanentSameAsCurrent !== undefined)
      updatePayload.isPermanentSameAsCurrent = data.isPermanentSameAsCurrent;
    if (data.permanentAddressStreet !== undefined)
      updatePayload.permanentAddressStreet = data.permanentAddressStreet;
    if (data.permanentAddressLine2 !== undefined)
      updatePayload.permanentAddressLine2 = data.permanentAddressLine2;
    if (data.permanentAddressCity !== undefined)
      updatePayload.permanentAddressCity = data.permanentAddressCity;
    if (data.permanentAddressDistrict !== undefined)
      updatePayload.permanentAddressDistrict = data.permanentAddressDistrict;
    if (data.permanentAddressState !== undefined)
      updatePayload.permanentAddressState = data.permanentAddressState;
    if (data.permanentAddressPostalCode !== undefined)
      updatePayload.permanentAddressPostalCode = data.permanentAddressPostalCode;
    if (data.permanentAddressCountry !== undefined)
      updatePayload.permanentAddressCountry = data.permanentAddressCountry;

    if (existing) {
      await db
        .update(employeePersonalDetails)
        .set(updatePayload)
        .where(
          and(
            eq(employeePersonalDetails.tenantId, tenantId),
            eq(employeePersonalDetails.companyId, companyId),
            eq(employeePersonalDetails.employeeId, employeeId),
          ),
        );
    } else {
      await db.insert(employeePersonalDetails).values({
        tenantId,
        companyId,
        employeeId,
        ...updatePayload,
      });
    }
  }

  async updateEmergencyContacts(
    tenantId: string,
    companyId: string,
    employeeId: string,
    items: EmergencyContactItemInput[],
  ): Promise<void> {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .delete(employeeEmergencyContacts)
        .where(
          and(
            eq(employeeEmergencyContacts.tenantId, tenantId),
            eq(employeeEmergencyContacts.companyId, companyId),
            eq(employeeEmergencyContacts.employeeId, employeeId),
          ),
        );

      if (items.length > 0) {
        await tx.insert(employeeEmergencyContacts).values(
          items.map((item) => ({
            id: generateSurrogateId('eec'),
            tenantId,
            companyId,
            employeeId,
            priority: item.priority,
            name: item.name,
            relationship: item.relationship,
            phone: item.phone,
            email: item.email ?? null,
            address: item.address ?? null,
            isPrivate: item.isPrivate ?? false,
          })),
        );
      }
    });
  }

  async updateFamilyMembers(
    tenantId: string,
    companyId: string,
    employeeId: string,
    items: FamilyMemberItemInput[],
  ): Promise<void> {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx
        .delete(employeeFamilyMembers)
        .where(
          and(
            eq(employeeFamilyMembers.tenantId, tenantId),
            eq(employeeFamilyMembers.companyId, companyId),
            eq(employeeFamilyMembers.employeeId, employeeId),
          ),
        );

      if (items.length > 0) {
        await tx.insert(employeeFamilyMembers).values(
          items.map((item, index) => ({
            id: generateSurrogateId('efm'),
            tenantId,
            companyId,
            employeeId,
            name: item.name,
            relationship: item.relationship,
            dateOfBirth: item.dateOfBirth ?? null,
            phone: item.phone ?? null,
            sortOrder: index,
          })),
        );
      }
    });
  }

  async getProfileChangeRequests(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeRequest[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeRequests)
      .where(
        and(
          eq(employeeRequests.tenantId, tenantId),
          eq(employeeRequests.companyId, companyId),
          eq(employeeRequests.employeeId, employeeId),
          eq(employeeRequests.requestType, 'profile_change'),
        ),
      )
      .orderBy(desc(employeeRequests.createdAt));
  }

  // ── Attendance Domain (Delegated to applications/hrms/attendance) ──────────
  async getTodayAttendance(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<EmployeeAttendance | null> {
    return this.attendanceRepo.getTodayAttendance(tenantId, companyId, employeeId, date);
  }

  async checkIn(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    checkInTime: string,
    workLocation: string = 'office',
    notes?: string,
  ): Promise<EmployeeAttendance> {
    return this.attendanceRepo.checkIn(
      tenantId,
      companyId,
      employeeId,
      date,
      checkInTime,
      workLocation,
      notes,
    );
  }

  async checkOut(id: string, checkOutTime: string): Promise<EmployeeAttendance> {
    return this.attendanceRepo.checkOut(id, checkOutTime);
  }

  async getAttendanceHistory(
    tenantId: string,
    companyId: string,
    employeeId: string,
    limit: number = 30,
  ): Promise<EmployeeAttendance[]> {
    return this.attendanceRepo.getAttendanceHistory(tenantId, companyId, employeeId, limit);
  }

  async getEmployeeAttendanceForMonth(
    tenantId: string,
    companyId: string,
    employeeId: string,
    yearMonth: string,
  ): Promise<EmployeeAttendance[]> {
    return this.attendanceRepo.getEmployeeAttendanceForMonth(
      tenantId,
      companyId,
      employeeId,
      yearMonth,
    );
  }

  async getEmployeeDayPunches(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ) {
    return this.attendanceRepo.getEmployeeDayPunches(tenantId, companyId, employeeId, date);
  }

  // ── Leave Domain (Delegated to applications/hrms/leave) ───────────────────
  async getLeaveBalances(
    tenantId: string,
    companyId: string,
    employeeId: string,
    year: number,
  ): Promise<EmployeeLeaveBalance[]> {
    return this.leaveRepo.getLeaveBalances(tenantId, companyId, employeeId, year);
  }

  async ensureDefaultLeaveBalances(
    tenantId: string,
    companyId: string,
    employeeId: string,
    year: number,
  ): Promise<EmployeeLeaveBalance[]> {
    return this.leaveRepo.ensureDefaultLeaveBalances(tenantId, companyId, employeeId, year);
  }

  async getLeaveRequests(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeLeaveRequest[]> {
    return this.leaveRepo.getLeaveRequests(tenantId, companyId, employeeId);
  }

  async findOverlappingLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<EmployeeLeaveRequest | null> {
    return this.leaveRepo.findOverlappingLeave(tenantId, companyId, employeeId, startDate, endDate);
  }

  async createLeaveRequest(data: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    leaveType: 'annual' | 'sick' | 'casual' | 'unpaid';
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
  }): Promise<EmployeeLeaveRequest> {
    return this.leaveRepo.createLeaveRequest(data);
  }

  async cancelLeaveRequest(id: string, employeeId: string): Promise<EmployeeLeaveRequest> {
    return this.leaveRepo.cancelLeaveRequest(id, employeeId);
  }

  // Timesheets
  async getTimesheets(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeTimesheet[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeTimesheets)
      .where(
        and(
          eq(employeeTimesheets.tenantId, tenantId),
          eq(employeeTimesheets.companyId, companyId),
          eq(employeeTimesheets.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeTimesheets.date), desc(employeeTimesheets.createdAt));
  }

  async logTimesheet(data: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    date: string;
    projectName: string;
    taskDescription: string;
    hours: number;
  }): Promise<EmployeeTimesheet> {
    const db = getDb();
    const id = generateSurrogateId('tms');
    await db.insert(employeeTimesheets).values({
      id,
      tenantId: data.tenantId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      date: data.date,
      projectName: data.projectName,
      taskDescription: data.taskDescription,
      hours: data.hours,
      status: 'draft',
    });

    const [created] = await db
      .select()
      .from(employeeTimesheets)
      .where(eq(employeeTimesheets.id, id));
    return created!;
  }

  async submitTimesheets(
    tenantId: string,
    companyId: string,
    employeeId: string,
    ids?: string[],
  ): Promise<number> {
    const db = getDb();
    const conditions = [
      eq(employeeTimesheets.tenantId, tenantId),
      eq(employeeTimesheets.companyId, companyId),
      eq(employeeTimesheets.employeeId, employeeId),
      eq(employeeTimesheets.status, 'draft'),
    ];

    if (ids && ids.length > 0) {
      conditions.push(inArray(employeeTimesheets.id, ids));
    }

    const targetRows = await db
      .select({ id: employeeTimesheets.id })
      .from(employeeTimesheets)
      .where(and(...conditions));

    if (targetRows.length === 0) return 0;

    const targetIds = targetRows.map((r) => r.id);
    await db
      .update(employeeTimesheets)
      .set({ status: 'submitted' })
      .where(inArray(employeeTimesheets.id, targetIds));

    return targetIds.length;
  }

  async getTimesheetById(
    tenantId: string,
    companyId: string,
    employeeId: string,
    id: string,
  ): Promise<EmployeeTimesheet | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(employeeTimesheets)
      .where(
        and(
          eq(employeeTimesheets.id, id),
          eq(employeeTimesheets.tenantId, tenantId),
          eq(employeeTimesheets.companyId, companyId),
          eq(employeeTimesheets.employeeId, employeeId),
        ),
      );
    return row ?? null;
  }

  async updateTimesheet(
    tenantId: string,
    companyId: string,
    employeeId: string,
    id: string,
    data: {
      date?: string;
      projectName?: string;
      taskDescription?: string;
      hours?: number;
    },
  ): Promise<EmployeeTimesheet | null> {
    const db = getDb();
    const existing = await this.getTimesheetById(tenantId, companyId, employeeId, id);
    if (!existing || existing.status !== 'draft') {
      return null;
    }

    const updates: Partial<{
      date: string;
      projectName: string;
      taskDescription: string;
      hours: number;
    }> = {};

    if (data.date !== undefined) updates.date = data.date;
    if (data.projectName !== undefined) updates.projectName = data.projectName;
    if (data.taskDescription !== undefined) updates.taskDescription = data.taskDescription;
    if (data.hours !== undefined) updates.hours = data.hours;

    if (Object.keys(updates).length > 0) {
      await db
        .update(employeeTimesheets)
        .set(updates)
        .where(
          and(
            eq(employeeTimesheets.id, id),
            eq(employeeTimesheets.tenantId, tenantId),
            eq(employeeTimesheets.companyId, companyId),
            eq(employeeTimesheets.employeeId, employeeId),
            eq(employeeTimesheets.status, 'draft'),
          ),
        );
    }

    return this.getTimesheetById(tenantId, companyId, employeeId, id);
  }

  async deleteTimesheet(
    tenantId: string,
    companyId: string,
    employeeId: string,
    id: string,
  ): Promise<boolean> {
    const db = getDb();
    const existing = await this.getTimesheetById(tenantId, companyId, employeeId, id);
    if (!existing || existing.status !== 'draft') {
      return false;
    }

    await db
      .delete(employeeTimesheets)
      .where(
        and(
          eq(employeeTimesheets.id, id),
          eq(employeeTimesheets.tenantId, tenantId),
          eq(employeeTimesheets.companyId, companyId),
          eq(employeeTimesheets.employeeId, employeeId),
          eq(employeeTimesheets.status, 'draft'),
        ),
      );

    return true;
  }

  // Documents
  async getDocuments(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeDocument[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeDocuments)
      .where(
        and(
          eq(employeeDocuments.tenantId, tenantId),
          eq(employeeDocuments.companyId, companyId),
          eq(employeeDocuments.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeDocuments.createdAt));
  }

  async createDocument(data: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    category:
      | 'personal_identity'
      | 'address_proof'
      | 'education'
      | 'previous_employment'
      | 'bank_payroll'
      | 'tax_other';
    documentName: string;
    documentNumber?: string;
    expiryDate?: string;
  }): Promise<EmployeeDocument> {
    const db = getDb();
    const id = generateSurrogateId('doc');
    await db.insert(employeeDocuments).values({
      id,
      tenantId: data.tenantId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      category: data.category,
      documentName: data.documentName,
      documentNumber: data.documentNumber ?? null,
      expiryDate: data.expiryDate ?? null,
      status: 'pending',
    });

    const [created] = await db.select().from(employeeDocuments).where(eq(employeeDocuments.id, id));
    return created!;
  }

  // Requests (Unified Ledger)
  async getRequests(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeRequest[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeRequests)
      .where(
        and(
          eq(employeeRequests.tenantId, tenantId),
          eq(employeeRequests.companyId, companyId),
          eq(employeeRequests.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeRequests.createdAt));
  }

  async createRequest(data: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    requestType:
      'profile_change' | 'attendance_regularization' | 'document_request' | 'general_service';
    subject: string;
    details: Record<string, unknown>;
  }): Promise<EmployeeRequest> {
    const db = getDb();
    const id = generateSurrogateId('req');
    await db.insert(employeeRequests).values({
      id,
      tenantId: data.tenantId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      requestType: data.requestType,
      subject: data.subject,
      details: data.details,
      status: 'pending',
    });

    const [created] = await db.select().from(employeeRequests).where(eq(employeeRequests.id, id));
    return created!;
  }

  async cancelRequest(id: string, employeeId: string): Promise<EmployeeRequest> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(employeeRequests)
      .where(and(eq(employeeRequests.id, id), eq(employeeRequests.employeeId, employeeId)));

    if (!existing) {
      throw new NotFoundError('Request not found');
    }
    if (existing.status !== 'pending') {
      throw new ConflictError(`Cannot cancel request with status '${existing.status}'`);
    }

    await db
      .update(employeeRequests)
      .set({ status: 'cancelled' })
      .where(eq(employeeRequests.id, id));

    const [updated] = await db.select().from(employeeRequests).where(eq(employeeRequests.id, id));
    return updated!;
  }

  // Tasks
  async getTasks(tenantId: string, companyId: string, employeeId: string): Promise<EmployeeTask[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeTasks)
      .where(
        and(
          eq(employeeTasks.tenantId, tenantId),
          eq(employeeTasks.companyId, companyId),
          eq(employeeTasks.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeTasks.createdAt));
  }

  async updateTaskStatus(
    id: string,
    employeeId: string,
    status: 'pending' | 'in_progress' | 'completed',
  ): Promise<EmployeeTask> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(employeeTasks)
      .where(and(eq(employeeTasks.id, id), eq(employeeTasks.employeeId, employeeId)));

    if (!existing) {
      throw new NotFoundError('Task not found');
    }

    await db.update(employeeTasks).set({ status }).where(eq(employeeTasks.id, id));

    const [updated] = await db.select().from(employeeTasks).where(eq(employeeTasks.id, id));
    return updated!;
  }

  async createTask(data: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    title: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<EmployeeTask> {
    const db = getDb();
    const id = generateSurrogateId('tsk');
    await db.insert(employeeTasks).values({
      id,
      tenantId: data.tenantId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ?? null,
      priority: data.priority ?? 'medium',
      status: 'pending',
    });

    const [created] = await db.select().from(employeeTasks).where(eq(employeeTasks.id, id));
    return created!;
  }

  // Notifications
  async getNotifications(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeNotification[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeNotifications)
      .where(
        and(
          eq(employeeNotifications.tenantId, tenantId),
          eq(employeeNotifications.companyId, companyId),
          eq(employeeNotifications.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeNotifications.createdAt))
      .limit(50);
  }

  async markNotificationAsRead(id: string, employeeId: string): Promise<EmployeeNotification> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(employeeNotifications)
      .where(
        and(eq(employeeNotifications.id, id), eq(employeeNotifications.employeeId, employeeId)),
      );

    if (!existing) {
      throw new NotFoundError('Notification not found');
    }

    await db
      .update(employeeNotifications)
      .set({ isRead: true })
      .where(eq(employeeNotifications.id, id));

    const [updated] = await db
      .select()
      .from(employeeNotifications)
      .where(eq(employeeNotifications.id, id));
    return updated!;
  }

  async markAllNotificationsAsRead(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<number> {
    const db = getDb();
    const unread = await db
      .select({ id: employeeNotifications.id })
      .from(employeeNotifications)
      .where(
        and(
          eq(employeeNotifications.tenantId, tenantId),
          eq(employeeNotifications.companyId, companyId),
          eq(employeeNotifications.employeeId, employeeId),
          eq(employeeNotifications.isRead, false),
        ),
      );

    if (unread.length === 0) return 0;

    await db
      .update(employeeNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(employeeNotifications.tenantId, tenantId),
          eq(employeeNotifications.companyId, companyId),
          eq(employeeNotifications.employeeId, employeeId),
          eq(employeeNotifications.isRead, false),
        ),
      );

    return unread.length;
  }

  async createNotification(data: {
    tenantId: string;
    companyId: string;
    employeeId: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'action_required';
    link?: string;
  }): Promise<EmployeeNotification> {
    const db = getDb();
    const id = generateSurrogateId('notif');
    await db.insert(employeeNotifications).values({
      id,
      tenantId: data.tenantId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      title: data.title,
      message: data.message,
      type: data.type ?? 'info',
      link: data.link ?? null,
      isRead: false,
    });

    const [created] = await db
      .select()
      .from(employeeNotifications)
      .where(eq(employeeNotifications.id, id));
    return created!;
  }

  // Attendance Regularization
  async getAttendanceRegularizations(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<AttendanceRegularization[]> {
    const db = getDb();
    return db
      .select()
      .from(attendanceRegularizations)
      .where(
        and(
          eq(attendanceRegularizations.tenantId, tenantId),
          eq(attendanceRegularizations.companyId, companyId),
          eq(attendanceRegularizations.employeeId, employeeId),
        ),
      )
      .orderBy(desc(attendanceRegularizations.submittedAt));
  }
}

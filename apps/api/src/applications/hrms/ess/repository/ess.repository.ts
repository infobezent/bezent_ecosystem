import { eq, and, desc, sql, gte, lte, or, inArray } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  employees,
  departments,
  designations,
  locations,
  employeePersonalDetails,
  employeeFamilyMembers,
  employeeNominees,
  employeeEmergencyContacts,
  employeeBankAccounts,
  employeeSkills,
  employeeWorkSchedules,
  employeeDocuments,
  employeeAttendance,
  employeeLeaveBalances,
  employeeLeaveRequests,
  employeeTimesheets,
  employeeRequests,
  employeeTasks,
  employeeNotifications,
  type Employee,
  type EmployeeAttendance,
  type EmployeeLeaveBalance,
  type EmployeeLeaveRequest,
  type EmployeeTimesheet,
  type EmployeeDocument,
  type EmployeeRequest,
  type EmployeeTask,
  type EmployeeNotification,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import type { EssEmployeeSummary, EssFullProfile } from '../types/ess.types.js';

export class EssRepository {
  async getEmployeeSummary(employeeId: string): Promise<EssEmployeeSummary | null> {
    const db = getDb();
    const rows = await db
      .select({
        emp: employees,
        dept: departments,
        desig: designations,
        loc: locations,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(locations, eq(employees.locationId, locations.id))
      .where(eq(employees.id, employeeId));

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.emp.id,
      tenantId: row.emp.tenantId,
      companyId: row.emp.companyId,
      employeeNumber: row.emp.employeeNumber,
      firstName: row.emp.firstName,
      lastName: row.emp.lastName,
      email: row.emp.email,
      departmentId: row.emp.departmentId,
      departmentName: row.dept?.name ?? null,
      designationId: row.emp.designationId,
      designationTitle: row.desig?.name ?? null,
      locationId: row.emp.locationId,
      locationName: row.loc?.name ?? null,
      employmentType: row.emp.employmentType,
      employmentStatus: row.emp.employmentStatus,
      joiningDate: row.emp.joiningDate,
    };
  }

  async getFullProfile(employeeId: string): Promise<EssFullProfile | null> {
    const summary = await this.getEmployeeSummary(employeeId);
    if (!summary) return null;

    const db = getDb();

    const [personalRows, familyRows, emergencyRows, bankRows, skillRows, scheduleRows] = await Promise.all([
      db.select().from(employeePersonalDetails).where(eq(employeePersonalDetails.employeeId, employeeId)),
      db.select().from(employeeFamilyMembers).where(eq(employeeFamilyMembers.employeeId, employeeId)).orderBy(employeeFamilyMembers.sortOrder),
      db.select().from(employeeEmergencyContacts).where(eq(employeeEmergencyContacts.employeeId, employeeId)),
      db.select().from(employeeBankAccounts).where(eq(employeeBankAccounts.employeeId, employeeId)),
      db.select().from(employeeSkills).where(eq(employeeSkills.employeeId, employeeId)).orderBy(employeeSkills.sortOrder),
      db.select().from(employeeWorkSchedules).where(eq(employeeWorkSchedules.employeeId, employeeId)),
    ]);

    const bank = bankRows[0];
    let maskedBank: EssFullProfile['bankAccount'] = null;
    if (bank) {
      const rawNum = bank.accountNumber ?? '';
      const masked = rawNum.length > 4 ? `••••••••${rawNum.slice(-4)}` : rawNum;
      maskedBank = {
        bankName: bank.bankName,
        accountHolderName: bank.accountHolderName,
        maskedAccountNumber: masked,
        ifscCode: bank.ifscCode,
        branchName: bank.branchName,
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
    };
  }

  // Attendance
  async getTodayAttendance(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<EmployeeAttendance | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, employeeId),
          eq(employeeAttendance.date, date),
        ),
      );
    return rows[0] ?? null;
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
    const db = getDb();
    const existing = await this.getTodayAttendance(tenantId, companyId, employeeId, date);
    if (existing) {
      if (existing.checkInTime) {
        throw new Error('Attendance check-in already recorded for today');
      }
      await db
        .update(employeeAttendance)
        .set({
          checkInTime,
          workLocation,
          notes: notes ?? existing.notes,
        })
        .where(eq(employeeAttendance.id, existing.id));
      const [updated] = await db.select().from(employeeAttendance).where(eq(employeeAttendance.id, existing.id));
      return updated!;
    }

    const id = generateSurrogateId('att');
    await db.insert(employeeAttendance).values({
      id,
      tenantId,
      companyId,
      employeeId,
      date,
      checkInTime,
      workLocation,
      notes: notes ?? null,
      status: 'present',
    });

    const [created] = await db.select().from(employeeAttendance).where(eq(employeeAttendance.id, id));
    return created!;
  }

  async checkOut(id: string, checkOutTime: string): Promise<EmployeeAttendance> {
    const db = getDb();
    await db
      .update(employeeAttendance)
      .set({ checkOutTime })
      .where(eq(employeeAttendance.id, id));
    const [updated] = await db.select().from(employeeAttendance).where(eq(employeeAttendance.id, id));
    return updated!;
  }

  async getAttendanceHistory(
    tenantId: string,
    companyId: string,
    employeeId: string,
    limit: number = 30,
  ): Promise<EmployeeAttendance[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeAttendance)
      .where(
        and(
          eq(employeeAttendance.tenantId, tenantId),
          eq(employeeAttendance.companyId, companyId),
          eq(employeeAttendance.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeAttendance.date))
      .limit(limit);
  }

  // Leave
  async getLeaveBalances(
    tenantId: string,
    companyId: string,
    employeeId: string,
    year: number,
  ): Promise<EmployeeLeaveBalance[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeLeaveBalances)
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, tenantId),
          eq(employeeLeaveBalances.companyId, companyId),
          eq(employeeLeaveBalances.employeeId, employeeId),
          eq(employeeLeaveBalances.year, year),
        ),
      );
  }

  async ensureDefaultLeaveBalances(
    tenantId: string,
    companyId: string,
    employeeId: string,
    year: number,
  ): Promise<EmployeeLeaveBalance[]> {
    const existing = await this.getLeaveBalances(tenantId, companyId, employeeId, year);
    if (existing.length > 0) return existing;

    const db = getDb();
    const defaults: Array<{ leaveType: 'annual' | 'sick' | 'casual' | 'unpaid'; totalDays: number }> = [
      { leaveType: 'annual', totalDays: 18 },
      { leaveType: 'sick', totalDays: 12 },
      { leaveType: 'casual', totalDays: 6 },
      { leaveType: 'unpaid', totalDays: 0 },
    ];

    for (const def of defaults) {
      await db.insert(employeeLeaveBalances).values({
        id: generateSurrogateId('lvb'),
        tenantId,
        companyId,
        employeeId,
        leaveType: def.leaveType,
        totalDays: def.totalDays,
        usedDays: 0,
        pendingDays: 0,
        year,
      });
    }

    return this.getLeaveBalances(tenantId, companyId, employeeId, year);
  }

  async getLeaveRequests(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeLeaveRequest[]> {
    const db = getDb();
    return db
      .select()
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, employeeId),
        ),
      )
      .orderBy(desc(employeeLeaveRequests.createdAt));
  }

  async findOverlappingLeave(
    tenantId: string,
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<EmployeeLeaveRequest | null> {
    const db = getDb();
    // Overlap: existing.startDate <= newEndDate AND existing.endDate >= newStartDate
    const rows = await db
      .select()
      .from(employeeLeaveRequests)
      .where(
        and(
          eq(employeeLeaveRequests.tenantId, tenantId),
          eq(employeeLeaveRequests.companyId, companyId),
          eq(employeeLeaveRequests.employeeId, employeeId),
          inArray(employeeLeaveRequests.status, ['pending', 'approved']),
          lte(employeeLeaveRequests.startDate, endDate),
          gte(employeeLeaveRequests.endDate, startDate),
        ),
      );
    return rows[0] ?? null;
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
    const db = getDb();
    const id = generateSurrogateId('lvrq');
    await db.insert(employeeLeaveRequests).values({
      id,
      tenantId: data.tenantId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      reason: data.reason,
      status: 'pending',
    });

    // Update pending days on leave balance if applicable
    const year = new Date(data.startDate).getFullYear();
    await db
      .update(employeeLeaveBalances)
      .set({
        pendingDays: sql`${employeeLeaveBalances.pendingDays} + ${data.totalDays}`,
      })
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, data.tenantId),
          eq(employeeLeaveBalances.companyId, data.companyId),
          eq(employeeLeaveBalances.employeeId, data.employeeId),
          eq(employeeLeaveBalances.leaveType, data.leaveType),
          eq(employeeLeaveBalances.year, year),
        ),
      );

    const [created] = await db.select().from(employeeLeaveRequests).where(eq(employeeLeaveRequests.id, id));
    return created!;
  }

  async cancelLeaveRequest(
    id: string,
    employeeId: string,
  ): Promise<EmployeeLeaveRequest> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(employeeLeaveRequests)
      .where(and(eq(employeeLeaveRequests.id, id), eq(employeeLeaveRequests.employeeId, employeeId)));

    if (!existing) {
      throw new Error('Leave request not found');
    }
    if (existing.status !== 'pending') {
      throw new Error(`Cannot cancel leave request with status '${existing.status}'`);
    }

    await db
      .update(employeeLeaveRequests)
      .set({ status: 'cancelled' })
      .where(eq(employeeLeaveRequests.id, id));

    const year = new Date(existing.startDate).getFullYear();
    await db
      .update(employeeLeaveBalances)
      .set({
        pendingDays: sql`GREATEST(0, ${employeeLeaveBalances.pendingDays} - ${existing.totalDays})`,
      })
      .where(
        and(
          eq(employeeLeaveBalances.tenantId, existing.tenantId),
          eq(employeeLeaveBalances.companyId, existing.companyId),
          eq(employeeLeaveBalances.employeeId, existing.employeeId),
          eq(employeeLeaveBalances.leaveType, existing.leaveType),
          eq(employeeLeaveBalances.year, year),
        ),
      );

    const [updated] = await db.select().from(employeeLeaveRequests).where(eq(employeeLeaveRequests.id, id));
    return updated!;
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

    const [created] = await db.select().from(employeeTimesheets).where(eq(employeeTimesheets.id, id));
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
    requestType: 'profile_change' | 'attendance_regularization' | 'document_request' | 'general_service';
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
      throw new Error('Request not found');
    }
    if (existing.status !== 'pending') {
      throw new Error(`Cannot cancel request with status '${existing.status}'`);
    }

    await db
      .update(employeeRequests)
      .set({ status: 'cancelled' })
      .where(eq(employeeRequests.id, id));

    const [updated] = await db.select().from(employeeRequests).where(eq(employeeRequests.id, id));
    return updated!;
  }

  // Tasks
  async getTasks(
    tenantId: string,
    companyId: string,
    employeeId: string,
  ): Promise<EmployeeTask[]> {
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
      throw new Error('Task not found');
    }

    await db
      .update(employeeTasks)
      .set({ status })
      .where(eq(employeeTasks.id, id));

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
      .where(and(eq(employeeNotifications.id, id), eq(employeeNotifications.employeeId, employeeId)));

    if (!existing) {
      throw new Error('Notification not found');
    }

    await db
      .update(employeeNotifications)
      .set({ isRead: true })
      .where(eq(employeeNotifications.id, id));

    const [updated] = await db.select().from(employeeNotifications).where(eq(employeeNotifications.id, id));
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

    const [created] = await db.select().from(employeeNotifications).where(eq(employeeNotifications.id, id));
    return created!;
  }
}

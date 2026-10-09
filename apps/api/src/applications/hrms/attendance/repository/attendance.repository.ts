import { eq, and, desc } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { employeeAttendance, type EmployeeAttendance } from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';

export class AttendanceRepository {
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
    workLocation: string,
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
      const [updated] = await db
        .select()
        .from(employeeAttendance)
        .where(eq(employeeAttendance.id, existing.id));
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

    const [created] = await db
      .select()
      .from(employeeAttendance)
      .where(eq(employeeAttendance.id, id));
    return created!;
  }

  async checkOut(id: string, checkOutTime: string): Promise<EmployeeAttendance> {
    const db = getDb();
    await db.update(employeeAttendance).set({ checkOutTime }).where(eq(employeeAttendance.id, id));
    const [updated] = await db
      .select()
      .from(employeeAttendance)
      .where(eq(employeeAttendance.id, id));
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
}

export const attendanceRepository = new AttendanceRepository();

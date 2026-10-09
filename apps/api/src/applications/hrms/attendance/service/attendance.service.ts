import {
  AttendanceRepository,
  attendanceRepository,
} from '../repository/attendance.repository.js';
import { BadRequestError, ConflictError } from '../../../../app/errors/AppError.js';
import type { CheckInInput, EmployeeAttendance } from '../types/attendance.types.js';

export class AttendanceService {
  constructor(private readonly repo: AttendanceRepository = attendanceRepository) {}

  getCurrentTimeString(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async getTodayAttendance(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<EmployeeAttendance | null> {
    return this.repo.getTodayAttendance(tenantId, companyId, employeeId, date);
  }

  async recordCheckIn(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
    input: CheckInInput,
  ): Promise<{ record: EmployeeAttendance; checkInTime: string }> {
    const checkInTime = this.getCurrentTimeString();
    try {
      const record = await this.repo.checkIn(
        tenantId,
        companyId,
        employeeId,
        date,
        checkInTime,
        input.workLocation ?? 'office',
        input.notes,
      );
      return { record, checkInTime };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('already recorded')) {
        throw new ConflictError(err.message);
      }
      throw err;
    }
  }

  async recordCheckOut(
    tenantId: string,
    companyId: string,
    employeeId: string,
    date: string,
  ): Promise<{ updated: EmployeeAttendance; checkOutTime: string }> {
    const todayAtt = await this.repo.getTodayAttendance(tenantId, companyId, employeeId, date);
    if (!todayAtt || !todayAtt.checkInTime) {
      throw new BadRequestError('Cannot check out before checking in today');
    }
    if (todayAtt.checkOutTime) {
      throw new ConflictError('Check out already recorded for today');
    }

    const checkOutTime = this.getCurrentTimeString();
    const updated = await this.repo.checkOut(todayAtt.id, checkOutTime);
    return { updated, checkOutTime };
  }

  async getAttendanceHistory(
    tenantId: string,
    companyId: string,
    employeeId: string,
    limit: number = 30,
  ): Promise<EmployeeAttendance[]> {
    return this.repo.getAttendanceHistory(tenantId, companyId, employeeId, limit);
  }
}

export const attendanceService = new AttendanceService();

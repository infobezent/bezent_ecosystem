import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';

/**
 * Which attendance workday does "now" belong to?
 *
 * The company's day boundary (HR Settings -> Attendance -> General) is the clock
 * time at which a new attendance day starts. With a 04:00 boundary a 01:30
 * punch still belongs to the previous workday, which is what lets night-shift
 * employees check out after midnight. A boundary of 00:00 (the default) keeps the
 * plain calendar date.
 */

export function boundaryToMilliseconds(boundaryTime: string | null | undefined): number {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(boundaryTime ?? '');
  if (!match) return 0;
  const [hours, minutes, seconds] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  if (hours > 23 || minutes > 59 || seconds > 59) return 0;
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

/** Local-time workday (YYYY-MM-DD) of `now` for a given day boundary. */
export function resolveWorkday(now: Date, boundaryTime: string | null | undefined): string {
  const shifted = new Date(now.getTime() - boundaryToMilliseconds(boundaryTime));
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${shifted.getFullYear()}-${month}-${day}`;
}

export class AttendanceWorkdayService {
  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
  ) {}

  async currentWorkday(
    tenantId: string,
    companyId: string,
    now: Date = new Date(),
  ): Promise<string> {
    const settings = await this.settingsRepo.getGeneralSettings(tenantId, companyId);
    return resolveWorkday(now, settings?.dayBoundaryTime);
  }
}

export const attendanceWorkdayService = new AttendanceWorkdayService();

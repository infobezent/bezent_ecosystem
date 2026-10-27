import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import { employeeNotifications, employees } from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import {
  attendanceSettingsRepository,
  type AttendanceSettingsRepository,
} from '../repository/attendanceSettings.repository.js';

/**
 * Attendance alerts (HR Settings -> Attendance -> General -> Notifications).
 *
 * Delivers the enabled events to the in-app notification feed. Only the
 * `in_app` channel is delivered; email, push and SMS need a delivery channel
 * that does not exist for attendance yet. Recipients `hr` and `device_admin`
 * have no recipient mapping yet and are skipped. A company that never saved
 * attendance settings gets no alerts. An alert can never fail the action that
 * triggered it.
 */

export type AttendanceAlertEvent =
  'lateArrival' | 'earlyExit' | 'regularizationPending' | 'missingPunch';

export interface AttendanceAlertSubject {
  employeeId: string;
  /** Employee who must act on the item, for the `assigned_approver` recipient. */
  approverEmployeeId?: string | null;
}

export interface AttendanceAlertContent {
  /** Text after the employee's name, e.g. "checked in 25 minutes late". */
  detail: string;
  title: string;
  link: string;
  type?: 'info' | 'warning' | 'action_required';
}

/** Events where the employee already receives their own confirmation elsewhere. */
const SKIP_EMPLOYEE_RECIPIENT: ReadonlySet<AttendanceAlertEvent> = new Set([
  'regularizationPending',
]);

export class AttendanceAlertService {
  constructor(
    private readonly settingsRepo: AttendanceSettingsRepository = attendanceSettingsRepository,
  ) {}

  async notify(
    tenantId: string,
    companyId: string,
    event: AttendanceAlertEvent,
    subject: AttendanceAlertSubject,
    content: AttendanceAlertContent,
  ): Promise<number> {
    try {
      const settings = await this.settingsRepo.getGeneralSettings(tenantId, companyId);
      const config = settings?.alertSettings?.events?.[event];
      if (!config?.enabled || !config.channels.includes('in_app')) return 0;

      const db = getDb();
      const [person] = await db
        .select({
          firstName: employees.firstName,
          lastName: employees.lastName,
          reportingManagerId: employees.reportingManagerId,
        })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.companyId, companyId),
            eq(employees.id, subject.employeeId),
          ),
        )
        .limit(1);
      if (!person) return 0;
      const name = `${person.firstName} ${person.lastName ?? ''}`.trim();

      const recipients = new Set<string>();
      for (const recipient of config.recipients) {
        if (recipient === 'employee' && !SKIP_EMPLOYEE_RECIPIENT.has(event)) {
          recipients.add(subject.employeeId);
        } else if (recipient === 'reporting_manager' && person.reportingManagerId) {
          recipients.add(person.reportingManagerId);
        } else if (recipient === 'assigned_approver' && subject.approverEmployeeId) {
          recipients.add(subject.approverEmployeeId);
        }
      }

      for (const employeeId of recipients) {
        await db.insert(employeeNotifications).values({
          id: generateSurrogateId('notif'),
          tenantId,
          companyId,
          employeeId,
          title: content.title,
          message: `${employeeId === subject.employeeId ? 'You' : name} ${content.detail}`.slice(
            0,
            500,
          ),
          type: content.type ?? 'info',
          link: content.link,
        });
      }
      return recipients.size;
    } catch {
      return 0;
    }
  }
}

export const attendanceAlertService = new AttendanceAlertService();

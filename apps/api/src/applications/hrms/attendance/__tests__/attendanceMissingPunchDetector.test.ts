import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { eq, and } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  attendanceExceptions,
  attendanceExceptionAudits,
  employees,
  attendanceGeneralSettings,
  employeeNotifications,
} from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';
import { attendanceMissingPunchDetectorService } from '../service/attendanceMissingPunchDetector.service.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS — Automated Missing Punch Detector & Sweeper Daemon Acceptance Suite',
  () => {
    const app = createApp();
    const tenantId = 'tenant_demo_01';
    const companyId = 'comp_demo_01';

    let headers: Record<string, string>;
    const empId = 'emp_mp_detector_001';
    const testDate = '2026-10-13'; // Past workday
    const attId = 'att_mp_detector_test_001';

    beforeAll(async () => {
      headers = await hrmsTestHeaders(companyId, tenantId);
      const db = getDb();

      // Clean up previous runs
      await db
        .delete(attendanceExceptions)
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.employeeId, empId),
          ),
        );
      await db
        .delete(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.employeeId, empId),
          ),
        );
      await db
        .delete(employeeNotifications)
        .where(
          and(
            eq(employeeNotifications.tenantId, tenantId),
            eq(employeeNotifications.employeeId, empId),
          ),
        );

      // Ensure test employee exists
      const existingEmp = await db
        .select()
        .from(employees)
        .where(eq(employees.id, empId))
        .limit(1);

      if (existingEmp.length === 0) {
        await db.insert(employees).values({
          id: empId,
          tenantId,
          companyId,
          employeeNumber: 'EMP-MP-001',
          firstName: 'Vikram',
          lastName: 'Prabhu',
          email: 'vikram.mp@bezent-test.example',
          joiningDate: '2025-01-01',
          employmentStatus: 'active',
          employmentType: 'full_time',
        });
      }

      // Ensure missing punch alerts are enabled in general settings
      const existingGen = await db
        .select()
        .from(attendanceGeneralSettings)
        .where(
          and(
            eq(attendanceGeneralSettings.tenantId, tenantId),
            eq(attendanceGeneralSettings.companyId, companyId),
          ),
        )
        .limit(1);

      if (existingGen.length === 0) {
        await db.insert(attendanceGeneralSettings).values({
          id: 'gen_mp_test_001',
          tenantId,
          companyId,
          timezone: 'Asia/Kolkata',
          dayBoundaryTime: '00:00:00',
          alertPreferences: {
            alertSettings: {
              events: {
                missingPunch: {
                  enabled: true,
                  recipients: ['employee'],
                  channels: ['in_app'],
                },
              },
              timing: {
                digestFrequency: 'instant',
              },
              escalation: {
                enabled: false,
              },
            },
          },
        });
      }
    });

    afterAll(async () => {
      const db = getDb();
      await db
        .delete(attendanceExceptions)
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.employeeId, empId),
          ),
        );
      await db
        .delete(employeeAttendance)
        .where(
          and(
            eq(employeeAttendance.tenantId, tenantId),
            eq(employeeAttendance.employeeId, empId),
          ),
        );
      await db
        .delete(employeeNotifications)
        .where(
          and(
            eq(employeeNotifications.tenantId, tenantId),
            eq(employeeNotifications.employeeId, empId),
          ),
        );
      await db.delete(employees).where(eq(employees.id, empId));
    });

    it('1. Detects an open check-in on a past date, reconciles missing punch, and logs audit exception', async () => {
      const db = getDb();

      // Seed unclosed past attendance record (Checked in at 09:15, no check out recorded)
      await db.insert(employeeAttendance).values({
        id: attId,
        tenantId,
        companyId,
        employeeId: empId,
        date: testDate,
        checkInTime: '09:15:00',
        checkOutTime: null,
        status: 'present',
        processingState: 'finalized',
        isMissingPunch: false,
        isLate: false,
        isEarlyExit: false,
        isRegularized: false,
        workedMinutes: 0,
      });

      // Run detection sweep targeting testDate
      const sweepResult = await attendanceMissingPunchDetectorService.runSweep({
        tenantId,
        companyId,
        targetDate: testDate,
      });

      expect(sweepResult.detectedCount).toBeGreaterThanOrEqual(1);
      expect(sweepResult.updatedAttendanceCount).toBeGreaterThanOrEqual(1);

      // Verify daily attendance status updated
      const [updatedAtt] = await db
        .select()
        .from(employeeAttendance)
        .where(eq(employeeAttendance.id, attId));

      expect(updatedAtt).toBeDefined();
      expect(updatedAtt!.isMissingPunch).toBe(true);
      // Status becomes 'incomplete' (flag_exception default policy) or 'absent'/'half_day'
      expect(['incomplete', 'absent', 'half_day']).toContain(updatedAtt!.status);

      // Verify exception record created
      const [exc] = await db
        .select()
        .from(attendanceExceptions)
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.sourceRecordId, attId),
            eq(attendanceExceptions.exceptionType, 'missing_out'),
          ),
        );

      expect(exc).toBeDefined();
      expect(exc!.severity).toBe('high');
      expect(exc!.status).toBe('open');
      expect(exc!.workday).toBe(testDate);
      expect(exc!.title).toBe('Missing Check-Out Punch');

      // Verify exception audit log entry
      const audits = await db
        .select()
        .from(attendanceExceptionAudits)
        .where(eq(attendanceExceptionAudits.exceptionId, exc!.id));

      expect(audits.length).toBeGreaterThanOrEqual(1);
      expect(audits[0]!.action).toBe('detected');
    });

    it('2. Deduplicates safely on subsequent sweeps without duplicating exceptions', async () => {
      const db = getDb();

      // Re-run sweep on the exact same workday
      const secondSweep = await attendanceMissingPunchDetectorService.runSweep({
        tenantId,
        companyId,
        targetDate: testDate,
      });

      // Should not detect as a new exception
      expect(secondSweep.detectedCount).toBe(0);

      // Verify only 1 exception exists for this attendance record
      const exceptions = await db
        .select()
        .from(attendanceExceptions)
        .where(
          and(
            eq(attendanceExceptions.tenantId, tenantId),
            eq(attendanceExceptions.sourceRecordId, attId),
            eq(attendanceExceptions.exceptionType, 'missing_out'),
          ),
        );

      expect(exceptions.length).toBe(1);
    });

    it('3. POST /hrms/attendance/missing-punch/sweep triggers on-demand missing punch reconciliation via API', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/missing-punch/sweep')
        .set(headers)
        .send({ targetDate: testDate });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.companiesEvaluated).toBeGreaterThanOrEqual(1);
      expect(res.body.message).toContain('Missing punch sweep completed');
    });
  },
);

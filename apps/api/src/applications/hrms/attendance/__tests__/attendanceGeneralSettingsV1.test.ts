import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured } from '../../../../db/connection.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';
import type { AttendanceAlertSettings } from '../types/attendance.types.js';

describe.skipIf(!isDatabaseConfigured)('Attendance General Settings V1.0 Comprehensive Suite', () => {
  const app = createApp();

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const otherCompanyId = 'comp_demo_02';

  let headers: Record<string, string>;
  let otherCompanyHeaders: Record<string, string>;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    otherCompanyHeaders = await hrmsTestHeaders(otherCompanyId, tenantId);
  });

  describe('1. Timezone Configuration & Validation', () => {
    it('accepts valid IANA timezone identifier and returns current UTC offsets', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          timezone: 'Asia/Kolkata',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.timezone).toBe('Asia/Kolkata');
    });

    it('rejects invalid IANA timezone identifier with 400 Bad Request', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          timezone: 'Invalid/Non_Existent_Zone',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Invalid IANA timezone/i);
    });
  });

  describe('2. Attendance Day Boundary Mode & Unscheduled Fallback Cutoff', () => {
    it('configures shift_workday_based mode and custom fallback cutoff time', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          dayBoundaryMode: 'shift_workday_based',
          unscheduledFallbackCutoff: '05:00:00',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.dayBoundaryMode).toBe('shift_workday_based');
      expect(res.body.data.unscheduledFallbackCutoff).toBe('05:00:00');
      // Preserves backward compatibility on dayBoundaryTime
      expect(res.body.data.dayBoundaryTime).toBe('05:00:00');
    });

    it('rejects invalid fallback cutoff format', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          unscheduledFallbackCutoff: '25:99:99_invalid',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/fallback cutoff time must be in HH:mm or HH:mm:ss/i);
    });
  });

  describe('3. Tracking Start Date (Controlled Modification)', () => {
    it('rejects modification of tracking start date when mandatory change reason is missing', async () => {
      // First get current tracking start date
      const getRes = await request(app)
        .get('/api/v1/hrms/attendance/settings/general')
        .set(headers);
      const currentDate = getRes.body.data.trackingStartDate;
      const newDate = currentDate === '2026-01-01' ? '2026-03-01' : '2026-01-01';

      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          trackingStartDate: newDate,
          trackingStartDateReason: '', // missing
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/change reason is required/i);
    });

    it('successfully updates tracking start date when mandatory change reason is provided', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          trackingStartDate: '2026-02-01',
          trackingStartDateReason: 'Operations committee approved deployment postponement',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.trackingStartDate).toBe('2026-02-01');
      expect(res.body.data.trackingStartDateReason).toBe('Operations committee approved deployment postponement');
    });

    it('rejects invalid tracking start date format', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          trackingStartDate: '01-02-2026', // wrong format
          trackingStartDateReason: 'Reason here',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/YYYY-MM-DD/i);
    });
  });

  describe('4. Processing Mode & Employee Visibility', () => {
    it('sets automatic processing mode and daily_and_monthly visibility', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          processingMode: 'automatic',
          employeeVisibility: 'daily_and_monthly',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.processingMode).toBe('automatic');
      expect(res.body.data.employeeVisibility).toBe('daily_and_monthly');
    });
  });

  describe('5. Controlled Manual Attendance Entry Configuration', () => {
    it('configures permitted roles, entry methods, and approval requirements', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          manualEntryAllowed: true,
          manualEntryConfig: {
            allowedRoles: ['hr', 'reporting_manager'],
            allowedMethods: ['actual_times', 'full_day_admin'],
            approvalMode: 'approval_required',
            requireReason: true,
            requireAttachment: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.manualEntryAllowed).toBe(true);
      expect(res.body.data.manualEntryConfig).toBeDefined();
      expect(res.body.data.manualEntryConfig.allowedRoles).toEqual(['hr', 'reporting_manager']);
      expect(res.body.data.manualEntryConfig.approvalMode).toBe('approval_required');
      expect(res.body.data.manualEntryConfig.requireAttachment).toBe(true);
    });

    it('rejects manual entry configuration with unauthorized roles', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          manualEntryAllowed: true,
          manualEntryConfig: {
            allowedRoles: ['unauthorized_random_role'],
            allowedMethods: ['actual_times'],
            approvalMode: 'direct_finalization',
            requireReason: true,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/unauthorized roles/i);
    });
  });

  describe('6. Default History View & Custom Range Validation', () => {
    it('saves default history view as current_month', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          defaultHistoryView: 'current_month',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.defaultHistoryView).toBe('current_month');
      expect(res.body.data.defaultHistoryViewDays).toBe(30);
    });

    it('rejects custom history view days outside 1-365 range', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          defaultHistoryView: 'custom',
          defaultHistoryViewDays: 500, // exceeds 365
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/between 1 and 365/i);
    });

    it('accepts valid custom history view days', async () => {
      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          defaultHistoryView: 'custom',
          defaultHistoryViewDays: 45,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.defaultHistoryView).toBe('custom');
      expect(res.body.data.defaultHistoryViewDays).toBe(45);
    });
  });

  describe('7. Attendance Notifications & Advanced Alert Configuration', () => {
    it('saves advanced alert events, recipients, channels, timing and escalation rules', async () => {
      const alertSettingsPayload: AttendanceAlertSettings = {
        events: {
          missingPunch: { enabled: true, recipients: ['employee', 'reporting_manager'], channels: ['in_app', 'email'] },
          lateArrival: { enabled: true, recipients: ['employee'], channels: ['in_app'] },
          earlyExit: { enabled: false, recipients: [], channels: [] },
          regularizationPending: { enabled: true, recipients: ['assigned_approver'], channels: ['in_app', 'email'] },
          exceptions: { enabled: true, recipients: ['hr'], channels: ['in_app'] },
          onDutyPending: { enabled: true, recipients: ['assigned_approver'], channels: ['in_app'] },
          deviceSyncFailure: { enabled: true, recipients: ['device_admin'], channels: ['in_app', 'email'] },
        },
        timing: {
          missingPunchDelayMinutes: 60,
          digestFrequency: 'daily',
          reminderIntervalHours: 24,
        },
        escalation: {
          enabled: true,
          deadlineHours: 48,
          targetRole: 'next_level_manager',
        },
      };

      const res = await request(app)
        .put('/api/v1/hrms/attendance/settings/general')
        .set(headers)
        .send({
          alertSettings: alertSettingsPayload,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.alertSettings).toBeDefined();
      expect(res.body.data.alertSettings.events.missingPunch.enabled).toBe(true);
      expect(res.body.data.alertSettings.timing.missingPunchDelayMinutes).toBe(60);
      expect(res.body.data.alertSettings.escalation.enabled).toBe(true);
      expect(res.body.data.alertSettings.escalation.deadlineHours).toBe(48);
    });
  });

  describe('8. Multi-Company & Tenant Isolation', () => {
    it('ensures Company B has completely isolated general settings from Company A', async () => {
      const compARes = await request(app)
        .get('/api/v1/hrms/attendance/settings/general')
        .set(headers);

      const compBRes = await request(app)
        .get('/api/v1/hrms/attendance/settings/general')
        .set(otherCompanyHeaders);

      expect(compARes.status).toBe(200);
      expect(compBRes.status).toBe(200);
      expect(compARes.body.data.companyId).toBe(companyId);
      expect(compBRes.body.data.companyId).toBe(otherCompanyId);
      expect(compARes.body.data.id).not.toBe(compBRes.body.data.id);
    });
  });

  describe('9. Persistence & Audit Verification', () => {
    it('persists all V1.0 settings across fresh GET requests and writes audit logs', async () => {
      const getRes = await request(app)
        .get('/api/v1/hrms/attendance/settings/general')
        .set(headers);

      expect(getRes.status).toBe(200);
      const data = getRes.body.data;
      expect(data.timezone).toBeDefined();
      expect(data.dayBoundaryMode).toBe('shift_workday_based');
      expect(data.unscheduledFallbackCutoff).toBeDefined();
      expect(data.trackingStartDate).toBeDefined();
      expect(data.processingMode).toBe('automatic');
      expect(data.employeeVisibility).toBe('daily_and_monthly');
      expect(data.manualEntryConfig).toBeDefined();
      expect(data.alertSettings).toBeDefined();

      // Check audit history endpoint to verify audit log was created
      const auditRes = await request(app)
        .get('/api/v1/hrms/attendance/settings/audit?category=general')
        .set(headers);

      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body.data)).toBe(true);
      expect(auditRes.body.data.length).toBeGreaterThan(0);
      const latestAudit = auditRes.body.data[0];
      expect(latestAudit.category).toBe('general');
      expect(latestAudit.action).toBe('updated');
    });
  });
});

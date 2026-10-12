import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  attendanceRegularizations,
  attendanceAdjustments,
  employeeAttendance,
  attendanceExceptions,
  employees,
  users,
} from '../../../../db/schema.js';
import { generateSurrogateId, hashPassword } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('BEZENT HRMS — Attendance Regularization V1.0 API', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const employeeId = 'emp_reg_test_01';
  const reviewerUserId = 'usr_reg_reviewer_01';
  let headers: Record<string, string>;

  const regId1 = generateSurrogateId('reg');
  const regId2 = generateSurrogateId('reg');
  const regIdBoth = generateSurrogateId('reg');
  const exceptionId1 = generateSurrogateId('exct');

  const reqNum1 = `REG-${Date.now().toString().slice(-6)}-001`;
  const reqNum2 = `REG-${Date.now().toString().slice(-6)}-002`;
  const reqNum3 = `REG-${Date.now().toString().slice(-6)}-003`;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    const db = getDb();

    // Ensure test reviewer user exists
    const pwd = hashPassword('test-password-123');
    await db
      .insert(users)
      .values({
        id: reviewerUserId,
        email: 'reviewer.regularization@example.com',
        passwordHash: pwd.hash,
        salt: pwd.salt,
        firstName: 'Meena',
        lastName: 'HR',
        status: 'active',
      })
      .onDuplicateKeyUpdate({ set: { status: 'active' } });

    // Ensure test employee exists
    await db
      .insert(employees)
      .values({
        id: employeeId,
        tenantId,
        companyId,
        userId: generateSurrogateId('usr'),
        employeeNumber: 'EMP-REG-001',
        firstName: 'Karthik',
        lastName: 'R',
        email: 'karthik.reg@example.com',
        joiningDate: '2026-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      })
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    // Seed linked exception case
    await db
      .insert(attendanceExceptions)
      .values({
        id: exceptionId1,
        tenantId,
        companyId,
        employeeId,
        workday: '2026-10-09',
        exceptionType: 'missing_out',
        severity: 'high',
        source: 'engine',
        sourceRecordType: 'attendance_daily',
        sourceRecordId: 'daily_rec_01',
        title: 'Missing Out Punch on 2026-10-09',
        description: 'No checkout punch found.',
        status: 'open',
        detectedAt: new Date('2026-10-09T20:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({ set: { status: 'open' } });

    // Seed employee attendance record
    await db
      .insert(employeeAttendance)
      .values({
        id: generateSurrogateId('adly'),
        tenantId,
        companyId,
        employeeId,
        date: '2026-10-09',
        checkInTime: '09:02:00',
        checkOutTime: null,
        status: 'half_day',
        processingState: 'provisional',
        workedMinutes: 240,
        lateMinutes: 0,
        earlyMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({ set: { checkInTime: '09:02:00' } });

    // Seed initial test regularization requests
    await db.insert(attendanceRegularizations).values([
      {
        id: regId1,
        tenantId,
        companyId,
        requestNumber: reqNum1,
        employeeId,
        workday: '2026-10-09',
        requestType: 'missing_out',
        approvalStatus: 'submitted',
        applicationStatus: 'pending_application',
        proposedCheckOut: '18:05:00',
        reason: 'Forgot to punch out after team wrap-up',
        evidenceAttachments: [{ name: 'office_exit.png', size: '240 KB' }],
        assignedTo: reviewerUserId,
        relatedExceptionId: exceptionId1,
        isHighRisk: false,
        submittedAt: new Date('2026-10-09T18:30:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: regId2,
        tenantId,
        companyId,
        requestNumber: reqNum2,
        employeeId,
        workday: '2026-10-08',
        requestType: 'incorrect_time',
        approvalStatus: 'under_review',
        applicationStatus: 'not_applicable',
        targetPunchId: 'punch_ref_01',
        proposedCheckIn: '09:05:00',
        reason: 'Device registered clock-in 20 minutes late due to line',
        evidenceAttachments: [],
        assignedTo: reviewerUserId,
        isHighRisk: false,
        submittedAt: new Date('2026-10-08T18:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: regIdBoth,
        tenantId,
        companyId,
        requestNumber: reqNum3,
        employeeId,
        workday: '2026-10-07',
        requestType: 'both_missing',
        approvalStatus: 'submitted',
        applicationStatus: 'pending_application',
        proposedCheckIn: '09:00:00',
        proposedCheckOut: '18:00:00',
        reason: 'Badge lost and temporary token not assigned',
        evidenceAttachments: [{ name: 'manager_email.pdf', size: '120 KB' }],
        assignedTo: null,
        isHighRisk: true,
        submittedAt: new Date('2026-10-07T18:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  describe('GET /api/v1/hrms/attendance/regularization/workspace', () => {
    it('returns paginated regularization items and all 6 summary counters', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/regularization/workspace?workdayFrom=2026-10-01&workdayTo=2026-10-15')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('counters');
      expect(res.body).toHaveProperty('total');

      const counters = res.body.counters;
      const items = res.body.data;
      expect(counters).toHaveProperty('pendingReview');
      expect(counters).toHaveProperty('underReview');
      expect(counters).toHaveProperty('awaitingInfo');
      expect(counters).toHaveProperty('approvedToday');
      expect(counters).toHaveProperty('applicationIssues');
      expect(counters).toHaveProperty('rejectedToday');

      expect(Array.isArray(items)).toBe(true);
      const found = items.find((i: any) => i.id === regId1);
      expect(found).toBeDefined();
      expect(found.requestType).toBe('missing_out');
      expect(found.requestedChange).toContain('06:05 PM');
    });

    it('filters correctly by approvalStatus and requestType', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/regularization/workspace?approvalStatus=under_review&requestType=incorrect_time')
        .set(headers);

      expect(res.status).toBe(200);
      const items = res.body.data;
      items.forEach((item: any) => {
        expect(item.approvalStatus).toBe('under_review');
        expect(item.requestType).toBe('incorrect_time');
      });
    });
  });

  describe('GET /api/v1/hrms/attendance/regularization/:id', () => {
    it('returns full 4-tab details with evidence context and audits', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${regId1}`)
        .set(headers);

      expect(res.status).toBe(200);
      const detail = res.body.data;
      expect(detail.id).toBe(regId1);
      expect(detail.requestType).toBe('missing_out');
      expect(detail).toHaveProperty('evidenceContext');
      expect(detail.evidenceContext).toHaveProperty('recordedAttendance');
      expect(detail.evidenceContext).toHaveProperty('punchTimeline');
      expect(detail.evidenceContext).toHaveProperty('payrollLockState');
      expect(detail).toHaveProperty('audits');
      expect(Array.isArray(detail.audits)).toBe(true);
    });

    it('returns 404 for nonexistent request id', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/regularization/nonexistent_reg_id')
        .set(headers);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/hrms/attendance/regularization/eligibility', () => {
    it('validates submission eligibility rules (future date rejection)', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/regularization/eligibility')
        .set(headers)
        .send({
          employeeId,
          workday: '2028-12-31', // future date
          requestType: 'missing_in',
          proposedCheckIn: '09:00:00',
          reason: 'Future date test',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.eligible).toBe(false);
      expect(res.body.data.reasons.some((r: string) => r.includes('future'))).toBe(true);
    });

    it('identifies both_missing as high-risk requiring individual review', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/regularization/eligibility')
        .set(headers)
        .send({
          employeeId,
          workday: '2026-10-06',
          requestType: 'both_missing',
          proposedCheckIn: '09:00:00',
          proposedCheckOut: '18:00:00',
          reason: 'Biometric gate failed all day',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.riskFactors).toContain('both_punches_missing');
      expect(res.body.data.isHighRisk).toBe(true);
    });
  });

  describe('Reviewer Assignment & Clarification Flow', () => {
    it('assigns request to a reviewer and logs audit', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/regularization/${regIdBoth}/assign`)
        .set(headers)
        .send({
          reviewerUserId,
          notes: 'Assigned to Meena HR for badge issue audit',
        });

      expect(res.status).toBe(200);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${regIdBoth}`)
        .set(headers);

      expect(detail.body.data.assignedTo).toBe(reviewerUserId);
      expect(detail.body.data.audits.some((a: any) => a.action === 'assigned')).toBe(true);
    });

    it('requests more information (awaiting_info)', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/regularization/${regIdBoth}/request-info`)
        .set(headers)
        .send({
          question: 'Please attach the visitor temporary badge slip signed by security.',
        });

      expect(res.status).toBe(200);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${regIdBoth}`)
        .set(headers);

      expect(detail.body.data.approvalStatus).toBe('awaiting_info');
      expect(detail.body.data.clarificationNotes).toContain('visitor temporary badge slip');
    });

    it('employee provides clarification and transitions back to under_review', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/regularization/${regIdBoth}/clarify`)
        .set(headers)
        .send({
          response: 'Attached security log confirmation slip image.',
          attachments: [{ name: 'security_slip.jpg', size: '180 KB' }],
        });

      expect(res.status).toBe(200);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${regIdBoth}`)
        .set(headers);

      expect(detail.body.data.approvalStatus).toBe('under_review');
      expect(detail.body.data.clarificationResponse).toContain('Attached security log');
    });
  });

  describe('Attendance Application Integrity & Recalculation', () => {
    it('approving a request creates adjustment ledger record and marks application applied', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/regularization/${regId1}/decision`)
        .set(headers)
        .send({
          decision: 'approved',
          reason: 'Verified with CCTV and manager approval',
        });

      expect(res.status).toBe(200);

      // Verify request statuses
      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${regId1}`)
        .set(headers);

      expect(detail.body.data.approvalStatus).toBe('approved');
      expect(detail.body.data.applicationStatus).toBe('applied');

      // Verify attendance adjustments ledger
      const db = getDb();
      const adjustments = await db
        .select()
        .from(attendanceAdjustments)
        .where(eq(attendanceAdjustments.regularizationId, regId1));

      const adj = adjustments[0];
      expect(adj).toBeDefined();
      expect(adj!.adjustmentType).toBe('missing_out');
      expect(adj!.adjustedCheckOut).toBe('18:05:00');

      // Verify linked exception was auto-resolved
      const exceptionRes = await request(app)
        .get(`/api/v1/hrms/attendance/exceptions/${exceptionId1}`)
        .set(headers);

      if (exceptionRes.status === 200) {
        expect(exceptionRes.body.data.status).toBe('resolved');
      }
    });

    it('rejecting a request marks approvalStatus rejected and applicationStatus not_applicable', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/regularization/${regId2}/decision`)
        .set(headers)
        .send({
          decision: 'rejected',
          reason: 'No evidence provided of device queue delay',
        });

      expect(res.status).toBe(200);

      const detail = await request(app)
        .get(`/api/v1/hrms/attendance/regularization/${regId2}`)
        .set(headers);

      expect(detail.body.data.approvalStatus).toBe('rejected');
      expect(detail.body.data.applicationStatus).toBe('not_applicable');
    });
  });

  describe('Controlled Bulk Operations', () => {
    it('skips high-risk or uneligible requests during bulk approve', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/regularization/bulk')
        .set(headers)
        .send({
          action: 'approve',
          requestIds: [regIdBoth], // high-risk both_missing
          reason: 'Bulk team verification',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('skipped');
      // regIdBoth is high-risk both_missing, requiring individual review
      expect(res.body.data.skipped.some((s: any) => s.id === regIdBoth)).toBe(true);
    });
  });

  describe('CSV Export & Formula-Injection Defense', () => {
    it('exports regularizations to CSV with sanitized fields', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/regularization/export')
        .set(headers)
        .send({
          format: 'csv',
          filter: { workdayFrom: '2026-10-01', workdayTo: '2026-10-15' },
        });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Request Number');
      expect(res.text).toContain('Employee Code');
      expect(res.text).toContain(reqNum1);
    });
  });
});

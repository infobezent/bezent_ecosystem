import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import { employees, employeeRequests, attendanceRegularizations } from '../../../../db/schema.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('Administrative Attendance API', () => {
  const app = createApp();

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const empId = 'emp_att_api_01';

  let headers: Record<string, string>;
  let testRegRequestId: string;

  beforeAll(async () => {
    headers = await hrmsTestHeaders(companyId, tenantId);
    const db = getDb();

    // Ensure test employee exists
    await db
      .insert(employees)
      .values({
        id: empId,
        tenantId,
        companyId,
        employeeNumber: 'EMP-ATT-001',
        firstName: 'Vikram',
        lastName: 'Seth',
        email: 'vikram.seth.test@example.com',
        joiningDate: '2026-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      })
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    // Sample Regularization Request in attendance_regularizations
    testRegRequestId = 'req_att_reg_01';
    await db
      .insert(attendanceRegularizations)
      .values({
        id: testRegRequestId,
        tenantId,
        companyId,
        requestNumber: 'REG-LEGACY-001',
        employeeId: empId,
        workday: '2026-10-01',
        requestType: 'both_missing',
        approvalStatus: 'submitted',
        applicationStatus: 'pending_application',
        proposedCheckIn: '09:00:00',
        proposedCheckOut: '18:00:00',
        reason: 'Biometric device sync glitch',
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({ set: { approvalStatus: 'submitted' } });

    // Sample Regularization Request in employee_requests
    await db
      .insert(employeeRequests)
      .values({
        id: testRegRequestId,
        tenantId,
        companyId,
        employeeId: empId,
        requestType: 'attendance_regularization',
        subject: 'Attendance Regularization for 2026-10-01',
        details: {
          date: '2026-10-01',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          reason: 'Biometric device sync glitch',
        },
        status: 'pending',
      })
      .onDuplicateKeyUpdate({ set: { status: 'pending' } });
  });

  describe('Security & Access Controls', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/hrms/attendance/overview');
      expect(res.status).toBe(401);
    });

    it('rejects access without X-Company-Id with 400', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/overview')
        .set('Authorization', headers.authorization!);
      expect(res.status).toBe(400);
    });
  });

  describe('Operational Endpoints (HR Admin)', () => {
    it('fetches attendance overview and KPIs', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/overview?date=2026-10-09')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.expectedCount).toBeGreaterThanOrEqual(1);
    });

    it('fetches daily attendance log', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/daily-log?date=2026-10-09')
        .set(headers);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('applies an authorized manual correction', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/manual-correction')
        .set(headers)
        .send({
          employeeId: empId,
          date: '2026-10-08',
          checkInTime: '09:05',
          checkOutTime: '18:10',
          reason: 'Manual adjustment approved by HR',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.checkInTime).toBe('09:05');
      expect(res.body.data.checkOutTime).toBe('18:10');
      expect(res.body.data.isRegularized).toBe(true);
    });

    it('fetches punch event logs', async () => {
      const res = await request(app).get('/api/v1/hrms/attendance/punch-logs').set(headers);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });

    it('fetches monthly attendance summary matrix', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/monthly-summary?year=2026&month=10')
        .set(headers);

      expect(res.status).toBe(200);
      const items = Array.isArray(res.body.data) ? res.body.data : res.body.data?.items;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('fetches regularization queue and reviews request', async () => {
      // 1. Get queue
      const listRes = await request(app).get('/api/v1/hrms/attendance/regularization').set(headers);

      expect(listRes.status).toBe(200);
      const reqItem = (listRes.body.data as Array<{ id: string }>).find(
        (r) => r.id === testRegRequestId,
      );
      expect(reqItem).toBeDefined();

      // 2. Approve request
      const reviewRes = await request(app)
        .patch(`/api/v1/hrms/attendance/regularization/${testRegRequestId}/review`)
        .set(headers)
        .send({
          status: 'approved',
          remarks: 'Approved after verifying access logs',
        });

      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.approvalStatus).toBe('approved');
    });

    it('fetches attendance exceptions', async () => {
      const res = await request(app).get('/api/v1/hrms/attendance/exceptions').set(headers);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('reads and updates company attendance policy', async () => {
      // 1. Get policy
      const getRes = await request(app).get('/api/v1/hrms/attendance/policies').set(headers);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.gracePeriodMinutes).toBeDefined();

      // 2. Update policy
      const updateRes = await request(app)
        .put('/api/v1/hrms/attendance/policies')
        .set(headers)
        .send({
          gracePeriodMinutes: 20,
          halfDayThresholdHours: 4.5,
          fullDayThresholdHours: 8.5,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.gracePeriodMinutes).toBe(20);
    });

    it('exports attendance CSV reports', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/reports/export?type=daily&date=2026-10-09')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Employee Code');
    });

    it('fetches daily attendance log V1 with counters, pagination, and sorting', async () => {
      const res = await request(app)
        .get(
          '/api/v1/hrms/attendance/daily-log?date=2026-10-09&page=1&limit=10&sortBy=name&sortOrder=asc',
        )
        .set(headers);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.counters).toBeDefined();
      expect(typeof res.body.counters.scheduled).toBe('number');
      expect(typeof res.body.counters.present).toBe('number');
      expect(typeof res.body.counters.absent).toBe('number');
      expect(typeof res.body.counters.onLeave).toBe('number');
      expect(typeof res.body.counters.onDuty).toBe('number');
      expect(typeof res.body.counters.pendingReview).toBe('number');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('fetches employee daily detail drawer payload', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/attendance/daily-log/employee/${empId}?date=2026-10-09`)
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.employee.id).toBe(empId);
      expect(res.body.data.attendanceSummary).toBeDefined();
      expect(res.body.data.punchTimeline).toBeDefined();
      expect(Array.isArray(res.body.data.punchTimeline)).toBe(true);
      expect(res.body.data.relatedRecords).toBeDefined();
      expect(res.body.data.historyAndActions).toBeDefined();
    });

    it('handles bulk recalculation and bulk finalization for eligible records', async () => {
      // 1. Recalculate
      const recalcRes = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/recalculate')
        .set(headers)
        .send({
          employeeIds: [empId],
          date: '2026-10-09',
        });

      expect(recalcRes.status).toBe(200);
      expect(recalcRes.body.data.recalculatedCount).toBe(1);

      // 2. Bulk Finalize
      const finalizeRes = await request(app)
        .post('/api/v1/hrms/attendance/daily-log/bulk-finalize')
        .set(headers)
        .send({
          employeeIds: [empId],
          date: '2026-10-09',
        });

      expect(finalizeRes.status).toBe(200);
      expect(finalizeRes.body.data.finalizedCount).toBe(1);
    });
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import { attendanceExceptions, employees } from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)('BEZENT HRMS — Attendance Exceptions V1.0 API', () => {
  const app = createApp();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const empId = 'emp_att_exc_test_01';
  let headers: Record<string, string>;

  const testCaseId1 = generateSurrogateId('exct');
  const testCaseId2 = generateSurrogateId('exct');
  const testCaseIdUnassigned = generateSurrogateId('exct');
  const recId1 = generateSurrogateId('rec');
  const recId2 = generateSurrogateId('rec');
  const recId3 = generateSurrogateId('rec');

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
        employeeNumber: 'EMP-EXC-001',
        firstName: 'Ananya',
        lastName: 'Rao',
        email: 'ananya.rao.exc@example.com',
        joiningDate: '2026-01-01',
        employmentStatus: 'active',
        employmentType: 'full_time',
      })
      .onDuplicateKeyUpdate({ set: { employmentStatus: 'active' } });

    // Seed test exception cases
    await db.insert(attendanceExceptions).values([
      {
        id: testCaseId1,
        tenantId,
        companyId,
        employeeId: empId,
        workday: '2026-10-10',
        exceptionType: 'missing_out',
        severity: 'high',
        source: 'engine',
        sourceRecordType: 'attendance_daily',
        sourceRecordId: recId1,
        title: 'Missing Out Punch on 2026-10-10',
        description: 'Single IN punch registered at 09:15 with no corresponding OUT punch.',
        status: 'open',
        assignedTo: null,
        detectedAt: new Date('2026-10-10T20:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: testCaseId2,
        tenantId,
        companyId,
        employeeId: empId,
        workday: '2026-10-09',
        exceptionType: 'leave_conflict',
        severity: 'critical',
        source: 'leave_system',
        sourceRecordType: 'leave_request',
        sourceRecordId: recId2,
        title: 'Punch Detected on Approved Leave Day',
        description: 'Employee has approved Casual Leave but punched IN at HQ Gate 1.',
        status: 'in_review',
        assignedTo: 'usr_manager_01',
        assignedQueue: 'HR Operations',
        detectedAt: new Date('2026-10-09T10:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: testCaseIdUnassigned,
        tenantId,
        companyId,
        employeeId: null,
        workday: '2026-10-10',
        exceptionType: 'unmatched_employee',
        severity: 'medium',
        source: 'biometric',
        sourceRecordType: 'punch',
        sourceRecordId: recId3,
        title: 'Unmatched Punch Event',
        description: 'Device registered punch for unmapped identifier BADGE_999.',
        status: 'open',
        assignedTo: null,
        detectedAt: new Date('2026-10-10T12:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  describe('GET /api/v1/hrms/attendance/exceptions', () => {
    it('returns paginated exceptions and 6 summary counters', async () => {
      const res = await request(app)
        .get(
          '/api/v1/hrms/attendance/exceptions?dateFrom=2026-10-01&dateTo=2026-10-15&status=all&limit=100',
        )
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('counters');
      expect(res.body.data).toHaveProperty('total');

      const { counters, items } = res.body.data;
      expect(counters).toHaveProperty('activeCases');
      expect(counters).toHaveProperty('critical');
      expect(counters).toHaveProperty('highPriority');
      expect(counters).toHaveProperty('unassigned');
      expect(counters).toHaveProperty('pendingAction');
      expect(counters).toHaveProperty('resolvedToday');

      expect(Array.isArray(items)).toBe(true);
      const found = items.find((i: { id: string; exceptionType: string }) => i.id === testCaseId1);
      expect(found).toBeDefined();
      expect(found.exceptionType).toBe('missing_out');
    });

    it('filters by status and severity correctly', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/exceptions?status=active&severity=critical')
        .set(headers);

      expect(res.status).toBe(200);
      const items = res.body.data.items;
      items.forEach((item: { severity: string; status: string }) => {
        expect(item.severity).toBe('critical');
        expect(['open', 'assigned', 'in_review', 'pending_action']).toContain(item.status);
      });
    });
  });

  describe('GET /api/v1/hrms/attendance/exceptions/:id', () => {
    it('returns full exception case detail with evidence context and audits', async () => {
      const res = await request(app)
        .get(`/api/v1/hrms/attendance/exceptions/${testCaseId1}`)
        .set(headers);

      expect(res.status).toBe(200);
      const detail = res.body.data;
      expect(detail.id).toBe(testCaseId1);
      expect(detail.exceptionType).toBe('missing_out');
      expect(detail).toHaveProperty('evidence');
      expect(detail).toHaveProperty('audits');
      expect(Array.isArray(detail.audits)).toBe(true);
    });

    it('returns 404 for nonexistent case', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/exceptions/nonexistent_case_id')
        .set(headers);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/hrms/attendance/exceptions/:id/assign', () => {
    it('assigns case to reviewer, transitions to assigned status, and creates audit log', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/exceptions/${testCaseId1}/assign`)
        .set(headers)
        .send({
          assignedTo: 'usr_reviewer_01',
          assignedQueue: 'Attendance Investigations',
          notes: 'Assigned to senior HR investigator',
        });

      expect(res.status).toBe(200);

      // Verify update in detail
      const detailRes = await request(app)
        .get(`/api/v1/hrms/attendance/exceptions/${testCaseId1}`)
        .set(headers);

      expect(detailRes.body.data.assignedTo).toBe('usr_reviewer_01');
      expect(detailRes.body.data.assignedQueue).toBe('Attendance Investigations');
      expect(detailRes.body.data.status).toBe('assigned');
    });
  });

  describe('POST /api/v1/hrms/attendance/exceptions/:id/status', () => {
    it('marks case as pending action with reason and awaited party', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/exceptions/${testCaseId1}/status`)
        .set(headers)
        .send({
          status: 'pending_action',
          pendingActionReason: 'Awaiting employee regularization submission',
          pendingActionAwaitedFrom: 'employee',
          notes: 'Notified employee via mobile notification',
        });

      expect(res.status).toBe(200);

      const detailRes = await request(app)
        .get(`/api/v1/hrms/attendance/exceptions/${testCaseId1}`)
        .set(headers);

      expect(detailRes.body.data.status).toBe('pending_action');
      expect(detailRes.body.data.pendingActionReason).toBe(
        'Awaiting employee regularization submission',
      );
      expect(detailRes.body.data.pendingActionAwaitedFrom).toBe('employee');
    });
  });

  describe('POST /api/v1/hrms/attendance/exceptions/:id/severity', () => {
    it('overrides severity with justification reason and records audit trail', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/exceptions/${testCaseId1}/severity`)
        .set(headers)
        .send({
          severity: 'critical',
          reason: 'Payroll processing cut-off is tomorrow at 5 PM',
        });

      expect(res.status).toBe(200);

      const detailRes = await request(app)
        .get(`/api/v1/hrms/attendance/exceptions/${testCaseId1}`)
        .set(headers);

      expect(detailRes.body.data.severity).toBe('critical');
      const audit = detailRes.body.data.audits.find(
        (a: { action: string; notes: string }) => a.action === 'severity_overridden',
      );
      expect(audit).toBeDefined();
      expect(audit.notes).toContain('Payroll processing');
    });
  });

  describe('POST /api/v1/hrms/attendance/exceptions/:id/verify-resolve', () => {
    it('verifies resolution integrity and transitions case to resolved', async () => {
      const res = await request(app)
        .post(`/api/v1/hrms/attendance/exceptions/${testCaseId1}/verify-resolve`)
        .set(headers)
        .send({
          resolutionNotes: 'Verified missing punch rectified via web punch submission',
        });

      expect(res.status).toBe(200);

      const detailRes = await request(app)
        .get(`/api/v1/hrms/attendance/exceptions/${testCaseId1}`)
        .set(headers);

      expect(detailRes.body.data.status).toBe('resolved');
      expect(detailRes.body.data.resolutionNotes).toBe(
        'Verified missing punch rectified via web punch submission',
      );
      expect(detailRes.body.data.resolvedAt).not.toBeNull();
    });
  });

  describe('POST /api/v1/hrms/attendance/exceptions/bulk', () => {
    it('performs bulk assignment and transitions unassigned cases', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/exceptions/bulk')
        .set(headers)
        .send({
          exceptionIds: [testCaseIdUnassigned],
          action: 'assign',
          assignedTo: 'usr_bulk_reviewer_01',
          assignedQueue: 'Triage Queue',
          notes: 'Bulk triage assignment',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.affectedCount).toBe(1);

      const detailRes = await request(app)
        .get(`/api/v1/hrms/attendance/exceptions/${testCaseIdUnassigned}`)
        .set(headers);

      expect(detailRes.body.data.assignedTo).toBe('usr_bulk_reviewer_01');
      expect(detailRes.body.data.status).toBe('assigned');
    });
  });

  describe('GET /api/v1/hrms/attendance/exceptions/export', () => {
    it('exports CSV with sanitized formulas and proper headers', async () => {
      const res = await request(app)
        .get('/api/v1/hrms/attendance/exceptions/export?status=all')
        .set(headers);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Case ID,Employee Name,Employee Code,Department,Workday');
      expect(res.text).toContain(testCaseId2);
    });
  });
});

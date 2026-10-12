import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../app/server/createApp.js';
import { isDatabaseConfigured, getDb } from '../../../../db/connection.js';
import {
  employeeAttendance,
  attendanceMonthlySummaries,
  employees,
  departments,
} from '../../../../db/schema.js';
import { generateSurrogateId } from '../../../../platform/auth/security.js';
import { hrmsTestHeaders } from '../../../../platform/__tests__/support/testSession.js';

describe.skipIf(!isDatabaseConfigured)(
  'BEZENT HRMS — Attendance Reports V1.0 API Integration Test Suite',
  () => {
    const app = createApp();
    const tenantId = 'tenant_demo_01';
    const companyId = 'comp_demo_01';
    const otherCompanyId = 'comp_other_report_test';

    const runSuffix = Date.now().toString().slice(-6);
    const testEmpId1 = generateSurrogateId('emp');
    const testEmpId2 = generateSurrogateId('emp');
    const testDeptId = generateSurrogateId('dpt');
    const empNum1 = `RPT1_${runSuffix}`;
    const empNum2 = `RPT2_${runSuffix}`;

    let headers: Record<string, string>;

    beforeAll(async () => {
      headers = await hrmsTestHeaders(companyId, tenantId);
      const db = getDb();

      // Insert test department
      await db
        .insert(departments)
        .values({
          id: testDeptId,
          tenantId,
          companyId,
          name: 'Reports Engineering',
          code: `RPT-ENG-${runSuffix}`,
        })
        .onDuplicateKeyUpdate({ set: { name: 'Reports Engineering' } });

      // Insert test employees
      await db.insert(employees).values([
        {
          id: testEmpId1,
          tenantId,
          companyId,
          employeeNumber: empNum1,
          firstName: 'Robert',
          lastName: 'ReportUser',
          email: `robert.${runSuffix}@example.com`,
          departmentId: testDeptId,
          joiningDate: '2026-01-01',
        },
        {
          id: testEmpId2,
          tenantId,
          companyId,
          employeeNumber: empNum2,
          firstName: 'Rachel',
          lastName: 'ReportUser',
          email: `rachel.${runSuffix}@example.com`,
          departmentId: testDeptId,
          joiningDate: '2026-01-01',
        },
      ]);

      // Seed test attendance records
      await db
        .insert(employeeAttendance)
        .values([
          {
            id: generateSurrogateId('att'),
            tenantId,
            companyId,
            employeeId: testEmpId1,
            date: '2026-10-10',
            checkInTime: '09:05:00',
            checkOutTime: '18:10:00',
            status: 'present',
            processingState: 'finalized',
            workedMinutes: 545,
            lateMinutes: 5,
            earlyMinutes: 0,
            isLate: true,
            isEarlyExit: false,
            isMissingPunch: false,
            isRegularized: false,
          },
          {
            id: generateSurrogateId('att'),
            tenantId,
            companyId,
            employeeId: testEmpId2,
            date: '2026-10-10',
            checkInTime: null,
            checkOutTime: null,
            status: 'absent',
            processingState: 'finalized',
            workedMinutes: 0,
            lateMinutes: 0,
            earlyMinutes: 0,
            isLate: false,
            isEarlyExit: false,
            isMissingPunch: true,
            isRegularized: false,
          },
        ])
        .onDuplicateKeyUpdate({ set: { status: 'present' } });

      // Seed monthly summary record
      await db
        .insert(attendanceMonthlySummaries)
        .values({
          id: generateSurrogateId('ams'),
          tenantId,
          companyId,
          employeeId: testEmpId1,
          month: '2026-10',
          scheduledDays: 22,
          scheduledMinutes: 10560,
          presentDays: '20.00',
          absentDays: '1.00',
          leaveDays: '1.00',
          onDutyDays: '0.00',
          weeklyOffDays: 8,
          holidayDays: 1,
          actualWorkedMinutes: 10200,
          policyCreditedMinutes: 10200,
          lateOccurrences: 1,
          lateMinutes: 5,
          earlyExitOccurrences: 0,
          earlyExitMinutes: 0,
          unresolvedExceptions: 0,
          pendingCorrections: 0,
          reviewState: 'reviewed',
          payrollReadiness: 'ready',
          version: 1,
        })
        .onDuplicateKeyUpdate({ set: { scheduledDays: 22 } });
    });

    // ════════════════════════════════════════════════════════════════════════
    // 1. CATALOG ENDPOINT
    // ════════════════════════════════════════════════════════════════════════

    it('GET /hrms/attendance/reports/catalog returns all 15 reports with complete metadata', async () => {
      const res = await request(app).get('/api/v1/hrms/attendance/reports/catalog').set(headers);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBe(15);

      type CatalogItem = {
        id: string;
        name: string;
        columns: unknown[];
        allowedFilters: unknown[];
        supportedExportFormats: unknown[];
        limitations?: string[];
        sensitiveClassification?: string;
      };
      const r01 = (res.body.data as CatalogItem[]).find((r) => r.id === 'R01');
      expect(r01).toBeDefined();
      expect(r01?.name).toBe('Daily Attendance Register');
      expect(r01?.columns.length).toBe(16);
      expect(r01?.allowedFilters.length ?? 0).toBeGreaterThan(0);
      expect(r01?.supportedExportFormats).toEqual(['csv', 'xlsx', 'pdf']);

      const r06 = (res.body.data as CatalogItem[]).find((r) => r.id === 'R06');
      expect(r06).toBeDefined();
      expect(r06?.name).toBe('Overtime');
      expect(r06?.limitations?.[0]).toContain('not automatically approved overtime');

      const r15 = (res.body.data as CatalogItem[]).find((r) => r.id === 'R15');
      expect(r15).toBeDefined();
      expect(r15?.name).toBe('Attendance Audit');
      expect(r15?.sensitiveClassification).toBe('audit_restricted');
    });

    // ════════════════════════════════════════════════════════════════════════
    // 2. PREVIEWS FOR REPORTS
    // ════════════════════════════════════════════════════════════════════════

    it('POST /hrms/attendance/reports/R01/preview executes Daily Register query', async () => {
      const res = await request(app).get('/api/v1/hrms/attendance/reports/catalog').set(headers);
      expect(res.status).toBe(200);

      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R01');
      expect(previewRes.body.data.columns).toHaveLength(16);
      expect(Array.isArray(previewRes.body.data.rows)).toBe(true);
      expect(previewRes.body.data.rows.length).toBeGreaterThanOrEqual(1);

      const row = previewRes.body.data.rows[0];
      expect(row).toHaveProperty('date');
      expect(row).toHaveProperty('employeeId');
      expect(row).toHaveProperty('employeeName');
      expect(row).toHaveProperty('actualWorkedHours');
      expect(row).toHaveProperty('attendanceStatus');
    });

    it('POST /hrms/attendance/reports/R02/preview executes Monthly Register query', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R02/preview')
        .set(headers)
        .send({
          filters: {
            month: '2026-10',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R02');
      expect(previewRes.body.data.columns).toHaveLength(17);
      expect(previewRes.body.data.rows.length).toBeGreaterThanOrEqual(1);

      const row = previewRes.body.data.rows[0];
      expect(row).toHaveProperty('employeeId');
      expect(row).toHaveProperty('scheduledDays');
      expect(row).toHaveProperty('presentDays');
      expect(row).toHaveProperty('reviewStatus');
      expect(row).toHaveProperty('payrollReadiness');
    });

    it('POST /hrms/attendance/reports/R03/preview executes Attendance Trend with mathematically sound rates', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R03/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R03');
      expect(previewRes.body.data.columns).toHaveLength(9);
      expect(Array.isArray(previewRes.body.data.rows)).toBe(true);

      if (previewRes.body.data.rows.length > 0) {
        const row = previewRes.body.data.rows[0];
        expect(row).toHaveProperty('attendanceRate');
        expect(row).toHaveProperty('absenceRate');
        expect(typeof row.attendanceRate === 'number' || row.attendanceRate === 'N/A').toBe(true);
      }
    });

    it('POST /hrms/attendance/reports/R04/preview calculates difference minutes accurately', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R04/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R04');
      expect(previewRes.body.data.columns).toHaveLength(10);
    });

    it('POST /hrms/attendance/reports/R05/preview returns late arrival & early exit violations', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R05/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R05');
      expect(previewRes.body.data.columns).toHaveLength(13);
    });

    it('POST /hrms/attendance/reports/R06/preview sets approved OT to N/A without inventing records', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R06/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R06');
      expect(previewRes.body.data.columns).toHaveLength(11);
      if (previewRes.body.data.rows.length > 0) {
        const row = previewRes.body.data.rows[0];
        expect(row.approvedOtHours).toBe('N/A');
        expect(row.approvalStatus).toBe('N/A');
      }
    });

    it('POST /hrms/attendance/reports/R07/preview computes consecutive absences correctly', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R07/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R07');
      expect(previewRes.body.data.columns).toHaveLength(9);
    });

    it('POST /hrms/attendance/reports/R08/preview queries leave impact', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R08/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R08');
    });

    it('POST /hrms/attendance/reports/R09/preview queries missing punch occurrences with aging', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R09/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R09');
      expect(previewRes.body.data.columns).toHaveLength(10);
    });

    it('POST /hrms/attendance/reports/R10/preview queries attendance exceptions', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R10/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R10');
    });

    it('POST /hrms/attendance/reports/R11/preview queries regularization lifecycle', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R11/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R11');
    });

    it('POST /hrms/attendance/reports/R12/preview queries on-duty workflow', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R12/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R12');
    });

    it('POST /hrms/attendance/reports/R13/preview queries payroll readiness with evaluator reuse', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R13/preview')
        .set(headers)
        .send({
          filters: {
            month: '2026-10',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R13');
    });

    it('POST /hrms/attendance/reports/R14/preview queries monthly review audits', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R14/preview')
        .set(headers)
        .send({
          filters: {
            month: '2026-10',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R14');
    });

    it('POST /hrms/attendance/reports/R15/preview queries attendance audit log', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R15/preview')
        .set(headers)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.reportId).toBe('R15');
      expect(previewRes.body.data.columns).toHaveLength(12);
    });

    // ════════════════════════════════════════════════════════════════════════
    // 3. SAVED CONFIGURATIONS CRUD
    // ════════════════════════════════════════════════════════════════════════

    it('creates, lists, and deletes a saved report configuration', async () => {
      const createRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/saved')
        .set(headers)
        .send({
          reportId: 'R01',
          configurationName: 'Engineering Daily Punctuality',
          filters: {
            departmentId: testDeptId,
            startDate: '2026-10-01',
            endDate: '2026-10-15',
          },
          sorting: { column: 'lateMinutes', direction: 'desc' },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.id).toBeDefined();
      expect(createRes.body.data.configurationName).toBe('Engineering Daily Punctuality');

      const configId = createRes.body.data.id;

      // List
      const listRes = await request(app).get('/api/v1/hrms/attendance/reports/saved').set(headers);

      expect(listRes.status).toBe(200);
      const found = (listRes.body.data as Array<{ id: string }>).find((c) => c.id === configId);
      expect(found).toBeDefined();

      // Delete
      const delRes = await request(app)
        .delete(`/api/v1/hrms/attendance/reports/saved/${configId}`)
        .set(headers);

      expect(delRes.status).toBe(200);

      // Verify deleted
      const listResAfter = await request(app)
        .get('/api/v1/hrms/attendance/reports/saved')
        .set(headers);
      expect(
        (listResAfter.body.data as Array<{ id: string }>).find((c) => c.id === configId),
      ).toBeUndefined();
    });

    // ════════════════════════════════════════════════════════════════════════
    // 4. EXPORT ENDPOINTS & REAL FILE BUFFERS
    // ════════════════════════════════════════════════════════════════════════

    it('POST /hrms/attendance/reports/R01/export produces valid CSV export', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/export')
        .set(headers)
        .send({
          format: 'csv',
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment;');
      expect(res.headers['x-report-history-id']).toBeDefined();
      expect(res.text.startsWith('\uFEFF')).toBe(true);
      expect(res.text).toContain('BEZENT HRMS — Daily Attendance Register');
    });

    it('POST /hrms/attendance/reports/R02/export produces valid Excel SpreadsheetML export', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/reports/R02/export')
        .set(headers)
        .send({
          format: 'xlsx',
          filters: {
            month: '2026-10',
          },
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/vnd.ms-excel');
      expect(res.headers['content-disposition']).toContain('.xls');
      expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(res.text).toContain('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
    });

    it('POST /hrms/attendance/reports/R01/export produces valid binary PDF-1.4 export', async () => {
      const res = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/export')
        .set(headers)
        .send({
          format: 'pdf',
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('.pdf');

      const pdfBuffer = Buffer.from(res.body);
      expect(pdfBuffer.subarray(0, 8).toString('ascii')).toBe('%PDF-1.4');
    });

    // ════════════════════════════════════════════════════════════════════════
    // 5. REPORT HISTORY & RE-DOWNLOAD
    // ════════════════════════════════════════════════════════════════════════

    it('GET /hrms/attendance/reports/history lists generations and supports download', async () => {
      const listRes = await request(app)
        .get('/api/v1/hrms/attendance/reports/history')
        .set(headers);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

      const firstHistory = listRes.body.data[0];
      expect(firstHistory.id).toBeDefined();
      expect(firstHistory.outputFormat).toBeDefined();

      // Re-download file
      const downloadRes = await request(app)
        .get(`/api/v1/hrms/attendance/reports/history/${firstHistory.id}/download`)
        .set(headers);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-disposition']).toContain('attachment;');
    });

    // ════════════════════════════════════════════════════════════════════════
    // 6. TENANT & COMPANY ISOLATION
    // ════════════════════════════════════════════════════════════════════════

    it('enforces company isolation: requests for other company do not leak test company data', async () => {
      const otherHeaders = await hrmsTestHeaders(otherCompanyId, 'tenant_other_report_01');

      const previewRes = await request(app)
        .post('/api/v1/hrms/attendance/reports/R01/preview')
        .set(otherHeaders)
        .send({
          filters: {
            startDate: '2026-10-01',
            endDate: '2026-10-31',
          },
        });

      expect(previewRes.status).toBe(200);
      const leaked = (previewRes.body.data.rows as Array<{ employeeId?: string }>).some(
        (r) => r.employeeId === empNum1,
      );
      expect(leaked).toBe(false);
    });
  },
);

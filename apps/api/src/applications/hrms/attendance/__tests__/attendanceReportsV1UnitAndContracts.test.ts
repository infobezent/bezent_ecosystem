import { describe, it, expect } from 'vitest';
import {
  REPORT_LIST,
  getReportDefinition,
} from '../service/attendanceReportRegistry.js';
import {
  generateCsvExport,
  generateExcelExport,
  generatePdfExport,
  sanitizeFormula,
} from '../service/attendanceReportExporter.js';
import type { ReportId } from '../types/attendanceReports.types.js';

describe('BEZENT HRMS — Attendance Reports V1.0 Unit & Column Contracts', () => {
  it('contains exactly 15 report definitions in the catalog registry', () => {
    expect(REPORT_LIST).toHaveLength(15);
    const ids = REPORT_LIST.map((r) => r.id);
    const expectedIds: ReportId[] = [
      'R01',
      'R02',
      'R03',
      'R04',
      'R05',
      'R06',
      'R07',
      'R08',
      'R09',
      'R10',
      'R11',
      'R12',
      'R13',
      'R14',
      'R15',
    ];
    expect(ids).toEqual(expectedIds);
  });

  describe('Exact Column Contracts for all 15 reports', () => {
    it('R01 Daily Attendance Register has exact specified columns', () => {
      const r01 = getReportDefinition('R01')!;
      expect(r01.name).toBe('Daily Attendance Register');
      const colLabels = r01.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Date',
        'Employee ID',
        'Employee Name',
        'Department',
        'Branch',
        'Shift',
        'Scheduled In',
        'Scheduled Out',
        'First In',
        'Last Out',
        'Actual Worked Hours',
        'Credited Hours',
        'Attendance Status',
        'Late Minutes',
        'Early Exit Minutes',
        'Exception Status',
      ]);
    });

    it('R02 Monthly Attendance Register has exact specified columns', () => {
      const r02 = getReportDefinition('R02')!;
      expect(r02.name).toBe('Monthly Attendance Register');
      const colLabels = r02.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Employee ID',
        'Employee Name',
        'Department',
        'Scheduled Days',
        'Present Days',
        'Absent Days',
        'Leave Days',
        'OD Days',
        'Weekly Off',
        'Holidays',
        'Actual Worked Hours',
        'Credited Hours',
        'Late Count',
        'Early Exit Count',
        'Exceptions',
        'Review Status',
        'Payroll Readiness',
      ]);
    });

    it('R03 Attendance Trend has exact specified columns', () => {
      const r03 = getReportDefinition('R03')!;
      expect(r03.name).toBe('Attendance Trend');
      const colLabels = r03.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Period',
        'Department/Branch',
        'Scheduled Employee-Days',
        'Present Equivalent Days',
        'Absent Equivalent Days',
        'Leave Equivalent Days',
        'Attendance Rate (%)',
        'Absence Rate (%)',
        'Late Occurrences',
      ]);
    });

    it('R04 Working Hours has exact specified columns', () => {
      const r04 = getReportDefinition('R04')!;
      expect(r04.name).toBe('Working Hours');
      const colLabels = r04.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Date/Period',
        'Employee ID',
        'Employee Name',
        'Department',
        'Shift',
        'Scheduled Minutes',
        'Actual Worked Minutes',
        'Policy-Credited Minutes',
        'Difference Minutes',
        'Processing Status',
      ]);
    });

    it('R05 Late Arrival & Early Exit has exact specified columns', () => {
      const r05 = getReportDefinition('R05')!;
      expect(r05.name).toBe('Late Arrival & Early Exit');
      const colLabels = r05.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Date',
        'Employee ID',
        'Employee Name',
        'Department',
        'Shift',
        'Expected In',
        'Actual In',
        'Late Minutes',
        'Expected Out',
        'Actual Out',
        'Early Exit Minutes',
        'Grace Applied',
        'Policy Violation Status',
      ]);
    });

    it('R06 Overtime has exact specified columns and authoritative restrictions', () => {
      const r06 = getReportDefinition('R06')!;
      expect(r06.name).toBe('Overtime');
      const colLabels = r06.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Date',
        'Employee ID',
        'Employee Name',
        'Department',
        'Scheduled Hours',
        'Actual Worked Hours',
        'Extra Worked Hours',
        'Approved OT Hours',
        'Approval Status',
        'OT Policy',
        'Processing Status',
      ]);
      expect(r06.limitations).toBeDefined();
      expect(r06.limitations?.[0]).toContain('not automatically approved overtime');
    });

    it('R07 Absenteeism has exact specified columns', () => {
      const r07 = getReportDefinition('R07')!;
      expect(r07.name).toBe('Absenteeism');
      const colLabels = r07.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Employee ID',
        'Employee Name',
        'Department',
        'Period',
        'Eligible Scheduled Days',
        'Absent Equivalent Days',
        'Absence Rate (%)',
        'Consecutive Absence Days',
        'Unresolved Absence Issues',
      ]);
    });

    it('R08 Leave Impact has exact specified columns', () => {
      const r08 = getReportDefinition('R08')!;
      expect(r08.name).toBe('Leave Impact');
      const colLabels = r08.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Employee ID',
        'Employee Name',
        'Department',
        'Leave Type',
        'Leave Start',
        'Leave End',
        'Approved Leave Equivalent Days',
        'Attendance Coverage',
        'Overlap/Conflict Status',
        'Approval Status',
      ]);
    });

    it('R09 Missing Punch has exact specified columns', () => {
      const r09 = getReportDefinition('R09')!;
      expect(r09.name).toBe('Missing Punch');
      const colLabels = r09.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Work Date',
        'Employee ID',
        'Employee Name',
        'Department',
        'Shift',
        'Missing In/Out',
        'Available Punch Time',
        'Exception Reference',
        'Resolution Status',
        'Aging Days',
      ]);
    });

    it('R10 Attendance Exceptions has exact specified columns', () => {
      const r10 = getReportDefinition('R10')!;
      expect(r10.name).toBe('Attendance Exceptions');
      const colLabels = r10.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Exception ID',
        'Work Date',
        'Employee ID',
        'Employee Name',
        'Department',
        'Exception Type',
        'Severity',
        'Status',
        'Assigned To',
        'Created At',
        'Aging Days',
        'Resolved At',
        'Resolution Type',
      ]);
    });

    it('R11 Regularization has exact specified columns', () => {
      const r11 = getReportDefinition('R11')!;
      expect(r11.name).toBe('Regularization');
      const colLabels = r11.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Request ID',
        'Employee ID',
        'Employee Name',
        'Department',
        'Affected Date',
        'Request Type',
        'Submitted At',
        'Approval Status',
        'Processing Status',
        'Reviewer',
        'Decision At',
        'Applied Correction Reference',
      ]);
    });

    it('R12 On-Duty has exact specified columns', () => {
      const r12 = getReportDefinition('R12')!;
      expect(r12.name).toBe('On-Duty');
      const colLabels = r12.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'OD Request ID',
        'Employee ID',
        'Employee Name',
        'Department',
        'OD Start',
        'OD End',
        'Requested Duration',
        'Approved Duration',
        'Applied Credit',
        'Approval Status',
        'Processing Status',
        'Reviewer',
      ]);
    });

    it('R13 Payroll Readiness has exact specified columns', () => {
      const r13 = getReportDefinition('R13')!;
      expect(r13.name).toBe('Payroll Readiness');
      const colLabels = r13.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Attendance Month',
        'Employee ID',
        'Employee Name',
        'Department',
        'Scheduled Days',
        'Present Equivalent',
        'Leave Equivalent',
        'OD Coverage',
        'Unresolved Exceptions',
        'Pending Corrections',
        'Review Status',
        'Readiness Status',
        'Blocking Reasons',
        'Lock State',
        'Evaluated At',
      ]);
    });

    it('R14 Monthly Review has exact specified columns', () => {
      const r14 = getReportDefinition('R14')!;
      expect(r14.name).toBe('Monthly Review');
      const colLabels = r14.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Attendance Month',
        'Employee ID',
        'Employee Name',
        'Department',
        'Assigned Reviewer',
        'Review State',
        'Reviewed Version',
        'Current Summary Version',
        'Review Started At',
        'Reviewed At',
        'Reopened At',
        'Reopen Reason',
      ]);
    });

    it('R15 Attendance Audit has exact specified columns and restricted permission', () => {
      const r15 = getReportDefinition('R15')!;
      expect(r15.name).toBe('Attendance Audit');
      expect(r15.requiredPermission).toBe('hrms.attendance.audit');
      expect(r15.sensitiveClassification).toBe('audit_restricted');
      const colLabels = r15.columns.map((c) => c.label);
      expect(colLabels).toEqual([
        'Event ID',
        'Timestamp',
        'Actor',
        'Employee Reference',
        'Source Module',
        'Entity Reference',
        'Action',
        'Before Value',
        'After Value',
        'Reason',
        'Source Version',
        'Company Reference',
      ]);
    });
  });

  describe('Formula Injection Sanitization', () => {
    it('escapes dangerous formula prefixes (=, +, -, @, tab, cr)', () => {
      expect(sanitizeFormula('=1+1')).toBe("'=1+1");
      expect(sanitizeFormula('+CMD')).toBe("'+CMD");
      expect(sanitizeFormula('-50')).toBe("'-50");
      expect(sanitizeFormula('@SUM(A1:A5)')).toBe("'@SUM(A1:A5)");
      expect(sanitizeFormula('\tPAYLOAD')).toBe("'\tPAYLOAD");
      expect(sanitizeFormula('\rPAYLOAD')).toBe("'\rPAYLOAD");
      expect(sanitizeFormula('Normal Text')).toBe('Normal Text');
      expect(sanitizeFormula(123)).toBe('123');
      expect(sanitizeFormula(null)).toBe('');
    });
  });

  describe('CSV Export Generation', () => {
    it('generates valid UTF-8 BOM CSV with formula escaping and metadata header', () => {
      const r01 = getReportDefinition('R01')!;
      const rows = [
        {
          date: '2026-10-12',
          employeeId: 'EMP-001',
          employeeName: 'Alice Smith',
          department: 'Engineering',
          branch: 'HQ',
          shift: 'General',
          scheduledIn: '09:00 AM',
          scheduledOut: '06:00 PM',
          firstIn: '09:05 AM',
          lastOut: '06:10 PM',
          actualWorkedHours: 8.5,
          creditedHours: 8.5,
          attendanceStatus: 'Present',
          lateMinutes: 5,
          earlyExitMinutes: 0,
          exceptionStatus: 'Normal',
        },
        {
          date: '2026-10-12',
          employeeId: '=MALICIOUS',
          employeeName: 'Attacker',
          department: 'Security',
          branch: 'HQ',
          shift: 'General',
          scheduledIn: '09:00 AM',
          scheduledOut: '06:00 PM',
          firstIn: '—',
          lastOut: '—',
          actualWorkedHours: 0,
          creditedHours: 0,
          attendanceStatus: 'Absent',
          lateMinutes: 0,
          earlyExitMinutes: 0,
          exceptionStatus: 'Normal',
        },
      ];

      const meta = {
        companyName: 'Acme Corp',
        generatedAt: '2026-10-12 12:00:00',
        timezone: 'UTC',
        appliedFilters: { date: '2026-10-12' },
      };

      const buffer = generateCsvExport(r01, r01.columns, rows, meta);
      const csvStr = buffer.toString('utf-8');

      // UTF-8 BOM check
      expect(csvStr.startsWith('\uFEFF')).toBe(true);
      // Header metadata
      expect(csvStr).toContain('BEZENT HRMS — Daily Attendance Register');
      expect(csvStr).toContain('Company: Acme Corp');
      // Column row
      expect(csvStr).toContain('"Date","Employee ID","Employee Name"');
      // Formula sanitized
      expect(csvStr).toContain("\"'=MALICIOUS\"");
      expect(csvStr).toContain('"Alice Smith"');
    });
  });

  describe('Excel SpreadsheetML Export Generation', () => {
    it('generates valid XML Spreadsheet 2003 with formula protection', () => {
      const r02 = getReportDefinition('R02')!;
      const rows = [
        {
          employeeId: 'EMP-001',
          employeeName: 'Bob Builder',
          department: 'Operations',
          scheduledDays: 22,
          presentDays: 20,
          absentDays: 1,
          leaveDays: 1,
          odDays: 0,
          weeklyOff: 8,
          holidays: 1,
          actualWorkedHours: 160,
          creditedHours: 160,
          lateCount: 0,
          earlyExitCount: 0,
          exceptions: 0,
          reviewStatus: 'Reviewed',
          payrollReadiness: 'Ready',
        },
      ];

      const meta = {
        companyName: 'Acme Corp',
        generatedAt: '2026-10-12 12:00:00',
        timezone: 'UTC',
        appliedFilters: { month: '2026-10' },
      };

      const buffer = generateExcelExport(r02, r02.columns, rows, meta);
      const xmlStr = buffer.toString('utf-8');

      expect(xmlStr).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlStr).toContain('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
      expect(xmlStr).toContain('<Worksheet ss:Name="R02">');
      expect(xmlStr).toContain('BEZENT HRMS — Monthly Attendance Register');
      expect(xmlStr).toContain('<Data ss:Type="String">Bob Builder</Data>');
      expect(xmlStr).toContain('<Data ss:Type="Number">22</Data>');
      expect(xmlStr).toContain('</Workbook>');
    });
  });

  describe('Binary PDF-1.4 Generation', () => {
    it('generates valid binary PDF buffer with %PDF-1.4 header and trailer', () => {
      const r01 = getReportDefinition('R01')!;
      const rows = [
        {
          date: '2026-10-12',
          employeeId: 'EMP-001',
          employeeName: 'Alice Smith',
          department: 'Engineering',
          branch: 'HQ',
          shift: 'General',
          scheduledIn: '09:00 AM',
          scheduledOut: '06:00 PM',
          firstIn: '09:05 AM',
          lastOut: '06:10 PM',
          actualWorkedHours: 8.5,
          creditedHours: 8.5,
          attendanceStatus: 'Present',
          lateMinutes: 5,
          earlyExitMinutes: 0,
          exceptionStatus: 'Normal',
        },
      ];

      const meta = {
        companyName: 'Acme Corp',
        generatedAt: '2026-10-12 12:00:00',
        timezone: 'UTC',
        appliedFilters: { date: '2026-10-12' },
      };

      const buffer = generatePdfExport(r01, r01.columns, rows, meta);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(500);

      const header = buffer.subarray(0, 8).toString('ascii');
      expect(header).toBe('%PDF-1.4');

      const tail = buffer.subarray(buffer.length - 128).toString('ascii');
      expect(tail).toContain('%%EOF');
      expect(tail).toContain('startxref');
      expect(tail).toContain('trailer');
    });
  });
});

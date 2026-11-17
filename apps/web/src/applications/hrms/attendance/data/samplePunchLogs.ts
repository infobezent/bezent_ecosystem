import type { PunchLogItem, PunchEventDetail } from '../types/attendance.types';

export interface SampleEmployee {
  name: string;
  code: string;
  department: string;
  avatarUrl?: string;
}

export const SAMPLE_EMPLOYEES: Record<string, SampleEmployee> = {
  BZ1001: { name: 'Karthik P', code: 'BZ1001', department: 'Engineering' },
  BZ1007: { name: 'Sahana J', code: 'BZ1007', department: 'Human Resources' },
  BZ1010: { name: 'Arjun S', code: 'BZ1010', department: 'Engineering' },
  BZ1014: { name: 'Priya L', code: 'BZ1014', department: 'Product Design' },
  BZ1020: { name: 'Vimal M', code: 'BZ1020', department: 'Operations' },
  BZ1025: { name: 'Divya R', code: 'BZ1025', department: 'Marketing' },
  BZ1030: { name: 'Naveen K', code: 'BZ1030', department: 'Finance' },
  BZ1035: { name: 'Harish M', code: 'BZ1035', department: 'Quality Assurance' },
  BZ1040: { name: 'Meera R', code: 'BZ1040', department: 'Legal & Compliance' },
  BZ1045: { name: 'Sanjay K', code: 'BZ1045', department: 'DevOps & Infrastructure' },
};

export interface SamplePunchTemplate {
  id: string;
  employeeCode: keyof typeof SAMPLE_EMPLOYEES;
  timeOffset: string; // e.g. "09:02:15"
  dayOffset?: number; // 0 for workday date, 1 for next day (overnight shifts)
  punchType: 'in' | 'out';
  source: 'biometric' | 'web' | 'mobile';
  terminalName: string;
  workLocation: string;
  validationStatus: 'valid' | 'needs_review' | 'duplicate' | 'invalid';
  processingState: 'processed' | 'failed';
  remarks: string;
  isUsedInCalc: boolean;
  rawPayload: Record<string, unknown>;
}

export const SAMPLE_PUNCH_TEMPLATES: SamplePunchTemplate[] = [
  // 1. Karthik P - BZ1001 (Engineering - Bangalore HQ)
  {
    id: 'sample-p-01',
    employeeCode: 'BZ1001',
    timeOffset: '08:35:10',
    punchType: 'in',
    source: 'biometric',
    terminalName: 'Terminal-A (Main Lobby)',
    workLocation: 'Bangalore HQ',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Early Arrival',
    isUsedInCalc: true,
    rawPayload: { biometricType: 'fingerprint', confidence: 0.99, deviceSerial: 'BIO-BLR-01' },
  },
  {
    id: 'sample-p-02',
    employeeCode: 'BZ1001',
    timeOffset: '18:02:40',
    punchType: 'out',
    source: 'biometric',
    terminalName: 'Terminal-B (East Exit)',
    workLocation: 'Bangalore HQ',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Regular Checkout',
    isUsedInCalc: true,
    rawPayload: { biometricType: 'fingerprint', confidence: 0.99, deviceSerial: 'BIO-BLR-02' },
  },

  // 2. Sahana J - BZ1007 (Human Resources - Chennai Branch)
  {
    id: 'sample-p-03',
    employeeCode: 'BZ1007',
    timeOffset: '09:48:22',
    punchType: 'in',
    source: 'web',
    terminalName: 'Chrome v130 (macOS)',
    workLocation: 'Chennai Branch',
    validationStatus: 'needs_review',
    processingState: 'processed',
    remarks: 'Late Punch',
    isUsedInCalc: false,
    rawPayload: { browser: 'Chrome 130.0', ip: '192.168.10.45', os: 'macOS 15.1' },
  },
  {
    id: 'sample-p-04',
    employeeCode: 'BZ1007',
    timeOffset: '18:32:10',
    punchType: 'out',
    source: 'web',
    terminalName: 'Chrome v130 (macOS)',
    workLocation: 'Chennai Branch',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Regular Checkout',
    isUsedInCalc: true,
    rawPayload: { browser: 'Chrome 130.0', ip: '192.168.10.45', os: 'macOS 15.1' },
  },

  // 3. Arjun S - BZ1010 (Engineering - Bangalore HQ)
  {
    id: 'sample-p-05',
    employeeCode: 'BZ1010',
    timeOffset: '08:58:15',
    punchType: 'in',
    source: 'mobile',
    terminalName: 'iOS App v2.4 (iPhone 15)',
    workLocation: 'Bangalore HQ (Geo-fenced)',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Normal Check In',
    isUsedInCalc: true,
    rawPayload: { appVersion: '2.4.0', lat: 12.9716, lng: 77.5946, accuracyMeters: 4.2 },
  },
  {
    id: 'sample-p-06',
    employeeCode: 'BZ1010',
    timeOffset: '08:59:02',
    punchType: 'in',
    source: 'mobile',
    terminalName: 'iOS App v2.4 (iPhone 15)',
    workLocation: 'Bangalore HQ (Geo-fenced)',
    validationStatus: 'duplicate',
    processingState: 'processed',
    remarks: 'Duplicate Punch',
    isUsedInCalc: false,
    rawPayload: { appVersion: '2.4.0', lat: 12.9716, lng: 77.5946, duplicateThresholdSec: 60 },
  },
  {
    id: 'sample-p-07',
    employeeCode: 'BZ1010',
    timeOffset: '16:15:30',
    punchType: 'out',
    source: 'mobile',
    terminalName: 'iOS App v2.4 (iPhone 15)',
    workLocation: 'Bangalore HQ (Geo-fenced)',
    validationStatus: 'needs_review',
    processingState: 'processed',
    remarks: 'Early Checkout',
    isUsedInCalc: false,
    rawPayload: { appVersion: '2.4.0', lat: 12.9716, lng: 77.5946, earlyDepartureMin: 105 },
  },

  // 4. Priya L - BZ1014 (Product Design - Bangalore HQ)
  {
    id: 'sample-p-08',
    employeeCode: 'BZ1014',
    timeOffset: '09:02:45',
    punchType: 'in',
    source: 'biometric',
    terminalName: 'Terminal-C (Reception)',
    workLocation: 'Bangalore HQ',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'On Time',
    isUsedInCalc: true,
    rawPayload: { biometricType: 'face_recognition', confidence: 0.99, deviceSerial: 'BIO-BLR-03' },
  },
  {
    id: 'sample-p-09',
    employeeCode: 'BZ1014',
    timeOffset: '18:05:10',
    punchType: 'out',
    source: 'biometric',
    terminalName: 'Terminal-A (Main Lobby)',
    workLocation: 'Bangalore HQ',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Normal Check Out',
    isUsedInCalc: true,
    rawPayload: { biometricType: 'fingerprint', confidence: 0.97, deviceSerial: 'BIO-BLR-01' },
  },

  // 5. Vimal M - BZ1020 (Operations - Remote / Hybrid)
  {
    id: 'sample-p-10',
    employeeCode: 'BZ1020',
    timeOffset: '09:20:00',
    punchType: 'in',
    source: 'biometric',
    terminalName: 'Face ID Terminal - 02',
    workLocation: 'Remote / Hybrid',
    validationStatus: 'valid',
    processingState: 'failed',
    remarks: 'Device Synchronization Failure',
    isUsedInCalc: false,
    rawPayload: { error: 'Device socket timeout during sync handshake', attemptCount: 3 },
  },
  {
    id: 'sample-p-11',
    employeeCode: 'BZ1020',
    timeOffset: '09:32:15',
    punchType: 'in',
    source: 'web',
    terminalName: 'Firefox v128 (Windows 11)',
    workLocation: 'Remote / Hybrid',
    validationStatus: 'needs_review',
    processingState: 'processed',
    remarks: 'Manual Review Required',
    isUsedInCalc: false,
    rawPayload: { browser: 'Firefox 128.0', ip: '203.0.113.195', vpnActive: true },
  },
  {
    id: 'sample-p-12',
    employeeCode: 'BZ1020',
    timeOffset: '18:15:00',
    punchType: 'out',
    source: 'web',
    terminalName: 'Firefox v128 (Windows 11)',
    workLocation: 'Remote / Hybrid',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Regular Checkout',
    isUsedInCalc: true,
    rawPayload: { browser: 'Firefox 128.0', ip: '203.0.113.195', vpnActive: true },
  },

  // 6. Divya R - BZ1025 (Marketing - Chennai Branch)
  {
    id: 'sample-p-13',
    employeeCode: 'BZ1025',
    timeOffset: '09:05:33',
    punchType: 'in',
    source: 'mobile',
    terminalName: 'Android App v2.4 (Pixel 8)',
    workLocation: 'Chennai Branch',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'On Time',
    isUsedInCalc: true,
    rawPayload: { appVersion: '2.4.0', lat: 13.0827, lng: 80.2707, accuracyMeters: 3.8 },
  },
  {
    id: 'sample-p-14',
    employeeCode: 'BZ1025',
    timeOffset: '17:55:12',
    punchType: 'out',
    source: 'mobile',
    terminalName: 'Android App v2.4 (Pixel 8)',
    workLocation: 'Chennai Branch',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Normal Check Out',
    isUsedInCalc: true,
    rawPayload: { appVersion: '2.4.0', lat: 13.0827, lng: 80.2707, accuracyMeters: 4.1 },
  },

  // 7. Naveen K - BZ1030 (Finance - Bangalore HQ)
  {
    id: 'sample-p-15',
    employeeCode: 'BZ1030',
    timeOffset: '10:15:20',
    punchType: 'in',
    source: 'biometric',
    terminalName: 'Terminal-A (Main Lobby)',
    workLocation: 'Bangalore HQ',
    validationStatus: 'needs_review',
    processingState: 'processed',
    remarks: 'Late Punch',
    isUsedInCalc: false,
    rawPayload: { biometricType: 'fingerprint', confidence: 0.96, lateGraceExceededMin: 45 },
  },
  {
    id: 'sample-p-16',
    employeeCode: 'BZ1030',
    timeOffset: '19:20:00',
    punchType: 'out',
    source: 'biometric',
    terminalName: 'Terminal-B (East Exit)',
    workLocation: 'Bangalore HQ',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Regular Checkout',
    isUsedInCalc: true,
    rawPayload: { biometricType: 'fingerprint', confidence: 0.99, overtimeMin: 50 },
  },

  // 8. Harish M - BZ1035 (Quality Assurance - Pune Hub)
  {
    id: 'sample-p-17',
    employeeCode: 'BZ1035',
    timeOffset: '09:14:40',
    punchType: 'in',
    source: 'biometric',
    terminalName: 'Terminal-D (Factory Gate)',
    workLocation: 'Pune Hub',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'On Time',
    isUsedInCalc: true,
    rawPayload: { biometricType: 'rfid_badge', cardUid: 'A4F29D38', deviceSerial: 'RFID-PUN-01' },
  },
  {
    id: 'sample-p-18',
    employeeCode: 'BZ1035',
    timeOffset: '14:20:00',
    punchType: 'out',
    source: 'biometric',
    terminalName: 'Terminal-D (Factory Gate)',
    workLocation: 'Pune Hub',
    validationStatus: 'invalid',
    processingState: 'processed',
    remarks: 'Missing Punch',
    isUsedInCalc: false,
    rawPayload: { flag: 'single_swipe_during_shift_midpoint', unlinkedDurationHours: 5.1 },
  },
  {
    id: 'sample-p-19',
    employeeCode: 'BZ1035',
    timeOffset: '18:25:15',
    punchType: 'out',
    source: 'web',
    terminalName: 'Edge v131 (Windows 11)',
    workLocation: 'Pune Hub',
    validationStatus: 'needs_review',
    processingState: 'processed',
    remarks: 'Manual Review Required',
    isUsedInCalc: false,
    rawPayload: { browser: 'Edge 131.0', ip: '198.51.100.22', justification: 'Factory badge malfunction' },
  },

  // 9. Meera R - BZ1040 (Legal & Compliance - Mumbai Office)
  {
    id: 'sample-p-20',
    employeeCode: 'BZ1040',
    timeOffset: '09:01:10',
    punchType: 'in',
    source: 'biometric',
    terminalName: 'Terminal-M (Mumbai Hub)',
    workLocation: 'Mumbai Office',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'On Time',
    isUsedInCalc: true,
    rawPayload: { biometricType: 'face_recognition', confidence: 0.98, deviceSerial: 'BIO-MUM-01' },
  },
  {
    id: 'sample-p-21',
    employeeCode: 'BZ1040',
    timeOffset: '12:45:00',
    punchType: 'in',
    source: 'biometric',
    terminalName: 'Terminal-M (Mumbai Hub)',
    workLocation: 'Mumbai Office',
    validationStatus: 'invalid',
    processingState: 'processed',
    remarks: 'Invalid Punch',
    isUsedInCalc: false,
    rawPayload: { error: 'Unknown security perimeter zone', zoneCode: 'SEC-Z9-RESTRICTED' },
  },
  {
    id: 'sample-p-22',
    employeeCode: 'BZ1040',
    timeOffset: '18:00:30',
    punchType: 'out',
    source: 'biometric',
    terminalName: 'Terminal-M (Mumbai Hub)',
    workLocation: 'Mumbai Office',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Regular Checkout',
    isUsedInCalc: true,
    rawPayload: { biometricType: 'face_recognition', confidence: 0.99, deviceSerial: 'BIO-MUM-01' },
  },

  // 10. Sanjay K - BZ1045 (DevOps & Infrastructure - Bangalore Data Center)
  // Overnight shift: Workday belongs to refDate, but subsequent punches fall on next calendar day!
  {
    id: 'sample-p-23',
    employeeCode: 'BZ1045',
    timeOffset: '21:52:10',
    dayOffset: 0,
    punchType: 'in',
    source: 'biometric',
    terminalName: 'Terminal-B (Data Center)',
    workLocation: 'Bangalore Data Center',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Normal Check In',
    isUsedInCalc: true,
    rawPayload: { shiftName: 'Night Shift - Ops', shiftStart: '22:00', confidence: 0.99 },
  },
  {
    id: 'sample-p-24',
    employeeCode: 'BZ1045',
    timeOffset: '01:30:25',
    dayOffset: 1, // Past midnight: next calendar day!
    punchType: 'out',
    source: 'biometric',
    terminalName: 'Terminal-B (Data Center)',
    workLocation: 'Bangalore Data Center',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Normal Check Out',
    isUsedInCalc: true,
    rawPayload: { shiftName: 'Night Shift - Ops', breakType: 'meal_break', confidence: 0.98 },
  },
  {
    id: 'sample-p-25',
    employeeCode: 'BZ1045',
    timeOffset: '02:15:10',
    dayOffset: 1, // Past midnight: next calendar day!
    punchType: 'in',
    source: 'mobile',
    terminalName: 'Android App v2.4',
    workLocation: 'Bangalore Data Center',
    validationStatus: 'valid',
    processingState: 'failed',
    remarks: 'Device Synchronization Failure',
    isUsedInCalc: false,
    rawPayload: { error: 'Network timeout syncing with cloud queue', retryAllowed: true },
  },
  {
    id: 'sample-p-26',
    employeeCode: 'BZ1045',
    timeOffset: '06:08:45',
    dayOffset: 1, // Past midnight: next calendar day!
    punchType: 'out',
    source: 'biometric',
    terminalName: 'Terminal-B (Data Center)',
    workLocation: 'Bangalore Data Center',
    validationStatus: 'valid',
    processingState: 'processed',
    remarks: 'Regular Checkout',
    isUsedInCalc: true,
    rawPayload: { shiftName: 'Night Shift - Ops', shiftEnd: '06:00', overtimeMin: 8, confidence: 0.99 },
  },
];

/**
 * Calculates a date string + offset days formatted as YYYY-MM-DD
 */
function addDays(dateStr: string, days: number): string {
  try {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

/**
 * Generates the full set of sample punch items anchored to a reference workday date.
 */
export function generateSamplePunchLogs(targetWorkdayDate?: string): PunchLogItem[] {
  const refDate = targetWorkdayDate || new Date().toISOString().slice(0, 10);
  const nextDate = addDays(refDate, 1);

  return SAMPLE_PUNCH_TEMPLATES.map((tmpl) => {
    const emp = SAMPLE_EMPLOYEES[tmpl.employeeCode] ?? {
      name: 'Employee',
      code: tmpl.employeeCode,
      department: 'General',
    };

    // Calculate actual timestamp date based on dayOffset
    const eventDate = tmpl.dayOffset ? nextDate : refDate;
    const punchTimestamp = `${eventDate}T${tmpl.timeOffset}Z`;

    return {
      id: tmpl.id,
      tenantId: 'tenant-dev-1',
      companyId: 'company-dev-1',
      employeeId: `emp-${tmpl.employeeCode.toLowerCase()}`,
      employeeName: emp.name,
      employeeCode: emp.code,
      departmentName: emp.department,
      rawIdentifier: tmpl.employeeCode,
      punchTime: punchTimestamp,
      punchType: tmpl.punchType,
      source: tmpl.source,
      deviceMetadata: {
        terminalName: tmpl.terminalName,
        deviceName: tmpl.terminalName,
        ...tmpl.rawPayload,
      },
      workLocation: tmpl.workLocation,
      workday: refDate, // All belong to this shift workday!
      validationStatus: tmpl.validationStatus,
      validationReason: tmpl.remarks,
      processingState: tmpl.processingState,
      processingError:
        tmpl.processingState === 'failed' ? 'Device socket timeout during sync handshake' : null,
      retryCount: tmpl.processingState === 'failed' ? 2 : 0,
      investigationStatus: tmpl.validationStatus === 'needs_review' ? 'open' : 'none',
      notes: tmpl.remarks,
      isDuplicate: tmpl.validationStatus === 'duplicate',
      createdAt: punchTimestamp,
      updatedAt: punchTimestamp,
      linkedAttendanceId: tmpl.isUsedInCalc ? `att-${tmpl.employeeCode}-${refDate}` : undefined,
      linkedAttendanceStatus: tmpl.isUsedInCalc ? 'present' : undefined,
      linkedAttendanceProcessingState: tmpl.isUsedInCalc ? 'finalized' : undefined,
    };
  });
}

/**
 * Builds a detailed PunchEventDetail object from a sample PunchLogItem
 * so the Punch Detail Drawer / Modal opens smoothly for sample records.
 */
export function getSamplePunchDetail(punch: PunchLogItem): PunchEventDetail {
  const meta = (punch.deviceMetadata as Record<string, unknown>) || {};

  return {
    ...punch,
    timeline: [
      {
        id: `tl-${punch.id}-1`,
        punchTime: punch.punchTime,
        punchType: punch.punchType,
        source: punch.source,
        validationStatus: punch.validationStatus,
        processingState: punch.processingState,
      },
    ],
    audits: [
      {
        id: `audit-${punch.id}-1`,
        tenantId: punch.tenantId,
        companyId: punch.companyId,
        punchId: punch.id,
        action: 'ingested',
        actorUserId: 'system-gateway',
        details: { source: punch.source, ...meta },
        notes: `Raw punch event captured via ${punch.source.toUpperCase()} gateway.`,
        createdAt: punch.punchTime,
      },
      {
        id: `audit-${punch.id}-2`,
        tenantId: punch.tenantId,
        companyId: punch.companyId,
        punchId: punch.id,
        action: 'validated',
        actorUserId: 'validation-engine',
        details: { validationStatus: punch.validationStatus, reason: punch.validationReason },
        notes: `Validation result: ${punch.validationStatus.toUpperCase()} (${punch.validationReason || 'Standard Validation'}).`,
        createdAt: punch.punchTime,
      },
      ...(punch.processingState === 'processed'
        ? [
            {
              id: `audit-${punch.id}-3`,
              tenantId: punch.tenantId,
              companyId: punch.companyId,
              punchId: punch.id,
              action: 'processed' as const,
              actorUserId: 'attendance-calculator',
              details: { linkedAttendanceId: punch.linkedAttendanceId },
              notes: punch.linkedAttendanceId
                ? 'Linked successfully to daily attendance record.'
                : 'Excluded from calculation based on validation rules.',
              createdAt: punch.punchTime,
            },
          ]
        : [
            {
              id: `audit-${punch.id}-3`,
              tenantId: punch.tenantId,
              companyId: punch.companyId,
              punchId: punch.id,
              action: 'retry_attempted' as const,
              actorUserId: 'sync-worker',
              details: { retryCount: punch.retryCount, error: punch.processingError },
              notes: punch.processingError || 'Queued for automatic retry.',
              createdAt: punch.punchTime,
            },
          ]),
    ],
  };
}

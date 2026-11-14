import { getDb } from '../src/db/connection.js';
import { attendancePunches, employees } from '../src/db/schema.js';
import { generateSurrogateId } from '../src/platform/auth/security.js';
import { and, eq } from 'drizzle-orm';

async function main() {
  const db = getDb();
  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';
  const workday = '2026-11-14';

  console.log(`[Seed Punches] Seeding live demo punches for ${workday}...`);

  // First delete any previous punches for 2026-11-14 to ensure idempotent run
  await db
    .delete(attendancePunches)
    .where(
      and(
        eq(attendancePunches.tenantId, tenantId),
        eq(attendancePunches.companyId, companyId),
        eq(attendancePunches.workday, workday),
      ),
    );

  const punchesToInsert = [
    // Lakshmi Narayanan (EMP-0001)
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_demo_001',
      workday,
      punchTime: new Date(`${workday}T09:02:15Z`),
      punchType: 'in' as const,
      source: 'biometric' as const,
      workLocation: 'HQ - Main Gate 1',
      deviceMetadata: { terminalName: 'Turnstile A1 - Main Lobby', terminalId: 'TRN-LOB-01' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_demo_001',
      workday,
      punchTime: new Date(`${workday}T18:15:30Z`),
      punchType: 'out' as const,
      source: 'biometric' as const,
      workLocation: 'HQ - Main Gate 1',
      deviceMetadata: { terminalName: 'Turnstile A2 - Main Lobby', terminalId: 'TRN-LOB-02' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },

    // Arjun Mehta (EMP-0002)
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_demo_002',
      workday,
      punchTime: new Date(`${workday}T08:55:10Z`),
      punchType: 'in' as const,
      source: 'web' as const,
      workLocation: 'Remote - Bangalore',
      deviceMetadata: { browser: 'Chrome 131', os: 'macOS 15', ip: '106.51.72.19' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_demo_002',
      workday,
      punchTime: new Date(`${workday}T13:00:22Z`),
      punchType: 'break_out' as const,
      source: 'web' as const,
      workLocation: 'Remote - Bangalore',
      deviceMetadata: { browser: 'Chrome 131', os: 'macOS 15' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_demo_002',
      workday,
      punchTime: new Date(`${workday}T13:45:05Z`),
      punchType: 'break_in' as const,
      source: 'web' as const,
      workLocation: 'Remote - Bangalore',
      deviceMetadata: { browser: 'Chrome 131', os: 'macOS 15' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_demo_002',
      workday,
      punchTime: new Date(`${workday}T17:58:40Z`),
      punchType: 'out' as const,
      source: 'web' as const,
      workLocation: 'Remote - Bangalore',
      deviceMetadata: { browser: 'Chrome 131', os: 'macOS 15', ip: '106.51.72.19' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },

    // Vikram Seth (EMP-ATT-001)
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_att_api_01',
      workday,
      punchTime: new Date(`${workday}T09:12:44Z`),
      punchType: 'in' as const,
      source: 'biometric' as const,
      workLocation: 'HQ - Floor 2',
      deviceMetadata: { terminalName: 'Biometric Scanner FL2-North', terminalId: 'BIO-FL2-01' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_att_api_01',
      workday,
      punchTime: new Date(`${workday}T18:05:12Z`),
      punchType: 'out' as const,
      source: 'biometric' as const,
      workLocation: 'HQ - Floor 2',
      deviceMetadata: { terminalName: 'Biometric Scanner FL2-North', terminalId: 'BIO-FL2-01' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },

    // Ananya Rao (EMP-EXC-001)
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_att_exc_test_01',
      workday,
      punchTime: new Date(`${workday}T09:42:00Z`),
      punchType: 'in' as const,
      source: 'mobile' as const,
      workLocation: 'Client Site - Mumbai',
      deviceMetadata: { deviceName: 'iPhone 15 Pro', appVersion: 'v2.4.0', geoFenced: true },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_att_exc_test_01',
      workday,
      punchTime: new Date(`${workday}T18:30:18Z`),
      punchType: 'out' as const,
      source: 'mobile' as const,
      workLocation: 'Client Site - Mumbai',
      deviceMetadata: { deviceName: 'iPhone 15 Pro', appVersion: 'v2.4.0', geoFenced: true },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },

    // Ananya Sharma (EMP-CO-001)
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_co_audit_001',
      workday,
      punchTime: new Date(`${workday}T09:04:11Z`),
      punchType: 'in' as const,
      source: 'biometric' as const,
      workLocation: 'HQ - Main Lobby',
      deviceMetadata: { terminalName: 'Face Recognition Cam 01', terminalId: 'FR-CAM-01' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_co_audit_001',
      workday,
      punchTime: new Date(`${workday}T17:55:40Z`),
      punchType: 'out' as const,
      source: 'biometric' as const,
      workLocation: 'HQ - Main Lobby',
      deviceMetadata: { terminalName: 'Face Recognition Cam 01', terminalId: 'FR-CAM-01' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },

    // Karthik Engineer (EMP-OD-001)
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_od_audit_001',
      workday,
      punchTime: new Date(`${workday}T08:48:33Z`),
      punchType: 'in' as const,
      source: 'biometric' as const,
      workLocation: 'HQ - Tech Hub',
      deviceMetadata: { terminalName: 'Biometric Scanner FL4-East', terminalId: 'BIO-FL4-02' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_od_audit_001',
      workday,
      punchTime: new Date(`${workday}T17:32:19Z`),
      punchType: 'out' as const,
      source: 'biometric' as const,
      workLocation: 'HQ - Tech Hub',
      deviceMetadata: { terminalName: 'Biometric Scanner FL4-East', terminalId: 'BIO-FL4-02' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },

    // Siddharth Rao (EMP-OT-001)
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_ot_audit_001',
      workday,
      punchTime: new Date(`${workday}T09:00:50Z`),
      punchType: 'in' as const,
      source: 'web' as const,
      workLocation: 'Office - Standard',
      deviceMetadata: { browser: 'Edge 130', os: 'Windows 11' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
    },
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_ot_audit_001',
      workday,
      punchTime: new Date(`${workday}T20:15:00Z`),
      punchType: 'out' as const,
      source: 'web' as const,
      workLocation: 'Office - Standard',
      deviceMetadata: { browser: 'Edge 130', os: 'Windows 11' },
      validationStatus: 'valid' as const,
      processingState: 'processed' as const,
      notes: 'Overtime shift approved',
    },

    // Import Tester (EMP-IMP-001) - Flagged for review
    {
      id: generateSurrogateId('pnch'),
      tenantId,
      companyId,
      employeeId: 'emp_import_01',
      workday,
      punchTime: new Date(`${workday}T10:20:15Z`),
      punchType: 'in' as const,
      source: 'kiosk' as const,
      workLocation: 'HQ - Entrance Gate',
      deviceMetadata: { terminalName: 'Visitor & Temp Kiosk', terminalId: 'KSK-01' },
      validationStatus: 'needs_review' as const,
      validationReason: 'Unregistered kiosk badge scan',
      processingState: 'processed' as const,
      investigationStatus: 'open' as const,
      investigationNotes: 'Manual badge swipe needs HR verification',
    },
  ];

  await db.insert(attendancePunches).values(punchesToInsert);

  console.log(`[Seed Punches] Successfully inserted ${punchesToInsert.length} punches for ${workday}!`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed Punches] Error:', err);
  process.exit(1);
});

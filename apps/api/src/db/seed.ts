import { getDb, isDatabaseConfigured } from './connection.js';
import { companies, departments, designations, locations, onboardingCases } from './schema.js';
import { eq } from 'drizzle-orm';

/**
 * Deterministic Development Seed Script
 *
 * Populates BEZENT Demo Pvt Ltd with starter departments, designations,
 * locations, and initial onboarding cases.
 *
 * Idempotent: checks for existing company before inserting.
 */
export async function seedDatabase() {
  if (!isDatabaseConfigured) {
    console.log('[Seed] Database not configured; skipping seed.');
    return;
  }

  const db = getDb();

  const tenantId = 'tenant_demo_01';
  const companyId = 'comp_demo_01';

  // 1. Company
  const existingCompany = await db.select().from(companies).where(eq(companies.id, companyId));

  if (existingCompany.length === 0) {
    console.log('[Seed] Inserting company...');
    await db.insert(companies).values({
      id: companyId,
      tenantId,
      name: 'BEZENT Demo Pvt Ltd',
      code: 'BEZENT_DEMO',
      status: 'active',
    });
  }

  // 2. Departments
  const deptData = [
    { id: 'dept_eng_01', name: 'Engineering', code: 'ENG' },
    { id: 'dept_hr_01', name: 'Human Resources', code: 'HR' },
    { id: 'dept_fin_01', name: 'Finance', code: 'FIN' },
    { id: 'dept_prod_01', name: 'Product', code: 'PROD' },
  ];

  for (const d of deptData) {
    const exists = await db.select().from(departments).where(eq(departments.id, d.id));
    if (exists.length === 0) {
      await db.insert(departments).values({
        id: d.id,
        tenantId,
        companyId,
        name: d.name,
        code: d.code,
        status: 'active',
      });
    }
  }

  // 3. Designations
  const desigData = [
    { id: 'desig_se_01', name: 'Software Engineer', code: 'SE' },
    { id: 'desig_hr_01', name: 'Senior HR Specialist', code: 'SHR' },
    { id: 'desig_fa_01', name: 'Financial Analyst', code: 'FA' },
    { id: 'desig_pm_01', name: 'Product Manager', code: 'PM' },
  ];

  for (const d of desigData) {
    const exists = await db.select().from(designations).where(eq(designations.id, d.id));
    if (exists.length === 0) {
      await db.insert(designations).values({
        id: d.id,
        tenantId,
        companyId,
        name: d.name,
        code: d.code,
        status: 'active',
      });
    }
  }

  // 4. Locations
  const locData = [
    { id: 'loc_chn_01', name: 'Chennai (HQ)', code: 'CHN', city: 'Chennai', country: 'India' },
    { id: 'loc_blr_01', name: 'Bengaluru', code: 'BLR', city: 'Bengaluru', country: 'India' },
    { id: 'loc_rem_01', name: 'Remote', code: 'REM', city: 'Remote', country: 'Global' },
  ];

  for (const l of locData) {
    const exists = await db.select().from(locations).where(eq(locations.id, l.id));
    if (exists.length === 0) {
      await db.insert(locations).values({
        id: l.id,
        tenantId,
        companyId,
        name: l.name,
        code: l.code,
        city: l.city,
        country: l.country,
        status: 'active',
      });
    }
  }

  // 5. Sample Onboarding Cases
  const sampleCases = [
    {
      id: 'case_arun_01',
      firstName: 'Arun',
      lastName: 'Kumar',
      email: 'arun.kumar@example.com',
      phone: '+91 98765 43210',
      joiningDate: '2026-10-01',
      employmentType: 'full_time' as const,
      stage: 'preboarding' as const,
      departmentId: 'dept_eng_01',
      designationId: 'desig_se_01',
      locationId: 'loc_chn_01',
    },
    {
      id: 'case_priya_02',
      firstName: 'Priya',
      lastName: 'S',
      email: 'priya.s@example.com',
      phone: '+91 98765 43211',
      joiningDate: '2026-10-15',
      employmentType: 'full_time' as const,
      stage: 'documents' as const,
      departmentId: 'dept_hr_01',
      designationId: 'desig_hr_01',
      locationId: 'loc_chn_01',
    },
  ];

  for (const c of sampleCases) {
    const exists = await db.select().from(onboardingCases).where(eq(onboardingCases.id, c.id));
    if (exists.length === 0) {
      await db.insert(onboardingCases).values({
        ...c,
        tenantId,
        companyId,
        status: 'active',
      });
    }
  }

  console.log('[Seed] Database seeded successfully for BEZENT Demo Pvt Ltd.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}

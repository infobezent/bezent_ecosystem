import { getDb, isDatabaseConfigured } from './connection.js';
import {
  tenants,
  companies,
  departments,
  designations,
  locations,
  onboardingCases,
  onboardingGeneralSettings,
  onboardingStageConfigs,
  onboardingFieldConfigs,
  onboardingDocumentRequirements,
  onboardingChecklistTemplates,
  onboardingConversionSettings,
  employees,
} from './schema.js';
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

  // 0. Tenant
  const existingTenant = await db.select().from(tenants).where(eq(tenants.id, tenantId));

  if (existingTenant.length === 0) {
    console.log('[Seed] Inserting tenant...');
    await db.insert(tenants).values({
      id: tenantId,
      name: 'BEZENT Demo Organization',
      status: 'active',
    });
  }

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

  // 6. Onboarding Settings for comp_demo_01
  const existingGen = await db
    .select()
    .from(onboardingGeneralSettings)
    .where(eq(onboardingGeneralSettings.companyId, companyId));
  if (existingGen.length === 0) {
    await db.insert(onboardingGeneralSettings).values({
      id: 'gen_sett_demo_01',
      tenantId,
      companyId,
      onboardingEnabled: true,
      defaultDurationDays: 30,
      idPrefix: 'NH-',
      defaultLocationId: 'loc_chn_01',
    });
  }

  const stageData = [
    {
      id: 'stg_cfg_preboarding',
      stageKey: 'preboarding',
      name: 'Pre-boarding',
      description: 'Pre-boarding activities prior to day 1',
      displayOrder: 1,
      isRequired: true,
      isActive: true,
      isSystem: true,
    },
    {
      id: 'stg_cfg_documents',
      stageKey: 'documents',
      name: 'Document Collection',
      description: 'Collection and verification of employee credentials',
      displayOrder: 2,
      isRequired: true,
      isActive: true,
      isSystem: true,
    },
    {
      id: 'stg_cfg_induction',
      stageKey: 'induction',
      name: 'Induction & Orientation',
      description: 'Welcome session and team orientation',
      displayOrder: 3,
      isRequired: true,
      isActive: true,
      isSystem: true,
    },
    {
      id: 'stg_cfg_completed',
      stageKey: 'completed',
      name: 'Completed',
      description: 'Onboarding process successfully finalized',
      displayOrder: 4,
      isRequired: true,
      isActive: true,
      isSystem: true,
    },
  ];

  for (const s of stageData) {
    const exists = await db
      .select()
      .from(onboardingStageConfigs)
      .where(eq(onboardingStageConfigs.id, s.id));
    if (exists.length === 0) {
      await db.insert(onboardingStageConfigs).values({
        ...s,
        tenantId,
        companyId,
      });
    }
  }

  const fieldData = [
    {
      id: 'fld_cfg_first_name',
      fieldKey: 'firstName',
      label: 'First Name',
      isRequired: true,
      isEnabled: true,
      displayOrder: 1,
      isSystem: true,
    },
    {
      id: 'fld_cfg_last_name',
      fieldKey: 'lastName',
      label: 'Last Name',
      isRequired: false,
      isEnabled: true,
      displayOrder: 2,
      isSystem: false,
    },
    {
      id: 'fld_cfg_email',
      fieldKey: 'email',
      label: 'Work / Personal Email',
      isRequired: true,
      isEnabled: true,
      displayOrder: 3,
      isSystem: true,
    },
    {
      id: 'fld_cfg_phone',
      fieldKey: 'phone',
      label: 'Phone Number',
      isRequired: false,
      isEnabled: true,
      displayOrder: 4,
      isSystem: false,
    },
    {
      id: 'fld_cfg_company_id',
      fieldKey: 'companyId',
      label: 'Company',
      isRequired: true,
      isEnabled: true,
      displayOrder: 5,
      isSystem: true,
    },
    {
      id: 'fld_cfg_dept_id',
      fieldKey: 'departmentId',
      label: 'Department',
      isRequired: true,
      isEnabled: true,
      displayOrder: 6,
      isSystem: true,
    },
    {
      id: 'fld_cfg_desig_id',
      fieldKey: 'designationId',
      label: 'Designation',
      isRequired: true,
      isEnabled: true,
      displayOrder: 7,
      isSystem: true,
    },
    {
      id: 'fld_cfg_loc_id',
      fieldKey: 'locationId',
      label: 'Work Location',
      isRequired: false,
      isEnabled: true,
      displayOrder: 8,
      isSystem: false,
    },
    {
      id: 'fld_cfg_joining_date',
      fieldKey: 'joiningDate',
      label: 'Date of Joining',
      isRequired: true,
      isEnabled: true,
      displayOrder: 9,
      isSystem: true,
    },
    {
      id: 'fld_cfg_emp_type',
      fieldKey: 'employmentType',
      label: 'Employment Type',
      isRequired: true,
      isEnabled: true,
      displayOrder: 10,
      isSystem: true,
    },
  ];

  for (const f of fieldData) {
    const exists = await db
      .select()
      .from(onboardingFieldConfigs)
      .where(eq(onboardingFieldConfigs.id, f.id));
    if (exists.length === 0) {
      await db.insert(onboardingFieldConfigs).values({
        ...f,
        tenantId,
        companyId,
      });
    }
  }

  const docData = [
    {
      id: 'doc_req_id_proof',
      documentType: 'id_proof',
      name: 'Government ID Proof',
      description: 'National ID, Passport, or Driver License',
      isRequired: true,
      verificationRequired: true,
      expiryTracking: false,
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'doc_req_edu_cert',
      documentType: 'educational_certificates',
      name: 'Degree & Educational Certificates',
      description: 'Highest degree completion certificates',
      isRequired: true,
      verificationRequired: true,
      expiryTracking: false,
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'doc_req_relieving',
      documentType: 'experience_letters',
      name: 'Previous Employment Relieving Letters',
      description: 'Relieving & experience letters from past employers',
      isRequired: false,
      verificationRequired: true,
      expiryTracking: false,
      displayOrder: 3,
      isActive: true,
    },
    {
      id: 'doc_req_bank',
      documentType: 'bank_details',
      name: 'Bank Account Passbook / Cancelled Cheque',
      description: 'Bank details for salary processing',
      isRequired: true,
      verificationRequired: true,
      expiryTracking: false,
      displayOrder: 4,
      isActive: true,
    },
  ];

  for (const doc of docData) {
    const exists = await db
      .select()
      .from(onboardingDocumentRequirements)
      .where(eq(onboardingDocumentRequirements.id, doc.id));
    if (exists.length === 0) {
      await db.insert(onboardingDocumentRequirements).values({
        ...doc,
        tenantId,
        companyId,
      });
    }
  }

  const chkData = [
    {
      id: 'chk_tpl_welcome',
      name: 'Send Welcome Email',
      description: 'Send onboarding email and first-day details to new hire',
      stageKey: 'preboarding',
      assigneeType: 'hr',
      dueOffsetDays: -3,
      isRequired: true,
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'chk_tpl_hardware',
      name: 'Prepare IT Hardware & Accounts',
      description: 'Provision laptop, email account, and access rights',
      stageKey: 'preboarding',
      assigneeType: 'it_admin',
      dueOffsetDays: -1,
      isRequired: true,
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'chk_tpl_submit_docs',
      name: 'Submit Personal & Banking Information',
      description: 'Upload required documents and enter bank details',
      stageKey: 'documents',
      assigneeType: 'employee',
      dueOffsetDays: 1,
      isRequired: true,
      displayOrder: 3,
      isActive: true,
    },
    {
      id: 'chk_tpl_verify_docs',
      name: 'Verify Submitted Documents',
      description: 'Review and verify identity and background documents',
      stageKey: 'documents',
      assigneeType: 'hr',
      dueOffsetDays: 3,
      isRequired: true,
      displayOrder: 4,
      isActive: true,
    },
    {
      id: 'chk_tpl_induction',
      name: 'Team Introduction & Induction Session',
      description: 'Conduct welcome meeting and introduce team buddy',
      stageKey: 'induction',
      assigneeType: 'manager',
      dueOffsetDays: 1,
      isRequired: true,
      displayOrder: 5,
      isActive: true,
    },
  ];

  for (const chk of chkData) {
    const exists = await db
      .select()
      .from(onboardingChecklistTemplates)
      .where(eq(onboardingChecklistTemplates.id, chk.id));
    if (exists.length === 0) {
      await db.insert(onboardingChecklistTemplates).values({
        ...chk,
        tenantId,
        companyId,
      });
    }
  }

  const existingConv = await db
    .select()
    .from(onboardingConversionSettings)
    .where(eq(onboardingConversionSettings.companyId, companyId));
  if (existingConv.length === 0) {
    await db.insert(onboardingConversionSettings).values({
      id: 'conv_sett_demo_01',
      tenantId,
      companyId,
      autoConvertOnJoining: false,
      requireDocumentVerification: true,
      requireChecklistCompletion: true,
      employeeIdPrefix: 'EMP-',
      defaultEmploymentStatus: 'probation',
    });
  }

  // 7. Sample Employees (canonical HRMS workforce records; user_id left null — no IAM yet)
  const employeeData = [
    {
      id: 'emp_demo_001',
      employeeNumber: 'EMP-0001',
      firstName: 'Lakshmi',
      lastName: 'Narayanan',
      email: 'lakshmi.narayanan@bezent-demo.example',
      departmentId: 'dept_hr_01',
      designationId: 'desig_hr_01',
      locationId: 'loc_chn_01',
      reportingManagerId: null,
      joiningDate: '2023-04-03',
      probationEndDate: '2023-10-03',
      confirmationDate: '2023-10-03',
      employmentStatus: 'active' as const,
    },
    {
      id: 'emp_demo_002',
      employeeNumber: 'EMP-0002',
      firstName: 'Arjun',
      lastName: 'Mehta',
      email: 'arjun.mehta@bezent-demo.example',
      departmentId: 'dept_eng_01',
      designationId: 'desig_se_01',
      locationId: 'loc_blr_01',
      reportingManagerId: 'emp_demo_001',
      joiningDate: '2024-01-15',
      probationEndDate: '2024-07-15',
      confirmationDate: '2024-07-15',
      employmentStatus: 'active' as const,
    },
    {
      id: 'emp_demo_003',
      employeeNumber: 'EMP-0003',
      firstName: 'Kavya',
      lastName: 'Iyer',
      email: 'kavya.iyer@bezent-demo.example',
      departmentId: 'dept_eng_01',
      designationId: 'desig_se_01',
      locationId: 'loc_chn_01',
      reportingManagerId: 'emp_demo_002',
      joiningDate: '2026-06-01',
      probationEndDate: '2026-12-01',
      confirmationDate: null,
      employmentStatus: 'probation' as const,
    },
    {
      id: 'emp_demo_004',
      employeeNumber: 'EMP-0004',
      firstName: 'Rahul',
      lastName: 'Verma',
      email: 'rahul.verma@bezent-demo.example',
      departmentId: 'dept_fin_01',
      designationId: 'desig_fa_01',
      locationId: 'loc_rem_01',
      reportingManagerId: 'emp_demo_001',
      joiningDate: '2026-07-20',
      probationEndDate: '2027-01-20',
      confirmationDate: null,
      employmentStatus: 'probation' as const,
    },
  ];

  for (const e of employeeData) {
    const exists = await db.select().from(employees).where(eq(employees.id, e.id));
    if (exists.length === 0) {
      await db.insert(employees).values({
        ...e,
        tenantId,
        companyId,
        employmentType: 'full_time',
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

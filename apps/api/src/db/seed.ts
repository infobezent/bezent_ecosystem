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
  tenantDetails,
  users,
  memberships,
  roleAssignments,
  tenantModules,
  employeePersonalDetails,
  employeeLeaveBalances,
  employeeTasks,
  employeeNotifications,
  tenantAdmins,
  plans,
  planPrices,
  planEntitlements,
  tenantLifecycleEvents,
  attendancePolicies,
  attendanceGeneralSettings,
  attendanceRegularizationSettings,
  attendanceSecuritySettings,
  attendancePayrollSettings,
  attendanceDevices,
  attendanceOvertimePolicies,
  employeeAttendance,
} from './schema.js';
import { and, eq } from 'drizzle-orm';
import { createUnusableCredential } from '../platform/auth/security.js';

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
      isTerminal: false,
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
      isTerminal: false,
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
      isTerminal: false,
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
      isTerminal: true,
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

  // 8. Tenant Details for canonical demo tenant
  const existingDetail = await db
    .select()
    .from(tenantDetails)
    .where(eq(tenantDetails.tenantId, tenantId));
  if (existingDetail.length === 0) {
    await db.insert(tenantDetails).values({
      tenantId,
      code: 'BEZENT_DEMO',
      contactEmail: 'contact@bezent-demo.example',
      contactPhone: '+1-555-0199',
    });
  }

  // 9. Development Identity 1: superadmin@bezent.com (Platform Super Admin)
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@bezent.com')
    .toLowerCase()
    .trim();
  const existingSa = await db.select().from(users).where(eq(users.email, superAdminEmail));
  if (existingSa.length === 0) {
    const { hash, salt } = createUnusableCredential(); // passwordless: signs in with Email OTP
    await db.insert(users).values({
      id: 'usr_sa_demo_01',
      email: superAdminEmail,
      passwordHash: hash,
      salt,
      firstName: 'Platform',
      lastName: 'Super Admin',
      status: 'active',
      isSuperAdmin: true,
    });
  } else {
    await db
      .update(users)
      .set({ isSuperAdmin: true, status: 'active' })
      .where(eq(users.email, superAdminEmail));
  }

  // 10. Development Identity 2: companyadmin@bezent.com (Development Company Administrator)
  const companyAdminEmail = 'companyadmin@bezent.com';
  const existingCa = await db.select().from(users).where(eq(users.email, companyAdminEmail));
  let companyAdminUserId = 'usr_ca_bezent_01';
  if (existingCa.length === 0) {
    const { hash, salt } = createUnusableCredential(); // passwordless: signs in with Email OTP
    await db.insert(users).values({
      id: companyAdminUserId,
      email: companyAdminEmail,
      passwordHash: hash,
      salt,
      firstName: 'Company',
      lastName: 'Admin',
      status: 'active',
      isSuperAdmin: false,
    });
  } else {
    companyAdminUserId = existingCa[0]!.id;
    await db
      .update(users)
      .set({ status: 'active', isSuperAdmin: false })
      .where(eq(users.id, companyAdminUserId));
  }

  // Company Admin Membership & System Role Assignment
  const existingCaMem = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.companyId, companyId),
        eq(memberships.userId, companyAdminUserId),
      ),
    );
  if (existingCaMem.length === 0) {
    await db.insert(memberships).values({
      id: 'mem_ca_bezent_01',
      tenantId,
      companyId,
      userId: companyAdminUserId,
      role: 'company_admin',
      status: 'active',
    });
  }
  await db
    .insert(roleAssignments)
    .values({
      id: 'ra_ca_bezent_01',
      userId: companyAdminUserId,
      roleId: 'role_sys_company_admin',
      tenantId,
      companyId,
      status: 'active',
    })
    .onDuplicateKeyUpdate({ set: { status: 'active' } });

  // Also support legacy test company admin alias if present
  const legacyCaEmail = 'admin@bezent-demo.example';
  const existingLegacyCa = await db.select().from(users).where(eq(users.email, legacyCaEmail));
  if (existingLegacyCa.length === 0) {
    const { hash, salt } = createUnusableCredential();
    await db.insert(users).values({
      id: 'usr_ca_legacy_01',
      email: legacyCaEmail,
      passwordHash: hash,
      salt,
      firstName: 'Company',
      lastName: 'Administrator',
      status: 'active',
      isSuperAdmin: false,
    });
    await db.insert(memberships).values({
      id: 'mem_ca_legacy_01',
      tenantId,
      companyId,
      userId: 'usr_ca_legacy_01',
      role: 'company_admin',
      status: 'active',
    });
    await db.insert(roleAssignments).values({
      id: 'ra_ca_legacy_01',
      userId: 'usr_ca_legacy_01',
      roleId: 'role_sys_company_admin',
      tenantId,
      companyId,
      status: 'active',
    });
  }

  // 11. Development Identity 3: hr@bezent.com (Daily HRMS Application Development)
  const hrEmail = 'hr@bezent.com';
  const existingHr = await db.select().from(users).where(eq(users.email, hrEmail));
  let hrUserId = 'usr_hr_bezent_01';
  if (existingHr.length === 0) {
    const { hash, salt } = createUnusableCredential();
    await db.insert(users).values({
      id: hrUserId,
      email: hrEmail,
      passwordHash: hash,
      salt,
      firstName: 'HR',
      lastName: 'Manager',
      status: 'active',
      isSuperAdmin: false,
    });
  } else {
    hrUserId = existingHr[0]!.id;
    await db
      .update(users)
      .set({ status: 'active', isSuperAdmin: false })
      .where(eq(users.id, hrUserId));
  }

  // HR Membership & Role Assignment
  const existingHrMem = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.companyId, companyId),
        eq(memberships.userId, hrUserId),
      ),
    );
  if (existingHrMem.length === 0) {
    await db.insert(memberships).values({
      id: 'mem_hr_bezent_01',
      tenantId,
      companyId,
      userId: hrUserId,
      role: 'hr_manager',
      status: 'active',
    });
  }
  await db
    .insert(roleAssignments)
    .values({
      id: 'ra_hr_bezent_01',
      userId: hrUserId,
      roleId: 'role_sys_hr_manager',
      tenantId,
      companyId,
      status: 'active',
    })
    .onDuplicateKeyUpdate({ set: { status: 'active' } });

  // Link HR employee record (emp_demo_001 Lakshmi Narayanan)
  await db.update(employees).set({ userId: hrUserId }).where(eq(employees.id, 'emp_demo_001'));

  // 12. Ensure HRMS Application Entitlement in Development Company
  const existingModule = await db
    .select()
    .from(tenantModules)
    .where(
      and(
        eq(tenantModules.tenantId, tenantId),
        eq(tenantModules.companyId, companyId),
        eq(tenantModules.moduleCode, 'hrms'),
      ),
    );
  if (existingModule.length === 0) {
    await db.insert(tenantModules).values({
      id: 'mod_hrms_demo_01',
      tenantId,
      companyId,
      moduleCode: 'hrms',
      status: 'enabled',
    });
  } else if (existingModule[0]!.status !== 'enabled') {
    await db
      .update(tenantModules)
      .set({ status: 'enabled' })
      .where(eq(tenantModules.id, existingModule[0]!.id));
  }

  // 13. Development Identity 4: employee@bezent.com (Employee Self Service testing)
  const employeeEmail = 'employee@bezent.com';
  const existingEmpUser = await db.select().from(users).where(eq(users.email, employeeEmail));
  let empUserId = 'usr_emp_bezent_01';
  if (existingEmpUser.length === 0) {
    const { hash, salt } = createUnusableCredential();
    await db.insert(users).values({
      id: empUserId,
      email: employeeEmail,
      passwordHash: hash,
      salt,
      firstName: 'Demo',
      lastName: 'Employee',
      status: 'active',
      isSuperAdmin: false,
    });
  } else {
    empUserId = existingEmpUser[0]!.id;
    await db
      .update(users)
      .set({ status: 'active', isSuperAdmin: false })
      .where(eq(users.id, empUserId));
  }

  // Employee Membership
  const existingEmpMem = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.companyId, companyId),
        eq(memberships.userId, empUserId),
      ),
    );
  if (existingEmpMem.length === 0) {
    await db.insert(memberships).values({
      id: 'mem_emp_bezent_01',
      tenantId,
      companyId,
      userId: empUserId,
      role: 'employee',
      status: 'active',
    });
  }
  await db
    .insert(roleAssignments)
    .values({
      id: 'ra_emp_bezent_01',
      userId: empUserId,
      roleId: 'role_sys_employee',
      tenantId,
      companyId,
      status: 'active',
    })
    .onDuplicateKeyUpdate({ set: { status: 'active' } });

  // Link employee record (emp_demo_002) to this user
  await db
    .update(employees)
    .set({ userId: empUserId, email: employeeEmail })
    .where(eq(employees.id, 'emp_demo_002'));

  // Personal details for emp_demo_002 (Arjun Mehta)
  const existingPersonal = await db
    .select()
    .from(employeePersonalDetails)
    .where(eq(employeePersonalDetails.employeeId, 'emp_demo_002'));
  if (existingPersonal.length === 0) {
    await db.insert(employeePersonalDetails).values({
      employeeId: 'emp_demo_002',
      tenantId,
      companyId,
      gender: 'male',
      dateOfBirth: '1995-08-20',
      nationality: 'Indian',
    });
  } else if (!existingPersonal[0]?.gender) {
    await db
      .update(employeePersonalDetails)
      .set({ gender: 'male' })
      .where(eq(employeePersonalDetails.employeeId, 'emp_demo_002'));
  }

  // Initial Leave Balances for 2026
  const existingLeaveBal = await db
    .select()
    .from(employeeLeaveBalances)
    .where(eq(employeeLeaveBalances.employeeId, 'emp_demo_002'));
  if (existingLeaveBal.length === 0) {
    await db.insert(employeeLeaveBalances).values([
      {
        id: 'lvb_demo_01',
        tenantId,
        companyId,
        employeeId: 'emp_demo_002',
        leaveType: 'annual',
        totalDays: 18,
        usedDays: 3,
        pendingDays: 0,
        year: 2026,
      },
      {
        id: 'lvb_demo_02',
        tenantId,
        companyId,
        employeeId: 'emp_demo_002',
        leaveType: 'sick',
        totalDays: 12,
        usedDays: 1,
        pendingDays: 0,
        year: 2026,
      },
      {
        id: 'lvb_demo_03',
        tenantId,
        companyId,
        employeeId: 'emp_demo_002',
        leaveType: 'casual',
        totalDays: 6,
        usedDays: 0,
        pendingDays: 0,
        year: 2026,
      },
    ]);
  }

  // Initial Task for Arjun
  const existingEmpTask = await db
    .select()
    .from(employeeTasks)
    .where(eq(employeeTasks.employeeId, 'emp_demo_002'));
  if (existingEmpTask.length === 0) {
    await db.insert(employeeTasks).values({
      id: 'tsk_demo_01',
      tenantId,
      companyId,
      employeeId: 'emp_demo_002',
      title: 'Complete annual IT security compliance refresher',
      description: 'Review updated data handling policies and acknowledge compliance.',
      dueDate: '2026-10-15',
      priority: 'medium',
      status: 'pending',
    });
  }

  // Initial Welcome Notification
  const existingEmpNotif = await db
    .select()
    .from(employeeNotifications)
    .where(eq(employeeNotifications.employeeId, 'emp_demo_002'));
  if (existingEmpNotif.length === 0) {
    await db.insert(employeeNotifications).values({
      id: 'notif_demo_01',
      tenantId,
      companyId,
      employeeId: 'emp_demo_002',
      title: 'Welcome to BEZENT Employee Self Service',
      message:
        'Access your profile, attendance, leave balance, documents and personal requests directly.',
      type: 'info',
      isRead: false,
    });
  }

  // 13b. Seed Month Attendance Records for Arjun Mehta (emp_demo_002) for October 2026
  const existingOctAtt = await db
    .select({ id: employeeAttendance.id })
    .from(employeeAttendance)
    .where(
      and(
        eq(employeeAttendance.tenantId, tenantId),
        eq(employeeAttendance.companyId, companyId),
        eq(employeeAttendance.employeeId, 'emp_demo_002'),
      ),
    );

  if (existingOctAtt.length < 5) {
    const octRecords = [
      {
        id: 'att_seed_oct_01',
        date: '2026-10-01',
        checkIn: '09:02',
        checkOut: '18:04',
        worked: 482,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_02',
        date: '2026-10-02',
        checkIn: null,
        checkOut: null,
        worked: 0,
        status: 'on_leave' as const,
        isLate: false,
        lateMins: 0,
        notes: 'Approved Casual Leave',
      },
      {
        id: 'att_seed_oct_03',
        date: '2026-10-03',
        checkIn: null,
        checkOut: null,
        worked: 0,
        status: 'absent' as const,
        isLate: false,
        lateMins: 0,
        notes: 'Unplanned Absence',
      },
      {
        id: 'att_seed_oct_05',
        date: '2026-10-05',
        checkIn: '08:58',
        checkOut: '18:02',
        worked: 484,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_06',
        date: '2026-10-06',
        checkIn: '09:35',
        checkOut: '18:15',
        worked: 460,
        status: 'present' as const,
        isLate: true,
        lateMins: 35,
        notes: 'Late arrival - Traffic delay',
      },
      {
        id: 'att_seed_oct_07',
        date: '2026-10-07',
        checkIn: '09:05',
        checkOut: '18:00',
        worked: 475,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_08',
        date: '2026-10-08',
        checkIn: '09:00',
        checkOut: '18:10',
        worked: 490,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_09',
        date: '2026-10-09',
        checkIn: '08:55',
        checkOut: '18:00',
        worked: 485,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_12',
        date: '2026-10-12',
        checkIn: '09:01',
        checkOut: '18:04',
        worked: 483,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_13',
        date: '2026-10-13',
        checkIn: '08:59',
        checkOut: '18:00',
        worked: 481,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_14',
        date: '2026-10-14',
        checkIn: '09:25',
        checkOut: '18:30',
        worked: 485,
        status: 'present' as const,
        isLate: true,
        lateMins: 25,
        notes: 'Late arrival - Client call',
      },
      {
        id: 'att_seed_oct_15',
        date: '2026-10-15',
        checkIn: '09:02',
        checkOut: '18:01',
        worked: 479,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_16',
        date: '2026-10-16',
        checkIn: '09:02',
        checkOut: null,
        worked: 0,
        status: 'present' as const,
        isLate: false,
        lateMins: 0,
      },
      {
        id: 'att_seed_oct_19',
        date: '2026-10-19',
        checkIn: null,
        checkOut: null,
        worked: 0,
        status: 'on_leave' as const,
        isLate: false,
        lateMins: 0,
        notes: 'Approved Annual Leave',
      },
      {
        id: 'att_seed_oct_20',
        date: '2026-10-20',
        checkIn: null,
        checkOut: null,
        worked: 0,
        status: 'on_leave' as const,
        isLate: false,
        lateMins: 0,
        notes: 'Approved Annual Leave',
      },
    ];

    for (const r of octRecords) {
      await db
        .insert(employeeAttendance)
        .values({
          id: r.id,
          tenantId,
          companyId,
          employeeId: 'emp_demo_002',
          date: r.date,
          checkInTime: r.checkIn,
          checkOutTime: r.checkOut,
          status: r.status,
          workLocation: 'office',
          notes: r.notes ?? null,
          workedMinutes: r.worked,
          lateMinutes: r.lateMins,
          isLate: r.isLate,
          shiftScheduleRef: 'General Shift · 09:00–18:00',
        })
        .onDuplicateKeyUpdate({
          set: {
            checkInTime: r.checkIn,
            checkOutTime: r.checkOut,
            status: r.status,
            workedMinutes: r.worked,
            lateMinutes: r.lateMins,
            isLate: r.isLate,
          },
        });
    }
  }

  // 14. Development Identity 5: tenantadmin@bezent.com (Dedicated Tenant Admin)
  const tenantAdminEmail = 'tenantadmin@bezent.com';
  const existingTaUser = await db.select().from(users).where(eq(users.email, tenantAdminEmail));
  let tenantAdminUserId = 'usr_ta_bezent_01';
  if (existingTaUser.length === 0) {
    const { hash, salt } = createUnusableCredential(); // passwordless: signs in with Email OTP
    await db.insert(users).values({
      id: tenantAdminUserId,
      email: tenantAdminEmail,
      passwordHash: hash,
      salt,
      firstName: 'Tenant',
      lastName: 'Admin',
      status: 'active',
      isSuperAdmin: false,
    });
  } else {
    tenantAdminUserId = existingTaUser[0]!.id;
    await db
      .update(users)
      .set({ status: 'active', isSuperAdmin: false })
      .where(eq(users.id, tenantAdminUserId));
  }

  // Canonical Tenant Admin Authority (tenant_admins record)
  // Strictly NO memberships, NO company_admin role, NO employee record
  const existingTaRecord = await db
    .select()
    .from(tenantAdmins)
    .where(and(eq(tenantAdmins.tenantId, tenantId), eq(tenantAdmins.userId, tenantAdminUserId)));
  if (existingTaRecord.length === 0) {
    await db.insert(tenantAdmins).values({
      id: 'ta_bezent_demo_01',
      tenantId,
      userId: tenantAdminUserId,
      status: 'active',
      isPrimary: true,
      jobTitle: 'Chief Technology Officer',
    });
  } else {
    await db
      .update(tenantAdmins)
      .set({
        status: 'active',
        isPrimary: true,
        jobTitle: 'Chief Technology Officer',
      })
      .where(eq(tenantAdmins.id, existingTaRecord[0]!.id));
  }

  // 17. Tenant Lifecycle Event Baseline
  const existingLifecycle = await db
    .select()
    .from(tenantLifecycleEvents)
    .where(eq(tenantLifecycleEvents.tenantId, tenantId));
  if (existingLifecycle.length === 0) {
    await db.insert(tenantLifecycleEvents).values({
      id: 'tle_demo_init',
      tenantId,
      eventType: 'created',
      newStatus: 'active',
      reason: 'Initial platform demonstration tenant seed',
      actorUserId: tenantAdminUserId,
      actorEmail: tenantAdminEmail,
      metadata: { seed: true, phase: 'phase_01' },
    });
  }

  // 18. Commercial Subscription Plans Catalog (HRMS, CRM, PM)
  const defaultPlans: (typeof plans.$inferInsert)[] = [
    {
      id: 'plan_hrms_starter',
      applicationCode: 'hrms',
      code: 'starter',
      name: 'HRMS Starter',
      description: 'Essential core workforce, attendance, and leave management for small teams.',
      tier: 'starter',
      status: 'active',
      version: 1,
      defaultSeats: 15,
      minSeats: 1,
      maxSeats: 50,
      trialEligible: true,
      trialDurationDays: 14,
    },
    {
      id: 'plan_hrms_growth',
      applicationCode: 'hrms',
      code: 'growth',
      name: 'HRMS Growth',
      description:
        'Advanced workforce administration with recruitment, onboarding, and document management.',
      tier: 'growth',
      status: 'active',
      version: 1,
      defaultSeats: 50,
      minSeats: 5,
      maxSeats: 200,
      trialEligible: true,
      trialDurationDays: 14,
    },
    {
      id: 'plan_hrms_enterprise',
      applicationCode: 'hrms',
      code: 'enterprise',
      name: 'HRMS Enterprise',
      description:
        'Full-spectrum HR suite with performance, custom reporting, and enterprise governance.',
      tier: 'enterprise',
      status: 'active',
      version: 1,
      defaultSeats: 200,
      minSeats: 20,
      trialEligible: false,
      trialDurationDays: 0,
    },
    {
      id: 'plan_crm_starter',
      applicationCode: 'crm',
      code: 'starter',
      name: 'CRM Starter',
      description: 'Lead and contact tracking for emerging sales teams.',
      tier: 'starter',
      status: 'active',
      version: 1,
      defaultSeats: 5,
      minSeats: 1,
      maxSeats: 20,
      trialEligible: true,
      trialDurationDays: 14,
    },
    {
      id: 'plan_crm_growth',
      applicationCode: 'crm',
      code: 'growth',
      name: 'CRM Growth',
      description: 'Pipeline automation, deals, and customer interaction tracking.',
      tier: 'growth',
      status: 'active',
      version: 1,
      defaultSeats: 25,
      minSeats: 5,
      maxSeats: 100,
      trialEligible: true,
      trialDurationDays: 14,
    },
    {
      id: 'plan_pm_starter',
      applicationCode: 'project_management',
      code: 'starter',
      name: 'Project Management Starter',
      description: 'Task boards, milestones, and basic team collaboration.',
      tier: 'starter',
      status: 'active',
      version: 1,
      defaultSeats: 10,
      minSeats: 1,
      maxSeats: 30,
      trialEligible: true,
      trialDurationDays: 14,
    },
    {
      id: 'plan_pm_growth',
      applicationCode: 'project_management',
      code: 'growth',
      name: 'Project Management Growth',
      description: 'Sprint planning, resource workload management, and cross-project metrics.',
      tier: 'growth',
      status: 'active',
      version: 1,
      defaultSeats: 40,
      minSeats: 5,
      maxSeats: 150,
      trialEligible: true,
      trialDurationDays: 14,
    },
  ];

  for (const p of defaultPlans) {
    const existing = await db.select().from(plans).where(eq(plans.id, p.id));
    if (existing.length === 0) {
      await db.insert(plans).values(p);
    }
  }

  // 19. Commercial Plan Prices
  const defaultPrices: (typeof planPrices.$inferInsert)[] = [
    {
      id: 'price_hrms_starter_usd_m',
      planId: 'plan_hrms_starter',
      currency: 'USD',
      billingInterval: 'monthly',
      amountMinorUnits: 0, // Configurable template: 0 minor units pending finalized business pricing approval
      status: 'active',
    },
    {
      id: 'price_hrms_starter_inr_m',
      planId: 'plan_hrms_starter',
      currency: 'INR',
      billingInterval: 'monthly',
      amountMinorUnits: 0,
      status: 'active',
    },
    {
      id: 'price_hrms_growth_usd_m',
      planId: 'plan_hrms_growth',
      currency: 'USD',
      billingInterval: 'monthly',
      amountMinorUnits: 0,
      status: 'active',
    },
    {
      id: 'price_hrms_growth_inr_m',
      planId: 'plan_hrms_growth',
      currency: 'INR',
      billingInterval: 'monthly',
      amountMinorUnits: 0,
      status: 'active',
    },
    {
      id: 'price_hrms_ent_usd_m',
      planId: 'plan_hrms_enterprise',
      currency: 'USD',
      billingInterval: 'monthly',
      amountMinorUnits: 0,
      status: 'active',
    },
  ];

  for (const pr of defaultPrices) {
    const existing = await db.select().from(planPrices).where(eq(planPrices.id, pr.id));
    if (existing.length === 0) {
      await db.insert(planPrices).values(pr);
    } else {
      await db
        .update(planPrices)
        .set({ amountMinorUnits: pr.amountMinorUnits, status: pr.status })
        .where(eq(planPrices.id, pr.id));
    }
  }

  // 20. Plan Entitlements
  const defaultEntitlements: (typeof planEntitlements.$inferInsert)[] = [
    {
      id: 'ent_hrms_st_org',
      planId: 'plan_hrms_starter',
      applicationCode: 'hrms',
      moduleCode: 'organization',
      isEnabled: true,
      limits: { maxDepartments: 10 },
    },
    {
      id: 'ent_hrms_st_emp',
      planId: 'plan_hrms_starter',
      applicationCode: 'hrms',
      moduleCode: 'employees',
      isEnabled: true,
      limits: { maxRecords: 50 },
    },
    {
      id: 'ent_hrms_st_att',
      planId: 'plan_hrms_starter',
      applicationCode: 'hrms',
      moduleCode: 'attendance',
      isEnabled: true,
    },
    {
      id: 'ent_hrms_st_leave',
      planId: 'plan_hrms_starter',
      applicationCode: 'hrms',
      moduleCode: 'leave',
      isEnabled: true,
    },
    {
      id: 'ent_hrms_gw_rec',
      planId: 'plan_hrms_growth',
      applicationCode: 'hrms',
      moduleCode: 'recruitment',
      isEnabled: true,
    },
    {
      id: 'ent_hrms_gw_onb',
      planId: 'plan_hrms_growth',
      applicationCode: 'hrms',
      moduleCode: 'onboarding',
      isEnabled: true,
    },
    {
      id: 'ent_hrms_ent_all',
      planId: 'plan_hrms_enterprise',
      applicationCode: 'hrms',
      moduleCode: 'all_modules',
      isEnabled: true,
      limits: { unmetered: true },
    },
  ];

  for (const ent of defaultEntitlements) {
    const existing = await db
      .select()
      .from(planEntitlements)
      .where(eq(planEntitlements.id, ent.id));
    if (existing.length === 0) {
      await db.insert(planEntitlements).values(ent);
    }
  }

  // 17. Default Attendance Policy
  const existingPolicy = await db
    .select()
    .from(attendancePolicies)
    .where(eq(attendancePolicies.companyId, companyId));

  if (existingPolicy.length === 0) {
    console.log('[Seed] Inserting default attendance policy...');
    await db.insert(attendancePolicies).values({
      id: 'att_pol_demo_01',
      tenantId,
      companyId,
      policyName: 'Standard Corporate Attendance Policy',
      version: 1,
      status: 'published',
      description: 'Default enterprise policy applying to all departments',
      scope: 'company',
      overridesPriority: 0,
      captureMethods: ['web', 'mobile', 'biometric'],
      breakDeductionMethod: 'scheduled',
      enableLateTracking: true,
      gracePeriodMinutes: 15,
      enableEarlyExitTracking: true,
      halfDayThresholdHours: '4.00',
      fullDayThresholdHours: '8.00',
      missingPunchPolicy: 'flag_exception',
      allowRegularization: true,
      regularizationCutoffDays: 7,
      requiresApproval: true,
      effectiveFrom: '2026-01-01',
      penaltyRules: {
        enabled: true,
        lateMarksThreshold: 3,
        penaltyUnit: 'half_day',
        period: 'monthly',
      },
      odRules: {
        enabled: true,
        odTypes: ['Client Visit', 'Business Trip', 'Training / Conference', 'Field Assignment'],
        allowHalfDay: true,
        allowHourly: true,
        allowBackdated: true,
        maxBackdatedDays: 30,
        requiresApproval: true,
        countAsPresent: true,
      },
      classificationRules: {
        minHoursForPresent: 8.0,
        minHoursForHalfDay: 4.0,
        insufficientHoursAction: 'half_day',
      },
      isActive: true,
    });
  }

  // 18. Default Attendance General Settings
  const existingAttGen = await db
    .select()
    .from(attendanceGeneralSettings)
    .where(eq(attendanceGeneralSettings.companyId, companyId));
  if (existingAttGen.length === 0) {
    await db.insert(attendanceGeneralSettings).values({
      id: 'att_gen_demo_01',
      tenantId,
      companyId,
      timezone: 'Asia/Kolkata',
      dayBoundaryTime: '00:00:00',
      trackingStartDate: '2026-01-01',
      processingMode: 'realtime',
      manualEntryAllowed: true,
      employeeVisibility: 'self_only',
      defaultHistoryViewDays: 30,
      alertPreferences: {
        notifyOnMissingPunch: true,
        notifyOnLateArrival: true,
        notifyApproverOnRegularization: true,
        digestFrequency: 'daily',
      },
    });
  }

  // 19. Default Attendance Regularization Settings
  const existingReg = await db
    .select()
    .from(attendanceRegularizationSettings)
    .where(eq(attendanceRegularizationSettings.companyId, companyId));
  if (existingReg.length === 0) {
    await db.insert(attendanceRegularizationSettings).values({
      id: 'att_reg_demo_01',
      tenantId,
      companyId,
      isEnabled: true,
      allowedCorrectionTypes: ['missed_in', 'missed_out', 'time_adjustment', 'both_missing'],
      submissionWindowDays: 7,
      maxRequestsPerMonth: 3,
      requireReason: true,
      requireEvidence: false,
      approvalHierarchy: 'manager_then_hr',
      autoApproveGraceMinutes: 0,
      blockOnPayrollLock: true,
      allowWithdrawal: true,
    });
  }

  // 20. Default Attendance Security Settings
  const existingSec = await db
    .select()
    .from(attendanceSecuritySettings)
    .where(eq(attendanceSecuritySettings.companyId, companyId));
  if (existingSec.length === 0) {
    await db.insert(attendanceSecuritySettings).values({
      id: 'att_sec_demo_01',
      tenantId,
      companyId,
      enableGps: true,
      geofenceConfigs: [
        {
          locationId: 'loc_chn_01',
          name: 'Chennai HQ Campus',
          latitude: 12.9716,
          longitude: 80.2437,
          radiusMeters: 250,
          enforceStrict: false,
        },
      ],
      ipAllowlist: ['192.168.1.0/24', '10.0.0.0/16'],
      enforceIpRestriction: false,
      maxDevicesPerEmployee: 2,
      allowSharedKiosk: true,
      detectMockLocation: true,
      detectImpossibleTravel: true,
      rapidPunchThrottlingSeconds: 60,
      flagVpnProxy: true,
    });
  }

  // 21. Default Attendance Payroll Settings
  const existingPay = await db
    .select()
    .from(attendancePayrollSettings)
    .where(eq(attendancePayrollSettings.companyId, companyId));
  if (existingPay.length === 0) {
    await db.insert(attendancePayrollSettings).values({
      id: 'att_pay_demo_01',
      tenantId,
      companyId,
      cycleType: 'calendar_month',
      cutoffDay: 30,
      requireApprovalBeforeLock: true,
      autoLockOnCutoff: false,
      blockingSeverity: 'warning_only',
    });
  }

  // 22. Sample Biometric Terminal Device
  const existingDev = await db
    .select()
    .from(attendanceDevices)
    .where(eq(attendanceDevices.companyId, companyId));
  if (existingDev.length === 0) {
    await db.insert(attendanceDevices).values({
      id: 'att_dev_demo_01',
      tenantId,
      companyId,
      locationId: 'loc_chn_01',
      deviceName: 'Chennai Main Gate Terminal',
      deviceCode: 'DEV-CHN-01',
      deviceType: 'biometric_facial',
      serialNumber: 'ZK-TECO-FACIAL-99201',
      ipAddress: '192.168.1.150',
      port: 4370,
      status: 'testing',
      firmwareVersion: 'v2.4.1-build88',
      metadata: { protocol: 'ZK-Pull-SDK', syncIntervalSec: 30 },
    });
  }

  // 23. Default Attendance Overtime Policy
  const existingOtPolicy = await db
    .select()
    .from(attendanceOvertimePolicies)
    .where(eq(attendanceOvertimePolicies.companyId, companyId));
  if (existingOtPolicy.length === 0) {
    await db.insert(attendanceOvertimePolicies).values({
      id: 'att_ot_pol_demo_01',
      tenantId,
      companyId,
      policyName: 'Standard Overtime Policy',
      version: 1,
      status: 'published',
      description: 'Standard company overtime policy with daily, weekly and monthly limits.',
      scope: 'company',
      overridesPriority: 0,
      effectiveFrom: '2024-01-01',
      effectiveTo: null,
      isEnabled: true,
      eligibleEmploymentTypes: ['full_time', 'contract'],
      eligibleDepartments: [],
      workdayEligibility: { regularWorkday: true, weeklyOff: true, holiday: true },
      minimumQualifyingMinutes: 60,
      dailyCapMinutes: 240,
      weeklyCapMinutes: 720,
      monthlyCapMinutes: 2400,
      roundingRule: 'round_down_15',
      requiresPreApproval: false,
      submissionWindowDays: 14,
      allowPayable: true,
      allowCompOff: true,
      defaultSettlementPreference: 'payable',
      approvalHierarchy: 'manager_then_hr',
      statutoryRules: {
        statutoryMaxDailyMinutes: 300,
        statutoryMaxWeeklyMinutes: 900,
      },
      isActive: true,
    });
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

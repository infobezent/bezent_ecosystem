/**
 * Phase 04 — Tenant Module Entitlements & Subscription Configuration
 * Comprehensive Backend Automated Test Suite
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getApplicationModules,
  APPLICATION_MODULE_CATALOG,
} from '../modules/catalog/applicationModuleCatalog.js';
import { moduleService } from '../modules/service/module.service.js';
import { planService } from '../plans/service/plan.service.js';
import { tenantCreationOrchestrationService as orchestrationService } from '../tenants/service/tenantOrchestration.service.js';
import { effectiveEntitlementService as entitlementService } from '../entitlements/service/effectiveEntitlement.service.js';
import { accessResolverService as accessResolver } from '../access/service/accessResolver.service.js';
import { BadRequestError } from '../../app/errors/AppError.js';
import { getDb } from '../../db/connection.js';
import {
  tenants,
  companies,
  tenantSubscriptions,
  tenantEntitlementOverrides,
  provisioningJobs,
  roleAssignments,
  users,
} from '../../db/schema.js';
import { generateSurrogateId } from '../auth/security.js';
import type { AuthenticatedUser } from '../auth/types/auth.types.js';
import { eq } from 'drizzle-orm';

describe('Phase 04 — Tenant Module Entitlements Backend', () => {
  const createdTenantIds: string[] = [];

  afterAll(async () => {
    const db = getDb();
    for (const tId of createdTenantIds) {
      try {
        await db.delete(tenantEntitlementOverrides).where(eq(tenantEntitlementOverrides.tenantId, tId));
        await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tId));
        await db.delete(provisioningJobs).where(eq(provisioningJobs.tenantId, tId));
        await db.delete(companies).where(eq(companies.tenantId, tId));
        await db.delete(tenants).where(eq(tenants.id, tId));
      } catch {
        // cleanup ignore
      }
    }
  });

  /* ── 1. Module Catalog Retrieval ───────────────────────────────────────── */
  describe('Module Catalog Retrieval', () => {
    it('returns authoritative server-defined HRMS catalog with metadata', () => {
      const hrmsModules = getApplicationModules('hrms');
      expect(hrmsModules.length).toBeGreaterThanOrEqual(10);

      const orgMod = hrmsModules.find((m) => m.key === 'organization');
      expect(orgMod).toBeDefined();
      expect(orgMod?.name).toBe('Organization Masters');
      expect(orgMod?.isMandatory).toBe(true);
      expect(orgMod?.availability).toBe('GA');

      const empMod = hrmsModules.find((m) => m.key === 'employees');
      expect(empMod).toBeDefined();
      expect(empMod?.isMandatory).toBe(true);
      expect(empMod?.dependencies).toContain('organization');

      const attMod = hrmsModules.find((m) => m.key === 'attendance');
      expect(attMod).toBeDefined();
      expect(attMod?.isMandatory).toBe(false);
      expect(attMod?.dependencies).toContain('employees');
    });

    it('returns CRM and PM module catalogs with correct boundaries', () => {
      const crmModules = getApplicationModules('crm');
      expect(crmModules.length).toBeGreaterThanOrEqual(5);
      expect(crmModules.some((m) => m.key === 'leads')).toBe(true);

      const pmModules = getApplicationModules('project_management');
      expect(pmModules.length).toBeGreaterThanOrEqual(5);
      expect(pmModules.some((m) => m.key === 'projects')).toBe(true);
    });
  });

  /* ── 2. Plan-Based Defaults & Eligibility ──────────────────────────────── */
  describe('Plan-Based Defaults', () => {
    it('evaluates plan eligibility and locks mandatory modules for HRMS Starter', async () => {
      const starterPlan = (await planService.listPlans()).find((p) => p.tier === 'starter' && p.applicationCode === 'hrms');
      expect(starterPlan).toBeDefined();

      const eligibility = await moduleService.getPlanModuleEligibility(starterPlan!.id);
      expect(eligibility.length).toBeGreaterThanOrEqual(10);

      const mandatoryOrg = eligibility.find((e) => e.moduleKey === 'organization');
      expect(mandatoryOrg?.isMandatory).toBe(true);
      expect(mandatoryOrg?.defaultEnabled).toBe(true);
      expect(mandatoryOrg?.isIncludedInPlan).toBe(true);

      const mandatoryEmp = eligibility.find((e) => e.moduleKey === 'employees');
      expect(mandatoryEmp?.isMandatory).toBe(true);
      expect(mandatoryEmp?.defaultEnabled).toBe(true);

      // Advanced modules (like payroll or performance) should not be included in Starter
      const payroll = eligibility.find((e) => e.moduleKey === 'payroll');
      expect(payroll?.isIncludedInPlan).toBe(false);
      expect(payroll?.defaultEnabled).toBe(false);
      expect(payroll?.requiresOverride).toBe(true);
    });

    it('includes advanced modules in Enterprise plan', async () => {
      const enterprisePlan = (await planService.listPlans()).find((p) => p.tier === 'enterprise' && p.applicationCode === 'hrms');
      expect(enterprisePlan).toBeDefined();

      const eligibility = await moduleService.getPlanModuleEligibility(enterprisePlan!.id);
      const payroll = eligibility.find((e) => e.moduleKey === 'payroll');
      expect(payroll?.isIncludedInPlan).toBe(true);
      expect(payroll?.defaultEnabled).toBe(true);
    });
  });

  /* ── 3. Preflight & Mandatory Module Enforcement ───────────────────────── */
  describe('Preflight & Mandatory Enforcement', () => {
    it('fails preflight when mandatory module is deselected', async () => {
      const plans = await planService.listPlans();
      const hrmsPlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'starter')!;

      await expect(
        orchestrationService.preflight({
          company: {
            legalName: 'Mandatory Test Corp',
            displayName: 'Mandatory Test',
            businessEmail: 'admin@mandtest.com',
            country: 'United States',
            timeZone: 'UTC',
          },
          admin: {
            fullName: 'Admin Test',
            workEmail: 'admin@mandtest.com',
          },
          subscriptions: [
            {
              applicationCode: 'hrms',
              planId: hrmsPlan.id,
              accessMode: 'trial',
              licensedSeats: 10,
              // Intentionally omit mandatory 'organization'
              selectedModules: ['employees', 'attendance'],
            },
          ],
        }),
      ).rejects.toThrow(/Mandatory module .* cannot be deselected/);
    });

    it('fails preflight when module dependency is missing', async () => {
      const plans = await planService.listPlans();
      const enterprisePlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'enterprise')!;

      await expect(
        orchestrationService.preflight({
          company: {
            legalName: 'Dependency Test Corp',
            displayName: 'Dependency Test',
            businessEmail: 'admin@deptest.com',
            country: 'United States',
            timeZone: 'UTC',
          },
          admin: {
            fullName: 'Admin Test',
            workEmail: 'admin@deptest.com',
          },
          subscriptions: [
            {
              applicationCode: 'hrms',
              planId: enterprisePlan.id,
              accessMode: 'paid',
              licensedSeats: 25,
              commercialAgreementNotes: 'Custom enterprise contract #2026-DEP',
              // 'payroll' requires 'attendance', but 'attendance' is omitted
              selectedModules: ['organization', 'employees', 'payroll'],
            },
          ],
        }),
      ).rejects.toThrow(/requires dependency 'Attendance/);
    });

    it('fails preflight when non-plan module is selected without authorized override', async () => {
      const plans = await planService.listPlans();
      const starterPlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'starter')!;

      await expect(
        orchestrationService.preflight({
          company: {
            legalName: 'No Override Test Corp',
            displayName: 'No Override Test',
            businessEmail: 'admin@nooverride.com',
            country: 'United States',
            timeZone: 'UTC',
          },
          admin: {
            fullName: 'Admin Test',
            workEmail: 'admin@nooverride.com',
          },
          subscriptions: [
            {
              applicationCode: 'hrms',
              planId: starterPlan.id,
              accessMode: 'trial',
              licensedSeats: 10,
              // 'recruitment' is not included in starter
              selectedModules: ['organization', 'employees', 'recruitment'],
            },
          ],
        }),
      ).rejects.toThrow(/requires an authorized override/);
    });

    it('fails preflight when override reason is too short', async () => {
      const plans = await planService.listPlans();
      const starterPlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'starter')!;

      await expect(
        orchestrationService.preflight({
          company: {
            legalName: 'Short Reason Test Corp',
            displayName: 'Short Reason Test',
            businessEmail: 'admin@shortreason.com',
            country: 'United States',
            timeZone: 'UTC',
          },
          admin: {
            fullName: 'Admin Test',
            workEmail: 'admin@shortreason.com',
          },
          subscriptions: [
            {
              applicationCode: 'hrms',
              planId: starterPlan.id,
              accessMode: 'trial',
              licensedSeats: 10,
              selectedModules: ['organization', 'employees', 'payroll'],
              moduleOverrides: [
                {
                  moduleCode: 'payroll',
                  overrideType: 'enable',
                  reason: 'ok', // < 3 characters
                },
              ],
            },
          ],
        }),
      ).rejects.toThrow(/Validation failed|requires an authorized reason/);
    });

    it('fails preflight when attempting to disable mandatory module via override', async () => {
      const plans = await planService.listPlans();
      const starterPlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'starter')!;

      await expect(
        orchestrationService.preflight({
          company: {
            legalName: 'Mandatory Override Test',
            displayName: 'Mandatory Override',
            businessEmail: 'admin@mandoverride.com',
            country: 'United States',
            timeZone: 'UTC',
          },
          admin: {
            fullName: 'Admin Test',
            workEmail: 'admin@mandoverride.com',
          },
          subscriptions: [
            {
              applicationCode: 'hrms',
              planId: starterPlan.id,
              accessMode: 'trial',
              licensedSeats: 10,
              selectedModules: ['organization', 'employees'],
              moduleOverrides: [
                {
                  moduleCode: 'organization',
                  overrideType: 'disable',
                  reason: 'Customer requested no org chart',
                },
              ],
            },
          ],
        }),
      ).rejects.toThrow(/Cannot disable mandatory module/);
    });
  });

  /* ── 4. Commercial Pricing & Trial Rules ───────────────────────────────── */
  describe('Pricing & Trial Rules', () => {
    it('fails preflight if trial is requested on a non-trial eligible plan', async () => {
      const plans = await planService.listPlans();
      const enterprisePlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'enterprise')!;
      expect(enterprisePlan.trialEligible).toBe(false);

      await expect(
        orchestrationService.preflight({
          company: {
            legalName: 'Trial Ineligible Corp',
            displayName: 'Trial Ineligible',
            businessEmail: 'admin@ineligibletrial.com',
            country: 'United States',
            timeZone: 'UTC',
          },
          admin: {
            fullName: 'Admin Test',
            workEmail: 'admin@ineligibletrial.com',
          },
          subscriptions: [
            {
              applicationCode: 'hrms',
              planId: enterprisePlan.id,
              accessMode: 'trial',
              licensedSeats: 25,
            },
          ],
        }),
      ).rejects.toThrow(/not eligible for trial access/);
    });

    it('fails preflight if paid activation has unapproved price without commercialAgreementNotes', async () => {
      const plans = await planService.listPlans();
      const enterprisePlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'enterprise')!;

      await expect(
        orchestrationService.preflight({
          company: {
            legalName: 'Unapproved Price Corp',
            displayName: 'Unapproved Price',
            businessEmail: 'admin@unapprovedprice.com',
            country: 'United States',
            timeZone: 'UTC',
          },
          admin: {
            fullName: 'Admin Test',
            workEmail: 'admin@unapprovedprice.com',
          },
          subscriptions: [
            {
              applicationCode: 'hrms',
              planId: enterprisePlan.id,
              accessMode: 'paid',
              licensedSeats: 25,
              // commercialAgreementNotes omitted
            },
          ],
        }),
      ).rejects.toThrow();
    });

    it('succeeds preflight for enterprise paid activation when commercialAgreementNotes are provided', async () => {
      const plans = await planService.listPlans();
      const enterprisePlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'enterprise')!;

      const result = await orchestrationService.preflight({
        company: {
          legalName: 'Approved Agreement Corp',
          displayName: 'Approved Agreement',
          businessEmail: 'admin@approvedagreement.com',
          country: 'United States',
          timeZone: 'UTC',
        },
        admin: {
          fullName: 'Admin Test',
          workEmail: 'admin@approvedagreement.com',
        },
        subscriptions: [
          {
            applicationCode: 'hrms',
            planId: enterprisePlan.id,
            accessMode: 'paid',
            licensedSeats: 50,
            commercialAgreementNotes: 'Signed custom enterprise order form #2026-9901, approved SLA',
            selectedModules: ['organization', 'employees', 'attendance', 'payroll'],
          },
        ],
      });

      expect(result.valid).toBe(true);
      expect(result.summary?.subscriptions?.[0]?.modulesCount).toBe(4);
    });
  });

  /* ── 5. Atomic Creation & Persistence ─────────────────────────────────── */
  describe('Atomic Creation & Persistence', () => {
    it('atomically orchestrates tenant with selected modules and authorized overrides', async () => {
      const plans = await planService.listPlans();
      const starterPlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'starter')!;

      const uniqueEmail = `p4-tenant-${Date.now()}@example.com`;
      const result = await orchestrationService.orchestrate({
        company: {
          legalName: `Phase 04 Persistence Co ${Date.now()}`,
          displayName: 'P4 Persistence Co',
          businessEmail: uniqueEmail,
          country: 'United States',
          timeZone: 'UTC',
        },
        admin: {
          fullName: 'P4 Administrator',
          workEmail: uniqueEmail,
        },
        subscriptions: [
          {
            applicationCode: 'hrms',
            planId: starterPlan.id,
            accessMode: 'trial',
            licensedSeats: 15,
            // Starter includes organization, employees, attendance, leave.
            // We select organization, employees, attendance,
            // deselect leave, and grant an authorized override for payroll!
            selectedModules: ['organization', 'employees', 'attendance', 'payroll'],
            moduleOverrides: [
              {
                moduleCode: 'payroll',
                overrideType: 'enable',
                reason: 'Authorized VIP pilot evaluation by Super Admin',
              },
            ],
          },
        ],
      });

      expect(result.tenantId).toBeDefined();
      const tenantId = result.tenantId as string;
      const primaryCompanyId = result.primaryCompanyId as string;
      createdTenantIds.push(tenantId);

      // Verify overrides table in DB
      const db = getDb();
      const storedOverrides = await db
        .select()
        .from(tenantEntitlementOverrides)
        .where(eq(tenantEntitlementOverrides.tenantId, tenantId));

      expect(storedOverrides.length).toBeGreaterThanOrEqual(1);

      // The explicit enable override
      const payrollOverride = storedOverrides.find((o) => o.moduleCode === 'payroll');
      expect(payrollOverride).toBeDefined();
      expect(payrollOverride?.overrideType).toBe('enable');
      expect(payrollOverride?.reason).toContain('VIP pilot evaluation');

      // The deselected plan module (leave) should be persisted as disable override
      const leaveOverride = storedOverrides.find((o) => o.moduleCode === 'leave');
      expect(leaveOverride).toBeDefined();
      expect(leaveOverride?.overrideType).toBe('disable');

      // Check effective runtime entitlements via service
      const hrmsEntitlement = await entitlementService.resolveEffectiveEntitlements(
        tenantId,
        'hrms',
        primaryCompanyId,
      );
      expect(hrmsEntitlement).toBeDefined();
      expect(hrmsEntitlement.isEntitled).toBe(true);

      const payrollModule = hrmsEntitlement.modules.find((m) => m.moduleCode === 'payroll');
      expect(payrollModule?.isEnabled).toBe(true);
      expect(payrollModule?.source).toBe('override');

      const leaveModule = hrmsEntitlement.modules.find((m) => m.moduleCode === 'leave');
      expect(leaveModule?.isEnabled).toBe(false);
      expect(leaveModule?.source).toBe('override');
    });
  });

  /* ── 6. Runtime Entitlement Enforcement ────────────────────────────────── */
  describe('Runtime Entitlement Denial', () => {
    it('filters out permissions belonging to disabled modules in access resolver', async () => {
      const plans = await planService.listPlans();
      const starterPlan = plans.find((p) => p.applicationCode === 'hrms' && p.tier === 'starter')!;

      const uniqueEmail = `p4-runtime-${Date.now()}@example.com`;
      const result = await orchestrationService.orchestrate({
        company: {
          legalName: `P4 Runtime Corp ${Date.now()}`,
          displayName: 'P4 Runtime Corp',
          businessEmail: uniqueEmail,
          country: 'United States',
          timeZone: 'UTC',
        },
        admin: {
          fullName: 'Runtime Administrator',
          workEmail: uniqueEmail,
        },
        subscriptions: [
          {
            applicationCode: 'hrms',
            planId: starterPlan.id,
            accessMode: 'trial',
            licensedSeats: 5,
            // attendance is deselected
            selectedModules: ['organization', 'employees', 'leave'],
          },
        ],
      });

      const tenantId = result.tenantId as string;
      const primaryCompanyId = result.primaryCompanyId as string;
      createdTenantIds.push(tenantId);

      // Resolve access context with HR manager role assigned
      const db = getDb();
      const testUserId = generateSurrogateId('usr');
      await db.insert(users).values({
        id: testUserId,
        email: uniqueEmail,
        passwordHash: 'dummy_hash',
        salt: 'dummy_salt',
        firstName: 'Runtime',
        lastName: 'Admin',
        status: 'active',
      });

      await db.insert(roleAssignments).values({
        id: generateSurrogateId('ra'),
        userId: testUserId,
        tenantId: tenantId,
        companyId: primaryCompanyId,
        roleId: 'role_sys_hr_manager',
        status: 'active',
        assignedBy: testUserId,
      });

      const user: AuthenticatedUser = {
        id: testUserId,
        email: uniqueEmail,
        firstName: 'Runtime',
        lastName: 'Admin',
        status: 'active',
        isSuperAdmin: false,
        memberships: [
          {
            companyId: primaryCompanyId,
            tenantId: tenantId,
            role: 'hr_manager',
            status: 'active',
          },
        ],
      };

      const accessContext = await accessResolver.resolveCompanyAccess(user, primaryCompanyId);

      // Attendance permissions must NOT be granted because attendance module was deselected
      const hasAttendancePerm = accessContext.permissions.some((p) => p.includes('attendance'));
      expect(hasAttendancePerm).toBe(false);

      // Employees permissions must be granted because employees is enabled
      const hasEmployeesPerm = accessContext.permissions.some((p) => p.includes('employees'));
      expect(hasEmployeesPerm).toBe(true);
    });
  });
});

import { randomUUID } from 'node:crypto';
import { eq, and, asc, type SQL } from 'drizzle-orm';
import { getDb } from '../../../../db/connection.js';
import {
  workforceGeneralSettings,
  workforceEmploymentTypes,
  workforceProbationPolicies,
  workforceLifecyclePolicies,
  workforceOffboardingPolicies,
  workforceClearanceChecklistTemplates,
  type WorkforceGeneralSettings,
  type NewWorkforceGeneralSettings,
  type WorkforceEmploymentType,
  type NewWorkforceEmploymentType,
  type WorkforceProbationPolicy,
  type NewWorkforceProbationPolicy,
  type WorkforceLifecyclePolicy,
  type NewWorkforceLifecyclePolicy,
  type WorkforceOffboardingPolicy,
  type NewWorkforceOffboardingPolicy,
  type WorkforceClearanceChecklistTemplate,
  type NewWorkforceClearanceChecklistTemplate,
} from '../../../../db/schema.js';
import type {
  UpdateGeneralSettingsInput,
  CreateEmploymentTypeInput,
  UpdateEmploymentTypeInput,
  UpdateProbationPolicyInput,
  UpdateLifecyclePolicyInput,
  UpdateOffboardingPolicyInput,
  CreateClearanceTemplateInput,
} from '../types/workforceSettings.types.js';

export class WorkforceSettingsRepository {
  private get db() {
    return getDb();
  }

  // =========================================================================
  // 1. GENERAL SETTINGS & AUTO-NUMBERING
  // =========================================================================

  async getGeneralSettings(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceGeneralSettings | null> {
    const rows = await this.db
      .select()
      .from(workforceGeneralSettings)
      .where(
        and(
          eq(workforceGeneralSettings.tenantId, tenantId),
          eq(workforceGeneralSettings.companyId, companyId),
        ),
      );
    return rows[0] ?? null;
  }

  async seedDefaultGeneralSettings(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceGeneralSettings> {
    const existing = await this.getGeneralSettings(tenantId, companyId);
    if (existing) return existing;

    const newRow: NewWorkforceGeneralSettings = {
      id: randomUUID(),
      tenantId,
      companyId,
      generationMode: 'automatic',
      idPrefix: 'EMP-',
      idSuffix: null,
      sequenceLength: 4,
      startingNumber: 1001,
      currentCounter: 1000,
      resetFrequency: 'never',
      allowManualOverride: true,
      preventIdReuse: true,
      autoProvisionUser: true,
      activationTiming: 'instant',
    };

    await this.db.insert(workforceGeneralSettings).values(newRow);
    const created = await this.getGeneralSettings(tenantId, companyId);
    return created!;
  }

  async updateGeneralSettings(
    tenantId: string,
    companyId: string,
    input: UpdateGeneralSettingsInput,
  ): Promise<WorkforceGeneralSettings> {
    let settings = await this.getGeneralSettings(tenantId, companyId);
    if (!settings) {
      settings = await this.seedDefaultGeneralSettings(tenantId, companyId);
    }

    await this.db
      .update(workforceGeneralSettings)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workforceGeneralSettings.tenantId, tenantId),
          eq(workforceGeneralSettings.companyId, companyId),
        ),
      );

    const updated = await this.getGeneralSettings(tenantId, companyId);
    return updated!;
  }

  async peekNextSequence(
    tenantId: string,
    companyId: string,
  ): Promise<{ nextId: string; prefix: string; sequenceNumber: number; suffix: string | null }> {
    let settings = await this.getGeneralSettings(tenantId, companyId);
    if (!settings) {
      settings = await this.seedDefaultGeneralSettings(tenantId, companyId);
    }

    const nextNum = Math.max(settings.currentCounter + 1, settings.startingNumber);
    const formattedNum = String(nextNum).padStart(settings.sequenceLength, '0');
    const nextId = `${settings.idPrefix}${formattedNum}${settings.idSuffix || ''}`;

    return {
      nextId,
      prefix: settings.idPrefix,
      sequenceNumber: nextNum,
      suffix: settings.idSuffix,
    };
  }

  async getNextSequenceAndIncrement(
    tenantId: string,
    companyId: string,
    externalTx?: any,
  ): Promise<{ nextId: string; prefix: string; sequenceNumber: number; suffix: string | null }> {
    const runInTx = async (tx: any) => {
      let [settings] = await tx
        .select()
        .from(workforceGeneralSettings)
        .where(
          and(
            eq(workforceGeneralSettings.tenantId, tenantId),
            eq(workforceGeneralSettings.companyId, companyId),
          ),
        )
        .for('update');

      if (!settings) {
        const newRow: NewWorkforceGeneralSettings = {
          id: randomUUID(),
          tenantId,
          companyId,
          generationMode: 'automatic',
          idPrefix: 'EMP-',
          idSuffix: null,
          sequenceLength: 4,
          startingNumber: 1001,
          currentCounter: 1000,
          resetFrequency: 'never',
          allowManualOverride: true,
          preventIdReuse: true,
          autoProvisionUser: true,
          activationTiming: 'instant',
        };
        try {
          await tx.insert(workforceGeneralSettings).values(newRow);
        } catch {
          // In case of concurrent seed race, ignore insert error and select for update
        }

        [settings] = await tx
          .select()
          .from(workforceGeneralSettings)
          .where(
            and(
              eq(workforceGeneralSettings.tenantId, tenantId),
              eq(workforceGeneralSettings.companyId, companyId),
            ),
          )
          .for('update');
      }

      if (!settings) {
        throw new Error(
          `Unable to lock and retrieve workforce numbering settings for company ${companyId}`,
        );
      }

      const nextNum = Math.max(settings.currentCounter + 1, settings.startingNumber);

      await tx
        .update(workforceGeneralSettings)
        .set({
          currentCounter: nextNum,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workforceGeneralSettings.tenantId, tenantId),
            eq(workforceGeneralSettings.companyId, companyId),
          ),
        );

      const formattedNum = String(nextNum).padStart(settings.sequenceLength, '0');
      const nextId = `${settings.idPrefix}${formattedNum}${settings.idSuffix || ''}`;

      return {
        nextId,
        prefix: settings.idPrefix,
        sequenceNumber: nextNum,
        suffix: settings.idSuffix,
      };
    };

    if (externalTx) {
      return runInTx(externalTx);
    }
    return this.db.transaction(runInTx);
  }

  // =========================================================================
  // 2. EMPLOYMENT TYPES
  // =========================================================================

  async listEmploymentTypes(
    tenantId: string,
    companyId: string,
    activeOnly: boolean = false,
  ): Promise<WorkforceEmploymentType[]> {
    const conditions: SQL[] = [
      eq(workforceEmploymentTypes.tenantId, tenantId),
      eq(workforceEmploymentTypes.companyId, companyId),
    ];

    if (activeOnly) {
      conditions.push(eq(workforceEmploymentTypes.isActive, true));
    }

    const rows = await this.db
      .select()
      .from(workforceEmploymentTypes)
      .where(and(...conditions))
      .orderBy(asc(workforceEmploymentTypes.code));

    if (rows.length === 0 && !activeOnly) {
      await this.seedDefaultEmploymentTypes(tenantId, companyId);
      return this.listEmploymentTypes(tenantId, companyId, false);
    }

    return rows;
  }

  async seedDefaultEmploymentTypes(
    tenantId: string,
    companyId: string,
  ): Promise<void> {
    const defaults: NewWorkforceEmploymentType[] = [
      {
        id: randomUUID(),
        tenantId,
        companyId,
        code: 'FT',
        name: 'Full Time Regular',
        description: 'Permanent employee working standard full-time hours',
        workHoursPerWeek: '40.0',
        isBenefitsEligible: true,
        defaultNoticeDays: 60,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        code: 'PT',
        name: 'Part Time',
        description: 'Employee working reduced scheduled hours',
        workHoursPerWeek: '20.0',
        isBenefitsEligible: false,
        defaultNoticeDays: 30,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        code: 'CT',
        name: 'Fixed-term Contract',
        description: 'Contractor or fixed-duration employee',
        workHoursPerWeek: '40.0',
        isBenefitsEligible: true,
        defaultNoticeDays: 30,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        code: 'IN',
        name: 'Internship',
        description: 'Student or trainee on temporary training program',
        workHoursPerWeek: '35.0',
        isBenefitsEligible: false,
        defaultNoticeDays: 15,
        isActive: true,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        code: 'PB',
        name: 'Probationary',
        description: 'Newly hired employee undergoing evaluation period',
        workHoursPerWeek: '40.0',
        isBenefitsEligible: true,
        defaultNoticeDays: 15,
        isActive: true,
      },
    ];

    for (const item of defaults) {
      await this.db.insert(workforceEmploymentTypes).values(item).onDuplicateKeyUpdate({
        set: { updatedAt: new Date() },
      });
    }
  }

  async getEmploymentTypeById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<WorkforceEmploymentType | null> {
    const rows = await this.db
      .select()
      .from(workforceEmploymentTypes)
      .where(
        and(
          eq(workforceEmploymentTypes.tenantId, tenantId),
          eq(workforceEmploymentTypes.companyId, companyId),
          eq(workforceEmploymentTypes.id, id),
        ),
      );
    return rows[0] ?? null;
  }

  async getEmploymentTypeByCode(
    tenantId: string,
    companyId: string,
    code: string,
  ): Promise<WorkforceEmploymentType | null> {
    const rows = await this.db
      .select()
      .from(workforceEmploymentTypes)
      .where(
        and(
          eq(workforceEmploymentTypes.tenantId, tenantId),
          eq(workforceEmploymentTypes.companyId, companyId),
          eq(workforceEmploymentTypes.code, code.toUpperCase()),
        ),
      );
    return rows[0] ?? null;
  }

  async createEmploymentType(
    tenantId: string,
    companyId: string,
    input: CreateEmploymentTypeInput,
  ): Promise<WorkforceEmploymentType> {
    const id = randomUUID();
    const newRow: NewWorkforceEmploymentType = {
      id,
      tenantId,
      companyId,
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description ?? null,
      workHoursPerWeek: String(input.workHoursPerWeek ?? 40.0),
      isBenefitsEligible: input.isBenefitsEligible ?? true,
      defaultNoticeDays: input.defaultNoticeDays ?? 60,
      isActive: input.isActive ?? true,
    };

    await this.db.insert(workforceEmploymentTypes).values(newRow);
    const created = await this.getEmploymentTypeById(tenantId, companyId, id);
    return created!;
  }

  async updateEmploymentType(
    tenantId: string,
    companyId: string,
    id: string,
    input: UpdateEmploymentTypeInput,
  ): Promise<WorkforceEmploymentType> {
    const patch: Partial<NewWorkforceEmploymentType> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.workHoursPerWeek !== undefined) patch.workHoursPerWeek = String(input.workHoursPerWeek);
    if (input.isBenefitsEligible !== undefined) patch.isBenefitsEligible = input.isBenefitsEligible;
    if (input.defaultNoticeDays !== undefined) patch.defaultNoticeDays = input.defaultNoticeDays;
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    await this.db
      .update(workforceEmploymentTypes)
      .set(patch)
      .where(
        and(
          eq(workforceEmploymentTypes.tenantId, tenantId),
          eq(workforceEmploymentTypes.companyId, companyId),
          eq(workforceEmploymentTypes.id, id),
        ),
      );

    const updated = await this.getEmploymentTypeById(tenantId, companyId, id);
    return updated!;
  }

  async deleteEmploymentType(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<boolean> {
    const result = await this.db
      .delete(workforceEmploymentTypes)
      .where(
        and(
          eq(workforceEmploymentTypes.tenantId, tenantId),
          eq(workforceEmploymentTypes.companyId, companyId),
          eq(workforceEmploymentTypes.id, id),
        ),
      );
    return (result[0] as unknown as { affectedRows?: number })?.affectedRows ? true : true;
  }

  // =========================================================================
  // 3. PROBATION POLICY
  // =========================================================================

  async getProbationPolicy(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceProbationPolicy | null> {
    const rows = await this.db
      .select()
      .from(workforceProbationPolicies)
      .where(
        and(
          eq(workforceProbationPolicies.tenantId, tenantId),
          eq(workforceProbationPolicies.companyId, companyId),
        ),
      );
    return rows[0] ?? null;
  }

  async seedDefaultProbationPolicy(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceProbationPolicy> {
    const existing = await this.getProbationPolicy(tenantId, companyId);
    if (existing) return existing;

    const newRow: NewWorkforceProbationPolicy = {
      id: randomUUID(),
      tenantId,
      companyId,
      defaultProbationDays: 90,
      confirmationMode: 'manager_review',
      reminderLeadDays: 14,
      maxExtensionDays: 90,
      maxExtensionsAllowed: 1,
      autoGenerateLetter: true,
    };

    await this.db.insert(workforceProbationPolicies).values(newRow);
    const created = await this.getProbationPolicy(tenantId, companyId);
    return created!;
  }

  async updateProbationPolicy(
    tenantId: string,
    companyId: string,
    input: UpdateProbationPolicyInput,
  ): Promise<WorkforceProbationPolicy> {
    let policy = await this.getProbationPolicy(tenantId, companyId);
    if (!policy) {
      policy = await this.seedDefaultProbationPolicy(tenantId, companyId);
    }

    await this.db
      .update(workforceProbationPolicies)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workforceProbationPolicies.tenantId, tenantId),
          eq(workforceProbationPolicies.companyId, companyId),
        ),
      );

    const updated = await this.getProbationPolicy(tenantId, companyId);
    return updated!;
  }

  // =========================================================================
  // 4. LIFECYCLE & TRANSFER POLICY
  // =========================================================================

  async getLifecyclePolicy(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceLifecyclePolicy | null> {
    const rows = await this.db
      .select()
      .from(workforceLifecyclePolicies)
      .where(
        and(
          eq(workforceLifecyclePolicies.tenantId, tenantId),
          eq(workforceLifecyclePolicies.companyId, companyId),
        ),
      );
    return rows[0] ?? null;
  }

  async seedDefaultLifecyclePolicy(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceLifecyclePolicy> {
    const existing = await this.getLifecyclePolicy(tenantId, companyId);
    if (existing) return existing;

    const newRow: NewWorkforceLifecyclePolicy = {
      id: randomUUID(),
      tenantId,
      companyId,
      requireReleasingManagerApproval: true,
      effectiveDateAlignment: 'next_payroll_month',
      autoReassignShifts: true,
      autoReassignLeaveApprover: true,
    };

    await this.db.insert(workforceLifecyclePolicies).values(newRow);
    const created = await this.getLifecyclePolicy(tenantId, companyId);
    return created!;
  }

  async updateLifecyclePolicy(
    tenantId: string,
    companyId: string,
    input: UpdateLifecyclePolicyInput,
  ): Promise<WorkforceLifecyclePolicy> {
    let policy = await this.getLifecyclePolicy(tenantId, companyId);
    if (!policy) {
      policy = await this.seedDefaultLifecyclePolicy(tenantId, companyId);
    }

    await this.db
      .update(workforceLifecyclePolicies)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workforceLifecyclePolicies.tenantId, tenantId),
          eq(workforceLifecyclePolicies.companyId, companyId),
        ),
      );

    const updated = await this.getLifecyclePolicy(tenantId, companyId);
    return updated!;
  }

  // =========================================================================
  // 5. OFFBOARDING POLICY
  // =========================================================================

  async getOffboardingPolicy(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceOffboardingPolicy | null> {
    const rows = await this.db
      .select()
      .from(workforceOffboardingPolicies)
      .where(
        and(
          eq(workforceOffboardingPolicies.tenantId, tenantId),
          eq(workforceOffboardingPolicies.companyId, companyId),
        ),
      );
    return rows[0] ?? null;
  }

  async seedDefaultOffboardingPolicy(
    tenantId: string,
    companyId: string,
  ): Promise<WorkforceOffboardingPolicy> {
    const existing = await this.getOffboardingPolicy(tenantId, companyId);
    if (existing) return existing;

    const newRow: NewWorkforceOffboardingPolicy = {
      id: randomUUID(),
      tenantId,
      companyId,
      probationNoticeDays: 15,
      confirmedNoticeDays: 60,
      leadershipNoticeDays: 90,
      allowNoticeBuyout: true,
      allowLeaveOffset: true,
      resignationWithdrawalWindowDays: 7,
    };

    await this.db.insert(workforceOffboardingPolicies).values(newRow);
    const created = await this.getOffboardingPolicy(tenantId, companyId);
    return created!;
  }

  async updateOffboardingPolicy(
    tenantId: string,
    companyId: string,
    input: UpdateOffboardingPolicyInput,
  ): Promise<WorkforceOffboardingPolicy> {
    let policy = await this.getOffboardingPolicy(tenantId, companyId);
    if (!policy) {
      policy = await this.seedDefaultOffboardingPolicy(tenantId, companyId);
    }

    await this.db
      .update(workforceOffboardingPolicies)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workforceOffboardingPolicies.tenantId, tenantId),
          eq(workforceOffboardingPolicies.companyId, companyId),
        ),
      );

    const updated = await this.getOffboardingPolicy(tenantId, companyId);
    return updated!;
  }

  // =========================================================================
  // 6. CLEARANCE CHECKLIST TEMPLATES
  // =========================================================================

  async listClearanceTemplates(
    tenantId: string,
    companyId: string,
    department?: 'it' | 'admin' | 'finance' | 'hr',
  ): Promise<WorkforceClearanceChecklistTemplate[]> {
    const conditions: SQL[] = [
      eq(workforceClearanceChecklistTemplates.tenantId, tenantId),
      eq(workforceClearanceChecklistTemplates.companyId, companyId),
    ];

    if (department) {
      conditions.push(eq(workforceClearanceChecklistTemplates.department, department));
    }

    const rows = await this.db
      .select()
      .from(workforceClearanceChecklistTemplates)
      .where(and(...conditions))
      .orderBy(
        asc(workforceClearanceChecklistTemplates.department),
        asc(workforceClearanceChecklistTemplates.displayOrder),
      );

    if (rows.length === 0 && !department) {
      await this.seedDefaultClearanceTemplates(tenantId, companyId);
      return this.listClearanceTemplates(tenantId, companyId);
    }

    return rows;
  }

  async seedDefaultClearanceTemplates(
    tenantId: string,
    companyId: string,
  ): Promise<void> {
    const defaults: NewWorkforceClearanceChecklistTemplate[] = [
      // IT
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'it',
        itemTitle: 'Revoke Email & SSO Access',
        description: 'Disable Google Workspace / Microsoft 365 and SSO identity provider logins',
        isMandatory: true,
        displayOrder: 1,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'it',
        itemTitle: 'Collect Laptop & Peripherals',
        description: 'Collect company-issued MacBook / laptop, charger, monitor, and security keys',
        isMandatory: true,
        displayOrder: 2,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'it',
        itemTitle: 'Revoke VPN & GitHub Access',
        description: 'Remove user from VPN groups, GitHub organization, and production clusters',
        isMandatory: true,
        displayOrder: 3,
      },
      // Admin
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'admin',
        itemTitle: 'Collect ID Card & Building Access Pass',
        description: 'Deactivate NFC badge and collect physical access card',
        isMandatory: true,
        displayOrder: 1,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'admin',
        itemTitle: 'Collect Keys & Locker Clearance',
        description: 'Verify locker emptied and office/drawer keys handed over',
        isMandatory: true,
        displayOrder: 2,
      },
      // Finance
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'finance',
        itemTitle: 'Clear Pending Expense Claims',
        description: 'Audit and approve/reject all pending travel and expense vouchers',
        isMandatory: true,
        displayOrder: 1,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'finance',
        itemTitle: 'Loan & Advance Settlement',
        description: 'Verify zero balance on salary advances, travel advances, or equipment loans',
        isMandatory: true,
        displayOrder: 2,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'finance',
        itemTitle: 'Final Salary & Gratuity Calculation',
        description: 'Calculate encashed leave days, notice shortfall/buyout, and gratuity if eligible',
        isMandatory: true,
        displayOrder: 3,
      },
      // HR
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'hr',
        itemTitle: 'Conduct Exit Interview',
        description: 'Schedule and complete exit feedback session with HR Business Partner',
        isMandatory: true,
        displayOrder: 1,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'hr',
        itemTitle: 'Sign NDA & Non-Compete Acknowledgment',
        description: 'Review and countersign confidentiality and post-employment obligations',
        isMandatory: true,
        displayOrder: 2,
      },
      {
        id: randomUUID(),
        tenantId,
        companyId,
        department: 'hr',
        itemTitle: 'Issue Relieving & Experience Letter',
        description: 'Generate standard relieving documentation post full & final settlement clearance',
        isMandatory: true,
        displayOrder: 3,
      },
    ];

    for (const item of defaults) {
      await this.db.insert(workforceClearanceChecklistTemplates).values(item);
    }
  }

  async getClearanceTemplateById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<WorkforceClearanceChecklistTemplate | null> {
    const rows = await this.db
      .select()
      .from(workforceClearanceChecklistTemplates)
      .where(
        and(
          eq(workforceClearanceChecklistTemplates.tenantId, tenantId),
          eq(workforceClearanceChecklistTemplates.companyId, companyId),
          eq(workforceClearanceChecklistTemplates.id, id),
        ),
      );
    return rows[0] ?? null;
  }

  async createClearanceTemplate(
    tenantId: string,
    companyId: string,
    input: CreateClearanceTemplateInput,
  ): Promise<WorkforceClearanceChecklistTemplate> {
    const id = randomUUID();
    const newRow: NewWorkforceClearanceChecklistTemplate = {
      id,
      tenantId,
      companyId,
      department: input.department,
      itemTitle: input.itemTitle,
      description: input.description ?? null,
      isMandatory: input.isMandatory ?? true,
      displayOrder: input.displayOrder ?? 0,
    };

    await this.db.insert(workforceClearanceChecklistTemplates).values(newRow);
    const created = await this.getClearanceTemplateById(tenantId, companyId, id);
    return created!;
  }

  async updateClearanceTemplate(
    tenantId: string,
    companyId: string,
    id: string,
    input: Partial<CreateClearanceTemplateInput>,
  ): Promise<WorkforceClearanceChecklistTemplate> {
    await this.db
      .update(workforceClearanceChecklistTemplates)
      .set(input)
      .where(
        and(
          eq(workforceClearanceChecklistTemplates.tenantId, tenantId),
          eq(workforceClearanceChecklistTemplates.companyId, companyId),
          eq(workforceClearanceChecklistTemplates.id, id),
        ),
      );

    const updated = await this.getClearanceTemplateById(tenantId, companyId, id);
    return updated!;
  }

  async deleteClearanceTemplate(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<boolean> {
    await this.db
      .delete(workforceClearanceChecklistTemplates)
      .where(
        and(
          eq(workforceClearanceChecklistTemplates.tenantId, tenantId),
          eq(workforceClearanceChecklistTemplates.companyId, companyId),
          eq(workforceClearanceChecklistTemplates.id, id),
        ),
      );
    return true;
  }
}

export const workforceSettingsRepository = new WorkforceSettingsRepository();

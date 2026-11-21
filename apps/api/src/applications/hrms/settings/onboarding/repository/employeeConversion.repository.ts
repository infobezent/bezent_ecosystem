import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import {
  formCustomizations,
  onboardingConversionSettings,
  type FormCustomization,
} from '../../../../../db/schema.js';
import type {
  EmployeeConversionConfig,
  ConversionSettingsConfig,
  FieldMappingItem,
  RequiredInfoItem,
  PostConversionActionsConfig,
  ConversionRulesConfig,
  UpdateEmployeeConversionConfigDto,
} from '../types/employeeConversion.types.js';

const CONVERSION_CONFIG_FORM_KEY = 'onboarding_employee_conversion_v2';
const CONVERSION_AUDIT_PREFIX = 'onboarding_conversion_audit_';

export class EmployeeConversionRepository {
  private get db() {
    return getDb();
  }

  /**
   * Generates default enterprise conversion configuration
   */
  getDefaultConfig(tenantId: string, companyId: string): EmployeeConversionConfig {
    const now = new Date().toISOString();

    const settings: ConversionSettingsConfig = {
      conversionMode: 'both',
      defaultMode: 'manual',
      conversionTriggerStage: 'completed',
      defaultEmploymentStatus: 'probation',
      effectiveDateType: 'joining_date',
      allowHrOverride: true,
    };

    const fieldMappings: FieldMappingItem[] = [
      {
        id: 'map_name',
        sourceField: 'fullName',
        destinationField: 'displayName',
        sourceLabel: 'Full Name',
        destinationLabel: 'Employee Name',
        isActive: true,
        isSystem: true,
      },
      {
        id: 'map_email',
        sourceField: 'email',
        destinationField: 'email',
        sourceLabel: 'Email',
        destinationLabel: 'Work Email',
        isActive: true,
        isSystem: true,
      },
      {
        id: 'map_phone',
        sourceField: 'phone',
        destinationField: 'phone',
        sourceLabel: 'Phone',
        destinationLabel: 'Mobile Number',
        isActive: true,
        isSystem: true,
      },
      {
        id: 'map_dob',
        sourceField: 'dateOfBirth',
        destinationField: 'dateOfBirth',
        sourceLabel: 'Date of Birth',
        destinationLabel: 'Date of Birth',
        isActive: true,
      },
      {
        id: 'map_gender',
        sourceField: 'gender',
        destinationField: 'gender',
        sourceLabel: 'Gender',
        destinationLabel: 'Gender',
        isActive: true,
      },
      {
        id: 'map_dept',
        sourceField: 'departmentId',
        destinationField: 'departmentId',
        sourceLabel: 'Department',
        destinationLabel: 'Department',
        isActive: true,
        isSystem: true,
      },
      {
        id: 'map_desig',
        sourceField: 'designationId',
        destinationField: 'designationId',
        sourceLabel: 'Designation',
        destinationLabel: 'Designation',
        isActive: true,
        isSystem: true,
      },
      {
        id: 'map_emp_type',
        sourceField: 'employmentType',
        destinationField: 'employmentType',
        sourceLabel: 'Employment Type',
        destinationLabel: 'Employment Type',
        isActive: true,
      },
      {
        id: 'map_joining_date',
        sourceField: 'joiningDate',
        destinationField: 'joiningDate',
        sourceLabel: 'Joining Date',
        destinationLabel: 'Date of Joining',
        isActive: true,
        isSystem: true,
      },
      {
        id: 'map_loc',
        sourceField: 'locationId',
        destinationField: 'locationId',
        sourceLabel: 'Work Location',
        destinationLabel: 'Work Location',
        isActive: true,
      },
      {
        id: 'map_mgr',
        sourceField: 'reportingManagerId',
        destinationField: 'reportingManagerId',
        sourceLabel: 'Reporting Manager',
        destinationLabel: 'Reporting Manager',
        isActive: true,
      },
      {
        id: 'map_addr',
        sourceField: 'address',
        destinationField: 'address',
        sourceLabel: 'Address',
        destinationLabel: 'Current Address',
        isActive: true,
      },
    ];

    const requiredInformation: RequiredInfoItem[] = [
      {
        id: 'req_name',
        fieldKey: 'fullName',
        fieldName: 'Full Name',
        group: 'personal',
        isRequired: true,
        isSystemMandatory: true,
      },
      {
        id: 'req_dob',
        fieldKey: 'dateOfBirth',
        fieldName: 'Date of Birth',
        group: 'personal',
        isRequired: false,
        isSystemMandatory: false,
      },
      {
        id: 'req_dept',
        fieldKey: 'departmentId',
        fieldName: 'Department',
        group: 'employment',
        isRequired: true,
        isSystemMandatory: true,
      },
      {
        id: 'req_desig',
        fieldKey: 'designationId',
        fieldName: 'Designation',
        group: 'employment',
        isRequired: true,
        isSystemMandatory: true,
      },
      {
        id: 'req_emp_type',
        fieldKey: 'employmentType',
        fieldName: 'Employment Type',
        group: 'employment',
        isRequired: true,
        isSystemMandatory: false,
      },
      {
        id: 'req_joining_date',
        fieldKey: 'joiningDate',
        fieldName: 'Joining Date',
        group: 'employment',
        isRequired: true,
        isSystemMandatory: true,
      },
      {
        id: 'req_location',
        fieldKey: 'locationId',
        fieldName: 'Work Location',
        group: 'employment',
        isRequired: false,
        isSystemMandatory: false,
      },
      {
        id: 'req_manager',
        fieldKey: 'reportingManagerId',
        fieldName: 'Reporting Manager',
        group: 'employment',
        isRequired: false,
        isSystemMandatory: false,
      },
      {
        id: 'req_email',
        fieldKey: 'email',
        fieldName: 'Work Email',
        group: 'additional',
        isRequired: true,
        isSystemMandatory: true,
      },
      {
        id: 'req_phone',
        fieldKey: 'phone',
        fieldName: 'Mobile Number',
        group: 'additional',
        isRequired: false,
        isSystemMandatory: false,
      },
      {
        id: 'req_address',
        fieldKey: 'address',
        fieldName: 'Current Address',
        group: 'additional',
        isRequired: false,
        isSystemMandatory: false,
      },
    ];

    const postConversionActions: PostConversionActionsConfig = {
      createEmployeeProfile: true,
      applyChecklistTemplates: true,
      applyRequiredDocuments: true,
      enableEssAccess: true,
      sendNotifications: true,
    };

    const conversionRules: ConversionRulesConfig = {
      preventDuplicateEmployee: true,
      validateRequiredFields: true,
      preserveCandidateHistory: true,
      allowRetryFailedConversion: true,
      restrictedRoles: ['super_admin', 'company_admin', 'hr_manager', 'hr_executive'],
      recordAuditHistory: true,
    };

    return {
      tenantId,
      companyId,
      settings,
      fieldMappings,
      requiredInformation,
      postConversionActions,
      conversionRules,
      updatedAt: now,
      updatedBy: 'system',
    };
  }

  /**
   * Retrieves the conversion configuration for a tenant and company
   */
  async getConfig(tenantId: string, companyId: string): Promise<EmployeeConversionConfig> {
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, CONVERSION_CONFIG_FORM_KEY),
        ),
      );

    if (rows.length > 0 && rows[0]?.metadata) {
      try {
        const stored = rows[0].metadata as unknown as EmployeeConversionConfig;
        const defaults = this.getDefaultConfig(tenantId, companyId);
        return {
          ...defaults,
          ...stored,
          settings: {
            ...defaults.settings,
            ...(stored.settings || {}),
          },
          postConversionActions: {
            ...defaults.postConversionActions,
            ...(stored.postConversionActions || {}),
          },
          conversionRules: {
            ...defaults.conversionRules,
            ...(stored.conversionRules || {}),
          },
          fieldMappings: stored.fieldMappings || defaults.fieldMappings,
          requiredInformation: stored.requiredInformation || defaults.requiredInformation,
          tenantId,
          companyId,
        };
      } catch {
        // Fall back to default
      }
    }

    return this.getDefaultConfig(tenantId, companyId);
  }

  /**
   * Saves or updates conversion configuration
   */
  async saveConfig(
    tenantId: string,
    companyId: string,
    dto: UpdateEmployeeConversionConfigDto,
    actorUserId?: string,
  ): Promise<EmployeeConversionConfig> {
    const current = await this.getConfig(tenantId, companyId);
    const now = new Date().toISOString();

    const updated: EmployeeConversionConfig = {
      ...current,
      tenantId,
      companyId,
      settings: {
        ...current.settings,
        ...(dto.settings || {}),
      },
      fieldMappings: dto.fieldMappings ? [...dto.fieldMappings] : current.fieldMappings,
      requiredInformation: dto.requiredInformation
        ? [...dto.requiredInformation]
        : current.requiredInformation,
      postConversionActions: {
        ...current.postConversionActions,
        ...(dto.postConversionActions || {}),
      },
      conversionRules: {
        ...current.conversionRules,
        ...(dto.conversionRules || {}),
      },
      updatedAt: now,
      updatedBy: actorUserId || current.updatedBy,
    };

    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, CONVERSION_CONFIG_FORM_KEY),
        ),
      );

    if (rows.length > 0) {
      await this.db
        .update(formCustomizations)
        .set({
          metadata: updated as unknown as Record<string, unknown>,
          version: (rows[0]?.version ?? 1) + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(formCustomizations.tenantId, tenantId),
            eq(formCustomizations.companyId, companyId),
            eq(formCustomizations.formKey, CONVERSION_CONFIG_FORM_KEY),
          ),
        );
    } else {
      await this.db.insert(formCustomizations).values({
        id: `fc_${randomUUID()}`,
        tenantId,
        companyId,
        formKey: CONVERSION_CONFIG_FORM_KEY,
        version: 1,
        metadata: updated as unknown as Record<string, unknown>,
      });
    }

    // Sync legacy columns to onboardingConversionSettings table
    try {
      const convRows = await this.db
        .select()
        .from(onboardingConversionSettings)
        .where(
          and(
            eq(onboardingConversionSettings.tenantId, tenantId),
            eq(onboardingConversionSettings.companyId, companyId),
          ),
        );

      const isAuto =
        updated.settings.conversionMode === 'automatic' ||
        (updated.settings.conversionMode === 'both' && updated.settings.defaultMode === 'automatic');

      if (convRows.length > 0) {
        await this.db
          .update(onboardingConversionSettings)
          .set({
            autoConvertOnJoining: isAuto,
            defaultEmploymentStatus: updated.settings.defaultEmploymentStatus,
            requireDocumentVerification: updated.postConversionActions.applyRequiredDocuments,
            requireChecklistCompletion: updated.postConversionActions.applyChecklistTemplates,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(onboardingConversionSettings.tenantId, tenantId),
              eq(onboardingConversionSettings.companyId, companyId),
            ),
          );
      }
    } catch {
      // Non-blocking sync
    }

    return updated;
  }

  /**
   * Resets configuration to deterministic defaults
   */
  async resetConfig(tenantId: string, companyId: string): Promise<EmployeeConversionConfig> {
    const defaults = this.getDefaultConfig(tenantId, companyId);
    return this.saveConfig(tenantId, companyId, defaults, 'system');
  }

  /**
   * Records candidate conversion audit log
   */
  async recordConversionAudit(
    tenantId: string,
    companyId: string,
    caseId: string,
    auditData: Record<string, unknown>,
  ): Promise<void> {
    const key = `${CONVERSION_AUDIT_PREFIX}${caseId}`;

    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, key),
        ),
      );

    if (rows.length > 0) {
      await this.db
        .update(formCustomizations)
        .set({
          metadata: auditData,
          version: (rows[0]?.version ?? 1) + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(formCustomizations.tenantId, tenantId),
            eq(formCustomizations.companyId, companyId),
            eq(formCustomizations.formKey, key),
          ),
        );
    } else {
      await this.db.insert(formCustomizations).values({
        id: `fc_${randomUUID()}`,
        tenantId,
        companyId,
        formKey: key,
        version: 1,
        metadata: auditData,
      });
    }
  }

  /**
   * Retrieves candidate conversion audit log if present
   */
  async getConversionAudit(
    tenantId: string,
    companyId: string,
    caseId: string,
  ): Promise<Record<string, unknown> | null> {
    const key = `${CONVERSION_AUDIT_PREFIX}${caseId}`;
    const rows = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, key),
        ),
      );

    if (rows.length > 0 && rows[0]?.metadata) {
      return rows[0].metadata as Record<string, unknown>;
    }
    return null;
  }
}

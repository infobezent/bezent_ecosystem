import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../../../../../db/connection.js';
import {
  formCustomizations,
  onboardingStageConfigs,
  type FormCustomization,
} from '../../../../../db/schema.js';
import { ConflictError, NotFoundError } from '../../../../../app/errors/AppError.js';
import type {
  OnboardingPipeline,
  PipelineStageConfig,
  PipelineAssignmentRule,
} from '../types/pipeline.types.js';
import { getDefaultStageConfigs } from '../service/settings.defaults.js';

const PIPELINES_FORM_KEY = 'onboarding_pipelines';
const PIPELINE_RULES_FORM_KEY = 'onboarding_pipeline_rules';

export class PipelineRepository {
  private get db() {
    return getDb();
  }

  private getDefaultPipelineStages(tenantId: string, companyId: string): PipelineStageConfig[] {
    const dbDefaults = getDefaultStageConfigs(tenantId, companyId);
    return dbDefaults.map((s, index) => {
      let stageType: 'standard' | 'approval' | 'final' = 'standard';
      if (s.isTerminal || s.stageKey === 'completed') {
        stageType = 'final';
      } else if (s.stageKey === 'documents') {
        stageType = 'approval';
      }

      return {
        id: s.id || `stg_${s.stageKey}_${index + 1}`,
        stageKey: s.stageKey,
        name: s.name,
        description: s.description ?? null,
        stageType,
        displayOrder: index + 1,
        isRequired: s.isRequired,
        isActive: s.isActive,
        isTerminal: s.isTerminal ?? s.stageKey === 'completed',
        color: null,
        allowManualEntry: true,
        allowManualExit: stageType !== 'final',
        requireChecklist: s.stageKey === 'induction',
        requireDocVerification: s.stageKey === 'documents',
        requireHrApproval: stageType === 'approval',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  private createDefaultPipelines(tenantId: string, companyId: string): OnboardingPipeline[] {
    const stages = this.getDefaultPipelineStages(tenantId, companyId);
    const now = new Date().toISOString();
    return [
      {
        id: `pipe_std_${companyId}`,
        tenantId,
        companyId,
        name: 'Standard Employee Onboarding',
        code: 'standard',
        description: 'Standard end-to-end onboarding workflow for full-time regular employees.',
        isDefault: true,
        isActive: true,
        stages,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `pipe_exec_${companyId}`,
        tenantId,
        companyId,
        name: 'Executive & Leadership Onboarding',
        code: 'executive',
        description: 'Accelerated onboarding pipeline tailored for senior leadership and executive hires.',
        isDefault: false,
        isActive: true,
        stages: [
          {
            id: `stg_exec_pre_${companyId}`,
            stageKey: 'preboarding_exec',
            name: 'Executive Pre-boarding',
            description: 'Leadership welcome pack, executive equipment provisioning and agreements.',
            stageType: 'standard',
            displayOrder: 1,
            isRequired: true,
            isActive: true,
            isTerminal: false,
            color: null,
            allowManualEntry: true,
            allowManualExit: true,
            requireChecklist: false,
            requireDocVerification: false,
            requireHrApproval: false,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: `stg_exec_doc_${companyId}`,
            stageKey: 'documents_exec',
            name: 'Executive Documentation',
            description: 'Confidentiality agreements, IP assignment and compliance sign-off.',
            stageType: 'approval',
            displayOrder: 2,
            isRequired: true,
            isActive: true,
            isTerminal: false,
            color: null,
            allowManualEntry: true,
            allowManualExit: true,
            requireChecklist: true,
            requireDocVerification: true,
            requireHrApproval: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: `stg_exec_brief_${companyId}`,
            stageKey: 'leadership_briefing',
            name: 'Board & Leadership Briefing',
            description: 'Executive committee introductions, strategic objectives alignment.',
            stageType: 'standard',
            displayOrder: 3,
            isRequired: true,
            isActive: true,
            isTerminal: false,
            color: null,
            allowManualEntry: true,
            allowManualExit: true,
            requireChecklist: true,
            requireDocVerification: false,
            requireHrApproval: false,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: `stg_exec_done_${companyId}`,
            stageKey: 'completed_exec',
            name: 'Completed',
            description: 'Onboarding concluded; converted to active executive workforce.',
            stageType: 'final',
            displayOrder: 4,
            isRequired: true,
            isActive: true,
            isTerminal: true,
            color: null,
            allowManualEntry: true,
            allowManualExit: false,
            requireChecklist: false,
            requireDocVerification: true,
            requireHrApproval: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  // ==================== Pipelines CRUD ====================

  async getPipelines(tenantId: string, companyId: string): Promise<OnboardingPipeline[]> {
    const [row] = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, PIPELINES_FORM_KEY),
        ),
      );

    if (!row || !row.metadata) {
      // Deterministic initialization without write side-effects until modified
      return this.createDefaultPipelines(tenantId, companyId);
    }

    const metadata = row.metadata as { pipelines?: OnboardingPipeline[] };
    if (!metadata.pipelines || !Array.isArray(metadata.pipelines) || metadata.pipelines.length === 0) {
      return this.createDefaultPipelines(tenantId, companyId);
    }

    return metadata.pipelines;
  }

  async getPipelineById(
    tenantId: string,
    companyId: string,
    pipelineId: string,
  ): Promise<OnboardingPipeline | null> {
    const pipelines = await this.getPipelines(tenantId, companyId);
    return pipelines.find((p) => p.id === pipelineId) ?? null;
  }

  async savePipelines(
    tenantId: string,
    companyId: string,
    pipelines: OnboardingPipeline[],
  ): Promise<OnboardingPipeline[]> {
    const existing = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, PIPELINES_FORM_KEY),
        ),
      );

    const now = new Date();
    const currentVersion = existing[0]?.version ?? 0;
    const nextVersion = currentVersion + 1;

    // Ensure version updated on pipelines
    const updatedPipelines = pipelines.map((p) => ({
      ...p,
      version: nextVersion,
      updatedAt: now.toISOString(),
    }));

    if (existing.length === 0) {
      await this.db.insert(formCustomizations).values({
        id: `form_cust_${companyId}_${randomUUID().slice(0, 8)}`,
        tenantId,
        companyId,
        formKey: PIPELINES_FORM_KEY,
        version: nextVersion,
        metadata: { pipelines: updatedPipelines },
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await this.db
        .update(formCustomizations)
        .set({
          version: nextVersion,
          metadata: { pipelines: updatedPipelines },
          updatedAt: now,
        })
        .where(
          and(
            eq(formCustomizations.tenantId, tenantId),
            eq(formCustomizations.companyId, companyId),
            eq(formCustomizations.formKey, PIPELINES_FORM_KEY),
          ),
        );
    }

    // Synchronize default pipeline stages with onboarding_stage_configs table
    const defaultPipeline = updatedPipelines.find((p) => p.isDefault) ?? updatedPipelines[0];
    if (defaultPipeline) {
      await this.syncDefaultStagesToDb(tenantId, companyId, defaultPipeline.stages);
    }

    return updatedPipelines;
  }

  /**
   * Synchronizes default pipeline stage changes into the legacy onboarding_stage_configs table
   * so existing onboarding case transitions and queries remain 100% compatible.
   */
  private async syncDefaultStagesToDb(
    tenantId: string,
    companyId: string,
    stages: PipelineStageConfig[],
  ): Promise<void> {
    try {
      for (const [index, stage] of stages.entries()) {
        const existing = await this.db
          .select()
          .from(onboardingStageConfigs)
          .where(
            and(
              eq(onboardingStageConfigs.tenantId, tenantId),
              eq(onboardingStageConfigs.companyId, companyId),
              eq(onboardingStageConfigs.stageKey, stage.stageKey),
            ),
          );

        if (existing.length > 0) {
          await this.db
            .update(onboardingStageConfigs)
            .set({
              name: stage.name,
              description: stage.description,
              displayOrder: index + 1,
              isRequired: stage.isRequired,
              isActive: stage.isActive,
              isTerminal: stage.isTerminal || stage.stageType === 'final',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(onboardingStageConfigs.tenantId, tenantId),
                eq(onboardingStageConfigs.companyId, companyId),
                eq(onboardingStageConfigs.stageKey, stage.stageKey),
              ),
            );
        } else {
          await this.db.insert(onboardingStageConfigs).values({
            id: stage.id || `stg_cfg_${companyId}_${randomUUID().slice(0, 8)}`,
            tenantId,
            companyId,
            stageKey: stage.stageKey,
            name: stage.name,
            description: stage.description,
            displayOrder: index + 1,
            isRequired: stage.isRequired,
            isActive: stage.isActive,
            isSystem: false,
            isTerminal: stage.isTerminal || stage.stageType === 'final',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    } catch {
      // Non-blocking sync to avoid interrupting pipeline persistence
    }
  }

  // ==================== Assignment Rules CRUD ====================

  async getAssignmentRules(tenantId: string, companyId: string): Promise<PipelineAssignmentRule[]> {
    const [row] = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, PIPELINE_RULES_FORM_KEY),
        ),
      );

    if (!row || !row.metadata) {
      return this.createDefaultAssignmentRules(tenantId, companyId);
    }

    const metadata = row.metadata as { rules?: PipelineAssignmentRule[] };
    if (!metadata.rules || !Array.isArray(metadata.rules)) {
      return this.createDefaultAssignmentRules(tenantId, companyId);
    }

    return metadata.rules;
  }

  private createDefaultAssignmentRules(
    tenantId: string,
    companyId: string,
  ): PipelineAssignmentRule[] {
    const now = new Date().toISOString();
    return [
      {
        id: `rule_exec_${companyId}`,
        tenantId,
        companyId,
        name: 'Executive & Leadership Route',
        priority: 1,
        conditionField: 'hiringCategory',
        operator: 'equals',
        conditionValue: 'executive',
        targetPipelineId: `pipe_exec_${companyId}`,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async saveAssignmentRules(
    tenantId: string,
    companyId: string,
    rules: PipelineAssignmentRule[],
  ): Promise<PipelineAssignmentRule[]> {
    const existing = await this.db
      .select()
      .from(formCustomizations)
      .where(
        and(
          eq(formCustomizations.tenantId, tenantId),
          eq(formCustomizations.companyId, companyId),
          eq(formCustomizations.formKey, PIPELINE_RULES_FORM_KEY),
        ),
      );

    const now = new Date();
    const nextVersion = (existing[0]?.version ?? 0) + 1;

    const normalizedRules = rules.map((r, index) => ({
      ...r,
      priority: r.priority || index + 1,
      updatedAt: now.toISOString(),
    }));

    if (existing.length === 0) {
      await this.db.insert(formCustomizations).values({
        id: `form_cust_${companyId}_${randomUUID().slice(0, 8)}`,
        tenantId,
        companyId,
        formKey: PIPELINE_RULES_FORM_KEY,
        version: nextVersion,
        metadata: { rules: normalizedRules },
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await this.db
        .update(formCustomizations)
        .set({
          version: nextVersion,
          metadata: { rules: normalizedRules },
          updatedAt: now,
        })
        .where(
          and(
            eq(formCustomizations.tenantId, tenantId),
            eq(formCustomizations.companyId, companyId),
            eq(formCustomizations.formKey, PIPELINE_RULES_FORM_KEY),
          ),
        );
    }

    return normalizedRules;
  }
}

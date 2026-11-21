import { randomUUID } from 'node:crypto';
import { AppError, BadRequestError, NotFoundError } from '../../../../../app/errors/AppError.js';
import { PipelineRepository } from '../repository/pipeline.repository.js';
import type {
  OnboardingPipeline,
  PipelineStageConfig,
  CreatePipelineDto,
  UpdatePipelineDto,
  PipelineAssignmentRule,
} from '../types/pipeline.types.js';

export class PipelineService {
  constructor(private readonly repository = new PipelineRepository()) {}

  // ==================== Pipelines ====================

  async listPipelines(tenantId: string, companyId: string): Promise<OnboardingPipeline[]> {
    return this.repository.getPipelines(tenantId, companyId);
  }

  async getPipelineById(
    tenantId: string,
    companyId: string,
    pipelineId: string,
  ): Promise<OnboardingPipeline> {
    const pipeline = await this.repository.getPipelineById(tenantId, companyId, pipelineId);
    if (!pipeline) {
      throw new NotFoundError(`Pipeline '${pipelineId}' not found`);
    }
    return pipeline;
  }

  async createPipeline(
    tenantId: string,
    companyId: string,
    dto: CreatePipelineDto,
  ): Promise<OnboardingPipeline> {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestError('Pipeline name is required', 'PIPELINE_NAME_REQUIRED');
    }

    const existingPipelines = await this.repository.getPipelines(tenantId, companyId);
    const duplicate = existingPipelines.find(
      (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      throw new AppError(
        `A pipeline with name '${trimmedName}' already exists`,
        409,
        'DUPLICATE_PIPELINE_NAME',
      );
    }

    // Prepare stages: reuse provided stages or inherit from the default pipeline
    let stages: PipelineStageConfig[];
    if (dto.stages && dto.stages.length > 0) {
      stages = this.validateAndNormalizeStages(dto.stages);
    } else {
      const defaultPipeline = existingPipelines.find((p) => p.isDefault) ?? existingPipelines[0];
      const baseStages = defaultPipeline?.stages ?? [];
      const now = new Date().toISOString();
      stages = baseStages.map((s, idx) => ({
        ...s,
        id: `stg_${randomUUID().slice(0, 8)}`,
        stageKey: `${s.stageKey}_${randomUUID().slice(0, 4)}`,
        displayOrder: idx + 1,
        createdAt: now,
        updatedAt: now,
      }));
    }

    const code = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30);

    const isDefault = Boolean(dto.isDefault);
    const now = new Date().toISOString();

    const newPipeline: OnboardingPipeline = {
      id: `pipe_${code || 'custom'}_${randomUUID().slice(0, 6)}`,
      tenantId,
      companyId,
      name: trimmedName,
      code: code || 'custom',
      description: dto.description?.trim() || null,
      isDefault,
      isActive: true,
      stages,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    let updatedList = [...existingPipelines];
    if (isDefault) {
      updatedList = updatedList.map((p) => ({ ...p, isDefault: false }));
    }

    updatedList.push(newPipeline);
    await this.repository.savePipelines(tenantId, companyId, updatedList);
    return newPipeline;
  }

  async updatePipeline(
    tenantId: string,
    companyId: string,
    pipelineId: string,
    dto: UpdatePipelineDto,
  ): Promise<OnboardingPipeline> {
    const existingPipelines = await this.repository.getPipelines(tenantId, companyId);
    const targetIndex = existingPipelines.findIndex((p) => p.id === pipelineId);
    if (targetIndex === -1) {
      throw new NotFoundError(`Pipeline '${pipelineId}' not found`);
    }

    const target = existingPipelines[targetIndex]!;

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestError('Pipeline name cannot be empty', 'PIPELINE_NAME_REQUIRED');
      }
      const duplicate = existingPipelines.find(
        (p) => p.id !== pipelineId && p.name.trim().toLowerCase() === trimmed.toLowerCase(),
      );
      if (duplicate) {
        throw new AppError(
          `A pipeline with name '${trimmed}' already exists`,
          409,
          'DUPLICATE_PIPELINE_NAME',
        );
      }
      target.name = trimmed;
    }

    if (dto.description !== undefined) {
      target.description = dto.description?.trim() || null;
    }

    if (dto.isActive !== undefined) {
      if (!dto.isActive && target.isDefault) {
        throw new BadRequestError(
          'Cannot deactivate the default pipeline. Designate another active default pipeline first.',
          'CANNOT_DEACTIVATE_DEFAULT',
        );
      }
      target.isActive = dto.isActive;
    }

    if (dto.isDefault !== undefined) {
      if (dto.isDefault) {
        if (!target.isActive) {
          throw new BadRequestError(
            'Cannot set an inactive pipeline as the default pipeline. Activate it first.',
            'INACTIVE_PIPELINE_DEFAULT',
          );
        }
        for (const p of existingPipelines) {
          p.isDefault = p.id === pipelineId;
        }
      } else if (target.isDefault && existingPipelines.length > 1) {
        throw new BadRequestError(
          'There must always be exactly one default pipeline. Designate another pipeline as default instead.',
          'MUST_HAVE_DEFAULT_PIPELINE',
        );
      }
    }

    target.updatedAt = new Date().toISOString();
    const saved = await this.repository.savePipelines(tenantId, companyId, existingPipelines);
    return saved.find((p) => p.id === pipelineId)!;
  }

  async savePipelineStages(
    tenantId: string,
    companyId: string,
    pipelineId: string,
    stages: PipelineStageConfig[],
  ): Promise<OnboardingPipeline> {
    const existingPipelines = await this.repository.getPipelines(tenantId, companyId);
    const target = existingPipelines.find((p) => p.id === pipelineId);
    if (!target) {
      throw new NotFoundError(`Pipeline '${pipelineId}' not found`);
    }

    const validatedStages = this.validateAndNormalizeStages(stages);
    target.stages = validatedStages;
    target.updatedAt = new Date().toISOString();

    const saved = await this.repository.savePipelines(tenantId, companyId, existingPipelines);
    return saved.find((p) => p.id === pipelineId)!;
  }

  async duplicatePipeline(
    tenantId: string,
    companyId: string,
    pipelineId: string,
  ): Promise<OnboardingPipeline> {
    const existingPipelines = await this.repository.getPipelines(tenantId, companyId);
    const source = existingPipelines.find((p) => p.id === pipelineId);
    if (!source) {
      throw new NotFoundError(`Source pipeline '${pipelineId}' not found`);
    }

    const baseName = `${source.name} (Copy)`;
    let copyName = baseName;
    let counter = 1;
    while (existingPipelines.some((p) => p.name.toLowerCase() === copyName.toLowerCase())) {
      counter++;
      copyName = `${source.name} (Copy ${counter})`;
    }

    const now = new Date().toISOString();
    const clonedStages = source.stages.map((s, idx) => ({
      ...s,
      id: `stg_${randomUUID().slice(0, 8)}`,
      stageKey: `${s.stageKey.replace(/_[a-z0-9]{4,6}$/, '')}_${randomUUID().slice(0, 4)}`,
      displayOrder: idx + 1,
      createdAt: now,
      updatedAt: now,
    }));

    const newPipeline: OnboardingPipeline = {
      id: `pipe_copy_${randomUUID().slice(0, 8)}`,
      tenantId,
      companyId,
      name: copyName,
      code: `${source.code}_copy`,
      description: source.description,
      isDefault: false,
      isActive: true,
      stages: clonedStages,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    existingPipelines.push(newPipeline);
    await this.repository.savePipelines(tenantId, companyId, existingPipelines);
    return newPipeline;
  }

  async deletePipeline(tenantId: string, companyId: string, pipelineId: string): Promise<void> {
    const existingPipelines = await this.repository.getPipelines(tenantId, companyId);
    const target = existingPipelines.find((p) => p.id === pipelineId);
    if (!target) {
      throw new NotFoundError(`Pipeline '${pipelineId}' not found`);
    }

    if (target.isDefault) {
      throw new BadRequestError(
        'The default onboarding pipeline cannot be deleted.',
        'CANNOT_DELETE_DEFAULT_PIPELINE',
      );
    }

    if (existingPipelines.length <= 1) {
      throw new BadRequestError(
        'At least one onboarding pipeline must remain configured for the organization.',
        'CANNOT_DELETE_ONLY_PIPELINE',
      );
    }

    const updated = existingPipelines.filter((p) => p.id !== pipelineId);
    await this.repository.savePipelines(tenantId, companyId, updated);
  }

  // ==================== Validation Invariants ====================

  private validateAndNormalizeStages(stages: PipelineStageConfig[]): PipelineStageConfig[] {
    if (!stages || stages.length === 0) {
      throw new BadRequestError(
        'A pipeline must contain at least one stage',
        'EMPTY_STAGES_LIST',
      );
    }

    // 1. Stage names must be non-empty and unique
    const nameSet = new Set<string>();
    for (const stage of stages) {
      const trimmed = stage.name?.trim();
      if (!trimmed) {
        throw new BadRequestError('Stage name cannot be empty', 'STAGE_NAME_REQUIRED');
      }
      const lower = trimmed.toLowerCase();
      if (nameSet.has(lower)) {
        throw new BadRequestError(
          `Duplicate stage name '${trimmed}' inside pipeline`,
          'DUPLICATE_STAGE_NAME_IN_PIPELINE',
        );
      }
      nameSet.add(lower);
    }

    // 2. Exactly one final stage
    const finalStages = stages.filter(
      (s) => s.stageType === 'final' || s.isTerminal || s.stageKey === 'completed',
    );
    if (finalStages.length === 0) {
      throw new BadRequestError(
        'Pipeline must contain exactly one final stage (Terminal stage).',
        'MISSING_FINAL_STAGE',
      );
    }
    if (finalStages.length > 1) {
      throw new BadRequestError(
        'Pipeline cannot contain multiple final stages. Exactly one final stage is allowed.',
        'MULTIPLE_FINAL_STAGES',
      );
    }

    // 3. The final stage must be at the very end
    const lastStage = stages[stages.length - 1]!;
    if (lastStage.stageType !== 'final' && !lastStage.isTerminal && lastStage.stageKey !== 'completed') {
      throw new BadRequestError(
        'The final stage must be placed as the last stage in the sequence.',
        'FINAL_STAGE_MUST_BE_LAST',
      );
    }

    // 4. Normalize displayOrder and terminal flags
    const now = new Date().toISOString();
    return stages.map((s, idx) => {
      const isTerminal = idx === stages.length - 1 && (s.stageType === 'final' || s.isTerminal);
      return {
        ...s,
        name: s.name.trim(),
        displayOrder: idx + 1,
        isTerminal,
        stageType: isTerminal ? 'final' : s.stageType === 'final' ? 'standard' : s.stageType,
        allowManualExit: isTerminal ? false : s.allowManualExit,
        updatedAt: now,
      };
    });
  }

  // ==================== Assignment Rules ====================

  async listAssignmentRules(
    tenantId: string,
    companyId: string,
  ): Promise<PipelineAssignmentRule[]> {
    return this.repository.getAssignmentRules(tenantId, companyId);
  }

  async saveAssignmentRules(
    tenantId: string,
    companyId: string,
    rules: Omit<PipelineAssignmentRule, 'tenantId' | 'companyId' | 'createdAt' | 'updatedAt'>[],
  ): Promise<PipelineAssignmentRule[]> {
    const pipelines = await this.repository.getPipelines(tenantId, companyId);
    const activePipelineIds = new Set(pipelines.filter((p) => p.isActive).map((p) => p.id));

    // Validate rules
    const now = new Date().toISOString();
    const normalized: PipelineAssignmentRule[] = rules.map((r, idx) => {
      const trimmedName = r.name?.trim();
      if (!trimmedName) {
        throw new BadRequestError('Rule name is required', 'RULE_NAME_REQUIRED');
      }
      if (!r.targetPipelineId) {
        throw new BadRequestError(
          `Rule '${trimmedName}' must assign an active pipeline`,
          'RULE_TARGET_PIPELINE_REQUIRED',
        );
      }
      if (!activePipelineIds.has(r.targetPipelineId)) {
        throw new BadRequestError(
          `Rule '${trimmedName}' targets an inactive or non-existent pipeline`,
          'RULE_TARGET_PIPELINE_INVALID',
        );
      }

      return {
        id: r.id || `rule_${randomUUID().slice(0, 8)}`,
        tenantId,
        companyId,
        name: trimmedName,
        priority: r.priority || idx + 1,
        conditionField: r.conditionField,
        operator: r.operator,
        conditionValue: r.conditionValue?.trim() || '',
        targetPipelineId: r.targetPipelineId,
        isActive: Boolean(r.isActive),
        createdAt: now,
        updatedAt: now,
      };
    });

    // Sort by priority ascending
    normalized.sort((a, b) => a.priority - b.priority);

    return this.repository.saveAssignmentRules(tenantId, companyId, normalized);
  }

  /**
   * Resolves the assigned pipeline for a candidate based on precedence:
   * 1. Manual HR selection overrides if specified
   * 2. Highest priority matching active rule
   * 3. Organization default pipeline
   */
  async resolvePipelineForCandidate(
    tenantId: string,
    companyId: string,
    candidateAttributes: {
      employmentType?: string;
      departmentId?: string;
      locationId?: string;
      hiringCategory?: string;
    },
    manualPipelineId?: string,
  ): Promise<OnboardingPipeline> {
    const pipelines = await this.repository.getPipelines(tenantId, companyId);
    const activePipelines = pipelines.filter((p) => p.isActive);
    const defaultPipeline = activePipelines.find((p) => p.isDefault) ?? activePipelines[0];

    // 1. Manual override
    if (manualPipelineId) {
      const match = activePipelines.find((p) => p.id === manualPipelineId);
      if (match) return match;
    }

    // 2. Evaluate assignment rules
    const rules = await this.repository.getAssignmentRules(tenantId, companyId);
    const activeRules = rules.filter((r) => r.isActive).sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      const value = candidateAttributes[rule.conditionField];
      if (!value) continue;

      let matched = false;
      const expected = rule.conditionValue.toLowerCase().trim();
      const actual = String(value).toLowerCase().trim();

      switch (rule.operator) {
        case 'equals':
          matched = actual === expected;
          break;
        case 'not_equals':
          matched = actual !== expected;
          break;
        case 'in': {
          const list = expected.split(',').map((s) => s.trim());
          matched = list.includes(actual);
          break;
        }
        case 'is_not_empty':
          matched = actual.length > 0;
          break;
      }

      if (matched) {
        const assigned = activePipelines.find((p) => p.id === rule.targetPipelineId);
        if (assigned) {
          return assigned;
        }
      }
    }

    // 3. Fallback to default pipeline
    if (!defaultPipeline) {
      throw new Error('No active onboarding pipeline available for this company');
    }
    return defaultPipeline;
  }
}

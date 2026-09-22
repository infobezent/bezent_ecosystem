import { randomUUID } from 'node:crypto';
import { OnboardingRepository } from '../repository/onboarding.repository.js';
import { OnboardingSettingsService } from '../../settings/onboarding/service/settings.service.js';
import type {
  CreateNewHireDto,
  CreateCaseDto,
  UpdateDraftDto,
  SubmitCaseDto,
  TransitionStageDto,
  WithdrawCaseDto,
  OnboardingCaseListItem,
  OnboardingCaseHistoryItem,
} from '../types/onboarding.types.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  AppError,
} from '../../../../app/errors/AppError.js';

export class OnboardingService {
  constructor(
    private readonly repo = new OnboardingRepository(),
    private readonly settingsService = new OnboardingSettingsService(),
  ) {}

  private async ensureOnboardingEnabled(tenantId: string, companyId: string): Promise<void> {
    const generalSettings = await this.settingsService.getGeneralSettings(tenantId, companyId);
    if (!generalSettings.onboardingEnabled) {
      throw new AppError(
        'Onboarding is currently disabled for this organization',
        400,
        'ONBOARDING_DISABLED',
      );
    }
  }

  async listNewHires(tenantId: string, companyId: string): Promise<OnboardingCaseListItem[]> {
    return this.repo.listByCompany(tenantId, companyId);
  }

  async listCases(
    tenantId: string,
    companyId: string,
    filters?: { status?: string },
  ): Promise<OnboardingCaseListItem[]> {
    return this.repo.listByCompany(tenantId, companyId, filters);
  }

  async getCaseById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingCaseListItem> {
    const item = await this.repo.getById(tenantId, companyId, id);
    if (!item) {
      throw new NotFoundError(`Onboarding case not found for ID: ${id}`);
    }
    return item;
  }

  async getNewHireById(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingCaseListItem> {
    return this.getCaseById(tenantId, companyId, id);
  }

  async createNewHire(
    tenantId: string,
    companyId: string,
    dto: CreateNewHireDto,
  ): Promise<OnboardingCaseListItem> {
    await this.ensureOnboardingEnabled(tenantId, companyId);

    const id = `case_${randomUUID()}`;

    await this.repo.create({
      id,
      tenantId,
      companyId,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      locationId: dto.locationId ?? null,
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      email: dto.email,
      phone: dto.phone ?? null,
      joiningDate: dto.joiningDate,
      employmentType: dto.employmentType ?? 'full_time',
      stage: 'preboarding',
      status: 'active',
      version: 1,
    });

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve newly created onboarding case');
    }
    return fullRecord;
  }

  async createCase(
    tenantId: string,
    companyId: string,
    dto: CreateCaseDto,
  ): Promise<OnboardingCaseListItem> {
    const id = `case_${randomUUID()}`;
    const status = dto.status ?? 'draft';

    if (status === 'active') {
      await this.ensureOnboardingEnabled(tenantId, companyId);
    }

    await this.repo.create({
      id,
      tenantId,
      companyId,
      departmentId: dto.departmentId ?? null,
      designationId: dto.designationId ?? null,
      locationId: dto.locationId ?? null,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      joiningDate: dto.joiningDate ?? null,
      employmentType: dto.employmentType ?? 'full_time',
      stage: 'preboarding',
      status,
      version: 1,
      draftPayload: dto.draftPayload ?? null,
    });

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve newly created onboarding case');
    }
    return fullRecord;
  }

  async updateDraft(
    tenantId: string,
    companyId: string,
    id: string,
    dto: UpdateDraftDto,
  ): Promise<OnboardingCaseListItem> {
    const existing = await this.getCaseById(tenantId, companyId, id);
    if (existing.status !== 'draft') {
      throw new ConflictError(
        `Cannot update draft: Case ${id} is in '${existing.status}' status, not 'draft'`,
      );
    }

    const expectedVersion = dto.version ?? existing.version;

    const updated = await this.repo.updateWithVersion(tenantId, companyId, id, expectedVersion, {
      firstName: dto.firstName !== undefined ? dto.firstName : existing.firstName,
      lastName: dto.lastName !== undefined ? dto.lastName : existing.lastName,
      email: dto.email !== undefined ? dto.email : existing.email,
      phone: dto.phone !== undefined ? dto.phone : existing.phone,
      departmentId: dto.departmentId !== undefined ? dto.departmentId : existing.departmentId,
      designationId: dto.designationId !== undefined ? dto.designationId : existing.designationId,
      locationId: dto.locationId !== undefined ? dto.locationId : existing.locationId,
      joiningDate: dto.joiningDate !== undefined ? dto.joiningDate : existing.joiningDate,
      employmentType:
        dto.employmentType !== undefined ? dto.employmentType : existing.employmentType,
      draftPayload: dto.draftPayload !== undefined ? dto.draftPayload : existing.draftPayload,
    });

    if (!updated) {
      throw new ConflictError(
        `Optimistic lock conflict: Case ${id} has been modified by another operation (expected version ${expectedVersion})`,
      );
    }

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve updated onboarding case');
    }
    return fullRecord;
  }

  async submitCase(
    tenantId: string,
    companyId: string,
    id: string,
    dto: SubmitCaseDto,
  ): Promise<OnboardingCaseListItem> {
    await this.ensureOnboardingEnabled(tenantId, companyId);

    const existing = await this.getCaseById(tenantId, companyId, id);
    if (existing.status !== 'draft') {
      throw new ConflictError(
        `Cannot submit case: Case ${id} is in '${existing.status}' status, not 'draft'`,
      );
    }

    const expectedVersion = dto.version ?? existing.version;

    const updated = await this.repo.updateWithVersion(tenantId, companyId, id, expectedVersion, {
      firstName: dto.firstName,
      lastName: dto.lastName ?? null,
      email: dto.email,
      phone: dto.phone ?? null,
      departmentId: dto.departmentId,
      designationId: dto.designationId,
      locationId: dto.locationId ?? null,
      joiningDate: dto.joiningDate,
      employmentType: dto.employmentType ?? 'full_time',
      status: 'active',
    });

    if (!updated) {
      throw new ConflictError(
        `Optimistic lock conflict: Case ${id} has been modified by another operation (expected version ${expectedVersion})`,
      );
    }

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve submitted onboarding case');
    }
    return fullRecord;
  }

  async deleteDraft(tenantId: string, companyId: string, id: string): Promise<void> {
    const existing = await this.getCaseById(tenantId, companyId, id);
    if (existing.status !== 'draft') {
      throw new ConflictError(
        `Cannot delete case: Only 'draft' cases can be discarded (case is in '${existing.status}' status)`,
      );
    }

    const deleted = await this.repo.deleteDraft(tenantId, companyId, id);
    if (!deleted) {
      throw new NotFoundError(`Draft case not found or not in draft status: ${id}`);
    }
  }

  async transitionStage(
    tenantId: string,
    companyId: string,
    id: string,
    dto: TransitionStageDto,
  ): Promise<OnboardingCaseListItem> {
    const existing = await this.getCaseById(tenantId, companyId, id);

    if (existing.status === 'draft') {
      throw new BadRequestError(
        `Cannot transition stage: Case ${id} is in 'draft' status. Submit the case to activate first.`,
      );
    }
    if (existing.status === 'withdrawn') {
      throw new BadRequestError(
        `Cannot transition stage: Case ${id} is 'withdrawn' and cannot be progressed.`,
      );
    }
    if (existing.status === 'completed') {
      throw new BadRequestError(`Cannot transition stage: Case ${id} is already 'completed'.`);
    }
    if (existing.status !== 'active') {
      throw new BadRequestError(
        `Cannot transition stage: Only active cases can transition (current status: '${existing.status}').`,
      );
    }

    if (dto.toStage === existing.stage) {
      throw new BadRequestError(`Case ${id} is already in '${dto.toStage}' stage.`);
    }

    const stageConfigs = await this.settingsService.getStageConfigs(tenantId, companyId);
    const targetConfig = stageConfigs.find((s) => s.stageKey === dto.toStage);
    if (!targetConfig) {
      throw new BadRequestError(
        `Target stage '${dto.toStage}' is not configured for this organization.`,
      );
    }
    if (!targetConfig.isActive) {
      throw new BadRequestError(
        `Target stage '${dto.toStage}' is disabled in organization stage configuration.`,
      );
    }

    const activeStages = stageConfigs
      .filter((s) => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const currentIndex = activeStages.findIndex((s) => s.stageKey === existing.stage);
    const targetIndex = activeStages.findIndex((s) => s.stageKey === dto.toStage);

    let action: 'transition' | 'revert' | 'complete' = 'transition';

    if (targetIndex > currentIndex) {
      for (let i = currentIndex + 1; i < targetIndex; i++) {
        const intermediate = activeStages[i]!;
        if (intermediate.isRequired) {
          throw new BadRequestError(
            `Cannot skip required stage '${intermediate.name}' (${intermediate.stageKey}).`,
          );
        }
      }
      if (dto.toStage === 'completed') {
        action = 'complete';
      } else {
        action = 'transition';
      }
    } else if (targetIndex < currentIndex) {
      if (targetIndex !== currentIndex - 1) {
        const immediatePrev = activeStages[currentIndex - 1];
        const prevName = immediatePrev ? immediatePrev.name : 'previous active stage';
        throw new BadRequestError(
          `Cannot revert across multiple stages. You may only revert to the immediate previous active stage '${prevName}'.`,
        );
      }
      action = 'revert';
    }

    const success = await this.repo.transitionStageWithHistory(
      tenantId,
      companyId,
      id,
      dto.version,
      existing.stage,
      dto.toStage,
      action,
      dto.notes,
    );

    if (!success) {
      throw new ConflictError(
        `Optimistic lock conflict: Case ${id} has been modified by another operation (expected version ${dto.version})`,
      );
    }

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve updated onboarding case');
    }
    return fullRecord;
  }

  async withdrawCase(
    tenantId: string,
    companyId: string,
    id: string,
    dto: WithdrawCaseDto,
  ): Promise<OnboardingCaseListItem> {
    const existing = await this.getCaseById(tenantId, companyId, id);

    if (existing.status === 'draft') {
      throw new BadRequestError(
        `Cannot withdraw case: Case ${id} is in 'draft' status. Discard the draft instead.`,
      );
    }
    if (existing.status === 'withdrawn') {
      throw new BadRequestError(`Case ${id} is already withdrawn.`);
    }
    if (existing.status === 'completed') {
      throw new BadRequestError(`Cannot withdraw case: Case ${id} is already completed.`);
    }
    if (existing.status !== 'active') {
      throw new BadRequestError(
        `Cannot withdraw case: Only active cases can be withdrawn (current status: '${existing.status}').`,
      );
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestError('Withdrawal reason is required.');
    }

    const success = await this.repo.withdrawWithHistory(
      tenantId,
      companyId,
      id,
      dto.version,
      existing.stage,
      dto.reason.trim(),
    );

    if (!success) {
      throw new ConflictError(
        `Optimistic lock conflict: Case ${id} has been modified by another operation (expected version ${dto.version})`,
      );
    }

    const fullRecord = await this.repo.getById(tenantId, companyId, id);
    if (!fullRecord) {
      throw new Error('Failed to retrieve withdrawn onboarding case');
    }
    return fullRecord;
  }

  async getCaseHistory(
    tenantId: string,
    companyId: string,
    id: string,
  ): Promise<OnboardingCaseHistoryItem[]> {
    await this.getCaseById(tenantId, companyId, id);
    return this.repo.getHistoryByCaseId(tenantId, companyId, id);
  }
}

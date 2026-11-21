import { AppError } from '../../../../../app/errors/AppError.js';
import { OnboardingGeneralSettingsRepository } from '../repository/onboardingGeneralSettings.repository.js';
import type {
  OnboardingGeneralSettingsConfig,
  UpdateOnboardingGeneralSettingsConfigDto,
  CandidateInitialStatus,
  AssignedHrAccessScope,
  ManagerVisibilityScope,
  DayCalculationMode,
  TimeFormatMode,
  SupportedDateFormat,
} from '../types/onboardingGeneralSettings.types.js';

const VALID_CANDIDATE_STATUSES: CandidateInitialStatus[] = [
  'draft',
  'invited',
  'in_progress',
  'submitted',
  'under_review',
  'approved',
];

const VALID_HR_SCOPES: AssignedHrAccessScope[] = ['assigned_only', 'all_hr'];

const VALID_MANAGER_SCOPES: ManagerVisibilityScope[] = [
  'assigned_reports_only',
  'department_wide',
  'all',
];

const VALID_DAY_CALCULATIONS: DayCalculationMode[] = ['business_days', 'calendar_days'];

const VALID_TIME_FORMATS: TimeFormatMode[] = ['12_hour', '24_hour'];

const VALID_DATE_FORMATS: SupportedDateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

export class OnboardingGeneralSettingsService {
  constructor(
    private readonly repository: OnboardingGeneralSettingsRepository = new OnboardingGeneralSettingsRepository(),
  ) {}

  /**
   * Retrieves current general configuration
   */
  async getConfig(tenantId: string, companyId: string): Promise<OnboardingGeneralSettingsConfig> {
    if (!tenantId || !companyId) {
      throw new AppError('Tenant ID and Company ID are required', 400);
    }
    return this.repository.getConfig(tenantId, companyId);
  }

  /**
   * Updates general configuration with validation
   */
  async updateConfig(
    tenantId: string,
    companyId: string,
    dto: UpdateOnboardingGeneralSettingsConfigDto,
    actorUserId?: string,
  ): Promise<OnboardingGeneralSettingsConfig> {
    if (!tenantId || !companyId) {
      throw new AppError('Tenant ID and Company ID are required', 400);
    }

    // Validate preferences
    if (dto.preferences) {
      if (
        dto.preferences.defaultCandidateStatus &&
        !VALID_CANDIDATE_STATUSES.includes(dto.preferences.defaultCandidateStatus)
      ) {
        throw new AppError(
          `Invalid default candidate status: ${dto.preferences.defaultCandidateStatus}. Supported: ${VALID_CANDIDATE_STATUSES.join(', ')}`,
          400,
        );
      }
    }

    // Validate access
    if (dto.access) {
      if (
        dto.access.assignedHrAccessScope &&
        !VALID_HR_SCOPES.includes(dto.access.assignedHrAccessScope)
      ) {
        throw new AppError(
          `Invalid assigned HR access scope: ${dto.access.assignedHrAccessScope}. Supported: ${VALID_HR_SCOPES.join(', ')}`,
          400,
        );
      }

      if (
        dto.access.managerVisibilityScope &&
        !VALID_MANAGER_SCOPES.includes(dto.access.managerVisibilityScope)
      ) {
        throw new AppError(
          `Invalid manager visibility scope: ${dto.access.managerVisibilityScope}. Supported: ${VALID_MANAGER_SCOPES.join(', ')}`,
          400,
        );
      }
    }

    // Validate dateTime
    if (dto.dateTime) {
      if (dto.dateTime.dateFormat && !VALID_DATE_FORMATS.includes(dto.dateTime.dateFormat)) {
        throw new AppError(
          `Invalid date format: ${dto.dateTime.dateFormat}. Supported: ${VALID_DATE_FORMATS.join(', ')}`,
          400,
        );
      }

      if (dto.dateTime.timeFormat && !VALID_TIME_FORMATS.includes(dto.dateTime.timeFormat)) {
        throw new AppError(
          `Invalid time format: ${dto.dateTime.timeFormat}. Supported: ${VALID_TIME_FORMATS.join(', ')}`,
          400,
        );
      }

      if (
        dto.dateTime.dayCalculation &&
        !VALID_DAY_CALCULATIONS.includes(dto.dateTime.dayCalculation)
      ) {
        throw new AppError(
          `Invalid day calculation: ${dto.dateTime.dayCalculation}. Supported: ${VALID_DAY_CALCULATIONS.join(', ')}`,
          400,
        );
      }

      if (dto.dateTime.workingDays) {
        if (!Array.isArray(dto.dateTime.workingDays) || dto.dateTime.workingDays.length === 0) {
          throw new AppError('Working days must contain at least one day (1-7)', 400);
        }
        for (const day of dto.dateTime.workingDays) {
          if (typeof day !== 'number' || day < 1 || day > 7) {
            throw new AppError('Working days must be integers between 1 (Mon) and 7 (Sun)', 400);
          }
        }
      }
    }

    return this.repository.saveConfig(tenantId, companyId, dto, actorUserId);
  }

  /**
   * Resets general configuration to system defaults
   */
  async resetConfig(
    tenantId: string,
    companyId: string,
    actorUserId?: string,
  ): Promise<OnboardingGeneralSettingsConfig> {
    if (!tenantId || !companyId) {
      throw new AppError('Tenant ID and Company ID are required', 400);
    }
    return this.repository.resetConfig(tenantId, companyId, actorUserId);
  }
}

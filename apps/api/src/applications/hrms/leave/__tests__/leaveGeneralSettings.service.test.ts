import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaveGeneralSettingsService } from '../service/leaveGeneralSettings.service.js';
import type { LeaveGeneralSettingsRepository } from '../repository/leaveGeneralSettings.repository.js';
import { BadRequestError } from '../../../../app/errors/AppError.js';
import type { LeaveGeneralSettings } from '../../../../db/schema.js';

describe('LeaveGeneralSettingsService — Unit Tests', () => {
  let mockRepo: Partial<LeaveGeneralSettingsRepository>;
  let service: LeaveGeneralSettingsService;

  const sampleSettings: LeaveGeneralSettings = {
    id: 'lvgs_1',
    tenantId: 'tenant_test',
    companyId: 'company_test',
    leaveYearCycle: 'calendar_year',
    customYearStartDate: null,
    goLiveDate: '2026-11-01',
    dayCountingMethod: 'working_days',
    balancePrecision: 'two_decimals',
    balanceRoundingRule: 'nearest',
    maxBackdatedDays: 7,
    maxAdvanceBookingDays: 180,
    currentVersionNumber: 1,
    status: 'pre_activation',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      ensureDefaultSettings: vi.fn().mockResolvedValue(sampleSettings),
      getSettings: vi.fn().mockResolvedValue(sampleSettings),
      hasLiveLeaveRecords: vi.fn().mockResolvedValue(false),
      getCompanyTimezone: vi.fn().mockResolvedValue('Asia/Kolkata'),
      publishNewVersion: vi.fn(),
      getActiveVersionAtTimestamp: vi.fn().mockResolvedValue(null),
      getLatestPublishedVersion: vi.fn().mockResolvedValue(null),
      getVersionHistory: vi.fn().mockResolvedValue([]),
    };
    service = new LeaveGeneralSettingsService(mockRepo as LeaveGeneralSettingsRepository, {
      logEvent: vi.fn().mockResolvedValue(undefined),
    });
  });

  describe('Accrual Rounding Rules (PO Decision #11)', () => {
    it('rounds to nearest 0.5 with half-up tie breaking at .25 and .75', () => {
      // 1.25 -> 1.50
      expect(service.roundAccrual(1.25, 'nearest')).toBe(1.5);
      // 1.75 -> 2.00
      expect(service.roundAccrual(1.75, 'nearest')).toBe(2.0);
      // 1.20 -> 1.00
      expect(service.roundAccrual(1.2, 'nearest')).toBe(1.0);
      // 1.30 -> 1.50
      expect(service.roundAccrual(1.3, 'nearest')).toBe(1.5);
      // 1.6667 -> 1.50
      expect(service.roundAccrual(1.6667, 'nearest')).toBe(1.5);
      // 1.8000 -> 2.00
      expect(service.roundAccrual(1.8, 'nearest')).toBe(2.0);
    });

    it('rounds up to next 0.5 increment with round_up', () => {
      expect(service.roundAccrual(1.1, 'round_up')).toBe(1.5);
      expect(service.roundAccrual(1.5, 'round_up')).toBe(1.5);
      expect(service.roundAccrual(1.51, 'round_up')).toBe(2.0);
    });

    it('truncates to previous 0.5 increment with round_down', () => {
      expect(service.roundAccrual(1.4, 'round_down')).toBe(1.0);
      expect(service.roundAccrual(1.9, 'round_down')).toBe(1.5);
      expect(service.roundAccrual(1.5, 'round_down')).toBe(1.5);
    });
  });

  describe('Lossless Balance Display Formatting', () => {
    it('renders whole_numbers losslessly for fractions without truncation', () => {
      // exact integer
      expect(service.formatBalanceDisplay(14.0, 'whole_numbers')).toBe('14');
      // fractional value preserved losslessly
      expect(service.formatBalanceDisplay(14.5, 'whole_numbers')).toBe('14.5');
      expect(service.formatBalanceDisplay(18.25, 'whole_numbers')).toBe('18.25');
    });

    it('renders two_decimals with fixed 2 decimal places', () => {
      expect(service.formatBalanceDisplay(14.0, 'two_decimals')).toBe('14.00');
      expect(service.formatBalanceDisplay(14.5, 'two_decimals')).toBe('14.50');
    });

    it('renders half precision with 1 decimal place', () => {
      expect(service.formatBalanceDisplay(14.0, 'half')).toBe('14');
      expect(service.formatBalanceDisplay(14.5, 'half')).toBe('14.5');
    });
  });

  describe('Validation & Invariants', () => {
    it('rejects change reason shorter than 10 characters', async () => {
      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Short',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects leap day (02-29) as custom year start date', async () => {
      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'custom',
            customYearStartDate: '02-29',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Setting custom annual leave cycle',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow(
        'Leap day (Feb 29) cannot be used as an annual cycle start. Please select March 1.',
      );
    });

    it('rejects impossible calendar dates like 04-31', async () => {
      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'custom',
            customYearStartDate: '04-31',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Setting custom annual leave cycle',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Invalid calendar date: 04-31 does not exist.');
    });

    it('rejects modifying leave_year_cycle when company is activated (PO Decision #2)', async () => {
      mockRepo.getSettings = vi.fn().mockResolvedValue({
        ...sampleSettings,
        status: 'activated',
        leaveYearCycle: 'calendar_year',
      });

      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'financial_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Attempting to change cycle after activation',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow(
        'Leave year cycle cannot be altered after company activation in V1. Transition workflows require a separate approved procedure.',
      );
    });

    it('rejects modifying go_live_date when company is activated', async () => {
      mockRepo.getSettings = vi.fn().mockResolvedValue({
        ...sampleSettings,
        status: 'activated',
        goLiveDate: '2026-11-01',
      });

      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-12-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Attempting to change cutover date after activation',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Go-live date is strictly immutable once company activation is complete.');
    });

    it('rejects missing or empty change reason', async () => {
      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: '        ',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Change reason must be at least 10 characters.');
    });

    it('rejects out-of-range maxBackdatedDays (< 0 or > 90)', async () => {
      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: -1,
            maxAdvanceBookingDays: 180,
            changeReason: 'Valid change reason statement',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Max backdated days must be an integer between 0 and 90.');

      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 91,
            maxAdvanceBookingDays: 180,
            changeReason: 'Valid change reason statement',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Max backdated days must be an integer between 0 and 90.');
    });

    it('rejects out-of-range maxAdvanceBookingDays (< 1 or > 365)', async () => {
      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 0,
            changeReason: 'Valid change reason statement',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Max advance booking days must be an integer between 1 and 365.');

      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 366,
            changeReason: 'Valid change reason statement',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Max advance booking days must be an integer between 1 and 365.');
    });

    it('rejects malformed goLiveDate format', async () => {
      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'calendar_year',
            goLiveDate: 'not-a-date',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Valid change reason statement',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Go-live date must be a valid date in YYYY-MM-DD format.');
    });

    it('rejects custom cycle when customYearStartDate is missing', async () => {
      await expect(
        service.updateSettings(
          't1',
          'c1',
          {
            leaveYearCycle: 'custom',
            customYearStartDate: undefined,
            goLiveDate: '2026-11-01',
            dayCountingMethod: 'working_days',
            balancePrecision: 'two_decimals',
            balanceRoundingRule: 'nearest',
            maxBackdatedDays: 7,
            maxAdvanceBookingDays: 180,
            changeReason: 'Valid change reason statement',
            expectedCurrentVersionNumber: 1,
          },
          'u1',
        ),
      ).rejects.toThrow('Custom year start date is required when cycle is custom.');
    });

    it('successfully saves valid change, creating new Version 2 while preserving Version 1', async () => {
      const updatedMockSettings: LeaveGeneralSettings = {
        ...sampleSettings,
        currentVersionNumber: 2,
        dayCountingMethod: 'calendar_days',
      };

      const newVersionMock = {
        id: 'lvgv_2',
        tenantId: 't1',
        companyId: 'c1',
        versionNumber: 2,
        effectiveFrom: new Date(),
        changeReason: 'Updating company day counting to calendar days policy',
        settingsPayload: {
          leaveYearCycle: 'calendar_year' as const,
          customYearStartDate: null,
          goLiveDate: '2026-11-01',
          dayCountingMethod: 'calendar_days' as const,
          balancePrecision: 'two_decimals' as const,
          balanceRoundingRule: 'nearest' as const,
          maxBackdatedDays: 7,
          maxAdvanceBookingDays: 180,
        },
        createdByUserId: 'u1',
        createdAt: new Date(),
      };

      mockRepo.publishNewVersion = vi.fn().mockResolvedValue({
        settings: updatedMockSettings,
        version: newVersionMock,
      });

      const result = await service.updateSettings(
        't1',
        'c1',
        {
          leaveYearCycle: 'calendar_year',
          goLiveDate: '2026-11-01',
          dayCountingMethod: 'calendar_days',
          balancePrecision: 'two_decimals',
          balanceRoundingRule: 'nearest',
          maxBackdatedDays: 7,
          maxAdvanceBookingDays: 180,
          changeReason: 'Updating company day counting to calendar days policy',
          expectedCurrentVersionNumber: 1,
        },
        'u1',
      );

      expect(mockRepo.publishNewVersion).toHaveBeenCalledTimes(1);
      expect(result.settings.currentVersionNumber).toBe(2);
      expect(result.settings.dayCountingMethod).toBe('calendar_days');
      expect(result.version.versionNumber).toBe(2);
      expect(result.version.changeReason).toBe(
        'Updating company day counting to calendar days policy',
      );
    });
  });

  describe('P1 Hardening', () => {
    const validInput = {
      leaveYearCycle: 'calendar_year' as const,
      goLiveDate: '2026-11-01',
      dayCountingMethod: 'working_days' as const,
      balancePrecision: 'two_decimals' as const,
      balanceRoundingRule: 'nearest' as const,
      maxBackdatedDays: 7,
      maxAdvanceBookingDays: 180,
      changeReason: 'Valid business reason for the change',
      expectedCurrentVersionNumber: 1,
    };

    it('GET for an unprovisioned company returns defaults without persisting anything', async () => {
      mockRepo.getSettings = vi.fn().mockResolvedValue(null);
      mockRepo.ensureDefaultSettings = vi.fn();
      mockRepo.publishNewVersion = vi.fn();

      const result = await service.getSettings('t1', 'c1');

      expect(result.settings.id).toBeNull();
      expect(result.settings.currentVersionNumber).toBe(1);
      expect(result.settings.leaveYearCycle).toBe('calendar_year');
      expect(result.activeVersion).toBeNull();
      expect(mockRepo.ensureDefaultSettings).not.toHaveBeenCalled();
      expect(mockRepo.publishNewVersion).not.toHaveBeenCalled();
    });

    it('GET resolves values from the version effective now and reports the latest version number', async () => {
      const activePayload = { ...validInput, customYearStartDate: null, maxBackdatedDays: 3 };
      mockRepo.getActiveVersionAtTimestamp = vi.fn().mockResolvedValue({
        versionNumber: 2,
        effectiveFrom: new Date(Date.now() - 1000),
        settingsPayload: activePayload,
      });
      mockRepo.getLatestPublishedVersion = vi.fn().mockResolvedValue({
        versionNumber: 3,
        effectiveFrom: new Date(Date.now() + 86_400_000),
        settingsPayload: { ...activePayload, maxBackdatedDays: 30 },
      });

      const result = await service.getSettings('t1', 'c1');

      expect(result.settings.maxBackdatedDays).toBe(3);
      expect(result.settings.currentVersionNumber).toBe(3);
      expect(result.hasScheduledFutureVersion).toBe(true);
    });

    it('derives activation on read once go-live has passed without writing it', async () => {
      mockRepo.getSettings = vi
        .fn()
        .mockResolvedValue({ ...sampleSettings, goLiveDate: '2020-01-01' });

      const result = await service.getSettings('t1', 'c1');

      expect(result.settings.status).toBe('activated');
      expect(mockRepo.publishNewVersion).not.toHaveBeenCalled();
    });

    it.each([
      ['NaN backdated days', { maxBackdatedDays: Number.NaN }, /Max backdated days/],
      ['fractional backdated days', { maxBackdatedDays: 2.5 }, /Max backdated days/],
      ['string advance days', { maxAdvanceBookingDays: '30' }, /Max advance booking days/],
      [
        'unknown day counting',
        { dayCountingMethod: 'hours' },
        /Day counting method must be one of/,
      ],
      ['unknown precision', { balancePrecision: 'three' }, /Balance precision must be one of/],
      [
        'impossible go-live date',
        { goLiveDate: '2026-02-31' },
        /Go-live date must be a valid date/,
      ],
      ['invalid effectiveFrom', { effectiveFrom: 'not-a-date' }, /Effective from must be a valid/],
      [
        'missing version number',
        { expectedCurrentVersionNumber: undefined },
        /Expected current version/,
      ],
    ])('rejects %s', async (_label, override, message) => {
      await expect(
        service.updateSettings('t1', 'c1', { ...validInput, ...override } as never, 'u1'),
      ).rejects.toThrow(message);
      expect(mockRepo.publishNewVersion).not.toHaveBeenCalled();
    });

    it('blocks changing the custom year start date after activation', async () => {
      mockRepo.getLatestPublishedVersion = vi.fn().mockResolvedValue({
        versionNumber: 1,
        effectiveFrom: new Date(Date.now() - 1000),
        settingsPayload: {
          ...validInput,
          leaveYearCycle: 'custom',
          customYearStartDate: '07-01',
        },
      });
      mockRepo.getSettings = vi.fn().mockResolvedValue({ ...sampleSettings, status: 'activated' });

      await expect(
        service.updateSettings(
          't1',
          'c1',
          { ...validInput, leaveYearCycle: 'custom', customYearStartDate: '08-01' },
          'u1',
        ),
      ).rejects.toThrow(/Leave year cycle cannot be altered after company activation/);
    });

    it('checks immutability against the latest published version, not the cached row', async () => {
      // Row cache still says calendar_year, but the latest published version is financial_year.
      mockRepo.getSettings = vi.fn().mockResolvedValue({ ...sampleSettings, status: 'activated' });
      mockRepo.getLatestPublishedVersion = vi.fn().mockResolvedValue({
        versionNumber: 1,
        effectiveFrom: new Date(Date.now() - 1000),
        settingsPayload: {
          ...validInput,
          leaveYearCycle: 'financial_year',
          customYearStartDate: null,
        },
      });

      await expect(
        service.updateSettings(
          't1',
          'c1',
          { ...validInput, leaveYearCycle: 'calendar_year' },
          'u1',
        ),
      ).rejects.toThrow(/Leave year cycle cannot be altered/);
    });

    it('persists derived activation in the same publish', async () => {
      mockRepo.getSettings = vi
        .fn()
        .mockResolvedValue({ ...sampleSettings, goLiveDate: '2020-01-01' });
      mockRepo.publishNewVersion = vi.fn().mockResolvedValue({
        settings: { ...sampleSettings, currentVersionNumber: 2 },
        version: { id: 'lvgv_2', versionNumber: 2, effectiveFrom: new Date(), settingsPayload: {} },
      });

      await service.updateSettings('t1', 'c1', { ...validInput, goLiveDate: '2020-01-01' }, 'u1');

      expect(mockRepo.publishNewVersion).toHaveBeenCalledWith(
        't1',
        'c1',
        expect.any(Object),
        'u1',
        expect.objectContaining({ markActivated: true }),
      );
    });

    it('formats half precision losslessly when a balance has more precision', () => {
      expect(service.formatBalanceDisplay(2.25, 'half')).toBe('2.25');
      expect(service.formatBalanceDisplay(2.5, 'half')).toBe('2.5');
    });
  });
});

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../../../../design-system/components/Modal/Modal';
import { Button } from '../../../../../../design-system/components/Button/Button';
import { Select, type SelectOption } from '../../../../../../design-system/components/Select/Select';
import { Alert } from '../../../../../../design-system/components/Alert/Alert';
import type {
  DateTimePreferencesConfig,
  DayCalculationMode,
  TimeFormatMode,
  SupportedDateFormat,
} from '../../../types/onboardingGeneralSettings.types';

interface DateTimePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: DateTimePreferencesConfig;
  onSave: (dateTime: DateTimePreferencesConfig) => Promise<void>;
}

const TIMEZONE_OPTIONS: SelectOption[] = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time, UTC+00:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-05:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST, UTC+00:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+08:00)' },
];

const DATE_FORMAT_OPTIONS: SelectOption[] = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 31/12/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 12/31/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO 8601, e.g. 2026-12-31)' },
];

const TIME_FORMAT_OPTIONS: SelectOption[] = [
  { value: '12_hour', label: '12-Hour format (e.g. 02:30 PM)' },
  { value: '24_hour', label: '24-Hour format (e.g. 14:30)' },
];

const DAY_CALCULATION_OPTIONS: SelectOption[] = [
  {
    value: 'business_days',
    label: 'Business Days (Excludes configured non-working days & weekends)',
  },
  {
    value: 'calendar_days',
    label: 'Calendar Days (Counts every consecutive 24-hour day)',
  },
];

const DAYS_OF_WEEK = [
  { day: 1, label: 'Mon', fullName: 'Monday' },
  { day: 2, label: 'Tue', fullName: 'Tuesday' },
  { day: 3, label: 'Wed', fullName: 'Wednesday' },
  { day: 4, label: 'Thu', fullName: 'Thursday' },
  { day: 5, label: 'Fri', fullName: 'Friday' },
  { day: 6, label: 'Sat', fullName: 'Saturday' },
  { day: 7, label: 'Sun', fullName: 'Sunday' },
];

export function DateTimePreferencesModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
}: DateTimePreferencesModalProps) {
  const [formData, setFormData] = useState<DateTimePreferencesConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialConfig);
      setError(null);
    }
  }, [isOpen, initialConfig]);

  const toggleDay = (dayNumber: number) => {
    setFormData((prev) => {
      const exists = prev.workingDays.includes(dayNumber);
      if (exists && prev.workingDays.length === 1) {
        // Prevent deselecting the only working day
        return prev;
      }
      const updated = exists
        ? prev.workingDays.filter((d) => d !== dayNumber)
        : [...prev.workingDays, dayNumber].sort((a, b) => a - b);
      return { ...prev, workingDays: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.workingDays.length === 0) {
      setError('Please select at least one active working day.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save date & time preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Date & Time Preferences"
      size="lg"
      footer={
        <div className="bezent-genpref-modal-footer">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={saving}
            aria-label="Save Preferences"
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="bezent-genpref-form">
        {error && (
          <div className="bezent-genpref-form-row">
            <Alert variant="danger" title="Validation Error">
              {error}
            </Alert>
          </div>
        )}

        {/* 2-Column Grid: Timezone & Day Calculation */}
        <div className="bezent-genpref-grid-2col">
          {/* Tenant Timezone */}
          <div className="bezent-genpref-field">
            <label className="bezent-genpref-label" htmlFor="genpref-timezone">
              Tenant Timezone
            </label>
            <Select
              id="genpref-timezone"
              options={TIMEZONE_OPTIONS}
              value={formData.timezone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, timezone: e.target.value }))
              }
            />
          </div>

          {/* Day Calculation Mode */}
          <div className="bezent-genpref-field">
            <label className="bezent-genpref-label" htmlFor="genpref-day-calculation">
              Day Calculation for Deadlines &amp; SLAs
            </label>
            <Select
              id="genpref-day-calculation"
              options={DAY_CALCULATION_OPTIONS}
              value={formData.dayCalculation}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dayCalculation: e.target.value as DayCalculationMode,
                }))
              }
            />
          </div>
        </div>

        {/* 2-Column Grid: Date & Time Formats */}
        <div className="bezent-genpref-grid-2col">
          {/* Date Format */}
          <div className="bezent-genpref-field">
            <label className="bezent-genpref-label" htmlFor="genpref-date-format">
              Date Format
            </label>
            <Select
              id="genpref-date-format"
              options={DATE_FORMAT_OPTIONS}
              value={formData.dateFormat}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dateFormat: e.target.value as SupportedDateFormat,
                }))
              }
            />
          </div>

          {/* Time Format */}
          <div className="bezent-genpref-field">
            <label className="bezent-genpref-label" htmlFor="genpref-time-format">
              Time Format
            </label>
            <Select
              id="genpref-time-format"
              options={TIME_FORMAT_OPTIONS}
              value={formData.timeFormat}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  timeFormat: e.target.value as TimeFormatMode,
                }))
              }
            />
          </div>
        </div>

        {/* Working Week Configuration */}
        <div className="bezent-genpref-field">
          <label className="bezent-genpref-label">Working Week Schedule</label>
          <div className="bezent-genpref-day-selector">
            {DAYS_OF_WEEK.map((item) => {
              const isActive = formData.workingDays.includes(item.day);
              return (
                <button
                  key={item.day}
                  type="button"
                  title={item.fullName}
                  aria-pressed={isActive}
                  className={`bezent-genpref-day-btn ${
                    isActive ? 'bezent-genpref-day-btn--active' : ''
                  }`}
                  onClick={() => toggleDay(item.day)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  FormSection,
  FormGrid,
  Input,
  Select,
  Checkbox,
  Stack,
} from '../../../../design-system/components';

import { RegistrationField, useRegistrationConfig } from '../registration/registrationConfig';
import type { RegistrationFieldConfig } from '../../settings/api/registrationSettingsApi';
import type { ResolvedFormField } from '../../settings/api/formsApi';
import { getGroupsForSection } from '../../settings/administration/forms/types';
import type { Chapter08WorkingHoursState } from '../types/registration.types';

export interface WorkingHoursSectionProps {
  value?: Chapter08WorkingHoursState;
  onChange?: (updated: Chapter08WorkingHoursState) => void;
}

const SHIFT_PRESETS: Record<string, { startTime: string; endTime: string; breakMinutes: number }> =
  {
    general: { startTime: '09:00', endTime: '18:00', breakMinutes: 30 },
    morning: { startTime: '07:00', endTime: '16:00', breakMinutes: 30 },
    evening: { startTime: '14:00', endTime: '23:00', breakMinutes: 30 },
    night: { startTime: '22:00', endTime: '07:00', breakMinutes: 30 },
  };

const WORKING_DAYS_5 = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WORKING_DAYS_6 = [...WORKING_DAYS_5, 'Saturday'];

function workingDaysToPresetValue(days: string[]): string {
  return days.length >= 6 ? '6_days' : '5_days';
}

function presetValueToWorkingDays(preset: string): string[] {
  return preset === '6_days' ? WORKING_DAYS_6 : WORKING_DAYS_5;
}

export function WorkingHoursSection({ value, onChange }: WorkingHoursSectionProps = {}) {
  const [workSchedule, setWorkSchedule] = useState(value?.workSchedule ?? 'general');
  const [workingCalendar] = useState(value?.workingCalendar ?? '');
  const [workingDays, setWorkingDays] = useState<string[]>(value?.workingDays ?? WORKING_DAYS_5);
  const [startTime, setStartTime] = useState(value?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(value?.endTime ?? '18:00');
  const [breakMinutes, setBreakMinutes] = useState(value?.breakMinutes ?? 30);
  const [lunchMinutes] = useState(value?.lunchMinutes ?? 0);
  const [timeZone] = useState(value?.timeZone ?? '');

  // Catalog fields with no slot in Chapter08WorkingHoursState (e.g. overtimeEligible).
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});

  const handleShiftPresetChange = (preset: string) => {
    setWorkSchedule(preset);
    const defaults = SHIFT_PRESETS[preset];
    if (defaults) {
      setStartTime(defaults.startTime);
      setEndTime(defaults.endTime);
      setBreakMinutes(defaults.breakMinutes);
    }
  };

  // Sync state back to centralized store
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const updated: Chapter08WorkingHoursState = {
      workSchedule,
      workingCalendar,
      workingDays,
      startTime,
      endTime,
      breakMinutes,
      lunchMinutes,
      timeZone,
    };

    if (value && JSON.stringify(updated) === JSON.stringify(value)) {
      return;
    }

    onChange?.(updated);
  }, [
    workSchedule,
    workingCalendar,
    workingDays,
    startTime,
    endTime,
    breakMinutes,
    lunchMinutes,
    timeZone,
    value,
    onChange,
  ]);

  const config = useRegistrationConfig();

  const workingHoursFields = useMemo(() => {
    const fields = config.fields.filter((f) => f.section === 'working_hours' && f.enabled);
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.fields]);

  const groups = useMemo(() => {
    return getGroupsForSection(
      'working_hours',
      workingHoursFields as unknown as ResolvedFormField[],
      config.metadata,
    );
  }, [workingHoursFields, config.metadata]);

  const renderField = (field: RegistrationFieldConfig) => {
    const { key, width, config: fConfig } = field;
    const span = width === 'full' ? 'full' : undefined;
    const configuredOptions = Array.isArray(fConfig?.options)
      ? (fConfig.options as Array<{ value: string; label: string }>)
      : undefined;

    switch (key) {
      case 'working_hours.shiftPreset':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={workSchedule}
            htmlFor="reg-working-hours-shift-preset"
            span={span}
          >
            <Select
              id="reg-working-hours-shift-preset"
              value={workSchedule}
              onChange={(e) => handleShiftPresetChange(e.target.value)}
              options={
                configuredOptions || [
                  { value: 'general', label: 'General Shift (9:00 AM - 6:00 PM)' },
                  { value: 'morning', label: 'Morning Shift (7:00 AM - 4:00 PM)' },
                  { value: 'evening', label: 'Evening Shift (2:00 PM - 11:00 PM)' },
                  { value: 'night', label: 'Night Shift (10:00 PM - 7:00 AM)' },
                ]
              }
            />
          </RegistrationField>
        );

      case 'working_hours.startTime':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={startTime}
            htmlFor="reg-working-hours-start-time"
            span={span}
          >
            <Input
              id="reg-working-hours-start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </RegistrationField>
        );

      case 'working_hours.endTime':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={endTime}
            htmlFor="reg-working-hours-end-time"
            span={span}
          >
            <Input
              id="reg-working-hours-end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </RegistrationField>
        );

      case 'working_hours.breakDuration':
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={breakMinutes}
            htmlFor="reg-working-hours-break-duration"
            span={span}
          >
            <Input
              id="reg-working-hours-break-duration"
              type="number"
              min={0}
              value={String(breakMinutes)}
              onChange={(e) => setBreakMinutes(Number(e.target.value) || 0)}
            />
          </RegistrationField>
        );

      case 'working_hours.workingDays': {
        const presetValue = workingDaysToPresetValue(workingDays);
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={presetValue}
            htmlFor="reg-working-hours-working-days"
            span={span}
          >
            <Select
              id="reg-working-hours-working-days"
              value={presetValue}
              onChange={(e) => setWorkingDays(presetValueToWorkingDays(e.target.value))}
              options={
                configuredOptions || [
                  { value: '5_days', label: '5 Days (Monday - Friday)' },
                  { value: '6_days', label: '6 Days (Monday - Saturday)' },
                ]
              }
            />
          </RegistrationField>
        );
      }

      case 'working_hours.overtimeEligible': {
        const checked = Boolean(customValues[key]);
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={checked}
            htmlFor="reg-working-hours-overtime-eligible"
            hideLabel
            span={span}
          >
            <Checkbox
              id="reg-working-hours-overtime-eligible"
              label={field.label}
              checked={checked}
              onChange={(e) => setCustomValues((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
          </RegistrationField>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Stack gap="xl">
      {groups.map((group) => {
        if (group.fields.length === 0) return null;

        return (
          <Card key={group.key} padding="lg">
            <FormSection title={group.title}>
              <FormGrid columns={2} layout="horizontal" labelWidth="md">
                {group.fields.map((field) =>
                  renderField(field as unknown as RegistrationFieldConfig),
                )}
              </FormGrid>
            </FormSection>
          </Card>
        );
      })}
    </Stack>
  );
}

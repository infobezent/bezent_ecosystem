import { useMemo } from 'react';
import { Card, FormSection, FormGrid, Checkbox, Select, Stack } from '../../../../design-system';

import { RegistrationField, useRegistrationConfig } from '../registration/registrationConfig';
import type { RegistrationFieldConfig } from '../../settings/api/registrationSettingsApi';
import type { ResolvedFormField } from '../../settings/api/formsApi';
import { getGroupsForSection } from '../../settings/administration/forms/types';
import type { Chapter03OnboardingState } from '../types/registration.types';

export interface OnboardingSectionProps {
  value?: Chapter03OnboardingState;
  onChange?: (updated: Chapter03OnboardingState) => void;
}

const EMPTY_STATE: Chapter03OnboardingState = { tasks: [], assets: [] };

const CHECKLIST_TASKS: Record<string, { taskName: string; assignedTo: string }> = {
  'onboarding.laptopSetup': { taskName: 'Laptop & Workspace Setup', assignedTo: 'IT' },
  'onboarding.badgeCreation': { taskName: 'ID Badge Creation', assignedTo: 'HR' },
  'onboarding.complianceSigning': { taskName: 'Compliance & Policy Signing', assignedTo: 'HR' },
  'onboarding.teamIntroduction': {
    taskName: 'Team Introduction & Orientation',
    assignedTo: 'Manager',
  },
};

const SECURITY_KEY_ASSET = 'Security Hardware Token (YubiKey)';
const PRIMARY_HARDWARE_CATEGORY = 'primary_hardware';

function todayIso(): string {
  return new Date().toISOString().split('T')[0] || '';
}

export function OnboardingSection({ value, onChange }: OnboardingSectionProps = {}) {
  const state = value ?? EMPTY_STATE;
  const { tasks, assets } = state;

  const hasTask = (taskName: string) => tasks.some((t) => t.taskName === taskName);
  const hasAsset = (assetName: string) => assets.some((a) => a.assetName === assetName);
  const primaryHardwareAsset = assets.find((a) => a.category === PRIMARY_HARDWARE_CATEGORY);

  const setTaskChecked = (fieldKey: string, checked: boolean) => {
    const def = CHECKLIST_TASKS[fieldKey];
    if (!def) return;
    const nextTasks = checked
      ? hasTask(def.taskName)
        ? tasks
        : [
            ...tasks,
            {
              id: `task_${fieldKey}`,
              taskName: def.taskName,
              description: '',
              assignedTo: def.assignedTo,
              dueDate: '',
              status: 'Not Started' as const,
            },
          ]
      : tasks.filter((t) => t.taskName !== def.taskName);
    onChange?.({ ...state, tasks: nextTasks });
  };

  const setAssetChecked = (assetName: string, checked: boolean) => {
    const nextAssets = checked
      ? hasAsset(assetName)
        ? assets
        : [
            ...assets,
            {
              id: `asset_${assetName.replace(/\s+/g, '_')}`,
              assetName,
              quantity: 1,
              issueDate: todayIso(),
            },
          ]
      : assets.filter((a) => a.assetName !== assetName);
    onChange?.({ ...state, assets: nextAssets });
  };

  const setPrimaryHardware = (assetName: string) => {
    const withoutPrimary = assets.filter((a) => a.category !== PRIMARY_HARDWARE_CATEGORY);
    const nextAssets = assetName
      ? [
          ...withoutPrimary,
          {
            id: 'asset_primary_hardware',
            assetName,
            quantity: 1,
            issueDate: todayIso(),
            category: PRIMARY_HARDWARE_CATEGORY,
          },
        ]
      : withoutPrimary;
    onChange?.({ ...state, assets: nextAssets });
  };

  const config = useRegistrationConfig();

  const onboardingFields = useMemo(() => {
    const fields = config.fields.filter((f) => f.section === 'onboarding' && f.enabled);
    return [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [config.fields]);

  const groups = useMemo(
    () =>
      getGroupsForSection(
        'onboarding',
        onboardingFields as unknown as ResolvedFormField[],
        config.metadata,
      ),
    [onboardingFields, config.metadata],
  );

  const renderField = (field: RegistrationFieldConfig) => {
    const { key, width } = field;
    const span = width === 'full' ? 'full' : undefined;
    const configuredOptions = Array.isArray(field.config?.options)
      ? (field.config.options as Array<{ value: string; label: string }>)
      : undefined;

    switch (key) {
      case 'onboarding.laptopSetup':
      case 'onboarding.badgeCreation':
      case 'onboarding.complianceSigning':
      case 'onboarding.teamIntroduction': {
        const def = CHECKLIST_TASKS[key];
        const checked = def ? hasTask(def.taskName) : false;
        return (
          <RegistrationField key={key} fieldKey={key} value={checked} hideLabel span={span}>
            <Checkbox
              id={`field-${key}`}
              label={field.label}
              checked={checked}
              onChange={(e) => setTaskChecked(key, e.target.checked)}
            />
          </RegistrationField>
        );
      }

      case 'onboarding.securityKey': {
        const checked = hasAsset(SECURITY_KEY_ASSET);
        return (
          <RegistrationField key={key} fieldKey={key} value={checked} hideLabel span={span}>
            <Checkbox
              id={`field-${key}`}
              label={field.label}
              checked={checked}
              onChange={(e) => setAssetChecked(SECURITY_KEY_ASSET, e.target.checked)}
            />
          </RegistrationField>
        );
      }

      case 'onboarding.assetAllocation': {
        const selected = primaryHardwareAsset?.assetName ?? '';
        return (
          <RegistrationField
            key={key}
            fieldKey={key}
            value={selected}
            htmlFor={`field-${key}`}
            span={span}
          >
            <Select
              id={`field-${key}`}
              value={selected}
              onChange={(e) => setPrimaryHardware(e.target.value)}
              options={[{ value: '', label: 'Select hardware...' }, ...(configuredOptions || [])]}
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Actions,
  Alert,
  Badge,
  Button,
  EmptyState,
  Grid,
  Inline,
  LoadingState,
  Pane,
  Section,
  SelectableList,
  SelectableListItem,
  Stack,
  Switch,
  type BadgeVariant,
} from '../../../../design-system/components';
import {
  fetchRegistrationConfiguration,
  saveRegistrationConfiguration,
  type RegistrationConfiguration,
  type RegistrationFieldConfig,
} from '../api/registrationSettingsApi';
import { FormsApiError } from '../api/formsApi';

export type FieldSetting = { enabled: boolean; required: boolean };
export type FieldSettings = Record<string, FieldSetting>;

/** Draft settings of the configurable fields, as persisted (also used by Discard Changes). */
export function settingsOf(configuration: RegistrationConfiguration): FieldSettings {
  return Object.fromEntries(
    configuration.fields
      .filter((field) => field.configurable)
      .map((field) => [field.key, { enabled: field.enabled, required: field.required }]),
  );
}

/** Applies one field change to the draft; a disabled field is never required. */
export function applySettingChange(
  settings: FieldSettings,
  key: string,
  next: Partial<FieldSetting>,
): FieldSettings {
  const current = settings[key];
  if (!current) return settings;
  const merged = { ...current, ...next };
  if (!merged.enabled) merged.required = false;
  return { ...settings, [key]: merged };
}

/** Whether the draft differs from the persisted settings. */
export function hasUnsavedChanges(settings: FieldSettings, baseline: FieldSettings): boolean {
  return Object.entries(settings).some(
    ([key, value]) =>
      baseline[key]?.enabled !== value.enabled || baseline[key]?.required !== value.required,
  );
}

/** Sections whose fields a company can configure (only these appear in the editor). */
function configurableSectionsOf(configuration: RegistrationConfiguration) {
  return configuration.sections.filter((section) => section.configurable);
}

function fieldsOf(configuration: RegistrationConfiguration, sectionId: string) {
  return configuration.fields.filter((field) => field.section === sectionId && field.configurable);
}

/** The first configurable section, selected when the editor opens. */
export function defaultSectionId(configuration: RegistrationConfiguration): string | null {
  return configurableSectionsOf(configuration)[0]?.id ?? null;
}

/** The first field of a section, selected when the section is opened. */
export function firstFieldKey(
  configuration: RegistrationConfiguration,
  sectionId: string | null,
): string | null {
  return sectionId ? (fieldsOf(configuration, sectionId)[0]?.key ?? null) : null;
}

/** Draft status of a field as shown in the Form Fields list. */
export function fieldStatus(
  field: RegistrationFieldConfig,
  setting: FieldSetting,
): { label: string; variant: BadgeVariant } {
  if (field.protected) return { label: 'System required', variant: 'info' };
  if (!setting.enabled) return { label: 'Disabled', variant: 'neutral' };
  if (setting.required) return { label: 'Required', variant: 'warning' };
  return { label: 'Optional', variant: 'neutral' };
}

export interface RegistrationFormEditorProps {
  configuration: RegistrationConfiguration;
  settings: FieldSettings;
  selectedSectionId: string | null;
  selectedFieldKey: string | null;
  onSelectSection: (sectionId: string) => void;
  onSelectField: (fieldKey: string) => void;
  onToggleEnabled: (key: string, enabled: boolean) => void;
  onToggleRequired: (key: string, required: boolean) => void;
}

function FieldProperties({
  field,
  setting,
  onToggleEnabled,
  onToggleRequired,
}: {
  field: RegistrationFieldConfig;
  setting: FieldSetting;
  onToggleEnabled: (key: string, enabled: boolean) => void;
  onToggleRequired: (key: string, required: boolean) => void;
}) {
  return (
    <Stack gap="md">
      <Inline gap="xs" align="center">
        <span>{field.label}</span>
        {field.protected && (
          <Badge variant="info" size="sm">
            System required
          </Badge>
        )}
      </Inline>
      {field.protectedReason && <Alert variant="info">{field.protectedReason}</Alert>}
      <Switch
        label="Enabled"
        id={`registration-field-${field.key}-enabled`}
        aria-label={`${field.label} enabled`}
        checked={setting.enabled}
        disabled={field.protected}
        onChange={(e) => onToggleEnabled(field.key, e.target.checked)}
      />
      <Switch
        label="Required"
        id={`registration-field-${field.key}-required`}
        aria-label={`${field.label} required`}
        checked={setting.required}
        disabled={field.protected || !setting.enabled}
        onChange={(e) => onToggleRequired(field.key, e.target.checked)}
      />
    </Stack>
  );
}

/**
 * Pure Form Editor view: Sections | Form Fields | Field Properties.
 * Selection and draft settings are controlled by the container.
 */
export function RegistrationFormEditor({
  configuration,
  settings,
  selectedSectionId,
  selectedFieldKey,
  onSelectSection,
  onSelectField,
  onToggleEnabled,
  onToggleRequired,
}: RegistrationFormEditorProps) {
  const sections = configurableSectionsOf(configuration);
  const section = sections.find((s) => s.id === selectedSectionId) ?? sections[0];
  const fields = section ? fieldsOf(configuration, section.id) : [];
  const field = fields.find((f) => f.key === selectedFieldKey) ?? fields[0];
  const settingOf = (f: RegistrationFieldConfig): FieldSetting =>
    settings[f.key] ?? { enabled: f.enabled, required: f.required };

  return (
    <Grid columns="sidebar-main" gap="md">
      <Section title="Sections">
        <SelectableList
          aria-label="Form sections"
          selectedId={section?.id ?? null}
          onSelect={onSelectSection}
        >
          {sections.map((s) => (
            <SelectableListItem
              key={s.id}
              id={s.id}
              description={`${fieldsOf(configuration, s.id).length} fields`}
            >
              {s.label}
            </SelectableListItem>
          ))}
        </SelectableList>
      </Section>

      <Grid columns={2} gap="md">
        <Section title="Form Fields" subtitle={section?.label}>
          {section && fields.length > 0 ? (
            <Pane scroll="y" maxHeight="lg" aria-label="Form fields">
              <SelectableList
                aria-label={`${section.label} fields`}
                selectedId={field?.key ?? null}
                onSelect={onSelectField}
                size="sm"
              >
                {fields.map((f) => {
                  const status = fieldStatus(f, settingOf(f));
                  return (
                    <SelectableListItem
                      key={f.key}
                      id={f.key}
                      trailing={
                        <Badge variant={status.variant} size="sm">
                          {status.label}
                        </Badge>
                      }
                    >
                      {f.label}
                    </SelectableListItem>
                  );
                })}
              </SelectableList>
            </Pane>
          ) : (
            <EmptyState size="compact" hideIllustration title="No configurable fields" />
          )}
        </Section>

        <Pane sticky>
          <Section title="Field Properties">
            {field ? (
              <FieldProperties
                field={field}
                setting={settingOf(field)}
                onToggleEnabled={onToggleEnabled}
                onToggleRequired={onToggleRequired}
              />
            ) : (
              <EmptyState
                size="compact"
                hideIllustration
                title="No field selected"
                description="Select a field to view its properties."
              />
            )}
          </Section>
        </Pane>
      </Grid>
    </Grid>
  );
}

/**
 * HR Settings → Administration → Forms → Employee Registration → Customize.
 * Persists the company's Registration field configuration; the Employee
 * Registration form applies it.
 */
export function RegistrationSettingsSection() {
  const [configuration, setConfiguration] = useState<RegistrationConfiguration | null>(null);
  const [settings, setSettings] = useState<FieldSettings>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    fetchRegistrationConfiguration()
      .then((data) => {
        if (!active) return;
        setConfiguration(data);
        setSettings(settingsOf(data));
        const sectionId = defaultSectionId(data);
        setSelectedSectionId(sectionId);
        setSelectedFieldKey(firstFieldKey(data, sectionId));
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Failed to load settings');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const baseline = useMemo(() => (configuration ? settingsOf(configuration) : {}), [configuration]);
  const dirty = useMemo(() => hasUnsavedChanges(settings, baseline), [settings, baseline]);

  const update = useCallback((key: string, next: Partial<FieldSetting>) => {
    setSaved(false);
    setSettings((prev) => applySettingChange(prev, key, next));
  }, []);

  const selectSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    if (configuration) setSelectedFieldKey(firstFieldKey(configuration, sectionId));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await saveRegistrationConfiguration(
        Object.entries(settings).map(([key, value]) => ({ key, ...value })),
      );
      setConfiguration(updated);
      setSettings(settingsOf(updated));
      setSaved(true);
    } catch (err) {
      const details =
        err instanceof FormsApiError && err.details
          ? ` ${Object.values(err.details).join(' ')}`
          : '';
      setSaveError(`${err instanceof Error ? err.message : 'Failed to save settings'}.${details}`);
    } finally {
      setSaving(false);
    }
  };

  const actions = (
    <Actions gap="sm">
      <Button
        variant="secondary"
        onClick={() => configuration && setSettings(settingsOf(configuration))}
        disabled={!dirty || saving}
      >
        Discard Changes
      </Button>
      <Button variant="primary" onClick={handleSave} loading={saving} disabled={!dirty}>
        Save Changes
      </Button>
    </Actions>
  );

  if (loadError) {
    return (
      <Stack gap="sm" align="start">
        <Alert variant="error" title="Registration settings could not be loaded">
          {loadError}
        </Alert>
        <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (!configuration) {
    return <LoadingState label="Loading registration settings…" minHeight="md" />;
  }

  return (
    <Section
      variant="plain"
      title="Employee Registration"
      subtitle="Configure the information collected during employee registration."
      actions={actions}
    >
      <Stack gap="lg">
        {saved && (
          <Alert variant="success" dismissible onDismiss={() => setSaved(false)}>
            Employee Registration settings saved.
          </Alert>
        )}
        {saveError && (
          <Alert variant="error" title="Settings were not saved">
            {saveError}
          </Alert>
        )}
        <RegistrationFormEditor
          configuration={configuration}
          settings={settings}
          selectedSectionId={selectedSectionId}
          selectedFieldKey={selectedFieldKey}
          onSelectSection={selectSection}
          onSelectField={setSelectedFieldKey}
          onToggleEnabled={(key, enabled) => update(key, { enabled })}
          onToggleRequired={(key, required) => update(key, { required })}
        />
      </Stack>
    </Section>
  );
}

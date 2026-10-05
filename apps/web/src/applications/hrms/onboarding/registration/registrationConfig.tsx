import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Alert,
  Button,
  FormField,
  LoadingState,
  Stack,
} from '../../../../design-system/components';
import {
  fetchRegistrationConfiguration,
  type RegistrationConfiguration,
  type RegistrationFieldConfig,
  type RegistrationSectionConfig,
} from '../../settings/api/registrationSettingsApi';
import type { FormCustomizationMetadata } from '../../settings/api/formsApi';

/**
 * Employee Registration ← resolved company configuration.
 *
 * The form refers to fields only by catalog key (`<section>.<field>`); this
 * module answers "is it shown / is it required" and validates required
 * fields of a section before Save & Next. Fields outside the configurable
 * catalog are not affected.
 */

/** Empty = nothing entered (whitespace-only strings count as empty). */
export function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && !value.trim());
}

/** Keys of required, enabled fields in `sectionId` whose current value is empty. */
export function findMissingRequiredFields(
  configuration: RegistrationConfiguration,
  sectionId: string,
  values: ReadonlyMap<string, unknown>,
): string[] {
  return configuration.fields
    .filter(
      (field) =>
        field.section === sectionId &&
        field.enabled &&
        field.required &&
        values.has(field.key) &&
        isEmptyValue(values.get(field.key)),
    )
    .map((field) => field.key);
}

export interface RegistrationConfigContextValue {
  sections: RegistrationSectionConfig[];
  fields: RegistrationFieldConfig[];
  metadata?: FormCustomizationMetadata;
  configuration: RegistrationConfiguration;
  field: (key: string) => RegistrationFieldConfig | undefined;
  customFields: (sectionId: string) => RegistrationFieldConfig[];
  /** Records a rendered field's current value (for validation). */
  reportValue: (key: string, value: unknown) => void;
  removeValue: (key: string) => void;
  /** Validates the section; marks and returns the missing required field keys. */
  validateSection: (sectionId: string) => string[];
  hasError: (key: string) => boolean;
}

const RegistrationConfigContext = createContext<RegistrationConfigContextValue | null>(null);

export function RegistrationConfigProvider({
  configuration,
  children,
}: {
  configuration: RegistrationConfiguration;
  children: ReactNode;
}) {
  const values = useRef(new Map<string, unknown>());
  const [errorKeys, setErrorKeys] = useState<ReadonlySet<string>>(new Set());

  const byKey = useMemo(
    () => new Map(configuration.fields.map((field) => [field.key, field])),
    [configuration],
  );

  const customFieldsBySection = useMemo(() => {
    const map = new Map<string, RegistrationFieldConfig[]>();
    for (const f of configuration.fields) {
      if (f.origin === 'custom' && f.enabled) {
        const list = map.get(f.section) ?? [];
        list.push(f);
        map.set(f.section, list);
      }
    }
    return map;
  }, [configuration]);

  const reportValue = useCallback((key: string, value: unknown) => {
    values.current.set(key, value);
    if (!isEmptyValue(value)) {
      setErrorKeys((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const removeValue = useCallback((key: string) => {
    values.current.delete(key);
  }, []);

  const validateSection = useCallback(
    (sectionId: string) => {
      const missing = findMissingRequiredFields(configuration, sectionId, values.current);
      setErrorKeys(new Set(missing));
      return missing;
    },
    [configuration],
  );

  const context = useMemo<RegistrationConfigContextValue>(
    () => ({
      sections: configuration.sections,
      fields: configuration.fields,
      metadata: configuration.metadata,
      configuration,
      field: (key) => byKey.get(key),
      customFields: (sectionId) => customFieldsBySection.get(sectionId) ?? [],
      reportValue,
      removeValue,
      validateSection,
      hasError: (key) => errorKeys.has(key),
    }),
    [
      configuration,
      byKey,
      customFieldsBySection,
      reportValue,
      removeValue,
      validateSection,
      errorKeys,
    ],
  );

  return (
    <RegistrationConfigContext.Provider value={context}>
      {children}
    </RegistrationConfigContext.Provider>
  );
}

export function useRegistrationConfig(): RegistrationConfigContextValue {
  const context = useContext(RegistrationConfigContext);
  if (!context) {
    throw new Error('useRegistrationConfig must be used within a RegistrationConfigProvider');
  }
  return context;
}

export interface RegistrationFieldProps {
  /** Canonical catalog key, e.g. `personal.bloodGroup`. */
  fieldKey: string;
  /** Current value — used for required validation. */
  value: unknown;
  htmlFor?: string;
  span?: 1 | 2 | 'full';
  disabled?: boolean;
  helperText?: string;
  /** Field-specific error (e.g. format); the required error takes precedence. */
  error?: string;
  children: ReactNode;
}

/**
 * A configurable Registration field: hidden when disabled for the company,
 * marked required and validated when required. Label comes from the catalog.
 */
export function RegistrationField({
  fieldKey,
  value,
  htmlFor,
  span,
  disabled,
  helperText,
  error,
  children,
}: RegistrationFieldProps) {
  const config = useRegistrationConfig();
  const field = config.field(fieldKey);
  const enabled = field?.enabled ?? true;
  const { reportValue, removeValue } = config;

  useEffect(() => {
    if (!enabled) return;
    reportValue(fieldKey, value);
  }, [enabled, fieldKey, value, reportValue]);

  // A hidden or unmounted field never blocks validation.
  useEffect(() => {
    if (!enabled) removeValue(fieldKey);
    return () => removeValue(fieldKey);
  }, [enabled, fieldKey, removeValue]);

  if (!field) {
    // The form and the catalog must agree on keys; fail loudly rather than guess.
    throw new Error(`Unknown registration field '${fieldKey}'`);
  }
  if (!enabled) return null;

  return (
    <FormField
      label={field.label}
      htmlFor={htmlFor}
      required={field.required}
      disabled={disabled}
      span={span ?? (field.width === 'full' ? 'full' : undefined)}
      helperText={helperText ?? field.description ?? undefined}
      error={config.hasError(fieldKey) ? `${field.label} is required` : error}
    >
      {children}
    </FormField>
  );
}

/**
 * Loads the active company's resolved Registration configuration before the
 * form renders (so disabled fields never flash). Errors are shown with retry —
 * there is no local fallback configuration.
 */
export function RegistrationConfigLoader({ children }: { children: ReactNode }) {
  const [configuration, setConfiguration] = useState<RegistrationConfiguration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    fetchRegistrationConfiguration()
      .then((data) => active && setConfiguration(data))
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load registration settings');
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (error) {
    return (
      <Stack gap="sm" align="start">
        <Alert variant="error" title="Employee Registration could not be loaded">
          {error}
        </Alert>
        <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (!configuration) {
    return <LoadingState label="Loading employee registration…" fill />;
  }

  return (
    <RegistrationConfigProvider configuration={configuration}>
      {children}
    </RegistrationConfigProvider>
  );
}

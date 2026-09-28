import { ValidationError } from '../../../../../app/errors/AppError.js';
import {
  CUSTOM_FIELD_TYPES,
  FORM_FIELD_WIDTHS,
  type CustomFieldType,
  type FormFieldConfig,
  type FormFieldInput,
  type FormFieldOption,
  type FormSectionInput,
  type SaveFormDefinitionDto,
  type SystemFormDefinition,
} from '../types/form.types.js';

/** Generated custom field keys: `custom.` + 32 lowercase hex characters. */
export const CUSTOM_FIELD_KEY_PATTERN = /^custom\.[a-f0-9]{32}$/;

const MAX_CUSTOM_FIELDS_PER_FORM = 100;
const MAX_LABEL_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_OPTIONS = 100;
const OPTION_VALUE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const TEXT_LIMITS: Partial<Record<CustomFieldType, number>> = {
  single_line: 255,
  multi_line: 5000,
};
const CHOICE_TYPES = new Set<CustomFieldType>(['dropdown', 'radio', 'checkbox', 'multi_select']);
const SINGLE_CHOICE_TYPES = new Set<CustomFieldType>(['dropdown', 'radio']);

/** Config keys each custom field type accepts. */
const ALLOWED_CONFIG_KEYS: Record<CustomFieldType, readonly (keyof FormFieldConfig)[]> = {
  single_line: ['minLength', 'maxLength'],
  multi_line: ['minLength', 'maxLength'],
  email: [],
  phone: [],
  number: ['min', 'max'],
  decimal: ['min', 'max', 'decimalPlaces'],
  dropdown: ['options', 'defaultValue'],
  radio: ['options', 'defaultValue'],
  checkbox: ['options'],
  multi_select: ['options'],
  date: ['disallowPast', 'disallowFuture'],
  time: [],
  datetime: ['disallowPast', 'disallowFuture'],
  file_upload: ['maxSizeMb'],
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isInteger = (value: unknown): value is number => Number.isInteger(value);

/** Validates and normalises a custom field's type configuration; returns an error message or the config. */
export function validateFieldConfig(
  type: CustomFieldType,
  raw: unknown,
): { config: FormFieldConfig } | { error: string } {
  if (raw === undefined || raw === null) raw = {};
  if (!isObject(raw)) return { error: 'Config must be an object' };

  const allowed = ALLOWED_CONFIG_KEYS[type];
  const unexpected = Object.keys(raw).filter(
    (key) => !allowed.includes(key as keyof FormFieldConfig),
  );
  if (unexpected.length > 0) return { error: `Unsupported config for ${type}: ${unexpected.join(', ')}` };

  const config: FormFieldConfig = {};

  const textLimit = TEXT_LIMITS[type];
  if (textLimit !== undefined) {
    for (const key of ['minLength', 'maxLength'] as const) {
      const value = raw[key];
      if (value === undefined || value === null) continue;
      if (!isInteger(value) || value < 0 || value > textLimit) {
        return { error: `${key} must be a whole number between 0 and ${textLimit}` };
      }
      config[key] = value;
    }
    if (config.minLength !== undefined && config.maxLength !== undefined) {
      if (config.minLength > config.maxLength) return { error: 'minLength cannot exceed maxLength' };
    }
  }

  if (type === 'number' || type === 'decimal') {
    for (const key of ['min', 'max'] as const) {
      const value = raw[key];
      if (value === undefined || value === null) continue;
      const valid = type === 'number' ? isInteger(value) : typeof value === 'number';
      if (!valid || !Number.isFinite(value as number)) {
        return { error: `${key} must be a ${type === 'number' ? 'whole number' : 'number'}` };
      }
      config[key] = value as number;
    }
    if (config.min !== undefined && config.max !== undefined && config.min > config.max) {
      return { error: 'min cannot exceed max' };
    }
    if (type === 'decimal' && raw.decimalPlaces !== undefined && raw.decimalPlaces !== null) {
      const places = raw.decimalPlaces;
      if (!isInteger(places) || places < 1 || places > 6) {
        return { error: 'decimalPlaces must be between 1 and 6' };
      }
      config.decimalPlaces = places;
    }
  }

  if (CHOICE_TYPES.has(type)) {
    const options = raw.options;
    if (!Array.isArray(options) || options.length === 0) {
      return { error: 'At least one option is required' };
    }
    if (options.length > MAX_OPTIONS) return { error: `At most ${MAX_OPTIONS} options are allowed` };
    const values = new Set<string>();
    const labels = new Set<string>();
    const normalised: FormFieldOption[] = [];
    for (const option of options) {
      if (!isObject(option) || typeof option.value !== 'string' || typeof option.label !== 'string') {
        return { error: 'Each option needs a value and a label' };
      }
      const label = option.label.trim();
      if (!OPTION_VALUE_PATTERN.test(option.value)) return { error: 'Invalid option value' };
      if (!label || label.length > MAX_LABEL_LENGTH) {
        return { error: `Option labels must be 1–${MAX_LABEL_LENGTH} characters` };
      }
      if (values.has(option.value)) return { error: 'Option values must be unique' };
      if (labels.has(label.toLowerCase())) return { error: `Duplicate option '${label}'` };
      values.add(option.value);
      labels.add(label.toLowerCase());
      normalised.push({ value: option.value, label });
    }
    config.options = normalised;

    if (SINGLE_CHOICE_TYPES.has(type) && raw.defaultValue !== undefined && raw.defaultValue !== null) {
      if (typeof raw.defaultValue !== 'string' || !values.has(raw.defaultValue)) {
        return { error: 'The default must be one of the options' };
      }
      config.defaultValue = raw.defaultValue;
    }
  }

  if (type === 'date' || type === 'datetime') {
    for (const key of ['disallowPast', 'disallowFuture'] as const) {
      const value = raw[key];
      if (value === undefined || value === null) continue;
      if (typeof value !== 'boolean') return { error: `${key} must be true or false` };
      if (value) config[key] = true;
    }
    if (config.disallowPast && config.disallowFuture) {
      return { error: 'A date cannot exclude both past and future dates' };
    }
  }

  if (type === 'file_upload' && raw.maxSizeMb !== undefined && raw.maxSizeMb !== null) {
    if (!isInteger(raw.maxSizeMb) || raw.maxSizeMb < 1 || raw.maxSizeMb > 25) {
      return { error: 'maxSizeMb must be between 1 and 25' };
    }
    config.maxSizeMb = raw.maxSizeMb;
  }

  return { config };
}

/**
 * Validates an editor save for a system form. The request is the complete
 * desired customisation: every configurable section, each with its complete
 * ordered field list. Enforced server-side so no crafted request can:
 * - drop, duplicate or move a system field to another section,
 * - disable or relax a protected field, or require a disabled field,
 * - touch a non-configurable section or use an unknown key/type/config.
 * Any invalid entry rejects the whole request.
 */
export function validateSaveFormDefinition(
  form: SystemFormDefinition,
  input: unknown,
): SaveFormDefinitionDto {
  if (!isObject(input)) throw new ValidationError('Request body must be a JSON object');

  const errors: Record<string, string> = {};
  const { version, sections } = input;
  if (!isInteger(version) || version < 0) errors.version = 'Version must be a non-negative integer';
  if (!Array.isArray(sections)) {
    errors.sections = 'Sections must be an array';
    throw new ValidationError(`Validation failed for ${form.name}`, errors);
  }

  const configurable = new Map(
    form.sections.filter((section) => section.configurable).map((s) => [s.key, s]),
  );
  const seenSections = new Set<string>();
  const seenFields = new Set<string>();
  let customCount = 0;
  const result: FormSectionInput[] = [];

  sections.forEach((rawSection, sectionIndex) => {
    const sectionPath = `sections[${sectionIndex}]`;
    if (!isObject(rawSection) || typeof rawSection.key !== 'string') {
      errors[sectionPath] = 'Each section needs a key';
      return;
    }
    const section = configurable.get(rawSection.key);
    if (!section) {
      errors[`${sectionPath}.key`] = `Section '${rawSection.key}' is not configurable`;
      return;
    }
    if (seenSections.has(section.key)) {
      errors[`${sectionPath}.key`] = `Duplicate section '${section.key}'`;
      return;
    }
    seenSections.add(section.key);
    if (!Array.isArray(rawSection.fields)) {
      errors[`${sectionPath}.fields`] = 'Fields must be an array';
      return;
    }

    const systemFields = new Map(section.fields.map((f) => [f.key, f]));
    const fields: FormFieldInput[] = [];

    rawSection.fields.forEach((rawField, fieldIndex) => {
      const path = `${sectionPath}.fields[${fieldIndex}]`;
      if (!isObject(rawField) || typeof rawField.key !== 'string') {
        errors[path] = 'Each field needs a key';
        return;
      }
      const key = rawField.key;
      if (seenFields.has(key)) {
        errors[`${path}.key`] = `Duplicate field '${key}'`;
        return;
      }
      seenFields.add(key);

      const { origin, enabled, required, width } = rawField;
      const label = typeof rawField.label === 'string' ? rawField.label.trim() : '';
      const description =
        typeof rawField.description === 'string' ? rawField.description.trim() || null : null;

      if (!label || label.length > MAX_LABEL_LENGTH) {
        errors[`${path}.label`] = `Label must be 1–${MAX_LABEL_LENGTH} characters`;
        return;
      }
      if (rawField.description !== null && rawField.description !== undefined) {
        if (typeof rawField.description !== 'string' || rawField.description.length > MAX_DESCRIPTION_LENGTH) {
          errors[`${path}.description`] = `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters`;
          return;
        }
      }
      if (typeof enabled !== 'boolean' || typeof required !== 'boolean') {
        errors[path] = 'Enabled and required must be booleans';
        return;
      }
      if (!FORM_FIELD_WIDTHS.includes(width as never)) {
        errors[`${path}.width`] = 'Width must be half or full';
        return;
      }
      if (!enabled && required) {
        errors[path] = `'${label}' cannot be required while disabled`;
        return;
      }

      if (origin === 'system') {
        const definition = systemFields.get(key);
        if (!definition) {
          errors[`${path}.key`] = `'${key}' is not a system field of section '${section.key}'`;
          return;
        }
        if (definition.protected && (!enabled || !required)) {
          errors[path] = `'${definition.label}' is system-required and must stay enabled and required`;
          return;
        }
        if (rawField.type !== undefined || rawField.config !== undefined) {
          errors[path] = `The type and configuration of system field '${definition.label}' cannot change`;
          return;
        }
        fields.push({
          key,
          origin,
          label,
          description,
          enabled,
          required,
          width: width as FormFieldInput['width'],
        });
        return;
      }

      if (origin !== 'custom') {
        errors[`${path}.origin`] = 'Origin must be system or custom';
        return;
      }
      if (!CUSTOM_FIELD_KEY_PATTERN.test(key)) {
        errors[`${path}.key`] = `Invalid custom field key '${key}'`;
        return;
      }
      if (!CUSTOM_FIELD_TYPES.includes(rawField.type as CustomFieldType)) {
        errors[`${path}.type`] = `Unsupported field type '${String(rawField.type)}'`;
        return;
      }
      const type = rawField.type as CustomFieldType;
      const config = validateFieldConfig(type, rawField.config);
      if ('error' in config) {
        errors[`${path}.config`] = config.error;
        return;
      }
      customCount += 1;
      fields.push({
        key,
        origin,
        label,
        description,
        enabled,
        required,
        width: width as FormFieldInput['width'],
        type,
        config: config.config,
      });
    });

    const missing = [...systemFields.keys()].filter((key) => !seenFields.has(key));
    if (missing.length > 0) {
      errors[`${sectionPath}.fields`] = `System fields cannot be removed or moved: ${missing.join(', ')}`;
    }
    result.push({ key: section.key, fields });
  });

  const missingSections = [...configurable.keys()].filter((key) => !seenSections.has(key));
  if (missingSections.length > 0) {
    errors.sections = `Every configurable section is required: missing ${missingSections.join(', ')}`;
  }
  if (customCount > MAX_CUSTOM_FIELDS_PER_FORM) {
    errors.sections = `A form can have at most ${MAX_CUSTOM_FIELDS_PER_FORM} custom fields`;
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(`Validation failed for ${form.name}`, errors);
  }
  return { version: version as number, sections: result };
}

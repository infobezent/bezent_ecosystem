import { ValidationError } from '../../../../../app/errors/AppError.js';
import { indexSystemFields } from '../definitions/systemForms.js';
import type {
  FormFieldSettingInput,
  SystemFormDefinition,
  UpdateFormOverridesDto,
} from '../types/form.types.js';

/**
 * Validates a company's field settings for a system form. Enforced
 * server-side so no crafted request can violate domain invariants: unknown
 * keys and fields outside configurable sections are rejected, protected fields
 * must stay enabled and required, and a disabled field cannot be required.
 * Any invalid entry rejects the whole request.
 */
export function validateUpdateFormOverrides(
  form: SystemFormDefinition,
  input: unknown,
): UpdateFormOverridesDto {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  const raw = (input as Record<string, unknown>).fields;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ValidationError(`Validation failed for ${form.name} settings`, {
      fields: 'Fields must be a non-empty array',
    });
  }

  const fieldsByKey = indexSystemFields(form);
  const errors: Record<string, string> = {};
  const seen = new Set<string>();
  const fields: FormFieldSettingInput[] = [];

  raw.forEach((item, index) => {
    const path = `fields[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors[path] = 'Must be an object';
      return;
    }
    const { key, enabled, required } = item as Record<string, unknown>;

    if (typeof key !== 'string') {
      errors[`${path}.key`] = 'Field key is required';
      return;
    }
    const located = fieldsByKey.get(key);
    if (!located) {
      errors[`${path}.key`] = `Unknown field '${key}'`;
      return;
    }
    const { section, field } = located;
    if (!section.configurable) {
      errors[`${path}.key`] = `'${field.label}' is not configurable`;
      return;
    }
    if (seen.has(key)) {
      errors[`${path}.key`] = `Duplicate field '${key}'`;
      return;
    }
    seen.add(key);

    if (typeof enabled !== 'boolean' || typeof required !== 'boolean') {
      errors[path] = 'Enabled and required must be booleans';
      return;
    }
    if (field.protected && (!enabled || !required)) {
      errors[path] = `'${field.label}' is system-required and must stay enabled and required`;
      return;
    }
    if (!enabled && required) {
      errors[path] = `'${field.label}' cannot be required while disabled`;
      return;
    }

    fields.push({ key, enabled, required });
  });

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(`Validation failed for ${form.name} settings`, errors);
  }

  return { fields };
}

import { ValidationError } from '../../../app/errors/AppError.js';
import {
  type CreateWorkLocationDto,
  type UpdateWorkLocationDto,
  type LocationType,
  LOCATION_TYPES,
} from '../types/workLocation.types.js';

const INDIA_PIN_REGEX = /^\d{6}$/;
const GENERIC_POSTAL_REGEX = /^[a-zA-Z0-9\s-]{2,20}$/;

export function isValidIanaTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  const trimmed = tz.trim();
  // Canonical IANA identifiers use Area/Location notation (or UTC)
  if (!trimmed.includes('/') && trimmed !== 'UTC') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function validateCreateWorkLocation(input: unknown): CreateWorkLocationDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // 1. Name *
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Location name is required';
  } else {
    const trimmed = data.name.trim();
    if (trimmed.length < 2) {
      errors.name = 'Location name must be at least 2 characters';
    } else if (trimmed.length > 255) {
      errors.name = 'Location name must not exceed 255 characters';
    }
  }

  // 2. Code (optional)
  let normalizedCode: string | null = null;
  if (data.code !== undefined && data.code !== null && data.code !== '') {
    if (typeof data.code !== 'string') {
      errors.code = 'Location code must be a string';
    } else {
      const trimmed = data.code.trim().toUpperCase();
      if (trimmed.length > 50) {
        errors.code = 'Location code must not exceed 50 characters';
      } else if (trimmed.length > 0) {
        normalizedCode = trimmed;
      }
    }
  }

  // 3. Type *
  if (!data.type || typeof data.type !== 'string' || !data.type.trim()) {
    errors.type = 'Location type is required';
  } else if (!LOCATION_TYPES.includes(data.type as LocationType)) {
    errors.type = `Invalid location type. Must be one of: ${LOCATION_TYPES.join(', ')}`;
  }
  const locationType = (data.type as LocationType) || 'office';
  const isRemote = locationType === 'remote';

  // 4. Address validation (conditional based on type)
  let trimmedAddr1: string | null = null;
  let trimmedAddr2: string | null = null;
  let trimmedCountry: string | null = null;
  let trimmedState: string | null = null;
  let trimmedCity: string | null = null;
  let trimmedPostal: string | null = null;

  if (!isRemote) {
    // Physical location: address fields are required
    if (!data.addressLine1 || typeof data.addressLine1 !== 'string' || !data.addressLine1.trim()) {
      errors.addressLine1 = 'Address line 1 is required for physical locations';
    } else if (data.addressLine1.trim().length > 255) {
      errors.addressLine1 = 'Address line 1 must not exceed 255 characters';
    } else {
      trimmedAddr1 = data.addressLine1.trim();
    }

    if (!data.country || typeof data.country !== 'string' || !data.country.trim()) {
      errors.country = 'Country is required for physical locations';
    } else if (data.country.trim().length > 100) {
      errors.country = 'Country must not exceed 100 characters';
    } else {
      trimmedCountry = data.country.trim();
    }

    if (!data.state || typeof data.state !== 'string' || !data.state.trim()) {
      errors.state = 'State / Province is required for physical locations';
    } else if (data.state.trim().length > 100) {
      errors.state = 'State / Province must not exceed 100 characters';
    } else {
      trimmedState = data.state.trim();
    }

    if (!data.city || typeof data.city !== 'string' || !data.city.trim()) {
      errors.city = 'City is required for physical locations';
    } else if (data.city.trim().length > 100) {
      errors.city = 'City must not exceed 100 characters';
    } else {
      trimmedCity = data.city.trim();
    }

    if (!data.postalCode || typeof data.postalCode !== 'string' || !data.postalCode.trim()) {
      errors.postalCode = 'Postal code is required for physical locations';
    } else {
      const postal = data.postalCode.trim();
      const isIndia = trimmedCountry?.toLowerCase() === 'india';
      if (isIndia && !INDIA_PIN_REGEX.test(postal)) {
        errors.postalCode = 'PIN code must be a 6-digit number';
      } else if (!GENERIC_POSTAL_REGEX.test(postal)) {
        errors.postalCode = 'Invalid postal code format';
      } else if (postal.length > 20) {
        errors.postalCode = 'Postal code must not exceed 20 characters';
      } else {
        trimmedPostal = postal;
      }
    }
  } else {
    // Remote location: address fields are optional
    if (data.addressLine1 && typeof data.addressLine1 === 'string' && data.addressLine1.trim()) {
      trimmedAddr1 = data.addressLine1.trim();
    }
    if (data.country && typeof data.country === 'string' && data.country.trim()) {
      trimmedCountry = data.country.trim();
    }
    if (data.state && typeof data.state === 'string' && data.state.trim()) {
      trimmedState = data.state.trim();
    }
    if (data.city && typeof data.city === 'string' && data.city.trim()) {
      trimmedCity = data.city.trim();
    }
    if (data.postalCode && typeof data.postalCode === 'string' && data.postalCode.trim()) {
      const postal = data.postalCode.trim();
      const isIndia = trimmedCountry?.toLowerCase() === 'india';
      if (isIndia && !INDIA_PIN_REGEX.test(postal)) {
        errors.postalCode = 'PIN code must be a 6-digit number';
      } else if (!GENERIC_POSTAL_REGEX.test(postal)) {
        errors.postalCode = 'Invalid postal code format';
      } else {
        trimmedPostal = postal;
      }
    }
  }

  // Address Line 2 (optional for both)
  if (data.addressLine2 !== undefined && data.addressLine2 !== null && data.addressLine2 !== '') {
    if (typeof data.addressLine2 !== 'string') {
      errors.addressLine2 = 'Address line 2 must be a string';
    } else if (data.addressLine2.trim().length > 255) {
      errors.addressLine2 = 'Address line 2 must not exceed 255 characters';
    } else {
      trimmedAddr2 = data.addressLine2.trim();
    }
  }

  // 5. Time Zone (optional)
  let trimmedTz: string | null = null;
  if (data.timezone !== undefined && data.timezone !== null && data.timezone !== '') {
    if (typeof data.timezone !== 'string') {
      errors.timezone = 'Time zone must be a string';
    } else {
      const tz = data.timezone.trim();
      if (!isValidIanaTimezone(tz)) {
        errors.timezone = 'Invalid IANA timezone identifier (e.g. Asia/Kolkata, America/New_York)';
      } else {
        trimmedTz = tz;
      }
    }
  }

  // 6. Description (optional)
  let trimmedDesc: string | null = null;
  if (data.description !== undefined && data.description !== null && data.description !== '') {
    if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (data.description.trim().length > 1000) {
      errors.description = 'Description must not exceed 1000 characters';
    } else {
      trimmedDesc = data.description.trim();
    }
  }

  // 7. Status (optional)
  let status: 'active' | 'inactive' = 'active';
  if (data.status !== undefined && data.status !== null) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.status = 'Status must be either "active" or "inactive"';
    } else {
      status = data.status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    name: (data.name as string).trim(),
    code: normalizedCode,
    type: locationType,
    addressLine1: trimmedAddr1,
    addressLine2: trimmedAddr2,
    country: trimmedCountry,
    state: trimmedState,
    city: trimmedCity,
    postalCode: trimmedPostal,
    timezone: trimmedTz,
    description: trimmedDesc,
    status,
  };
}

export function validateUpdateWorkLocation(input: unknown): UpdateWorkLocationDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateWorkLocationDto = {};

  // 1. Name
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Location name cannot be empty';
    } else {
      const trimmed = data.name.trim();
      if (trimmed.length < 2) {
        errors.name = 'Location name must be at least 2 characters';
      } else if (trimmed.length > 255) {
        errors.name = 'Location name must not exceed 255 characters';
      } else {
        result.name = trimmed;
      }
    }
  }

  // 2. Code
  if (data.code !== undefined) {
    if (data.code === null || data.code === '') {
      result.code = null;
    } else if (typeof data.code !== 'string') {
      errors.code = 'Location code must be a string';
    } else {
      const trimmed = data.code.trim().toUpperCase();
      if (trimmed.length > 50) {
        errors.code = 'Location code must not exceed 50 characters';
      } else {
        result.code = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  // 3. Type
  if (data.type !== undefined) {
    if (typeof data.type !== 'string' || !LOCATION_TYPES.includes(data.type as LocationType)) {
      errors.type = `Invalid location type. Must be one of: ${LOCATION_TYPES.join(', ')}`;
    } else {
      result.type = data.type as LocationType;
    }
  }

  // 4. Address fields
  const isExplicitRemote = data.type === 'remote';

  if (data.addressLine1 !== undefined) {
    if (data.addressLine1 === null || data.addressLine1 === '') {
      if (!isRemoteAddressAllowedEmpty(data)) {
        errors.addressLine1 = 'Address line 1 cannot be empty for physical locations';
      } else {
        result.addressLine1 = null;
      }
    } else if (typeof data.addressLine1 !== 'string') {
      errors.addressLine1 = 'Address line 1 must be a string';
    } else if (data.addressLine1.trim().length > 255) {
      errors.addressLine1 = 'Address line 1 must not exceed 255 characters';
    } else {
      result.addressLine1 = data.addressLine1.trim();
    }
  }

  if (data.addressLine2 !== undefined) {
    if (data.addressLine2 === null || data.addressLine2 === '') {
      result.addressLine2 = null;
    } else if (typeof data.addressLine2 !== 'string') {
      errors.addressLine2 = 'Address line 2 must be a string';
    } else if (data.addressLine2.trim().length > 255) {
      errors.addressLine2 = 'Address line 2 must not exceed 255 characters';
    } else {
      result.addressLine2 = data.addressLine2.trim();
    }
  }

  if (data.country !== undefined) {
    if (data.country === null || data.country === '') {
      if (!isRemoteAddressAllowedEmpty(data)) {
        errors.country = 'Country cannot be empty for physical locations';
      } else {
        result.country = null;
      }
    } else if (typeof data.country !== 'string') {
      errors.country = 'Country must be a string';
    } else if (data.country.trim().length > 100) {
      errors.country = 'Country must not exceed 100 characters';
    } else {
      result.country = data.country.trim();
    }
  }

  if (data.state !== undefined) {
    if (data.state === null || data.state === '') {
      if (!isRemoteAddressAllowedEmpty(data)) {
        errors.state = 'State / Province cannot be empty for physical locations';
      } else {
        result.state = null;
      }
    } else if (typeof data.state !== 'string') {
      errors.state = 'State / Province must be a string';
    } else if (data.state.trim().length > 100) {
      errors.state = 'State / Province must not exceed 100 characters';
    } else {
      result.state = data.state.trim();
    }
  }

  if (data.city !== undefined) {
    if (data.city === null || data.city === '') {
      if (!isRemoteAddressAllowedEmpty(data)) {
        errors.city = 'City cannot be empty for physical locations';
      } else {
        result.city = null;
      }
    } else if (typeof data.city !== 'string') {
      errors.city = 'City must be a string';
    } else if (data.city.trim().length > 100) {
      errors.city = 'City must not exceed 100 characters';
    } else {
      result.city = data.city.trim();
    }
  }

  if (data.postalCode !== undefined) {
    if (data.postalCode === null || data.postalCode === '') {
      if (!isRemoteAddressAllowedEmpty(data)) {
        errors.postalCode = 'Postal code cannot be empty for physical locations';
      } else {
        result.postalCode = null;
      }
    } else if (typeof data.postalCode !== 'string') {
      errors.postalCode = 'Postal code must be a string';
    } else {
      const postal = data.postalCode.trim();
      const countryStr = typeof data.country === 'string' ? data.country : undefined;
      const isIndia = countryStr?.toLowerCase() === 'india';
      if (isIndia && !INDIA_PIN_REGEX.test(postal)) {
        errors.postalCode = 'PIN code must be a 6-digit number';
      } else if (!GENERIC_POSTAL_REGEX.test(postal)) {
        errors.postalCode = 'Invalid postal code format';
      } else if (postal.length > 20) {
        errors.postalCode = 'Postal code must not exceed 20 characters';
      } else {
        result.postalCode = postal;
      }
    }
  }

  // 5. Time Zone
  if (data.timezone !== undefined) {
    if (data.timezone === null || data.timezone === '') {
      result.timezone = null;
    } else if (typeof data.timezone !== 'string') {
      errors.timezone = 'Time zone must be a string';
    } else {
      const tz = data.timezone.trim();
      if (!isValidIanaTimezone(tz)) {
        errors.timezone = 'Invalid IANA timezone identifier (e.g. Asia/Kolkata, America/New_York)';
      } else {
        result.timezone = tz;
      }
    }
  }

  // 6. Description
  if (data.description !== undefined) {
    if (data.description === null || data.description === '') {
      result.description = null;
    } else if (typeof data.description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (data.description.trim().length > 1000) {
      errors.description = 'Description must not exceed 1000 characters';
    } else {
      result.description = data.description.trim();
    }
  }

  // 7. Status
  if (data.status !== undefined) {
    if (data.status !== 'active' && data.status !== 'inactive') {
      errors.status = 'Status must be either "active" or "inactive"';
    } else {
      result.status = data.status;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return result;
}

function isRemoteAddressAllowedEmpty(data: Record<string, unknown>): boolean {
  return data.type === 'remote';
}

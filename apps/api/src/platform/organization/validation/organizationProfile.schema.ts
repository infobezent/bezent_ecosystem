import { ValidationError } from '../../../app/errors/AppError.js';
import type { UpdateOrganizationProfileDto } from '../types/organization.types.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d+\-()\s.]{7,25}$/;
const WEBSITE_REGEX = /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/;
const INDIA_PIN_REGEX = /^\d{6}$/;
const GENERIC_POSTAL_REGEX = /^[a-zA-Z0-9\s-]{2,20}$/;

export function validateUpdateOrganizationProfile(input: unknown): UpdateOrganizationProfileDto {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }

  const data = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // 1. Basic Information
  // Organization Name *
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Organization name is required';
  } else if (data.name.trim().length > 255) {
    errors.name = 'Organization name must not exceed 255 characters';
  }

  // Display Name
  if (data.displayName !== undefined && data.displayName !== null && data.displayName !== '') {
    if (typeof data.displayName !== 'string') {
      errors.displayName = 'Display name must be a string';
    } else if (data.displayName.trim().length > 255) {
      errors.displayName = 'Display name must not exceed 255 characters';
    }
  }

  // Organization Type *
  if (
    !data.organizationType ||
    typeof data.organizationType !== 'string' ||
    !data.organizationType.trim()
  ) {
    errors.organizationType = 'Organization type is required';
  } else if (data.organizationType.trim().length > 100) {
    errors.organizationType = 'Organization type must not exceed 100 characters';
  }

  // Industry
  if (data.industry !== undefined && data.industry !== null && data.industry !== '') {
    if (typeof data.industry !== 'string') {
      errors.industry = 'Industry must be a string';
    } else if (data.industry.trim().length > 100) {
      errors.industry = 'Industry must not exceed 100 characters';
    }
  }

  // Website
  if (data.website !== undefined && data.website !== null && data.website !== '') {
    if (typeof data.website !== 'string') {
      errors.website = 'Website must be a string';
    } else {
      const trimmedWebsite = data.website.trim();
      if (trimmedWebsite.length > 255) {
        errors.website = 'Website URL must not exceed 255 characters';
      } else if (!WEBSITE_REGEX.test(trimmedWebsite)) {
        errors.website = 'Please enter a valid website URL (e.g. www.example.com)';
      }
    }
  }

  // Logo URL
  if (data.logoUrl !== undefined && data.logoUrl !== null && data.logoUrl !== '') {
    if (typeof data.logoUrl !== 'string') {
      errors.logoUrl = 'Logo URL must be a string';
    } else if (data.logoUrl.trim().length > 500) {
      errors.logoUrl = 'Logo URL must not exceed 500 characters';
    }
  }

  // 2. Official Contact
  // Primary Email *
  if (!data.primaryEmail || typeof data.primaryEmail !== 'string' || !data.primaryEmail.trim()) {
    errors.primaryEmail = 'Primary email is required';
  } else {
    const trimmedEmail = data.primaryEmail.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.primaryEmail = 'Invalid primary email format';
    } else if (trimmedEmail.length > 255) {
      errors.primaryEmail = 'Primary email must not exceed 255 characters';
    }
  }

  // Phone Number
  if (data.phoneNumber !== undefined && data.phoneNumber !== null && data.phoneNumber !== '') {
    if (typeof data.phoneNumber !== 'string') {
      errors.phoneNumber = 'Phone number must be a string';
    } else {
      const trimmedPhone = data.phoneNumber.trim();
      if (!PHONE_REGEX.test(trimmedPhone)) {
        errors.phoneNumber = 'Invalid phone number format';
      } else if (trimmedPhone.length > 50) {
        errors.phoneNumber = 'Phone number must not exceed 50 characters';
      }
    }
  }

  // Alternate Email
  if (
    data.alternateEmail !== undefined &&
    data.alternateEmail !== null &&
    data.alternateEmail !== ''
  ) {
    if (typeof data.alternateEmail !== 'string') {
      errors.alternateEmail = 'Alternate email must be a string';
    } else {
      const trimmedAltEmail = data.alternateEmail.trim();
      if (!EMAIL_REGEX.test(trimmedAltEmail)) {
        errors.alternateEmail = 'Invalid alternate email format';
      } else if (trimmedAltEmail.length > 255) {
        errors.alternateEmail = 'Alternate email must not exceed 255 characters';
      }
    }
  }

  // Alternate Phone
  if (
    data.alternatePhone !== undefined &&
    data.alternatePhone !== null &&
    data.alternatePhone !== ''
  ) {
    if (typeof data.alternatePhone !== 'string') {
      errors.alternatePhone = 'Alternate phone must be a string';
    } else {
      const trimmedAltPhone = data.alternatePhone.trim();
      if (!PHONE_REGEX.test(trimmedAltPhone)) {
        errors.alternatePhone = 'Invalid alternate phone format';
      } else if (trimmedAltPhone.length > 50) {
        errors.alternatePhone = 'Alternate phone must not exceed 50 characters';
      }
    }
  }

  // 3. Registered Address
  // Address Line 1 *
  if (!data.addressLine1 || typeof data.addressLine1 !== 'string' || !data.addressLine1.trim()) {
    errors.addressLine1 = 'Address line 1 is required';
  } else if (data.addressLine1.trim().length > 255) {
    errors.addressLine1 = 'Address line 1 must not exceed 255 characters';
  }

  // Address Line 2
  if (data.addressLine2 !== undefined && data.addressLine2 !== null && data.addressLine2 !== '') {
    if (typeof data.addressLine2 !== 'string') {
      errors.addressLine2 = 'Address line 2 must be a string';
    } else if (data.addressLine2.trim().length > 255) {
      errors.addressLine2 = 'Address line 2 must not exceed 255 characters';
    }
  }

  // Country *
  if (!data.country || typeof data.country !== 'string' || !data.country.trim()) {
    errors.country = 'Country is required';
  } else if (data.country.trim().length > 100) {
    errors.country = 'Country must not exceed 100 characters';
  }

  // State / Province *
  if (!data.state || typeof data.state !== 'string' || !data.state.trim()) {
    errors.state = 'State / Province is required';
  } else if (data.state.trim().length > 100) {
    errors.state = 'State / Province must not exceed 100 characters';
  }

  // City *
  if (!data.city || typeof data.city !== 'string' || !data.city.trim()) {
    errors.city = 'City is required';
  } else if (data.city.trim().length > 100) {
    errors.city = 'City must not exceed 100 characters';
  }

  // Postal Code *
  if (!data.postalCode || typeof data.postalCode !== 'string' || !data.postalCode.trim()) {
    errors.postalCode = 'Postal code is required';
  } else {
    const trimmedPostal = data.postalCode.trim();
    const isIndia = (typeof data.country === 'string' && data.country.trim().toLowerCase() === 'india');
    if (isIndia && !INDIA_PIN_REGEX.test(trimmedPostal)) {
      errors.postalCode = 'PIN code must be a 6-digit number';
    } else if (!GENERIC_POSTAL_REGEX.test(trimmedPostal)) {
      errors.postalCode = 'Invalid postal code format';
    } else if (trimmedPostal.length > 20) {
      errors.postalCode = 'Postal code must not exceed 20 characters';
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    name: (data.name as string).trim(),
    displayName: data.displayName ? (data.displayName as string).trim() : null,
    organizationType: (data.organizationType as string).trim(),
    industry: data.industry ? (data.industry as string).trim() : null,
    website: data.website ? (data.website as string).trim() : null,
    logoUrl: data.logoUrl ? (data.logoUrl as string).trim() : null,
    primaryEmail: (data.primaryEmail as string).trim().toLowerCase(),
    phoneNumber: data.phoneNumber ? (data.phoneNumber as string).trim() : null,
    alternateEmail: data.alternateEmail ? (data.alternateEmail as string).trim().toLowerCase() : null,
    alternatePhone: data.alternatePhone ? (data.alternatePhone as string).trim() : null,
    addressLine1: (data.addressLine1 as string).trim(),
    addressLine2: data.addressLine2 ? (data.addressLine2 as string).trim() : null,
    country: (data.country as string).trim(),
    state: (data.state as string).trim(),
    city: (data.city as string).trim(),
    postalCode: (data.postalCode as string).trim(),
  };
}

/**
 * BEZENT Common Data Engine - Validation Contracts
 */

export interface ValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly value?: T;
  readonly error?: string;
  readonly details?: Record<string, string>;
}

export interface TextValidationOptions {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: RegExp;
  readonly patternMessage?: string;
  readonly allowEmpty?: boolean;
  readonly trim?: boolean;
}

export interface EmailValidationOptions {
  readonly required?: boolean;
  readonly maxLength?: number;
}

export interface PhoneValidationOptions {
  readonly required?: boolean;
  readonly countryCode?: string;
  readonly allowExtensions?: boolean;
}

export interface UrlValidationOptions {
  readonly required?: boolean;
  readonly allowedProtocols?: readonly string[];
  readonly maxLength?: number;
  readonly requireTld?: boolean;
}

export interface IdentifierValidationOptions {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly allowedPattern?: RegExp;
  readonly uppercase?: boolean;
}

export interface PostalValidationOptions {
  readonly required?: boolean;
  readonly countryCode?: string;
}

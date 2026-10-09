/**
 * BEZENT Common Data Engine - Standard File Validation Policies
 */

import type { FileValidationPolicy } from '../contracts/file.types.js';

export const TENANT_LOGO_POLICY: FileValidationPolicy = {
  name: 'Tenant Logo',
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  imageDimensions: {
    minWidth: 100,
    maxWidth: 2048,
    minHeight: 100,
    maxHeight: 2048,
    aspectRatio: { width: 1, height: 1, tolerance: 0.1 },
  },
};

export const COMPANY_LOGO_POLICY: FileValidationPolicy = {
  name: 'Company Logo',
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
  maxSizeBytes: 1 * 1024 * 1024, // 1MB
  imageDimensions: {
    minWidth: 64,
    maxWidth: 1024,
    minHeight: 64,
    maxHeight: 1024,
    aspectRatio: { width: 1, height: 1, tolerance: 0.15 },
  },
};

export const TENANT_BANNER_POLICY: FileValidationPolicy = {
  name: 'Tenant Banner',
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
  allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
  maxSizeBytes: 4 * 1024 * 1024, // 4MB
  imageDimensions: {
    minWidth: 600,
    maxWidth: 3840,
    minHeight: 150,
    maxHeight: 1200,
    aspectRatio: { width: 3.5, height: 1, tolerance: 0.35 },
  },
};

export const EMPLOYEE_DOCUMENT_POLICY: FileValidationPolicy = {
  name: 'Employee Document',
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
  ],
  allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'],
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
};

/**
 * BEZENT Common Data Engine - Safe Filename Handling & File Validation
 */

import type {
  FileMetadataInput,
  FileValidationPolicy,
  FileValidationResult,
} from '../contracts/file.types.js';

/**
 * Sanitizes an untrusted filename, stripping directory traversal characters (e.g. '../', '..\\'),
 * non-printable characters, and unsafe symbols, while preserving legitimate extensions.
 */
export function sanitizeFilename(originalName: string): string {
  if (!originalName || typeof originalName !== 'string') {
    return 'unnamed_file';
  }

  // Extract base filename if a path was passed
  const baseName = originalName.replace(/^.*[\\/]/, '');

  // Separate name and extension
  const lastDotIndex = baseName.lastIndexOf('.');
  const rawBase = lastDotIndex > 0 ? baseName.slice(0, lastDotIndex) : baseName;
  const rawExt = lastDotIndex > 0 ? baseName.slice(lastDotIndex) : '';

  // Clean raw base name: allow alphanumeric, underscores, hyphens, and dots (collapse consecutive dots)
  let cleanBase = rawBase
    .trim()
    .replace(/[^a-zA-Z0-9_\-\s.]/g, '')
    .replace(/\s+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/\.+$/, '');

  if (!cleanBase) {
    cleanBase = 'file';
  }

  // Clean extension: lowercase, alphanumeric
  const cleanExt = rawExt
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '');

  // Truncate length safely (max 100 chars for base)
  if (cleanBase.length > 100) {
    cleanBase = cleanBase.slice(0, 100);
  }

  return `${cleanBase}${cleanExt}`;
}

/**
 * Validates a file's metadata against a target FileValidationPolicy.
 */
export function validateFile(
  input: FileMetadataInput,
  policy: FileValidationPolicy,
): FileValidationResult {
  const errors: string[] = [];

  if (!input || !input.name) {
    return {
      isValid: false,
      errors: ['File name is required'],
    };
  }

  const sanitized = sanitizeFilename(input.name);
  const dotIndex = sanitized.lastIndexOf('.');
  const extension = dotIndex >= 0 ? sanitized.slice(dotIndex).toLowerCase() : '';

  // 1. Size Check
  if (input.size <= 0) {
    errors.push('File cannot be empty (0 bytes)');
  } else if (input.size > policy.maxSizeBytes) {
    const maxMb = (policy.maxSizeBytes / (1024 * 1024)).toFixed(1);
    errors.push(`File size (${(input.size / (1024 * 1024)).toFixed(2)} MB) exceeds allowed limit of ${maxMb} MB`);
  }

  // 2. Extension Check
  if (!extension || !policy.allowedExtensions.includes(extension)) {
    errors.push(
      `File extension '${extension || 'none'}' is not allowed for ${policy.name}. Allowed: ${policy.allowedExtensions.join(', ')}`,
    );
  }

  // 3. MIME Type Check (if mimeType provided)
  const mimeType = (input.mimeType || '').trim().toLowerCase();
  if (mimeType && !policy.allowedMimeTypes.includes(mimeType)) {
    errors.push(
      `File MIME type '${mimeType}' is not supported for ${policy.name}. Allowed: ${policy.allowedMimeTypes.join(', ')}`,
    );
  }

  // 4. Magic-byte signature verification (if binary data provided)
  if (input.data && mimeType) {
    const sigCheck = verifyFileSignature(input.data, mimeType);
    if (!sigCheck.matches) {
      errors.push(
        `File content does not match declared MIME type '${mimeType}' (file signature mismatch)`,
      );
    }
  }

  // 5. Dimension & Aspect Ratio Checks (if image dimensions provided)
  if (policy.imageDimensions && input.width !== undefined && input.height !== undefined) {
    const { width, height } = input;
    const { minWidth, maxWidth, minHeight, maxHeight, aspectRatio } = policy.imageDimensions;

    if (minWidth !== undefined && width < minWidth) {
      errors.push(`Image width (${width}px) is less than minimum allowed width of ${minWidth}px`);
    }
    if (maxWidth !== undefined && width > maxWidth) {
      errors.push(`Image width (${width}px) exceeds maximum allowed width of ${maxWidth}px`);
    }
    if (minHeight !== undefined && height < minHeight) {
      errors.push(`Image height (${height}px) is less than minimum allowed height of ${minHeight}px`);
    }
    if (maxHeight !== undefined && height > maxHeight) {
      errors.push(`Image height (${height}px) exceeds maximum allowed height of ${maxHeight}px`);
    }

    if (aspectRatio && height > 0) {
      const actualRatio = width / height;
      const targetRatio = aspectRatio.width / aspectRatio.height;
      const tolerance = aspectRatio.tolerance ?? 0.1;
      const difference = Math.abs(actualRatio - targetRatio);

      if (difference > tolerance) {
        errors.push(
          `Image aspect ratio (${actualRatio.toFixed(2)}) deviates from expected ratio (${targetRatio.toFixed(2)}:1)`,
        );
      }
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    metadata: {
      originalName: input.name,
      sanitizedName: sanitized,
      extension,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: input.size,
      width: input.width,
      height: input.height,
    },
    errors: [],
  };
}

/**
 * Lightweight magic-byte verification for common image and document formats.
 * Prevents disguised files (e.g., HTML/JS renamed as .png) from bypassing validation.
 */
export function verifyFileSignature(
  data: Uint8Array | Buffer,
  declaredMimeType: string,
): { matches: boolean; detectedMimeType?: string } {
  if (!data || data.length < 4) {
    return { matches: false };
  }

  const bytes = data instanceof Buffer ? data : Buffer.from(data);
  const mime = declaredMimeType.trim().toLowerCase();

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { matches: mime === 'image/png', detectedMimeType: 'image/png' };
  }

  // JPEG / JPG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return {
      matches: mime === 'image/jpeg' || mime === 'image/jpg',
      detectedMimeType: 'image/jpeg',
    };
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { matches: mime === 'image/webp', detectedMimeType: 'image/webp' };
  }

  // PDF: %PDF (25 50 44 46)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return { matches: mime === 'application/pdf', detectedMimeType: 'application/pdf' };
  }

  // If MIME is not one of the strictly checked types, permit if no contradiction
  return { matches: false };
}

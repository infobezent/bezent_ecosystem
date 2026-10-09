import type { Request } from 'express';
import { BadRequestError } from '../../../app/errors/AppError.js';
import type { UploadFileInput } from '../../../platform/data/media/media.service.js';

export function parseUploadFromRequest(req: Request): UploadFileInput {
  // 1. Raw binary body
  if (Buffer.isBuffer(req.body)) {
    const filename = (
      (req.headers['x-file-name'] as string) ||
      (req.query.filename as string) ||
      'uploaded_file'
    ).trim();
    const mimeType = (req.headers['content-type'] || 'application/octet-stream')
      .split(';')[0]!
      .trim();
    return {
      filename,
      mimeType,
      data: req.body,
    };
  }

  // 2. JSON body with base64 fileData
  if (req.body && typeof req.body === 'object') {
    const { filename, mimeType, fileData } = req.body as Record<string, unknown>;
    if (!filename || typeof filename !== 'string') {
      throw new BadRequestError('Filename is required');
    }
    if (!fileData || typeof fileData !== 'string') {
      throw new BadRequestError('File data is required');
    }

    // Strip optional data URL prefix (e.g. "data:image/png;base64,")
    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const declaredMime = (
      (typeof mimeType === 'string' && mimeType.trim()) ||
      'application/octet-stream'
    ).trim();

    return {
      filename: filename.trim(),
      mimeType: declaredMime,
      data: buffer,
    };
  }

  throw new BadRequestError('No valid file payload received');
}

/**
 * BEZENT Common Data Engine - Storage Provider Abstraction
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { AppError } from '../../../app/errors/AppError.js';
import type {
  FileStorageProvider,
  FileStoragePutParams,
  FileStorageResult,
} from '../contracts/file.types.js';

export class UnsupportedStorageError extends AppError {
  constructor(operation = 'File storage') {
    super(
      `${operation} is not supported: persistent media/file storage provider is not configured for the platform.`,
      501,
      'STORAGE_NOT_CONFIGURED',
    );
    this.name = 'UnsupportedStorageError';
  }
}

/**
 * Default fallback storage provider that cleanly communicates the infrastructure gap
 * without failing silently, falling back to base64, or writing ephemeral files.
 */
export class UnsupportedFileStorageProvider implements FileStorageProvider {
  readonly name = 'unsupported-storage';

  async put(_params: FileStoragePutParams): Promise<FileStorageResult> {
    throw new UnsupportedStorageError('File upload');
  }

  async get(_path: string): Promise<{ data: Uint8Array; contentType: string } | null> {
    throw new UnsupportedStorageError('File retrieval');
  }

  async delete(_path: string): Promise<boolean> {
    throw new UnsupportedStorageError('File deletion');
  }

  async getUrl(_path: string): Promise<string> {
    throw new UnsupportedStorageError('File URL generation');
  }
}

/**
 * Local filesystem storage provider for development or deployments with mounted persistent volumes.
 */
export class LocalStorageProvider implements FileStorageProvider {
  readonly name = 'local-storage';
  readonly rootDir: string;
  readonly publicBaseUrl: string;

  constructor(options: { rootDir?: string; publicBaseUrl?: string } = {}) {
    this.rootDir = path.resolve(options.rootDir || process.env.STORAGE_LOCAL_DIR || './uploads');
    this.publicBaseUrl = (options.publicBaseUrl || '/api/v1/platform/media').replace(/\/+$/, '');
  }

  private resolveSafePath(relPath: string): string {
    const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const absolute = path.resolve(this.rootDir, normalized);
    if (!absolute.startsWith(this.rootDir)) {
      throw new Error(`Invalid storage path traversal: ${relPath}`);
    }
    return absolute;
  }

  async put(params: FileStoragePutParams): Promise<FileStorageResult> {
    const fullPath = this.resolveSafePath(params.path);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, params.data);
    const key = params.path.replace(/\\/g, '/');
    return {
      key,
      publicUrl: `${this.publicBaseUrl}/${key}`,
      sizeBytes: params.data.byteLength,
    };
  }

  async get(relPath: string): Promise<{ data: Uint8Array; contentType: string } | null> {
    const fullPath = this.resolveSafePath(relPath);
    if (!existsSync(fullPath)) return null;
    const data = await fs.readFile(fullPath);
    return { data, contentType: 'application/octet-stream' };
  }

  async delete(relPath: string): Promise<boolean> {
    const fullPath = this.resolveSafePath(relPath);
    try {
      if (existsSync(fullPath)) {
        await fs.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getUrl(relPath: string): Promise<string> {
    const key = relPath.replace(/\\/g, '/');
    return `${this.publicBaseUrl}/${key}`;
  }
}

export const defaultFileStorageProvider = new UnsupportedFileStorageProvider();

let activeStorageProvider: FileStorageProvider | null = null;

export function getStorageProvider(): FileStorageProvider {
  if (activeStorageProvider) {
    return activeStorageProvider;
  }
  const configured = (process.env.STORAGE_PROVIDER || '').trim().toLowerCase();
  if (configured === 'local') {
    activeStorageProvider = new LocalStorageProvider();
    return activeStorageProvider;
  }
  return defaultFileStorageProvider;
}

export function setStorageProvider(provider: FileStorageProvider | null): void {
  activeStorageProvider = provider;
}

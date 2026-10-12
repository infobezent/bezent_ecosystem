/**
 * BEZENT Common Data Engine - File Validation & Storage Contracts
 */

export interface ImageDimensionRules {
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  /**
   * Expected aspect ratio (width / height) with allowed tolerance margin.
   * e.g. ratio 1:1 -> { width: 1, height: 1, tolerance: 0.05 }
   * e.g. ratio 3:1 -> { width: 3, height: 1, tolerance: 0.1 }
   */
  readonly aspectRatio?: {
    readonly width: number;
    readonly height: number;
    readonly tolerance?: number;
  };
}

export interface FileValidationPolicy {
  readonly name: string;
  readonly allowedMimeTypes: readonly string[];
  readonly allowedExtensions: readonly string[];
  readonly maxSizeBytes: number;
  readonly imageDimensions?: ImageDimensionRules;
}

export interface FileMetadataInput {
  readonly name: string;
  readonly size: number;
  readonly mimeType?: string;
  readonly width?: number;
  readonly height?: number;
  readonly data?: Uint8Array | Buffer;
}

export interface FileMetadata {
  readonly originalName: string;
  readonly sanitizedName: string;
  readonly extension: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly width?: number;
  readonly height?: number;
  readonly checksum?: string;
}

export interface FileValidationResult {
  readonly isValid: boolean;
  readonly metadata?: FileMetadata;
  readonly errors: readonly string[];
}

export interface FileStoragePutParams {
  readonly path: string;
  readonly data: Uint8Array | Buffer;
  readonly contentType: string;
  readonly metadata?: Record<string, string>;
}

export interface FileStorageResult {
  readonly key: string;
  readonly publicUrl?: string;
  readonly sizeBytes: number;
}

/**
 * Storage provider contract.
 * Note: concrete production implementation (e.g. S3, GCS) is pending.
 */
export interface FileStorageProvider {
  readonly name: string;
  put(params: FileStoragePutParams): Promise<FileStorageResult>;
  get(path: string): Promise<{ data: Uint8Array; contentType: string } | null>;
  delete(path: string): Promise<boolean>;
  getUrl(path: string): Promise<string>;
}

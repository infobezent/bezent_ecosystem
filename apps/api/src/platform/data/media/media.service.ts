/**
 * BEZENT Common Data Engine - Media & Branding Service
 */

import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { tenants, companies } from '../../../db/schema.js';
import { generateSurrogateId } from '../../auth/security.js';
import { ValidationError, NotFoundError } from '../../../app/errors/AppError.js';
import {
  validateFile,
  TENANT_LOGO_POLICY,
  TENANT_BANNER_POLICY,
  COMPANY_LOGO_POLICY,
  type FileStorageProvider,
  getStorageProvider,
} from '../files/index.js';
import { mediaAssetRepository, MediaAssetRepository } from './mediaAsset.repository.js';

export interface UploadFileInput {
  readonly filename: string;
  readonly mimeType: string;
  readonly data: Buffer | Uint8Array;
  readonly width?: number;
  readonly height?: number;
}

export interface MediaUploadResult {
  readonly assetId: string;
  readonly url: string;
  readonly key: string;
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export type CompanyBrandingMode = 'own_logo' | 'tenant_logo' | 'initials';

export class MediaService {
  constructor(
    private readonly mediaAssetRepo: MediaAssetRepository = mediaAssetRepository,
    private readonly storageProviderGetter: () => FileStorageProvider = getStorageProvider,
  ) {}

  private get storageProvider(): FileStorageProvider {
    return this.storageProviderGetter();
  }

  // =========================================================================
  // 1. TENANT LOGO
  // =========================================================================

  async uploadTenantLogo(
    tenantId: string,
    file: UploadFileInput,
    userId?: string,
  ): Promise<MediaUploadResult> {
    const db = getDb();
    const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenantRows[0]) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    // 1. Validate against policy
    const validResult = validateFile(
      {
        name: file.filename,
        size: file.data.byteLength,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        data: file.data,
      },
      TENANT_LOGO_POLICY,
    );

    if (!validResult.isValid || !validResult.metadata) {
      throw new ValidationError(
        validResult.errors[0] || 'File does not satisfy tenant logo policy',
        { errors: validResult.errors.join('; ') },
      );
    }

    // 2. Generate safe server-controlled storage key
    const assetId = generateSurrogateId('med');
    const ext = validResult.metadata.extension || '.png';
    const storageKey = `tenants/${tenantId}/tenant/logo/${assetId}${ext}`;

    // 3. Store file with storage provider
    const storageRes = await this.storageProvider.put({
      path: storageKey,
      data: file.data,
      contentType: validResult.metadata.mimeType,
    });

    const publicUrl = storageRes.publicUrl || (await this.storageProvider.getUrl(storageKey));

    try {
      // 4. Record metadata
      await this.mediaAssetRepo.create({
        id: assetId,
        tenantId,
        ownerType: 'tenant',
        ownerId: tenantId,
        assetType: 'tenant_logo',
        storageProvider: this.storageProvider.name,
        storageKey: storageRes.key,
        originalFilename: validResult.metadata.originalName,
        mimeType: validResult.metadata.mimeType,
        sizeBytes: validResult.metadata.sizeBytes,
        width: validResult.metadata.width ?? null,
        height: validResult.metadata.height ?? null,
        status: 'active',
        createdBy: userId ?? null,
      });

      // 5. Update tenant branding pointer
      await db.update(tenants).set({ logoUrl: publicUrl }).where(eq(tenants.id, tenantId));

      // 6. Archive previous active logo assets
      const previousAssets = await this.mediaAssetRepo.findActiveByOwnerAndType(
        tenantId,
        'tenant',
        tenantId,
        'tenant_logo',
      );
      for (const prev of previousAssets) {
        if (prev.id !== assetId) {
          await this.mediaAssetRepo.updateStatus(prev.id, 'archived');
          // Safely delete older blob from storage without failing caller
          this.storageProvider.delete(prev.storageKey).catch(() => {});
        }
      }

      return {
        assetId,
        url: publicUrl,
        key: storageRes.key,
        originalFilename: validResult.metadata.originalName,
        mimeType: validResult.metadata.mimeType,
        sizeBytes: validResult.metadata.sizeBytes,
      };
    } catch (err) {
      // Rollback newly uploaded blob if DB persistence failed
      await this.storageProvider.delete(storageKey).catch(() => {});
      throw err;
    }
  }

  async removeTenantLogo(tenantId: string): Promise<void> {
    const db = getDb();
    const previousAssets = await this.mediaAssetRepo.findActiveByOwnerAndType(
      tenantId,
      'tenant',
      tenantId,
      'tenant_logo',
    );
    for (const prev of previousAssets) {
      await this.mediaAssetRepo.updateStatus(prev.id, 'deleted');
      this.storageProvider.delete(prev.storageKey).catch(() => {});
    }
    await db.update(tenants).set({ logoUrl: null }).where(eq(tenants.id, tenantId));
  }

  // =========================================================================
  // 2. TENANT BANNER
  // =========================================================================

  async uploadTenantBanner(
    tenantId: string,
    file: UploadFileInput,
    userId?: string,
  ): Promise<MediaUploadResult> {
    const db = getDb();
    const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenantRows[0]) {
      throw new NotFoundError(`Tenant '${tenantId}' not found`);
    }

    const validResult = validateFile(
      {
        name: file.filename,
        size: file.data.byteLength,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        data: file.data,
      },
      TENANT_BANNER_POLICY,
    );

    if (!validResult.isValid || !validResult.metadata) {
      throw new ValidationError(
        validResult.errors[0] || 'File does not satisfy tenant banner policy',
        { errors: validResult.errors.join('; ') },
      );
    }

    const assetId = generateSurrogateId('med');
    const ext = validResult.metadata.extension || '.png';
    const storageKey = `tenants/${tenantId}/tenant/banner/${assetId}${ext}`;

    const storageRes = await this.storageProvider.put({
      path: storageKey,
      data: file.data,
      contentType: validResult.metadata.mimeType,
    });

    const publicUrl = storageRes.publicUrl || (await this.storageProvider.getUrl(storageKey));

    try {
      await this.mediaAssetRepo.create({
        id: assetId,
        tenantId,
        ownerType: 'tenant',
        ownerId: tenantId,
        assetType: 'tenant_banner',
        storageProvider: this.storageProvider.name,
        storageKey: storageRes.key,
        originalFilename: validResult.metadata.originalName,
        mimeType: validResult.metadata.mimeType,
        sizeBytes: validResult.metadata.sizeBytes,
        width: validResult.metadata.width ?? null,
        height: validResult.metadata.height ?? null,
        status: 'active',
        createdBy: userId ?? null,
      });

      await db.update(tenants).set({ bannerUrl: publicUrl }).where(eq(tenants.id, tenantId));

      const previousAssets = await this.mediaAssetRepo.findActiveByOwnerAndType(
        tenantId,
        'tenant',
        tenantId,
        'tenant_banner',
      );
      for (const prev of previousAssets) {
        if (prev.id !== assetId) {
          await this.mediaAssetRepo.updateStatus(prev.id, 'archived');
          this.storageProvider.delete(prev.storageKey).catch(() => {});
        }
      }

      return {
        assetId,
        url: publicUrl,
        key: storageRes.key,
        originalFilename: validResult.metadata.originalName,
        mimeType: validResult.metadata.mimeType,
        sizeBytes: validResult.metadata.sizeBytes,
      };
    } catch (err) {
      await this.storageProvider.delete(storageKey).catch(() => {});
      throw err;
    }
  }

  async removeTenantBanner(tenantId: string): Promise<void> {
    const db = getDb();
    const previousAssets = await this.mediaAssetRepo.findActiveByOwnerAndType(
      tenantId,
      'tenant',
      tenantId,
      'tenant_banner',
    );
    for (const prev of previousAssets) {
      await this.mediaAssetRepo.updateStatus(prev.id, 'deleted');
      this.storageProvider.delete(prev.storageKey).catch(() => {});
    }
    await db.update(tenants).set({ bannerUrl: null }).where(eq(tenants.id, tenantId));
  }

  // =========================================================================
  // 3. COMPANY LOGO
  // =========================================================================

  async uploadCompanyLogo(
    tenantId: string,
    companyId: string,
    file: UploadFileInput,
    userId?: string,
  ): Promise<MediaUploadResult> {
    const db = getDb();
    const compRows = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)));

    if (!compRows[0]) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const validResult = validateFile(
      {
        name: file.filename,
        size: file.data.byteLength,
        mimeType: file.mimeType,
        width: file.width,
        height: file.height,
        data: file.data,
      },
      COMPANY_LOGO_POLICY,
    );

    if (!validResult.isValid || !validResult.metadata) {
      throw new ValidationError(
        validResult.errors[0] || 'File does not satisfy company logo policy',
        { errors: validResult.errors.join('; ') },
      );
    }

    const assetId = generateSurrogateId('med');
    const ext = validResult.metadata.extension || '.png';
    const storageKey = `tenants/${tenantId}/companies/${companyId}/logo/${assetId}${ext}`;

    const storageRes = await this.storageProvider.put({
      path: storageKey,
      data: file.data,
      contentType: validResult.metadata.mimeType,
    });

    const publicUrl = storageRes.publicUrl || (await this.storageProvider.getUrl(storageKey));

    try {
      await this.mediaAssetRepo.create({
        id: assetId,
        tenantId,
        ownerType: 'company',
        ownerId: companyId,
        assetType: 'company_logo',
        storageProvider: this.storageProvider.name,
        storageKey: storageRes.key,
        originalFilename: validResult.metadata.originalName,
        mimeType: validResult.metadata.mimeType,
        sizeBytes: validResult.metadata.sizeBytes,
        width: validResult.metadata.width ?? null,
        height: validResult.metadata.height ?? null,
        status: 'active',
        createdBy: userId ?? null,
      });

      await db
        .update(companies)
        .set({
          logoUrl: publicUrl,
          brandingMode: 'own_logo',
        })
        .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)));

      const previousAssets = await this.mediaAssetRepo.findActiveByOwnerAndType(
        tenantId,
        'company',
        companyId,
        'company_logo',
      );
      for (const prev of previousAssets) {
        if (prev.id !== assetId) {
          await this.mediaAssetRepo.updateStatus(prev.id, 'archived');
          this.storageProvider.delete(prev.storageKey).catch(() => {});
        }
      }

      return {
        assetId,
        url: publicUrl,
        key: storageRes.key,
        originalFilename: validResult.metadata.originalName,
        mimeType: validResult.metadata.mimeType,
        sizeBytes: validResult.metadata.sizeBytes,
      };
    } catch (err) {
      await this.storageProvider.delete(storageKey).catch(() => {});
      throw err;
    }
  }

  async removeCompanyLogo(tenantId: string, companyId: string): Promise<void> {
    const db = getDb();
    const compRows = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)));

    if (!compRows[0]) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    const previousAssets = await this.mediaAssetRepo.findActiveByOwnerAndType(
      tenantId,
      'company',
      companyId,
      'company_logo',
    );
    for (const prev of previousAssets) {
      await this.mediaAssetRepo.updateStatus(prev.id, 'deleted');
      this.storageProvider.delete(prev.storageKey).catch(() => {});
    }

    await db
      .update(companies)
      .set({
        logoUrl: null,
        brandingMode: 'initials',
      })
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)));
  }

  // =========================================================================
  // 4. COMPANY BRANDING MODE SWITCH
  // =========================================================================

  async updateCompanyBranding(
    tenantId: string,
    companyId: string,
    mode: CompanyBrandingMode,
  ): Promise<{ brandingMode: CompanyBrandingMode; logoUrl: string | null }> {
    const db = getDb();
    const compRows = await db
      .select()
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)));

    if (!compRows[0]) {
      throw new NotFoundError(`Company '${companyId}' not found in this tenant`);
    }

    let resolvedLogoUrl: string | null = null;

    if (mode === 'tenant_logo') {
      // Find tenant's current logoUrl
      const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      resolvedLogoUrl = tenantRows[0]?.logoUrl ?? null;
    } else if (mode === 'own_logo') {
      // Find company's active own logo
      const activeOwn = await this.mediaAssetRepo.findActiveByOwnerAndType(
        tenantId,
        'company',
        companyId,
        'company_logo',
      );
      if (activeOwn[0]) {
        resolvedLogoUrl = await this.storageProvider.getUrl(activeOwn[0].storageKey);
      } else {
        throw new ValidationError('Company does not have an uploaded logo. Please upload one first.');
      }
    } else {
      // 'initials'
      resolvedLogoUrl = null;
    }

    await db
      .update(companies)
      .set({
        brandingMode: mode,
        logoUrl: resolvedLogoUrl,
      })
      .where(and(eq(companies.id, companyId), eq(companies.tenantId, tenantId)));

    return {
      brandingMode: mode,
      logoUrl: resolvedLogoUrl,
    };
  }
}

export const mediaService = new MediaService();

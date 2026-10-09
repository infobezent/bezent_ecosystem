import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../db/connection.js';
import { mediaAssets, type MediaAsset, type NewMediaAsset } from '../../../db/schema.js';

export class MediaAssetRepository {
  async create(data: NewMediaAsset): Promise<MediaAsset> {
    const db = getDb();
    await db.insert(mediaAssets).values(data);
    const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, data.id));
    return rows[0]!;
  }

  async findById(id: string): Promise<MediaAsset | null> {
    const db = getDb();
    const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
    return rows[0] || null;
  }

  async findActiveByOwnerAndType(
    tenantId: string,
    ownerType: 'tenant' | 'company',
    ownerId: string,
    assetType: 'tenant_logo' | 'tenant_banner' | 'company_logo',
  ): Promise<MediaAsset[]> {
    const db = getDb();
    return db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.tenantId, tenantId),
          eq(mediaAssets.ownerType, ownerType),
          eq(mediaAssets.ownerId, ownerId),
          eq(mediaAssets.assetType, assetType),
          eq(mediaAssets.status, 'active'),
        ),
      );
  }

  async updateStatus(id: string, status: 'active' | 'archived' | 'deleted'): Promise<void> {
    const db = getDb();
    await db.update(mediaAssets).set({ status }).where(eq(mediaAssets.id, id));
  }

  async archivePreviousAssets(
    tenantId: string,
    ownerType: 'tenant' | 'company',
    ownerId: string,
    assetType: 'tenant_logo' | 'tenant_banner' | 'company_logo',
  ): Promise<MediaAsset[]> {
    const db = getDb();
    const activeRows = await this.findActiveByOwnerAndType(tenantId, ownerType, ownerId, assetType);
    if (activeRows.length > 0) {
      for (const row of activeRows) {
        await db.update(mediaAssets).set({ status: 'archived' }).where(eq(mediaAssets.id, row.id));
      }
    }
    return activeRows;
  }
}

export const mediaAssetRepository = new MediaAssetRepository();

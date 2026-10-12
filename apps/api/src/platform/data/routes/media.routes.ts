import { Router, type Request, type Response } from 'express';
import { getStorageProvider } from '../files/fileStorage.js';

export const mediaRouter = Router();

/**
 * GET /api/v1/platform/media/*
 * Serves media files when local storage provider is active.
 */
mediaRouter.get('/*', async (req: Request, res: Response) => {
  try {
    const rawPath = req.params[0] || '';
    if (!rawPath || rawPath.includes('..')) {
      res.status(400).json({ error: 'Invalid media path' });
      return;
    }

    const provider = getStorageProvider();
    const result = await provider.get(rawPath);
    if (!result) {
      res.status(404).json({ error: 'Media asset not found' });
      return;
    }

    // Determine content type from path extension
    let contentType = result.contentType;
    if (rawPath.endsWith('.png')) contentType = 'image/png';
    else if (rawPath.endsWith('.jpg') || rawPath.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (rawPath.endsWith('.webp')) contentType = 'image/webp';
    else if (rawPath.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (rawPath.endsWith('.pdf')) contentType = 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
    res.send(Buffer.from(result.data));
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode || 500;
    const message = err instanceof Error ? err.message : 'Media retrieval failed';
    res.status(status).json({ error: message });
  }
});

import { Router } from 'express';
import { isDatabaseConfigured, pingDatabase } from '../../db/connection.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const database = isDatabaseConfigured
    ? { configured: true, connected: await pingDatabase() }
    : { configured: false, connected: false };

  res.status(200).json({
    status: 'ok',
    service: 'bezent-api',
    timestamp: new Date().toISOString(),
    database,
  });
});

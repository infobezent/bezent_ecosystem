import { Router } from 'express';
import { isDatabaseConfigured, pingDatabase } from '../../db/connection.js';

export const healthRouter = Router();

/**
 * General application health (backward compatible with existing test suite).
 */
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

/**
 * Liveness probe: returns 200 if the HTTP process is alive.
 */
healthRouter.get('/health/live', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'bezent-api',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: returns 200 if API can serve DB-dependent requests,
 * or 503 if required database dependency is unreachable.
 */
healthRouter.get('/health/ready', async (_req, res) => {
  if (!isDatabaseConfigured) {
    res.status(503).json({
      status: 'unavailable',
      service: 'bezent-api',
      timestamp: new Date().toISOString(),
      database: { configured: false, connected: false },
    });
    return;
  }

  const isConnected = await pingDatabase();
  if (!isConnected) {
    res.status(503).json({
      status: 'unavailable',
      service: 'bezent-api',
      timestamp: new Date().toISOString(),
      database: { configured: true, connected: false },
    });
    return;
  }

  res.status(200).json({
    status: 'ready',
    service: 'bezent-api',
    timestamp: new Date().toISOString(),
    database: { configured: true, connected: true },
  });
});

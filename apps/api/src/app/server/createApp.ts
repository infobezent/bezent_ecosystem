import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './health.route.js';
import { notFoundHandler } from '../middleware/notFound.js';
import { errorHandler } from '../errors/errorHandler.js';

/**
 * Builds the Express application. Kept separate from `main.ts` so it can be
 * imported directly in tests without binding a port.
 *
 * Module routers (e.g. HRMS) are mounted under /api/v1 here as they are
 * introduced. None exist yet in Phase 0.
 */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.use('/api/v1', healthRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

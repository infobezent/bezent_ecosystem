import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './health.route.js';
import { notFoundHandler } from '../middleware/notFound.js';
import { errorHandler } from '../errors/errorHandler.js';
import { contextRouter, devContextMiddleware } from '../../platform/context/devContext.js';
import { organizationRouter } from '../../applications/hrms/organization/routes/organization.route.js';
import { onboardingRouter } from '../../applications/hrms/onboarding/routes/onboarding.route.js';
import { onboardingSettingsRouter } from '../../applications/hrms/settings/onboarding/routes/settings.route.js';
import { employeeRouter } from '../../applications/hrms/employees/routes/employee.route.js';
import { employeeActionRouter } from '../../applications/hrms/employee-administration/routes/employeeAction.route.js';
import { employeeDocumentRouter } from '../../applications/hrms/documents/routes/employeeDocument.route.js';

/**
 * Builds the Express application. Kept separate from `main.ts` so it can be
 * imported directly in tests without binding a port.
 *
 * Module routers (e.g. HRMS) and Platform capabilities are mounted under /api/v1.
 */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // Development context middleware (Milestone 1)
  app.use(devContextMiddleware);

  // Platform & Domain routers under /api/v1
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', contextRouter);
  app.use('/api/v1', organizationRouter);
  app.use('/api/v1', onboardingRouter);
  app.use('/api/v1', onboardingSettingsRouter);
  app.use('/api/v1', employeeRouter);
  app.use('/api/v1', employeeActionRouter);
  app.use('/api/v1', employeeDocumentRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

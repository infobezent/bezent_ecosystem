import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './health.route.js';
import { notFoundHandler } from '../middleware/notFound.js';
import { errorHandler } from '../errors/errorHandler.js';
import { organizationRouter } from '../../applications/hrms/organization/routes/organization.route.js';
import { onboardingRouter } from '../../applications/hrms/onboarding/routes/onboarding.route.js';
import { onboardingSettingsRouter } from '../../applications/hrms/settings/onboarding/routes/settings.route.js';
import { employeeRouter } from '../../applications/hrms/employees/routes/employee.route.js';
import { employeeActionRouter } from '../../applications/hrms/employee-administration/routes/employeeAction.route.js';
import { employeeDocumentRouter } from '../../applications/hrms/documents/routes/employeeDocument.route.js';
import { formsRouter } from '../../applications/hrms/settings/forms/routes/forms.route.js';
import { platformRouter } from '../../platform/routes.js';
import { companyAdminRouter } from '../../platform/company-admin/routes/companyAdmin.routes.js';
import { essRouter } from '../../applications/hrms/ess/routes/ess.routes.js';
import { requirePlatformAuth } from '../../platform/auth/middleware/auth.middleware.js';
import { requireApplicationAccess } from '../../platform/access/middleware/access.middleware.js';

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

  // Platform & Domain routers under /api/v1
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/platform', platformRouter);
  app.use('/api/v1/company-admin', companyAdminRouter);
  app.use('/api/v1/ess', essRouter);

  // HRMS administrative API (ADR-017 / ADR-018): every request needs a valid
  // session, a server-verified company (X-Company-Id is only a claim), an
  // HRMS entitlement and the HRMS workspace; routes add their own permission.
  // req.companyContext is the ONLY tenant/company source for HRMS controllers.
  app.use('/api/v1/hrms', requirePlatformAuth, requireApplicationAccess('hrms', 'hrms'));

  app.use('/api/v1', organizationRouter);
  app.use('/api/v1', onboardingRouter);
  app.use('/api/v1', onboardingSettingsRouter);
  app.use('/api/v1', employeeRouter);
  app.use('/api/v1', employeeActionRouter);
  app.use('/api/v1', employeeDocumentRouter);
  app.use('/api/v1', formsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

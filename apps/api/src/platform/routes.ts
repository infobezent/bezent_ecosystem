import { Router } from 'express';
import { authRouter } from './auth/routes/auth.routes.js';
import { dashboardRouter } from './dashboard/routes/dashboard.routes.js';
import { tenantRouter } from './tenants/routes/tenant.routes.js';
import { companyRouter } from './companies/routes/company.routes.js';
import { provisioningRouter } from './provisioning/routes/provisioning.routes.js';
import { companyAdminRouter } from './company-admins/routes/companyAdmin.routes.js';
import { moduleRouter } from './modules/routes/module.routes.js';
import { userRouter } from './users/routes/user.routes.js';
import { auditRouter } from './audit/routes/audit.routes.js';

export const platformRouter = Router();

platformRouter.use(authRouter);
platformRouter.use(dashboardRouter);
platformRouter.use(tenantRouter);
platformRouter.use(companyRouter);
platformRouter.use(provisioningRouter);
platformRouter.use(companyAdminRouter);
platformRouter.use(moduleRouter);
platformRouter.use(userRouter);
platformRouter.use(auditRouter);

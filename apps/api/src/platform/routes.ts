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
import { accessRouter } from './access/routes/access.routes.js';
import { governanceRouter } from './governance/routes/governance.routes.js';
import { platformTenantAdminRouter } from '../administration/tenant-admin/routes/platformTenantAdmin.routes.js';
import { referenceRouter } from './data/routes/reference.routes.js';
import { mediaRouter } from './data/routes/media.routes.js';
import { planRouter } from './plans/routes/plan.routes.js';
import { subscriptionRouter } from './subscriptions/routes/subscription.routes.js';
import { entitlementRouter } from './entitlements/routes/entitlement.routes.js';

export const platformRouter = Router();

platformRouter.use('/reference', referenceRouter);
platformRouter.use('/media', mediaRouter);
platformRouter.use(authRouter);
// Mounted before the Super Admin routers: several of them apply
// requireSuperAdmin to every request that reaches them.
platformRouter.use(accessRouter);
platformRouter.use(dashboardRouter);
platformRouter.use(tenantRouter);
platformRouter.use(planRouter);
platformRouter.use(subscriptionRouter);
platformRouter.use(entitlementRouter);
platformRouter.use(companyRouter);
platformRouter.use(provisioningRouter);
platformRouter.use(companyAdminRouter);
platformRouter.use(platformTenantAdminRouter);
platformRouter.use(moduleRouter);
platformRouter.use(userRouter);
platformRouter.use(auditRouter);
platformRouter.use(governanceRouter);

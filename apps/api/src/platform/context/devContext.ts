import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';

/**
 * TEMPORARY DEVELOPMENT APPLICATION CONTEXT
 *
 * Provides a centralized development company context for pre-authentication development.
 * Represents unrestricted development access to the BEZENT application.
 *
 * This temporary development context will be replaced in future phases by:
 * Authenticated User -> Tenant / Company Membership -> Role -> Permissions -> Application / Module Access.
 *
 * DO NOT use role or persona checks to determine application business behavior.
 * DO NOT hardcode companyId or tenantId outside this platform context module.
 */
export interface DevContext {
  tenantId: string;
  companyId: string;
  companyName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      devContext?: DevContext;
    }
  }
}

const DEFAULT_DEV_CONTEXT: DevContext = {
  tenantId: 'tenant_demo_01',
  companyId: 'comp_demo_01',
  companyName: 'BEZENT Demo Pvt Ltd',
};

export function getDevContext(): DevContext {
  return DEFAULT_DEV_CONTEXT;
}

export function devContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  const headerCompanyId = req.headers['x-company-id'];
  const headerTenantId = req.headers['x-tenant-id'];

  if (typeof headerCompanyId === 'string' && headerCompanyId.trim()) {
    req.devContext = {
      tenantId:
        typeof headerTenantId === 'string' && headerTenantId.trim()
          ? headerTenantId.trim()
          : DEFAULT_DEV_CONTEXT.tenantId,
      companyId: headerCompanyId.trim(),
      companyName: `Company ${headerCompanyId.trim()}`,
    };
  } else {
    req.devContext = getDevContext();
  }
  next();
}

export const contextRouter = Router();

contextRouter.get('/context', (_req: Request, res: Response) => {
  res.json({
    data: getDevContext(),
  });
});

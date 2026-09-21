import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';

/**
 * TEMPORARY DEVELOPMENT CONTEXT
 *
 * Provides a centralized development company and user context for Milestone 1.
 * Clearly marked as temporary: will be superseded in future phases by
 * authenticated sessions, tenant resolution middleware, and full RBAC.
 *
 * DO NOT hardcode companyId or tenantId outside this platform context module.
 */
export interface DevContext {
  tenantId: string;
  companyId: string;
  companyName: string;
  userId: string;
  role: string;
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
  userId: 'user_dev_01',
  role: 'HR',
};

export function getDevContext(): DevContext {
  return DEFAULT_DEV_CONTEXT;
}

export function devContextMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.devContext = getDevContext();
  next();
}

export const contextRouter = Router();

contextRouter.get('/context', (_req: Request, res: Response) => {
  res.json({
    data: getDevContext(),
  });
});

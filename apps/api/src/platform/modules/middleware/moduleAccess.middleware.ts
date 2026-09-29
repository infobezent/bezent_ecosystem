import type { Request, Response, NextFunction } from 'express';
import { moduleService } from '../service/module.service.js';
import { ForbiddenError } from '../../../app/errors/AppError.js';
import { isDatabaseConfigured } from '../../../db/connection.js';
import type { ModuleCode } from '../types/module.types.js';

export function requireModuleAccess(moduleCode: ModuleCode) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!isDatabaseConfigured) {
        return next();
      }

      const tenantId = req.devContext?.tenantId || (req.headers['x-tenant-id'] as string);
      const companyId = req.devContext?.companyId || (req.headers['x-company-id'] as string);

      if (!tenantId) {
        return next();
      }

      const isEnabled = await moduleService.isModuleEnabled(tenantId, moduleCode, companyId);
      if (!isEnabled) {
        throw new ForbiddenError(
          `Module '${moduleCode}' is not enabled for tenant '${tenantId}'`,
          'MODULE_DISABLED',
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

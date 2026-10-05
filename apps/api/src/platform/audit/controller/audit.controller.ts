import type { Request, Response, NextFunction } from 'express';
import { auditService, AuditService } from '../service/audit.service.js';

export class AuditController {
  constructor(private readonly service: AuditService = auditService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { action, targetType, targetId, tenantId, companyId, page, limit } = req.query;
      const result = await this.service.getLogs({
        action: typeof action === 'string' ? action : undefined,
        targetType: typeof targetType === 'string' ? targetType : undefined,
        targetId: typeof targetId === 'string' ? targetId : undefined,
        tenantId: typeof tenantId === 'string' ? tenantId : undefined,
        companyId: typeof companyId === 'string' ? companyId : undefined,
        page: typeof page === 'string' ? parseInt(page, 10) : 1,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 20,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const auditController = new AuditController();

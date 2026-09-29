import type { Request, Response, NextFunction } from 'express';
import { platformUserService, PlatformUserService } from '../service/user.service.js';
import { validateCreateUser } from '../validation/user.schema.js';
import type { UserAccountStatus } from '../types/user.types.js';

export class PlatformUserController {
  constructor(private readonly service: PlatformUserService = platformUserService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, tenantId, companyId, status, page, limit } = req.query;
      const result = await this.service.listUsers({
        search: typeof search === 'string' ? search : undefined,
        tenantId: typeof tenantId === 'string' ? tenantId : undefined,
        companyId: typeof companyId === 'string' ? companyId : undefined,
        status: typeof status === 'string' ? (status as UserAccountStatus) : undefined,
        page: typeof page === 'string' ? parseInt(page, 10) : 1,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 20,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const result = await this.service.getUserById(id);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validateCreateUser(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.createUser(dto, actor);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const { status } = req.body;
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.updateStatus(id, status as UserAccountStatus, actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const { isSuperAdmin } = req.body;
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.updateRole(id, Boolean(isSuperAdmin), actor);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };
}

export const platformUserController = new PlatformUserController();

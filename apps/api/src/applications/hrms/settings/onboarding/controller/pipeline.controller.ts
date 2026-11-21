import type { Request, Response, NextFunction } from 'express';
import { PipelineService } from '../service/pipeline.service.js';
import { BadRequestError } from '../../../../../app/errors/AppError.js';

export class PipelineController {
  constructor(private readonly service = new PipelineService()) {}

  private getTenantAndCompany(req: Request): { tenantId: string; companyId: string } {
    const tenantId =
      (req.headers['x-tenant-id'] as string) || (req as unknown as { tenantId?: string }).tenantId;
    const companyId =
      (req.headers['x-company-id'] as string) ||
      (req as unknown as { companyId?: string }).companyId;

    if (!tenantId || !companyId) {
      throw new BadRequestError(
        'Tenant ID and Company ID are required',
        'TENANT_OR_COMPANY_MISSING',
      );
    }

    return { tenantId, companyId };
  }

  listPipelines = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const pipelines = await this.service.listPipelines(tenantId, companyId);
      res.json({ success: true, data: pipelines });
    } catch (err) {
      next(err);
    }
  };

  getPipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const pipelineId = String(req.params.pipelineId);
      const pipeline = await this.service.getPipelineById(tenantId, companyId, pipelineId);
      res.json({ success: true, data: pipeline });
    } catch (err) {
      next(err);
    }
  };

  createPipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const pipeline = await this.service.createPipeline(tenantId, companyId, req.body);
      res.status(201).json({ success: true, data: pipeline });
    } catch (err) {
      next(err);
    }
  };

  updatePipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const pipelineId = String(req.params.pipelineId);
      const pipeline = await this.service.updatePipeline(tenantId, companyId, pipelineId, req.body);
      res.json({ success: true, data: pipeline });
    } catch (err) {
      next(err);
    }
  };

  savePipelineStages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const pipelineId = String(req.params.pipelineId);
      const pipeline = await this.service.savePipelineStages(
        tenantId,
        companyId,
        pipelineId,
        req.body.stages,
      );
      res.json({ success: true, data: pipeline });
    } catch (err) {
      next(err);
    }
  };

  duplicatePipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const pipelineId = String(req.params.pipelineId);
      const pipeline = await this.service.duplicatePipeline(tenantId, companyId, pipelineId);
      res.status(201).json({ success: true, data: pipeline });
    } catch (err) {
      next(err);
    }
  };

  deletePipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const pipelineId = String(req.params.pipelineId);
      await this.service.deletePipeline(tenantId, companyId, pipelineId);
      res.json({ success: true, message: 'Pipeline deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  listAssignmentRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const rules = await this.service.listAssignmentRules(tenantId, companyId);
      res.json({ success: true, data: rules });
    } catch (err) {
      next(err);
    }
  };

  saveAssignmentRules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const rules = await this.service.saveAssignmentRules(
        tenantId,
        companyId,
        req.body.rules || [],
      );
      res.json({ success: true, data: rules });
    } catch (err) {
      next(err);
    }
  };

  resolvePipeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, companyId } = this.getTenantAndCompany(req);
      const pipeline = await this.service.resolvePipelineForCandidate(
        tenantId,
        companyId,
        req.body.candidateAttributes || {},
        req.body.manualPipelineId,
      );
      res.json({ success: true, data: pipeline });
    } catch (err) {
      next(err);
    }
  };
}

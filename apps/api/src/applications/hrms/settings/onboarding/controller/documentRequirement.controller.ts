import type { Request, Response, NextFunction } from 'express';
import { DocumentRequirementService } from '../service/documentRequirement.service.js';
import { BadRequestError } from '../../../../../app/errors/AppError.js';

export class DocumentRequirementController {
  constructor(private readonly service = new DocumentRequirementService()) {}

  private getContext(req: Request) {
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
    return {
      tenantId,
      companyId,
      actor: {
        id: req.user?.id || 'admin_user',
        role: 'hr',
      },
    };
  }

  // ==================== Category Endpoints ====================

  listCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.listCategories(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.createCategory(tenantId, companyId, req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const categoryId = req.params.categoryId as string;
      const data = await this.service.updateCategory(tenantId, companyId, categoryId, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const categoryId = req.params.categoryId as string;
      await this.service.deleteCategory(tenantId, companyId, categoryId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  reorderCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.reorderCategories(tenantId, companyId, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  // ==================== Requirement Endpoints ====================

  listRequirements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.listRequirements(tenantId, companyId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  getRequirement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      const data = await this.service.getRequirementById(tenantId, companyId, id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  createRequirement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.createRequirement(tenantId, companyId, req.body);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  updateRequirement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      const data = await this.service.updateRequirement(tenantId, companyId, id, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  duplicateRequirement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      const data = await this.service.duplicateRequirement(tenantId, companyId, id);
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  deleteRequirement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      await this.service.deleteRequirement(tenantId, companyId, id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  saveApplicability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const id = req.params.id as string;
      const data = await this.service.saveApplicability(tenantId, companyId, id, req.body);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  resolveApplicable = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const data = await this.service.resolveApplicableRequirements(tenantId, companyId, {
        employmentType: req.body?.employmentType,
        departmentId: req.body?.departmentId,
        locationId: req.body?.locationId,
        pipelineId: req.body?.pipelineId,
        stageKey: req.body?.stageKey,
      });
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  // ==================== Candidate Document Workflow Endpoints ====================

  getCandidateDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const caseId = req.params.caseId as string;
      const data = await this.service.getCandidateDocuments(tenantId, companyId, caseId);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  generateCandidateDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = this.getContext(req);
      const caseId = req.params.caseId as string;
      const data = await this.service.generateCandidateDocuments(tenantId, companyId, {
        caseId,
        employmentType: req.body?.employmentType,
        departmentId: req.body?.departmentId,
        locationId: req.body?.locationId,
        pipelineId: req.body?.pipelineId,
        stageKey: req.body?.stageKey,
      });
      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  };

  uploadCandidateDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId, actor } = this.getContext(req);
      const caseId = req.params.caseId as string;
      const docId = req.params.docId as string;
      const data = await this.service.uploadCandidateDocument(
        tenantId,
        companyId,
        caseId,
        docId,
        req.body,
        actor,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  verifyCandidateDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId, actor } = this.getContext(req);
      const caseId = req.params.caseId as string;
      const docId = req.params.docId as string;
      const data = await this.service.verifyCandidateDocument(
        tenantId,
        companyId,
        caseId,
        docId,
        req.body,
        actor,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  requestCandidateReupload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId, actor } = this.getContext(req);
      const caseId = req.params.caseId as string;
      const docId = req.params.docId as string;
      const data = await this.service.requestCandidateReupload(
        tenantId,
        companyId,
        caseId,
        docId,
        req.body,
        actor,
      );
      res.json({ data });
    } catch (err) {
      next(err);
    }
  };
}

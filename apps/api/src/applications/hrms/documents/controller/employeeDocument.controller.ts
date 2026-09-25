import type { Request, Response, NextFunction } from 'express';
import { EmployeeDocumentService } from '../service/employeeDocument.service.js';
import { AppError } from '../../../../app/errors/AppError.js';
import type { DevContext } from '../../../../platform/context/devContext.js';

function requireContext(req: Request): DevContext {
  if (!req.devContext) {
    throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
  }
  return req.devContext;
}

export class EmployeeDocumentController {
  constructor(private readonly service = new EmployeeDocumentService()) {}

  listDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const result = await this.service.listDocuments(
        tenantId,
        companyId,
        req.query as Record<string, unknown>,
      );

      res.json({
        data: result.items,
        pagination: result.pagination,
        counts: result.counts,
      });
    } catch (err) {
      next(err);
    }
  };

  getDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const rawId = req.params.documentId;
      const documentId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!documentId) {
        throw new AppError('Document ID is required', 400, 'VALIDATION_ERROR');
      }

      const document = await this.service.getDocument(tenantId, companyId, documentId);
      res.json({
        data: document,
      });
    } catch (err) {
      next(err);
    }
  };

  createDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, companyId } = requireContext(req);
      const created = await this.service.createDocument(tenantId, companyId, req.body);
      res.status(201).json({
        data: created,
      });
    } catch (err) {
      next(err);
    }
  };
}

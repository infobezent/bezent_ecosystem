import type { Request, Response, NextFunction } from 'express';
import { EmployeeTemplateService } from '../service/employeeTemplate.service.js';
import { EmployeeImportService } from '../service/employeeImport.service.js';
import { AppError, BadRequestError } from '../../../../../app/errors/AppError.js';

export class EmployeeImportController {
  constructor(
    private readonly templateService = new EmployeeTemplateService(),
    private readonly importService = new EmployeeImportService(),
  ) {}

  downloadTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const type = (req.query.type as string) === 'complete' ? 'complete' : 'basic';
      const format = (req.query.format as string) === 'csv' ? 'csv' : 'xlsx';

      if (format === 'csv') {
        const csvContent = await this.templateService.generateCsv(
          companyContext.tenantId,
          companyContext.companyId,
          type,
        );
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="bezent-employee-template-${type}.csv"`,
        );
        return res.send(csvContent);
      }

      const buffer = await this.templateService.generateBuffer(
        companyContext.tenantId,
        companyContext.companyId,
        type,
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="bezent-employee-template-${type}.xlsx"`,
      );
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  };

  validateFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const body = req.body as {
        fileName?: string;
        fileFormat?: 'xlsx' | 'csv';
        fileBase64?: string;
        fileSize?: number;
        options?: {
          skipDuplicates?: boolean;
          sendInvitations?: boolean;
          autoGenerateId?: boolean;
        };
      };

      if (!body.fileName || !body.fileBase64) {
        throw new BadRequestError('Please upload an employee file to continue.');
      }

      const format =
        body.fileFormat || (body.fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx');

      const buffer = Buffer.from(body.fileBase64, 'base64');
      const size = body.fileSize || buffer.length;

      const summary = await this.importService.validateImportFile(
        companyContext.tenantId,
        companyContext.companyId,
        req.user?.id,
        {
          fileName: body.fileName,
          fileFormat: format,
          fileSize: size,
          buffer,
        },
        body.options,
      );

      res.status(200).json({ data: summary });
    } catch (err) {
      next(err);
    }
  };

  processImport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const importId = String(req.params.id);
      if (!importId) {
        throw new BadRequestError('Import ID is required');
      }

      const options = req.body?.options;
      const result = await this.importService.processImport(
        companyContext.tenantId,
        companyContext.companyId,
        req.user?.id,
        importId,
        options,
      );

      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  getImportDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const importId = String(req.params.id);
      const details = await this.importService.getImportDetails(
        companyContext.tenantId,
        companyContext.companyId,
        importId,
      );

      res.json({ data: details });
    } catch (err) {
      next(err);
    }
  };

  listImports = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const imports = await this.importService.listImports(
        companyContext.tenantId,
        companyContext.companyId,
      );

      res.json({ data: imports });
    } catch (err) {
      next(err);
    }
  };

  downloadErrorReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyContext = req.companyContext;
      if (!companyContext) {
        throw new AppError('Context not resolved', 400, 'CONTEXT_MISSING');
      }

      const importId = String(req.params.id);
      const csv = await this.importService.generateErrorReportCsv(
        companyContext.tenantId,
        companyContext.companyId,
        importId,
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="import-error-report-${importId}.csv"`,
      );
      return res.send(csv);
    } catch (err) {
      next(err);
    }
  };
}

import type { Request, Response, NextFunction } from 'express';
import {
  customerProvisioningService,
  CustomerProvisioningService,
} from '../service/provisioning.service.js';
import { validateCustomerProvisioning } from '../validation/provisioning.schema.js';

export class CustomerProvisioningController {
  constructor(
    private readonly service: CustomerProvisioningService = customerProvisioningService,
  ) {}

  validate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validateCustomerProvisioning(req.body);
      const result = await this.service.validatePreflight(dto);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  provision = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = validateCustomerProvisioning(req.body);
      const actor = { id: req.user?.id, email: req.user?.email };
      const result = await this.service.provisionCustomer(dto, actor);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  listJobs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, status, limit } = req.query;
      const { provisioningJobService } = await import('../service/provisioningJob.service.js');
      const jobs = await provisioningJobService.listJobs({
        tenantId: typeof tenantId === 'string' ? tenantId : undefined,
        status: typeof status === 'string' ? status : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 50,
      });
      res.status(200).json({ data: jobs, total: jobs.length });
    } catch (err) {
      next(err);
    }
  };

  getJobById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provisioningJobService } = await import('../service/provisioningJob.service.js');
      const job = await provisioningJobService.getJobById(String(req.params.id));
      res.status(200).json({ data: job });
    } catch (err) {
      next(err);
    }
  };

  retryJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { provisioningJobService } = await import('../service/provisioningJob.service.js');
      const actor = { id: req.user?.id, email: req.user?.email };
      const job = await provisioningJobService.retryJob(String(req.params.id), actor);
      res.status(200).json({ data: job, message: 'Provisioning job reset for retry' });
    } catch (err) {
      next(err);
    }
  };

  getOutboxStatus = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { transactionalOutboxService } = await import('../../outbox/service/transactionalOutbox.service.js');
      const status = await transactionalOutboxService.getStatus();
      res.status(200).json({ data: status });
    } catch (err) {
      next(err);
    }
  };

  getWorkerStatus = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { backgroundWorkerRunner } = await import('../../workers/backgroundWorker.runner.js');
      res.status(200).json({ data: backgroundWorkerRunner.getStatus() });
    } catch (err) {
      next(err);
    }
  };
}

export const customerProvisioningController = new CustomerProvisioningController();

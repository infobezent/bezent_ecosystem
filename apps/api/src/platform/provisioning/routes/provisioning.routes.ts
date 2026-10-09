import { Router } from 'express';
import { customerProvisioningController } from '../controller/provisioning.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const provisioningRouter = Router();

provisioningRouter.use(requirePlatformAuth, requireSuperAdmin);

provisioningRouter.post('/provisioning/validate', customerProvisioningController.validate);
provisioningRouter.post('/provisioning/provision', customerProvisioningController.provision);

// Provisioning jobs & Outbox status
provisioningRouter.get('/provisioning/jobs', customerProvisioningController.listJobs);
provisioningRouter.get('/provisioning/jobs/:id', customerProvisioningController.getJobById);
provisioningRouter.post('/provisioning/jobs/:id/retry', customerProvisioningController.retryJob);
provisioningRouter.get('/provisioning/outbox/status', customerProvisioningController.getOutboxStatus);
provisioningRouter.get('/provisioning/workers/status', customerProvisioningController.getWorkerStatus);

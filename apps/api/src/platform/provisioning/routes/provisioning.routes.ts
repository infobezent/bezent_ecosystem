import { Router } from 'express';
import { customerProvisioningController } from '../controller/provisioning.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const provisioningRouter = Router();

provisioningRouter.use(requirePlatformAuth, requireSuperAdmin);

provisioningRouter.post('/provisioning/validate', customerProvisioningController.validate);
provisioningRouter.post('/provisioning/provision', customerProvisioningController.provision);

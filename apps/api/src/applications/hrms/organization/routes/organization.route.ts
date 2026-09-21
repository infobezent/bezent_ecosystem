import { Router } from 'express';
import { OrganizationController } from '../controller/organization.controller.js';

export const organizationRouter = Router();
const controller = new OrganizationController();

organizationRouter.get('/hrms/organization/masters', controller.getMasters);

import { Router } from 'express';
import { OrganizationController } from '../controller/organization.controller.js';
import { requireAnyPermission } from '../../../../platform/access/middleware/access.middleware.js';

export const organizationRouter = Router();
const controller = new OrganizationController();

// Masters feed every HRMS screen that picks a department/designation/location.
organizationRouter.get(
  '/hrms/organization/masters',
  requireAnyPermission(
    'hrms.organization.read',
    'hrms.employees.read',
    'hrms.employees.create',
    'hrms.onboarding.read',
  ),
  controller.getMasters,
);

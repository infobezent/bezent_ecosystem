import { Router } from 'express';
import { leavePoliciesController } from '../controller/leavePolicies.controller.js';
import { requireReadWrite } from '../../../../platform/access/middleware/access.middleware.js';

export const leavePoliciesRouter = Router();

leavePoliciesRouter.use(
  '/hrms/leave/policies',
  requireReadWrite(
    [
      'hrms.leave.settings.view',
      'hrms.leave.settings.manage',
      'hrms.settings.view',
      'hrms.settings.manage',
      'hrms.leave.view',
    ],
    'hrms.leave.settings.manage',
  ),
);

leavePoliciesRouter.get('/hrms/leave/policies', leavePoliciesController.list);

leavePoliciesRouter.get('/hrms/leave/policies/:id', leavePoliciesController.getById);

leavePoliciesRouter.post('/hrms/leave/policies', leavePoliciesController.create);

leavePoliciesRouter.put('/hrms/leave/policies/:id', leavePoliciesController.update);

leavePoliciesRouter.patch('/hrms/leave/policies/:id/status', leavePoliciesController.changeStatus);

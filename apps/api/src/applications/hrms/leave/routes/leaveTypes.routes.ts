import { Router } from 'express';
import { leaveTypesController } from '../controller/leaveTypes.controller.js';
import { requireReadWrite } from '../../../../platform/access/middleware/access.middleware.js';

export const leaveTypesRouter = Router();

leaveTypesRouter.use(
  '/hrms/leave/types',
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

leaveTypesRouter.get('/hrms/leave/types', leaveTypesController.list);

leaveTypesRouter.get('/hrms/leave/types/:id', leaveTypesController.getById);

leaveTypesRouter.post('/hrms/leave/types', leaveTypesController.create);

leaveTypesRouter.put('/hrms/leave/types/:id', leaveTypesController.update);

leaveTypesRouter.patch('/hrms/leave/types/:id/status', leaveTypesController.changeStatus);

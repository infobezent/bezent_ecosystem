import { Router } from 'express';
import { EmployeeActionController } from '../controller/employeeAction.controller.js';
import { requireReadWrite } from '../../../../platform/access/middleware/access.middleware.js';

export const employeeActionRouter = Router();
const controller = new EmployeeActionController();

// Employment actions change canonical employee records (ADR-017).
employeeActionRouter.use(
  '/hrms/employee-actions',
  requireReadWrite(['hrms.employees.read'], 'hrms.employees.update'),
);

// Employee Administration — employment actions on existing employees
employeeActionRouter.get('/hrms/employee-actions', controller.listActions);
employeeActionRouter.post('/hrms/employee-actions', controller.createAction);
employeeActionRouter.get('/hrms/employee-actions/:actionId', controller.getAction);
employeeActionRouter.patch('/hrms/employee-actions/:actionId', controller.updateAction);
employeeActionRouter.post('/hrms/employee-actions/:actionId/cancel', controller.cancelAction);
employeeActionRouter.post('/hrms/employee-actions/:actionId/apply', controller.applyAction);

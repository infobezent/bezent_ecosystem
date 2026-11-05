import { Router } from 'express';
import { EmployeeImportController } from '../controller/employeeImport.controller.js';
import { requirePermission } from '../../../../../platform/access/middleware/access.middleware.js';

export const employeeImportRouter = Router();
const controller = new EmployeeImportController();

// Template download
employeeImportRouter.get(
  '/hrms/employees/import/template',
  requirePermission('hrms.employees.view'),
  controller.downloadTemplate,
);

// Import history
employeeImportRouter.get(
  '/hrms/employees/import/history',
  requirePermission('hrms.employees.view'),
  controller.listImports,
);

// Validate uploaded file
employeeImportRouter.post(
  '/hrms/employees/import/validate',
  requirePermission('hrms.employees.create'),
  controller.validateFile,
);

// Process validated import batch
employeeImportRouter.post(
  '/hrms/employees/import/:id/process',
  requirePermission('hrms.employees.create'),
  controller.processImport,
);

// Import batch details
employeeImportRouter.get(
  '/hrms/employees/import/:id',
  requirePermission('hrms.employees.view'),
  controller.getImportDetails,
);

// Error report CSV download
employeeImportRouter.get(
  '/hrms/employees/import/:id/error-report',
  requirePermission('hrms.employees.view'),
  controller.downloadErrorReport,
);

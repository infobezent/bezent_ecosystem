import { Router } from 'express';
import { EmployeeDocumentController } from '../controller/employeeDocument.controller.js';
import { requireReadWrite } from '../../../../platform/access/middleware/access.middleware.js';

export const employeeDocumentRouter = Router();
const controller = new EmployeeDocumentController();

// Administrative document access (ADR-017). An employee's own documents are
// served by ESS, which enforces ownership.
employeeDocumentRouter.use(
  '/hrms/employee-documents',
  requireReadWrite(['hrms.documents.read'], 'hrms.documents.manage'),
);

// Documents — canonical employee documents (metadata; no file storage yet)
employeeDocumentRouter.get('/hrms/employee-documents', controller.listDocuments);
employeeDocumentRouter.post('/hrms/employee-documents', controller.createDocument);
employeeDocumentRouter.get('/hrms/employee-documents/:documentId', controller.getDocument);

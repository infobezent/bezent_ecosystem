import { Router } from 'express';
import { EmployeeDocumentController } from '../controller/employeeDocument.controller.js';

export const employeeDocumentRouter = Router();
const controller = new EmployeeDocumentController();

// Documents — canonical employee documents (metadata; no file storage yet)
employeeDocumentRouter.get('/hrms/employee-documents', controller.listDocuments);
employeeDocumentRouter.post('/hrms/employee-documents', controller.createDocument);
employeeDocumentRouter.get('/hrms/employee-documents/:documentId', controller.getDocument);

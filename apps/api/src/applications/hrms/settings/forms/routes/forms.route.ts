import { Router } from 'express';
import { FormsController } from '../controller/forms.controller.js';
import { requireReadWrite } from '../../../../../platform/access/middleware/access.middleware.js';

export const formsRouter = Router();
const controller = new FormsController();

// The resolved form is read by whoever registers employees; editing forms
// requires HR settings authority (ADR-017).
formsRouter.use(
  '/hrms/settings/forms',
  requireReadWrite(
    ['hrms.settings.manage', 'hrms.employees.create', 'hrms.onboarding.manage'],
    'hrms.settings.manage',
  ),
);

// HR Settings → Administration → Forms (Form Engine; see docs/architecture/FORM-ENGINE.md)
// The registry of BEZENT system forms plus this company's own custom forms (for form-picker UIs).
formsRouter.get('/hrms/settings/forms', controller.listForms);
// Creates a new, fully company-defined form shell (sections/fields added afterwards in the builder).
formsRouter.post('/hrms/settings/forms', controller.createForm);
// Resolved definition: system definition + the company's overrides.
formsRouter.get('/hrms/settings/forms/:formKey', controller.getResolvedForm);
// Saves the complete editor state with optimistic concurrency.
formsRouter.put('/hrms/settings/forms/:formKey', controller.saveFormDefinition);
// Publishes current draft configuration as a new immutable version snapshot.
formsRouter.post('/hrms/settings/forms/:formKey/publish', controller.publishForm);
// Retrieves list of immutable published version snapshots.
formsRouter.get('/hrms/settings/forms/:formKey/versions', controller.getFormVersions);
// The company's stored overrides (editable state), and saving allowed changes.
formsRouter.get('/hrms/settings/forms/:formKey/overrides', controller.getOverrides);
formsRouter.put('/hrms/settings/forms/:formKey/overrides', controller.updateOverrides);

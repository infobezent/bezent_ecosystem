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
// Resolved definition: system definition + the company's overrides.
formsRouter.get('/hrms/settings/forms/:formKey', controller.getResolvedForm);
// Saves the complete editor state with optimistic concurrency.
formsRouter.put('/hrms/settings/forms/:formKey', controller.saveFormDefinition);
// The company's stored overrides (editable state), and saving allowed changes.
formsRouter.get('/hrms/settings/forms/:formKey/overrides', controller.getOverrides);
formsRouter.put('/hrms/settings/forms/:formKey/overrides', controller.updateOverrides);

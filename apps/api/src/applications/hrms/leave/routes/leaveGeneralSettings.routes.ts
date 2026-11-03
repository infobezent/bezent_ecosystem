import { Router } from 'express';
import { leaveGeneralSettingsController } from '../controller/leaveGeneralSettings.controller.js';
import { requireReadWrite } from '../../../../platform/access/middleware/access.middleware.js';

export const leaveSettingsRouter = Router();

leaveSettingsRouter.use(
  '/hrms/leave/settings/general',
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

leaveSettingsRouter.get('/hrms/leave/settings/general', leaveGeneralSettingsController.getSettings);

leaveSettingsRouter.post(
  '/hrms/leave/settings/general',
  leaveGeneralSettingsController.updateSettings,
);

leaveSettingsRouter.get(
  '/hrms/leave/settings/general/versions',
  leaveGeneralSettingsController.getVersionHistory,
);

import { Router } from 'express';
import { platformUserController } from '../controller/user.controller.js';
import { requirePlatformAuth, requireSuperAdmin } from '../../auth/middleware/auth.middleware.js';

export const userRouter = Router();

userRouter.use(requirePlatformAuth, requireSuperAdmin);

userRouter.get('/users', platformUserController.list);
userRouter.post('/users', platformUserController.create);
userRouter.get('/users/:id', platformUserController.getById);
userRouter.put('/users/:id/status', platformUserController.updateStatus);
userRouter.put('/users/:id/role', platformUserController.updateRole);

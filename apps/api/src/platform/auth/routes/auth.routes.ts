import { Router } from 'express';
import { authController } from '../controller/auth.controller.js';
import { requirePlatformAuth } from '../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/auth/login', authController.login);
authRouter.post('/auth/logout', requirePlatformAuth, authController.logout);
authRouter.get('/auth/me', requirePlatformAuth, authController.me);

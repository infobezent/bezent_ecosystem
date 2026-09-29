import { Router } from 'express';
import { authController } from '../controller/auth.controller.js';
import { requirePlatformAuth } from '../middleware/auth.middleware.js';

export const authRouter = Router();

// Email OTP sign-in: one flow for every user (ADR-018).
authRouter.post('/auth/otp/request', authController.requestOtp);
authRouter.post('/auth/otp/verify', authController.verifyOtp);

// Retired: answers 410 so existing clients get an explicit, actionable error.
authRouter.post('/auth/login', authController.passwordLoginDisabled);

authRouter.post('/auth/logout', requirePlatformAuth, authController.logout);
authRouter.get('/auth/me', requirePlatformAuth, authController.me);

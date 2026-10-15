import { Router } from 'express';
import { authController } from '../controller/auth.controller.js';
import { requirePlatformAuth } from '../middleware/auth.middleware.js';
import { passwordLoginRateLimiter } from '../middleware/rateLimiter.middleware.js';

export const authRouter = Router();

// Public auth config discovery (e.g. indicates whether password login is enabled in this environment)
authRouter.get('/auth/config', authController.getConfig);

// Email OTP sign-in: one flow for every user (ADR-018).
authRouter.post('/auth/otp/request', authController.requestOtp);
authRouter.post('/auth/otp/verify', authController.verifyOtp);

// Password sign-in for developers and reviewers (gated by deployment environment and server feature flag).
authRouter.post('/auth/login', passwordLoginRateLimiter, authController.login);

authRouter.post('/auth/logout', requirePlatformAuth, authController.logout);
authRouter.get('/auth/me', requirePlatformAuth, authController.me);


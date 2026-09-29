import type { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../service/auth.service.js';
import { otpAuthService, OtpAuthService, OtpRateLimitedError } from '../service/otpAuth.service.js';
import { validateOtpRequestPayload, validateOtpVerifyPayload } from '../validation/auth.schema.js';
import { AppError } from '../../../app/errors/AppError.js';

export class AuthController {
  constructor(
    private readonly service: AuthService = authService,
    private readonly otp: OtpAuthService = otpAuthService,
  ) {}

  /** POST /auth/otp/request — same response whether or not the account exists. */
  requestOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = validateOtpRequestPayload(req.body);
      const result = await this.otp.requestCode(email, req.ip ?? null);
      res.status(202).json({ data: result });
    } catch (err) {
      if (err instanceof OtpRateLimitedError) {
        res.setHeader('Retry-After', String(err.retryAfterSeconds));
      }
      next(err);
    }
  };

  /** POST /auth/otp/verify — the only way to obtain a session (ADR-018). */
  verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { challengeId, code } = validateOtpVerifyPayload(req.body);
      const result = await this.otp.verifyCode(challengeId, code);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  /** POST /auth/login — password sign-in was retired by ADR-018. */
  passwordLoginDisabled = (_req: Request, _res: Response, next: NextFunction) => {
    next(
      new AppError(
        'Password sign-in is no longer available. Request a one-time code at /platform/auth/otp/request.',
        410,
        'PASSWORD_LOGIN_DISABLED',
      ),
    );
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.sessionToken) {
        await this.service.logout(req.sessionToken, req.user?.id, req.user?.email);
      }
      res.status(200).json({ data: { message: 'Logged out successfully' } });
    } catch (err) {
      next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ data: req.user });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();

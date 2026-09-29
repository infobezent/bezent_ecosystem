import type { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../service/auth.service.js';
import { validateLoginPayload } from '../validation/auth.schema.js';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = validateLoginPayload(req.body);
      const result = await this.service.login(email, password);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
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

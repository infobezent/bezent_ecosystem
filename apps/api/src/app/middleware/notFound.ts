import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../errors/AppError.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`No route for ${req.method} ${req.originalUrl}`));
}

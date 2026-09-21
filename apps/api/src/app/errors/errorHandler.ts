import type { NextFunction, Request, Response } from 'express';
import { AppError } from './AppError.js';
import { env } from '../config/env.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    stack?: string;
  };
}

/**
 * Centralized error handler. Every route/middleware error should end up
 * here instead of ad-hoc `res.status(...)` calls scattered across
 * controllers. Never leaks stack traces outside development.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';
  const message = isAppError ? err.message : 'An unexpected error occurred';

  const body: ErrorResponseBody = {
    error: { code, message },
  };

  if (env.nodeEnv !== 'production' && err instanceof Error) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

import type { NextFunction, Request, Response } from 'express';
import { AppError, ValidationError, DatabaseConnectionError } from './AppError.js';
import { env } from '../config/env.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    stack?: string;
  };
}

const DB_CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ER_BAD_DB_ERROR',
]);

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
  // If the error is a DatabaseConnectionError or an underlying DB connection failure
  const isDriverDbError =
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    DB_CONNECTION_ERROR_CODES.has((err as { code: string }).code);

  if (err instanceof DatabaseConnectionError || isDriverDbError) {
    const message =
      err instanceof DatabaseConnectionError ? err.message : 'Database service is unavailable';

    res.status(500).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message,
      },
    });
    return;
  }

  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';
  const message = isAppError ? err.message : 'An unexpected error occurred';

  const body: ErrorResponseBody = {
    error: { code, message },
  };

  if (err instanceof ValidationError && err.details) {
    body.error.details = err.details;
  }

  if (env.nodeEnv !== 'production' && err instanceof Error) {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

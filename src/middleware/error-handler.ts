/**
 * Global error handler. Ensures every unhandled error still produces a
 * well-formed JSON response instead of leaking a stack trace to callers.
 */
import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  public constructor(statusCode: number, errorCode: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error_code: 'ROUTE_NOT_FOUND',
    error_detail: `No route for ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error_code: err.errorCode,
      error_detail: err.message,
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  process.stderr.write(`${JSON.stringify({ level: 'error', message })}\n`);

  res.status(500).json({
    error_code: 'INTERNAL_ERROR',
    error_detail: 'An unexpected error occurred.',
  });
}

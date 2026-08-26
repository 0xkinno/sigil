/**
 * Structured request logger. Never logs Authorization / API-key headers.
 */
import type { NextFunction, Request, Response } from 'express';

const REDACTED_HEADERS: readonly string[] = ['authorization', 'x-api-key', 'cookie'];

interface LogLine {
  readonly ts: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly duration_ms: number;
  readonly ip: string | undefined;
}

function redactHeaders(headers: Request['headers']): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (REDACTED_HEADERS.includes(key.toLowerCase())) {
      continue;
    }
    if (typeof value === 'string') {
      safe[key] = value;
    }
  }
  return safe;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  redactHeaders(req.headers);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const line: LogLine = {
      ts: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: Math.round(durationMs * 100) / 100,
      ip: req.ip,
    };
    process.stdout.write(`${JSON.stringify(line)}\n`);
  });

  next();
}

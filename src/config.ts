/**
 * Central runtime configuration. Reads environment variables once at
 * startup and exposes typed, validated constants to the rest of the app.
 */
import { config as loadDotenv } from 'dotenv';

loadDotenv();

function readInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw.length === 0) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const APP_NAME = 'sigil' as const;
export const SCHEMA_VERSION = '1.0.0' as const;

export const PORT: number = readInt('PORT', 3000);
export const NODE_ENV: string = process.env['NODE_ENV'] ?? 'development';
export const IS_PRODUCTION: boolean = NODE_ENV === 'production';

export const RATE_LIMIT_WINDOW_MS: number = readInt('RATE_LIMIT_WINDOW_MS', 60_000);
export const RATE_LIMIT_MAX: number = readInt('RATE_LIMIT_MAX', 30);

export const RPC_TIMEOUT_MS = 10_000;
export const READY_TIMEOUT_MS = 5_000;
export const HIGH_CONFIDENCE = 0.99;
export const SINGLE_PROVIDER_CONFIDENCE = 0.8;

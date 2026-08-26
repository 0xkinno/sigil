/**
 * Rate limiting middleware, configured from environment via src/config.ts.
 */
import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from '../config.js';

export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error_code: 'RATE_LIMITED',
    error_detail: 'Too many requests. Please slow down.',
  },
});

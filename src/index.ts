/**
 * Sigil — Express server entry point.
 * Wires all routes: /health, /ready, /lookup, /sigil.yaml
 * See Section 7 (Phase 2) of Sigil_Instruction.md.
 */
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { NODE_ENV, PORT } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { requestLogger } from './middleware/request-logger.js';
import { initAttestationKeys } from './core/attestation.js';
import { healthRouter } from './routes/health.js';
import { lookupRouter } from './routes/lookup.js';
import { wellKnownRouter } from './routes/well-known.js';
import { yamlRouter } from './routes/yaml.js';

export function createApp(): Express {
  initAttestationKeys();
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use(rateLimiter);

  // Routes
  app.use(healthRouter);
  app.use(lookupRouter);
  app.use(yamlRouter);
  app.use('/.well-known', wellKnownRouter);

  // Fallthrough handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function main(): void {
  const app = createApp();
  app.listen(PORT, () => {
    process.stdout.write(
      `${JSON.stringify({ event: 'server_started', port: PORT, env: NODE_ENV })}\n`,
    );
  });
}

main();

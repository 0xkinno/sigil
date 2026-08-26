/**
 * GET /health — process liveness only, no external dependency checks.
 * GET /ready — live RPC connectivity check across all 5 supported chains.
 * A chain counts as ready if at least one of its two providers responds;
 * that mirrors dual-RPC's single-provider degraded mode rather than
 * requiring full consensus just to report readiness.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { READY_TIMEOUT_MS } from '../config.js';
import { CHAIN_NAMES } from '../types/index.js';
import { CHAIN_REGISTRY } from '../core/chains.js';
import { isProviderReachable } from '../core/rpc-client.js';
import type { ChainName, HealthResponse, ReadyResponse } from '../types/index.js';

const startedAt = Date.now();

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req: Request, res: Response) => {
  const body: HealthResponse = {
    status: 'ok',
    uptime_ms: Date.now() - startedAt,
  };
  res.status(200).json(body);
});

healthRouter.get('/ready', (_req: Request, res: Response, next: NextFunction) => {
  void handleReady(res).catch(next);
});

async function handleReady(res: Response): Promise<void> {
  const entries = await Promise.all(
    CHAIN_NAMES.map(async (name: ChainName): Promise<readonly [ChainName, boolean]> => {
      const config = CHAIN_REGISTRY[name];
      const [aReachable, bReachable] = await Promise.all([
        isProviderReachable(config.providerAUrl, READY_TIMEOUT_MS),
        isProviderReachable(config.providerBUrl, READY_TIMEOUT_MS),
      ]);
      return [name, aReachable || bReachable];
    }),
  );

  const chains = Object.fromEntries(entries) as Record<ChainName, boolean>;
  const allReady = entries.every(([, reachable]) => reachable);

  const body: ReadyResponse = {
    status: allReady ? 'ready' : 'not_ready',
    chains,
  };

  res.status(allReady ? 200 : 503).json(body);
}

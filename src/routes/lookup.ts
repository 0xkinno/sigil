/**
 * GET /lookup — Section 10 of Sigil_Instruction.md.
 *
 * HTTP status mapping: INVALID_INPUT/UNSUPPORTED_CHAIN are genuine client
 * errors (400) since we never attempted an RPC call. Every other outcome —
 * including RPC_DISAGREEMENT, TIMEOUT, UPSTREAM_ERROR, CHAIN_ID_MISMATCH,
 * and all four TxStatus states — is a *completed* lookup that Telegraph's
 * validators score by body content, so it returns 200 with the relevant
 * error_code embedded. RATE_LIMITED never reaches this handler (the
 * rate-limit middleware short-circuits with 429 first). INTERNAL_ERROR is
 * only ever raised by the global error handler for truly unexpected
 * exceptions (500).
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { RPC_TIMEOUT_MS, SCHEMA_VERSION } from '../config.js';
import { buildCanonical } from '../core/canonical.js';
import { getChainConfig } from '../core/chains.js';
import { computeFinality } from '../core/confidence.js';
import { dualQuery } from '../core/dual-rpc.js';
import { decodeErc20Transfers } from '../core/effects.js';
import type {
  ChainName,
  ErrorCode,
  LookupErrorResponse,
  LookupSuccessResponse,
  TxStatus,
} from '../types/index.js';
import { validateLookupInput } from '../utils/validation.js';

export const lookupRouter: Router = Router();

function errorHttpStatus(code: ErrorCode): number {
  if (code === 'INVALID_INPUT' || code === 'UNSUPPORTED_CHAIN') {
    return 400;
  }
  return 200;
}

function buildErrorResponse(
  chain: ChainName | null,
  chainId: number | null,
  txHash: string,
  errorCode: ErrorCode,
  errorDetail: string,
): LookupErrorResponse {
  return {
    schema_version: SCHEMA_VERSION,
    chain,
    chain_id: chainId,
    tx_hash: txHash,
    status: 'error',
    canonical: '',
    confidence: 0,
    summary: errorDetail,
    effects: [],
    finality: null,
    evidence: null,
    error_code: errorCode,
    error_detail: errorDetail,
  };
}

function errorDetailFor(code: ErrorCode, chainLabel: string): string {
  switch (code) {
    case 'RPC_DISAGREEMENT':
      return `Provider A and Provider B disagree on critical transaction facts for ${chainLabel}. Failing closed.`;
    case 'CHAIN_ID_MISMATCH':
      return `A provider returned a chain ID that does not match ${chainLabel}'s expected chain ID.`;
    case 'TIMEOUT':
      return `Both RPC providers exceeded the ${String(RPC_TIMEOUT_MS)}ms timeout for ${chainLabel}.`;
    case 'UPSTREAM_ERROR':
      return `Both RPC providers failed to respond for ${chainLabel}.`;
    case 'RATE_LIMITED':
      return 'Too many requests. Please slow down.';
    case 'INTERNAL_ERROR':
      return 'An unexpected server error occurred.';
    default:
      return 'The request could not be processed.';
  }
}

function summarize(
  chainLabel: string,
  status: TxStatus,
  blockNumber: number | null,
  effectCount: number,
): string {
  if (status === 'not_found') {
    return `No transaction with this hash exists on ${chainLabel}.`;
  }
  if (status === 'pending') {
    return `Transaction is pending on ${chainLabel}; not yet mined.`;
  }
  if (status === 'reverted') {
    return `Transaction reverted on ${chainLabel} in block ${String(blockNumber)}.`;
  }
  const effectNote =
    effectCount > 0
      ? ` ${String(effectCount)} ERC-20 transfer${effectCount === 1 ? '' : 's'} detected.`
      : '';
  return `Confirmed ${chainLabel} transaction in block ${String(blockNumber)}.${effectNote}`;
}

lookupRouter.get('/lookup', (req: Request, res: Response, next: NextFunction) => {
  void handleLookup(req, res).catch(next);
});

async function handleLookup(req: Request, res: Response): Promise<void> {
  const validation = validateLookupInput(req.query['chain'], req.query['tx_hash']);

  if (!validation.valid) {
    const rawTxHash = typeof req.query['tx_hash'] === 'string' ? req.query['tx_hash'] : '';
    res
      .status(errorHttpStatus(validation.errorCode))
      .json(
        buildErrorResponse(null, null, rawTxHash, validation.errorCode, validation.errorDetail),
      );
    return;
  }

  const { chain, txHash } = validation;
  const chainConfig = getChainConfig(chain);

  const result = await dualQuery(chainConfig, txHash, RPC_TIMEOUT_MS);

  if (!result.ok) {
    res
      .status(errorHttpStatus(result.errorCode))
      .json(
        buildErrorResponse(
          chain,
          chainConfig.chainId,
          txHash,
          result.errorCode,
          errorDetailFor(result.errorCode, chain),
        ),
      );
    return;
  }

  const { data, confidence, providerCount, providersAgreed, responseTimeMs } = result;

  const blockNumberStr = data.blockNumber === null ? '' : data.blockNumber.toString();
  const fromStr = data.from ?? '';
  const toStr = data.to ?? '';
  const valueWeiStr = data.valueWei ?? '';

  const canonical = buildCanonical({
    chain,
    txHash,
    status: data.status,
    blockNumber: blockNumberStr,
    from: fromStr,
    to: toStr,
    valueWei: valueWeiStr,
  });

  const effects = decodeErc20Transfers(data.logs, chainConfig);
  const finality = computeFinality(
    data.status,
    data.blockNumber,
    data.currentBlockNumber,
    chainConfig.finalityDepth,
  );

  const response: LookupSuccessResponse = {
    schema_version: SCHEMA_VERSION,
    chain,
    chain_id: chainConfig.chainId,
    tx_hash: txHash,
    status: data.status,
    block_number: blockNumberStr,
    from: fromStr,
    to: toStr,
    value_wei: valueWeiStr,
    canonical,
    confidence,
    summary: summarize(chain, data.status, data.blockNumber, effects.length),
    effects,
    finality,
    evidence: {
      providers_agreed: providersAgreed,
      provider_count: providerCount,
      response_time_ms: responseTimeMs,
      queried_at: new Date().toISOString(),
    },
    error_code: null,
    error_detail: null,
  };

  res.status(200).json(response);
}

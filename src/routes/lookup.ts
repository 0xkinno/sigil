/**
 * GET & POST /lookup — Master Lookup Endpoint for Sigil.
 *
 * Implements:
 * 1. Dual-RPC Consensus (Provider A & Provider B)
 * 2. L2/L1 Finality State Machine (sequencer_soft -> l1_posted -> l1_finalized)
 * 3. Ed25519 Cryptographic Attestation over canonical fields
 * 4. ERC-20 Transfer Effect Decoding
 * 5. Deterministic canonical string (untouched 7-field format for 100% scoring compatibility)
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { RPC_TIMEOUT_MS, SCHEMA_VERSION } from '../config.js';
import { signCanonical } from '../core/attestation.js';
import { buildCanonical } from '../core/canonical.js';
import { getChainConfig } from '../core/chains.js';
import { dualQuery } from '../core/dual-rpc.js';
import { decodeErc20Transfers } from '../core/effects.js';
import { computeFinalityTier } from '../core/finality-tier.js';
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
    finality_tier: 'unknown',
    attestation: null,
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
  finalityClause: string,
): string {
  if (status === 'not_found') {
    return `No transaction with this hash exists on ${chainLabel}.`;
  }
  if (status === 'pending') {
    return `Transaction is pending on ${chainLabel}; not yet mined.`;
  }
  if (status === 'reverted') {
    return `Transaction reverted on ${chainLabel} in block ${String(blockNumber)}. [${finalityClause}]`;
  }
  const effectNote =
    effectCount > 0
      ? ` ${String(effectCount)} ERC-20 transfer${effectCount === 1 ? '' : 's'} detected.`
      : '';
  return `Confirmed ${chainLabel} transaction in block ${String(blockNumber)}.${effectNote} [${finalityClause}]`;
}

lookupRouter.get('/lookup', (req: Request, res: Response, next: NextFunction) => {
  void handleLookup(req, res).catch(next);
});

lookupRouter.post('/lookup', (req: Request, res: Response, next: NextFunction) => {
  void handleLookup(req, res).catch(next);
});

lookupRouter.get('/transaction/lookup', (req: Request, res: Response, next: NextFunction) => {
  void handleLookup(req, res).catch(next);
});

lookupRouter.post('/transaction/lookup', (req: Request, res: Response, next: NextFunction) => {
  void handleLookup(req, res).catch(next);
});

async function handleLookup(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown> | undefined;
  const chainInput = req.query['chain'] ?? body?.['chain'];
  const txHashInput =
    req.query['tx_hash'] ?? req.query['txHash'] ?? body?.['tx_hash'] ?? body?.['txHash'];

  const validation = validateLookupInput(chainInput, txHashInput);

  if (!validation.valid) {
    const rawTxHash = typeof txHashInput === 'string' ? txHashInput : '';
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

  // 7-field canonical string remains byte-identical to preserve standard scoring compatibility
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

  // Compute L2/L1 multi-chain finality tier
  const finalityResult = await computeFinalityTier(
    chain,
    data.blockNumber,
    data.currentBlockNumber,
    chainConfig.providerAUrl,
    RPC_TIMEOUT_MS,
  );

  // Cryptographically sign canonical string with Ed25519
  const attestation = signCanonical(canonical);

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
    summary: summarize(
      chain,
      data.status,
      data.blockNumber,
      effects.length,
      finalityResult.summaryClause,
    ),
    effects,
    finality: finalityResult.finality,
    finality_tier: finalityResult.finalityTier,
    attestation,
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

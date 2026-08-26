/**
 * Dual-RPC consensus engine — Sigil's core differentiator. Queries two
 * independent providers in parallel and fails closed on any disagreement.
 * See Section 11 of Sigil_Instruction.md for the algorithm this implements.
 */
import { HIGH_CONFIDENCE, SINGLE_PROVIDER_CONFIDENCE } from '../config.js';
import type { ChainConfig, DualQueryResult, ProviderTxResult } from '../types/index.js';
import { queryTransaction, RpcTimeoutError } from './rpc-client.js';

export type QueryFn = (
  rpcUrl: string,
  txHash: string,
  timeoutMs: number,
) => Promise<ProviderTxResult>;

interface SettledOutcome {
  readonly ok: boolean;
  readonly value: ProviderTxResult | null;
  readonly timedOut: boolean;
}

async function settle(promise: Promise<ProviderTxResult>): Promise<SettledOutcome> {
  try {
    const value = await promise;
    return { ok: true, value, timedOut: false };
  } catch (err) {
    return { ok: false, value: null, timedOut: err instanceof RpcTimeoutError };
  }
}

export function fieldsAgree(a: ProviderTxResult, b: ProviderTxResult): boolean {
  return (
    a.found === b.found &&
    a.status === b.status &&
    a.blockNumber === b.blockNumber &&
    a.from === b.from &&
    a.to === b.to &&
    a.valueWei === b.valueWei &&
    a.logs.length === b.logs.length
  );
}

export async function dualQuery(
  chain: ChainConfig,
  txHash: string,
  timeoutMs: number,
  queryFn: QueryFn = queryTransaction,
): Promise<DualQueryResult> {
  const startedAt = Date.now();

  const [outcomeA, outcomeB] = await Promise.all([
    settle(queryFn(chain.providerAUrl, txHash, timeoutMs)),
    settle(queryFn(chain.providerBUrl, txHash, timeoutMs)),
  ]);

  const responseTimeMs = Date.now() - startedAt;

  const chainIdMismatch =
    (outcomeA.value !== null && outcomeA.value.chainId !== chain.chainId) ||
    (outcomeB.value !== null && outcomeB.value.chainId !== chain.chainId);

  if (chainIdMismatch) {
    return { ok: false, errorCode: 'CHAIN_ID_MISMATCH', responseTimeMs };
  }

  if (outcomeA.ok && outcomeB.ok && outcomeA.value !== null && outcomeB.value !== null) {
    if (!fieldsAgree(outcomeA.value, outcomeB.value)) {
      return { ok: false, errorCode: 'RPC_DISAGREEMENT', responseTimeMs };
    }
    return {
      ok: true,
      data: outcomeA.value,
      confidence: HIGH_CONFIDENCE,
      providerCount: 2,
      providersAgreed: true,
      responseTimeMs,
    };
  }

  const single = outcomeA.ok ? outcomeA.value : outcomeB.ok ? outcomeB.value : null;
  if (single !== null) {
    return {
      ok: true,
      data: single,
      confidence: SINGLE_PROVIDER_CONFIDENCE,
      providerCount: 1,
      providersAgreed: false,
      responseTimeMs,
    };
  }

  const bothTimedOut = outcomeA.timedOut && outcomeB.timedOut;
  return {
    ok: false,
    errorCode: bothTimedOut ? 'TIMEOUT' : 'UPSTREAM_ERROR',
    responseTimeMs,
  };
}

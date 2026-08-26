import { describe, expect, it } from 'vitest';
import { buildChainRegistry } from '../../src/core/chains.js';
import { dualQuery, type QueryFn } from '../../src/core/dual-rpc.js';
import { RpcTimeoutError } from '../../src/core/rpc-client.js';
import type { ProviderTxResult } from '../../src/types/index.js';

const registry = buildChainRegistry({});
const base = registry.base;
const TX_HASH = `0x${'a'.repeat(64)}`;

function confirmedResult(overrides: Partial<ProviderTxResult> = {}): ProviderTxResult {
  return {
    found: true,
    status: 'confirmed',
    blockNumber: 100,
    from: `0x${'1'.repeat(40)}`,
    to: `0x${'2'.repeat(40)}`,
    valueWei: '0',
    logs: [],
    chainId: base.chainId,
    currentBlockNumber: 200,
    ...overrides,
  };
}

function fixedQueryFn(byUrl: Record<string, () => ProviderTxResult>): QueryFn {
  return (rpcUrl: string): Promise<ProviderTxResult> => {
    const handler = byUrl[rpcUrl];
    if (handler === undefined) {
      return Promise.reject(new Error(`no handler configured for ${rpcUrl}`));
    }
    try {
      return Promise.resolve(handler());
    } catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
  };
}

describe('dualQuery', () => {
  it('returns high confidence when both providers agree', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => confirmedResult(),
        [base.providerBUrl]: () => confirmedResult(),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.confidence).toBe(0.99);
      expect(result.providerCount).toBe(2);
      expect(result.providersAgreed).toBe(true);
    }
  });

  it('fails closed with RPC_DISAGREEMENT when block numbers differ', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => confirmedResult({ blockNumber: 100 }),
        [base.providerBUrl]: () => confirmedResult({ blockNumber: 101 }),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('RPC_DISAGREEMENT');
    }
  });

  it('fails closed with RPC_DISAGREEMENT when status differs', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => confirmedResult({ status: 'confirmed' }),
        [base.providerBUrl]: () => confirmedResult({ status: 'reverted' }),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('RPC_DISAGREEMENT');
    }
  });

  it('fails closed with RPC_DISAGREEMENT when from/to differ', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => confirmedResult({ to: `0x${'3'.repeat(40)}` }),
        [base.providerBUrl]: () => confirmedResult({ to: `0x${'4'.repeat(40)}` }),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('RPC_DISAGREEMENT');
    }
  });

  it('fails closed with RPC_DISAGREEMENT when log counts differ', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => confirmedResult({ logs: [] }),
        [base.providerBUrl]: () =>
          confirmedResult({
            logs: [{ address: '0x0', topics: [], data: '0x', logIndex: 0 }],
          }),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('RPC_DISAGREEMENT');
    }
  });

  it('falls back to single-provider confidence when one provider fails', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => confirmedResult(),
        [base.providerBUrl]: () => {
          throw new Error('connection reset');
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.confidence).toBe(0.8);
      expect(result.providerCount).toBe(1);
      expect(result.providersAgreed).toBe(false);
    }
  });

  it('returns UPSTREAM_ERROR when both providers fail with generic errors', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => {
          throw new Error('connection reset');
        },
        [base.providerBUrl]: () => {
          throw new Error('econnrefused');
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('UPSTREAM_ERROR');
    }
  });

  it('returns TIMEOUT when both providers time out', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => {
          throw new RpcTimeoutError(base.providerAUrl, 1000);
        },
        [base.providerBUrl]: () => {
          throw new RpcTimeoutError(base.providerBUrl, 1000);
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('TIMEOUT');
    }
  });

  it('returns CHAIN_ID_MISMATCH when a provider reports the wrong chain ID', async () => {
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => confirmedResult({ chainId: 1 }),
        [base.providerBUrl]: () => confirmedResult({ chainId: base.chainId }),
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('CHAIN_ID_MISMATCH');
    }
  });

  it('agrees on a not_found consensus between both providers', async () => {
    const notFound: ProviderTxResult = {
      found: false,
      status: 'not_found',
      blockNumber: null,
      from: null,
      to: null,
      valueWei: null,
      logs: [],
      chainId: base.chainId,
      currentBlockNumber: 200,
    };
    const result = await dualQuery(
      base,
      TX_HASH,
      1000,
      fixedQueryFn({
        [base.providerAUrl]: () => notFound,
        [base.providerBUrl]: () => notFound,
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe('not_found');
    }
  });
});

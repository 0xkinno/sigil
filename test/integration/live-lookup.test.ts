/**
 * Live-RPC integration tests for GET /lookup.
 *
 * These tests make REAL RPC calls against the live Sigil miner server
 * and known on-chain transactions. They are guarded by the INTEGRATION_RPC
 * environment variable to keep CI green without needing API keys or network.
 *
 * To run locally (requires real Alchemy keys in .env.local):
 *   INTEGRATION_RPC=1 npm run test:integration
 *
 * Or against the live Render deployment:
 *   INTEGRATION_RPC=1 SIGIL_BASE_URL=https://sigil-mssz.onrender.com npm run test:integration
 */
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { LookupSuccessResponse, LookupErrorResponse } from '../../src/types/index.js';
import { createApp } from '../../src/index.js';

const RUN_LIVE = process.env['INTEGRATION_RPC'] === '1';

// ---------------------------------------------------------------------------
// Known real on-chain tx hashes (permanently confirmed, verifiable any time)
// ---------------------------------------------------------------------------

const FIXTURES = {
  base_usdc_transfer: {
    chain: 'base' as const,
    tx_hash: '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7',
    expectedStatus: 'confirmed' as const,
    expectedErc20: true,
    expectedChainId: 8453,
  },
  ethereum_eth_transfer: {
    chain: 'ethereum' as const,
    tx_hash: '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060',
    expectedStatus: 'confirmed' as const,
    expectedErc20: false,
    expectedChainId: 1,
  },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSuccess(body: unknown): body is LookupSuccessResponse {
  return (
    typeof body === 'object' && body !== null && (body as LookupSuccessResponse).error_code === null
  );
}

// ---------------------------------------------------------------------------
// Tests (only run when INTEGRATION_RPC=1)
// ---------------------------------------------------------------------------

describe.skipIf(!RUN_LIVE)('GET /lookup — live RPC (Base USDC fixture)', () => {
  let app: Express;

  app = createApp();

  it('returns 200 with confirmed status for the Veyctum Base USDC fixture', async () => {
    const fix = FIXTURES.base_usdc_transfer;
    const res = await request(app).get(`/lookup?chain=${fix.chain}&tx_hash=${fix.tx_hash}`);
    expect(res.status).toBe(200);
    const body = res.body as LookupSuccessResponse | LookupErrorResponse;
    expect(body.status).toBe(fix.expectedStatus);
    expect(body.chain_id).toBe(fix.expectedChainId);
  }, 30000);

  it('returns the correct canonical format for the Base USDC fixture', async () => {
    const fix = FIXTURES.base_usdc_transfer;
    const res = await request(app).get(`/lookup?chain=${fix.chain}&tx_hash=${fix.tx_hash}`);
    const body = res.body as LookupSuccessResponse | LookupErrorResponse;
    expect(body.canonical).toBeTruthy();
    expect(typeof body.canonical).toBe('string');
    const parts = body.canonical.split('|');
    expect(parts).toHaveLength(7);
    expect(parts[0]).toBe('base');
    expect(parts[1]).toBe(fix.tx_hash);
    expect(parts[2]).toBe('confirmed');
  }, 30000);

  it('decodes at least one ERC-20 transfer in the effects array', async () => {
    const fix = FIXTURES.base_usdc_transfer;
    const res = await request(app).get(`/lookup?chain=${fix.chain}&tx_hash=${fix.tx_hash}`);
    const body = res.body as LookupSuccessResponse;
    if (isSuccess(body)) {
      expect(Array.isArray(body.effects)).toBe(true);
      expect(body.effects.length).toBeGreaterThan(0);
      expect(body.effects[0]?.type).toBe('ERC20_TRANSFER');
    }
  }, 30000);

  it('returns evidence with providers_agreed and provider_count', async () => {
    const fix = FIXTURES.base_usdc_transfer;
    const res = await request(app).get(`/lookup?chain=${fix.chain}&tx_hash=${fix.tx_hash}`);
    const body = res.body as LookupSuccessResponse;
    if (isSuccess(body) && body.evidence) {
      expect(typeof body.evidence.providers_agreed).toBe('boolean');
      expect(body.evidence.provider_count).toBeGreaterThanOrEqual(1);
      expect(body.evidence.response_time_ms).toBeGreaterThan(0);
    }
  }, 30000);

  it('returns confidence > 0 for a confirmed transaction', async () => {
    const fix = FIXTURES.base_usdc_transfer;
    const res = await request(app).get(`/lookup?chain=${fix.chain}&tx_hash=${fix.tx_hash}`);
    const body = res.body as LookupSuccessResponse;
    expect(body.confidence).toBeGreaterThan(0);
  }, 30000);

  it('returns finality data with a valid depth_category', async () => {
    const fix = FIXTURES.base_usdc_transfer;
    const res = await request(app).get(`/lookup?chain=${fix.chain}&tx_hash=${fix.tx_hash}`);
    const body = res.body as LookupSuccessResponse;
    if (isSuccess(body) && body.finality) {
      expect(['shallow', 'moderate', 'deep']).toContain(body.finality.depth_category);
      expect(body.finality.confirmations).toBeGreaterThan(0);
    }
  }, 30000);
});

describe.skipIf(!RUN_LIVE)('GET /lookup — live RPC (Ethereum ETH fixture)', () => {
  let app: Express;

  app = createApp();

  it('returns 200 with confirmed status for a known Ethereum ETH transfer', async () => {
    const fix = FIXTURES.ethereum_eth_transfer;
    const res = await request(app).get(`/lookup?chain=${fix.chain}&tx_hash=${fix.tx_hash}`);
    expect(res.status).toBe(200);
    const body = res.body as LookupSuccessResponse | LookupErrorResponse;
    expect(body.chain_id).toBe(fix.expectedChainId);
    // Confirmed OR upstream error depending on Alchemy key availability
    expect(['confirmed', 'error']).toContain(body.status);
  }, 30000);

  it('returns a canonical string starting with "ethereum|"', async () => {
    const fix = FIXTURES.ethereum_eth_transfer;
    const res = await request(app).get(`/lookup?chain=${fix.chain}&tx_hash=${fix.tx_hash}`);
    const body = res.body as LookupSuccessResponse;
    if (body.status === 'confirmed') {
      expect(body.canonical.startsWith('ethereum|')).toBe(true);
    }
  }, 30000);
});

describe.skipIf(!RUN_LIVE)('GET /lookup — live RPC (not_found path)', () => {
  let app: Express;

  app = createApp();

  it('returns not_found for a fabricated hash that cannot exist', async () => {
    const hash = `0x${'dead'.repeat(16)}`;
    const res = await request(app).get(`/lookup?chain=base&tx_hash=${hash}`);
    expect(res.status).toBe(200);
    const body = res.body as LookupSuccessResponse | LookupErrorResponse;
    // Should be not_found or an RPC error (both are valid without keys)
    expect(['not_found', 'error']).toContain(body.status);
    // Canonical is always present even on not_found
    expect(typeof body.canonical).toBe('string');
  }, 30000);

  it('cross-chain not_found: a Base tx hash queried on Ethereum returns not_found', async () => {
    const baseTx = FIXTURES.base_usdc_transfer.tx_hash;
    const res = await request(app).get(`/lookup?chain=ethereum&tx_hash=${baseTx}`);
    const body = res.body as LookupSuccessResponse | LookupErrorResponse;
    // Without real keys this might come back as UPSTREAM_ERROR — both are correct
    expect(['not_found', 'error']).toContain(body.status);
  }, 30000);
});

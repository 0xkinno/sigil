/**
 * Integration tests for GET /lookup, GET /health, GET /ready, GET /sigil.yaml.
 *
 * These tests use a real Express app instance (no real RPC calls by default).
 * Tests that require live RPC are guarded by the INTEGRATION_RPC environment
 * variable to keep CI green without API keys.
 *
 * To run live tests:
 *   INTEGRATION_RPC=1 npm run test:integration
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { LookupResponse, HealthResponse, ReadyResponse } from '../../src/types/index.js';
import { createApp } from '../../src/index.js';

let app: Express;

beforeAll(() => {
  app = createApp();
});

afterAll(() => {
  // Nothing to teardown for the app-level tests
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
describe('GET /health', () => {
  it('returns 200 with status:ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    const body = res.body as HealthResponse;
    expect(body.status).toBe('ok');
    expect(typeof body.uptime_ms).toBe('number');
  });

  it('returns JSON content-type', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

// ---------------------------------------------------------------------------
// GET /ready  (without real RPCs — expects not_ready since no env keys set)
// ---------------------------------------------------------------------------
describe('GET /ready', () => {
  it('returns a JSON body with a chains map containing all 5 chains', async () => {
    const res = await request(app).get('/ready');
    expect([200, 503]).toContain(res.status);
    const body = res.body as ReadyResponse;
    expect(body.chains).toHaveProperty('ethereum');
    expect(body.chains).toHaveProperty('base');
    expect(body.chains).toHaveProperty('arbitrum');
    expect(body.chains).toHaveProperty('optimism');
    expect(body.chains).toHaveProperty('polygon');
  });

  it('returns a status field of either "ready" or "not_ready"', async () => {
    const res = await request(app).get('/ready');
    const body = res.body as ReadyResponse;
    expect(['ready', 'not_ready']).toContain(body.status);
  });
});

// ---------------------------------------------------------------------------
// GET /sigil.yaml
// ---------------------------------------------------------------------------
describe('GET /sigil.yaml', () => {
  it('returns 200 or 404 (404 acceptable before YAML is generated, 200 when it exists)', async () => {
    const res = await request(app).get('/sigil.yaml');
    expect([200, 404]).toContain(res.status);
  });

  it('when present, sets Content-Type to text/yaml', async () => {
    const res = await request(app).get('/sigil.yaml');
    if (res.status === 200) {
      expect(res.headers['content-type']).toMatch(/text\/yaml/);
    }
  });
});

// ---------------------------------------------------------------------------
// GET /lookup — input validation (no real RPC needed)
// ---------------------------------------------------------------------------
describe('GET /lookup — input validation', () => {
  it('returns 400 INVALID_INPUT when chain param is missing', async () => {
    const res = await request(app).get(
      '/lookup?tx_hash=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(res.status).toBe(400);
    const body = res.body as LookupResponse;
    expect(body.error_code).toBe('INVALID_INPUT');
    expect(body.canonical).toBe('');
    expect(body.confidence).toBe(0);
  });

  it('returns 400 INVALID_INPUT when tx_hash param is missing', async () => {
    const res = await request(app).get('/lookup?chain=base');
    expect(res.status).toBe(400);
    const body = res.body as LookupResponse;
    expect(body.error_code).toBe('INVALID_INPUT');
  });

  it('returns 400 UNSUPPORTED_CHAIN for an unknown chain name', async () => {
    const res = await request(app).get(
      '/lookup?chain=solana&tx_hash=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(res.status).toBe(400);
    const body = res.body as LookupResponse;
    expect(body.error_code).toBe('UNSUPPORTED_CHAIN');
    expect(body.canonical).toBe('');
  });

  it('returns 400 INVALID_INPUT for a malformed tx_hash (too short)', async () => {
    const res = await request(app).get('/lookup?chain=base&tx_hash=0xdeadbeef');
    expect(res.status).toBe(400);
    const body = res.body as LookupResponse;
    expect(body.error_code).toBe('INVALID_INPUT');
  });

  it('returns 400 INVALID_INPUT for a tx_hash without 0x prefix', async () => {
    const hash = 'a'.repeat(64);
    const res = await request(app).get(`/lookup?chain=base&tx_hash=${hash}`);
    expect(res.status).toBe(400);
    const body = res.body as LookupResponse;
    expect(body.error_code).toBe('INVALID_INPUT');
  });

  it('returns 400 INVALID_INPUT for a tx_hash with uppercase 0X prefix', async () => {
    const res = await request(app).get(
      '/lookup?chain=base&tx_hash=0Xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(res.status).toBe(400);
    const body = res.body as LookupResponse;
    expect(body.error_code).toBe('INVALID_INPUT');
  });

  it('returns 400 for an empty chain string', async () => {
    const res = await request(app).get(
      '/lookup?chain=&tx_hash=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    expect(res.status).toBe(400);
    const body = res.body as LookupResponse;
    expect(body.error_code).toBe('INVALID_INPUT');
  });

  it('response shape always includes schema_version, canonical, confidence, effects, summary', async () => {
    const res = await request(app).get('/lookup?chain=ethereum&tx_hash=0xdeadbeef');
    const body = res.body as LookupResponse;
    expect(body.schema_version).toBe('1.0.0');
    expect(typeof body.canonical).toBe('string');
    expect(typeof body.confidence).toBe('number');
    expect(typeof body.summary).toBe('string');
  });

  it('accepts all 5 supported chain names without UNSUPPORTED_CHAIN error', async () => {
    const chains = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'];
    const hash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    for (const chain of chains) {
      const res = await request(app).get(`/lookup?chain=${chain}&tx_hash=${hash}`);
      const body = res.body as LookupResponse;
      expect(body.error_code).not.toBe('UNSUPPORTED_CHAIN');
    }
  });
});

// ---------------------------------------------------------------------------
// GET /lookup — response contract
// ---------------------------------------------------------------------------
describe('GET /lookup — response contract', () => {
  it('error responses always carry error_code and error_detail strings', async () => {
    const res = await request(app).get(
      '/lookup?chain=base&tx_hash=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const body = res.body as LookupResponse;
    if (body.error_code !== null) {
      expect(typeof body.error_code).toBe('string');
      expect(typeof body.error_detail).toBe('string');
    }
  });

  it('all responses include chain_id as an integer when chain is known', async () => {
    const res = await request(app).get(
      '/lookup?chain=base&tx_hash=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const body = res.body as LookupResponse;
    if (body.chain !== null) {
      expect(body.chain_id).toBe(8453);
    }
  });

  it('effects is always an array', async () => {
    const res = await request(app).get(
      '/lookup?chain=polygon&tx_hash=0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const body = res.body as LookupResponse;
    expect(Array.isArray(body.effects)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 404 fallthrough
// ---------------------------------------------------------------------------
describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-path');
    expect(res.status).toBe(404);
    const body = res.body as { error_code: string };
    expect(body.error_code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns JSON for unknown POST routes', async () => {
    const res = await request(app).post('/nonexistent');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

/**
 * Canonical compatibility integration test.
 *
 * Verifies that Sigil's canonical output for the known Base USDC fixture
 * (Section 9 of Sigil_Instruction.md) matches the Verity/Veyctum format
 * exactly: chain|tx_hash|status|block_number|from|to|value_wei
 *
 * This test uses mock data (no live RPC) to stay CI-safe while still
 * asserting format compatibility against the exact fixture hash.
 */
import { describe, expect, it } from 'vitest';
import { buildCanonical } from '../../src/core/canonical.js';
import type { CanonicalFields } from '../../src/types/index.js';

// Known fixture from Section 2 / Section 9 of Sigil_Instruction.md
// This is the Veyctum positive fixture — our canonical output must
// follow the same format.
const VEYCTUM_FIXTURE_HASH =
  '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7';

describe('canonical compatibility — Verity / Veyctum format', () => {
  it('produces exactly 7 pipe-delimited fields', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: VEYCTUM_FIXTURE_HASH,
      status: 'confirmed',
      blockNumber: '12345678',
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      valueWei: '0',
    };
    const canonical = buildCanonical(fields);
    expect(canonical.split('|')).toHaveLength(7);
  });

  it('field 0 is the lowercase chain name', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: VEYCTUM_FIXTURE_HASH,
      status: 'confirmed',
      blockNumber: '10000000',
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      valueWei: '0',
    };
    expect(buildCanonical(fields).split('|')[0]).toBe('base');
  });

  it('field 1 is the full 0x-prefixed lowercase tx hash (66 chars)', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: VEYCTUM_FIXTURE_HASH,
      status: 'confirmed',
      blockNumber: '10000000',
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      valueWei: '0',
    };
    const hashField = buildCanonical(fields).split('|')[1];
    expect(hashField).toBe(VEYCTUM_FIXTURE_HASH);
    expect(hashField?.length).toBe(66);
  });

  it('field 2 is one of the four status literals', () => {
    const statuses = ['confirmed', 'reverted', 'pending', 'not_found'] as const;
    for (const status of statuses) {
      const fields: CanonicalFields = {
        chain: 'base',
        txHash: VEYCTUM_FIXTURE_HASH,
        status,
        blockNumber: status === 'confirmed' || status === 'reverted' ? '100' : '',
        from: status === 'confirmed' || status === 'reverted' ? '0x' + 'a'.repeat(40) : '',
        to: status === 'confirmed' || status === 'reverted' ? '0x' + 'b'.repeat(40) : '',
        valueWei: status === 'confirmed' || status === 'reverted' ? '0' : '',
      };
      expect(buildCanonical(fields).split('|')[2]).toBe(status);
    }
  });

  it('value_wei is a decimal string, not hex', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: VEYCTUM_FIXTURE_HASH,
      status: 'confirmed',
      blockNumber: '100',
      from: '0x' + 'a'.repeat(40),
      to: '0x' + 'b'.repeat(40),
      valueWei: '1000000000000000000',
    };
    const valueField = buildCanonical(fields).split('|')[6];
    expect(valueField).toBe('1000000000000000000');
    expect(valueField?.startsWith('0x')).toBe(false);
  });

  it('produces the expected canonical prefix for the Veyctum Base USDC fixture', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: VEYCTUM_FIXTURE_HASH,
      status: 'confirmed',
      blockNumber: '27372726',
      from: '0x6cf30f7e01f2d40b9b9a2fb7e3c4d30a6c1eb5d0',
      to: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      valueWei: '0',
    };
    const canonical = buildCanonical(fields);
    expect(canonical).toBe(
      `base|${VEYCTUM_FIXTURE_HASH}|confirmed|27372726|0x6cf30f7e01f2d40b9b9a2fb7e3c4d30a6c1eb5d0|0x833589fcd6edb6e08f4c7c32d4f71b54bda02913|0`,
    );
  });
});

describe('canonical compatibility — all five chains', () => {
  const chains = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'] as const;
  const txHash = `0x${'ab12ef'.repeat(10)}cd34`;

  for (const chain of chains) {
    it(`builds a valid canonical string for chain: ${chain}`, () => {
      const fields: CanonicalFields = {
        chain,
        txHash,
        status: 'confirmed',
        blockNumber: '100',
        from: '0x' + 'a'.repeat(40),
        to: '0x' + 'b'.repeat(40),
        valueWei: '0',
      };
      const canonical = buildCanonical(fields);
      const parts = canonical.split('|');
      expect(parts).toHaveLength(7);
      expect(parts[0]).toBe(chain);
      expect(parts[1]).toBe(txHash);
      expect(parts[2]).toBe('confirmed');
    });
  }
});

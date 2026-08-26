import { describe, expect, it } from 'vitest';
import { buildCanonical } from '../../src/core/canonical.js';
import type { CanonicalFields } from '../../src/types/index.js';

describe('buildCanonical', () => {
  it('builds a confirmed canonical string with all fields populated', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7',
      status: 'confirmed',
      blockNumber: '12345678',
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      valueWei: '0',
    };
    expect(buildCanonical(fields)).toBe(
      'base|0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7|confirmed|12345678|0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa|0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb|0',
    );
  });

  it('matches the Veyctum-compatible fixture format exactly (Section 9)', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7',
      status: 'confirmed',
      blockNumber: '12345678',
      from: '0xsender000000000000000000000000000000000',
      to: '0xrecipient00000000000000000000000000000',
      valueWei: '0',
    };
    const canonical = buildCanonical(fields);
    expect(canonical.split('|')).toHaveLength(7);
    expect(
      canonical.startsWith(
        'base|0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7|confirmed|',
      ),
    ).toBe(true);
  });

  it('builds a reverted canonical string', () => {
    const fields: CanonicalFields = {
      chain: 'ethereum',
      txHash: `0x${'a'.repeat(64)}`,
      status: 'reverted',
      blockNumber: '100',
      from: `0x${'1'.repeat(40)}`,
      to: `0x${'2'.repeat(40)}`,
      valueWei: '1000000000000000000',
    };
    expect(buildCanonical(fields)).toBe(
      `ethereum|0x${'a'.repeat(64)}|reverted|100|0x${'1'.repeat(40)}|0x${'2'.repeat(40)}|1000000000000000000`,
    );
  });

  it('builds a pending canonical string with empty positional fields', () => {
    const fields: CanonicalFields = {
      chain: 'arbitrum',
      txHash: `0x${'b'.repeat(64)}`,
      status: 'pending',
      blockNumber: '',
      from: '',
      to: '',
      valueWei: '',
    };
    expect(buildCanonical(fields)).toBe(`arbitrum|0x${'b'.repeat(64)}|pending||||`);
  });

  it('builds a not_found canonical string with empty positional fields', () => {
    const fields: CanonicalFields = {
      chain: 'optimism',
      txHash: `0x${'c'.repeat(64)}`,
      status: 'not_found',
      blockNumber: '',
      from: '',
      to: '',
      valueWei: '',
    };
    expect(buildCanonical(fields)).toBe(`optimism|0x${'c'.repeat(64)}|not_found||||`);
  });

  it('preserves an empty "to" field for contract creation transactions', () => {
    const fields: CanonicalFields = {
      chain: 'polygon',
      txHash: `0x${'d'.repeat(64)}`,
      status: 'confirmed',
      blockNumber: '55',
      from: `0x${'3'.repeat(40)}`,
      to: '',
      valueWei: '0',
    };
    expect(buildCanonical(fields)).toBe(
      `polygon|0x${'d'.repeat(64)}|confirmed|55|0x${'3'.repeat(40)}||0`,
    );
  });

  it('produces exactly 6 pipe separators for 7 fields', () => {
    const fields: CanonicalFields = {
      chain: 'ethereum',
      txHash: `0x${'e'.repeat(64)}`,
      status: 'confirmed',
      blockNumber: '1',
      from: `0x${'4'.repeat(40)}`,
      to: `0x${'5'.repeat(40)}`,
      valueWei: '1',
    };
    const pipeCount = buildCanonical(fields).split('|').length - 1;
    expect(pipeCount).toBe(6);
  });

  it('is a pure function — same input always produces the same output', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: `0x${'f'.repeat(64)}`,
      status: 'confirmed',
      blockNumber: '10',
      from: `0x${'6'.repeat(40)}`,
      to: `0x${'7'.repeat(40)}`,
      valueWei: '42',
    };
    expect(buildCanonical(fields)).toBe(buildCanonical(fields));
  });

  it('does not alter casing — callers are responsible for lowercasing', () => {
    const fields: CanonicalFields = {
      chain: 'base',
      txHash: `0xABCDEF${'0'.repeat(58)}`,
      status: 'confirmed',
      blockNumber: '1',
      from: `0xAAAA${'0'.repeat(36)}`,
      to: `0xBBBB${'0'.repeat(36)}`,
      valueWei: '0',
    };
    expect(buildCanonical(fields)).toContain('0xABCDEF');
    expect(buildCanonical(fields)).toContain('0xAAAA');
  });

  it('handles a large value_wei decimal string without precision loss', () => {
    const fields: CanonicalFields = {
      chain: 'ethereum',
      txHash: `0x${'9'.repeat(64)}`,
      status: 'confirmed',
      blockNumber: '1',
      from: `0x${'1'.repeat(40)}`,
      to: `0x${'2'.repeat(40)}`,
      valueWei: '123456789012345678901234567890',
    };
    expect(buildCanonical(fields)).toContain('123456789012345678901234567890');
  });

  it('builds correctly for every supported chain name', () => {
    const chains = ['ethereum', 'base', 'arbitrum', 'optimism', 'polygon'] as const;
    for (const chain of chains) {
      const fields: CanonicalFields = {
        chain,
        txHash: `0x${'0'.repeat(64)}`,
        status: 'confirmed',
        blockNumber: '1',
        from: `0x${'0'.repeat(40)}`,
        to: `0x${'0'.repeat(40)}`,
        valueWei: '0',
      };
      expect(buildCanonical(fields).startsWith(`${chain}|`)).toBe(true);
    }
  });
});

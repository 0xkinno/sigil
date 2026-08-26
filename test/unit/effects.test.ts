import { describe, expect, it } from 'vitest';
import { buildChainRegistry } from '../../src/core/chains.js';
import { decodeErc20Transfers, ERC20_TRANSFER_TOPIC } from '../../src/core/effects.js';
import type { RawLog } from '../../src/types/index.js';

const registry = buildChainRegistry({});
const baseChain = registry.base;

function transferTopic(addressHex: string): string {
  return `0x${'0'.repeat(24)}${addressHex}`;
}

function makeTransferLog(overrides: Partial<RawLog> = {}): RawLog {
  return {
    address: baseChain.usdcContract,
    topics: [ERC20_TRANSFER_TOPIC, transferTopic('1'.repeat(40)), transferTopic('2'.repeat(40))],
    data: '0x64', // 100
    logIndex: 0,
    ...overrides,
  };
}

describe('decodeErc20Transfers', () => {
  it('decodes a single known-token (USDC) transfer', () => {
    const effects = decodeErc20Transfers([makeTransferLog()], baseChain);
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({
      type: 'ERC20_TRANSFER',
      token: baseChain.usdcContract,
      symbol: 'USDC',
      decimals: 6,
      amount_raw: '100',
    });
  });

  it('lowercases from/to addresses in the decoded effect', () => {
    const [effect] = decodeErc20Transfers([makeTransferLog()], baseChain);
    expect(effect?.from).toBe(effect?.from.toLowerCase());
    expect(effect?.to).toBe(effect?.to.toLowerCase());
  });

  it('decodes an unknown token with UNKNOWN symbol and 18 default decimals', () => {
    const log = makeTransferLog({ address: `0x${'9'.repeat(40)}` });
    const [effect] = decodeErc20Transfers([log], baseChain);
    expect(effect?.symbol).toBe('UNKNOWN');
    expect(effect?.decimals).toBe(18);
  });

  it('decodes multiple transfers in the same transaction', () => {
    const logs = [makeTransferLog({ logIndex: 0 }), makeTransferLog({ logIndex: 1, data: '0xc8' })];
    const effects = decodeErc20Transfers(logs, baseChain);
    expect(effects).toHaveLength(2);
    expect(effects[1]?.amount_raw).toBe('200');
  });

  it('returns an empty array when there are no logs', () => {
    expect(decodeErc20Transfers([], baseChain)).toEqual([]);
  });

  it('skips logs with a non-Transfer topic0', () => {
    const log = makeTransferLog({
      topics: [`0x${'a'.repeat(64)}`, transferTopic('1'.repeat(40)), transferTopic('2'.repeat(40))],
    });
    expect(decodeErc20Transfers([log], baseChain)).toEqual([]);
  });

  it('skips logs that do not have exactly 3 topics', () => {
    const log = makeTransferLog({ topics: [ERC20_TRANSFER_TOPIC, transferTopic('1'.repeat(40))] });
    expect(decodeErc20Transfers([log], baseChain)).toEqual([]);
  });

  it('skips non-ERC20 logs mixed in with real transfers', () => {
    const nonTransfer = makeTransferLog({
      logIndex: 0,
      topics: [`0x${'b'.repeat(64)}`, transferTopic('1'.repeat(40)), transferTopic('2'.repeat(40))],
    });
    const realTransfer = makeTransferLog({ logIndex: 1 });
    const effects = decodeErc20Transfers([nonTransfer, realTransfer], baseChain);
    expect(effects).toHaveLength(1);
  });
});

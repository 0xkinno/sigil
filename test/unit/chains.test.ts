import { describe, expect, it } from 'vitest';
import {
  buildChainRegistry,
  getChainByChainId,
  getChainConfig,
  isSupportedChain,
} from '../../src/core/chains.js';

describe('chain registry', () => {
  it('resolves all 5 chains with the correct chain IDs', () => {
    const registry = buildChainRegistry({});
    expect(registry.ethereum.chainId).toBe(1);
    expect(registry.base.chainId).toBe(8453);
    expect(registry.arbitrum.chainId).toBe(42161);
    expect(registry.optimism.chainId).toBe(10);
    expect(registry.polygon.chainId).toBe(137);
  });

  it('assigns the correct native symbol per chain', () => {
    const registry = buildChainRegistry({});
    expect(registry.ethereum.nativeSymbol).toBe('ETH');
    expect(registry.polygon.nativeSymbol).toBe('POL');
  });

  it('falls back to public RPC URLs for provider B when env is unset', () => {
    const registry = buildChainRegistry({});
    expect(registry.ethereum.providerBUrl).toBe('https://eth.llamarpc.com');
    expect(registry.base.providerBUrl).toBe('https://mainnet.base.org');
  });

  it('leaves provider A empty when env is unset (no fabricated keys)', () => {
    const registry = buildChainRegistry({});
    expect(registry.ethereum.providerAUrl).toBe('');
  });

  it('reads provider URLs from the supplied env object', () => {
    const registry = buildChainRegistry({
      ALCHEMY_ETH_URL: 'https://example.com/eth',
      BACKUP_ETH_URL: 'https://example.com/eth-backup',
    });
    expect(registry.ethereum.providerAUrl).toBe('https://example.com/eth');
    expect(registry.ethereum.providerBUrl).toBe('https://example.com/eth-backup');
  });

  it('lowercases USDC contract addresses', () => {
    const registry = buildChainRegistry({});
    expect(registry.base.usdcContract).toBe(registry.base.usdcContract.toLowerCase());
  });

  it('isSupportedChain accepts every registered chain name', () => {
    expect(isSupportedChain('ethereum')).toBe(true);
    expect(isSupportedChain('base')).toBe(true);
    expect(isSupportedChain('arbitrum')).toBe(true);
    expect(isSupportedChain('optimism')).toBe(true);
    expect(isSupportedChain('polygon')).toBe(true);
  });

  it('isSupportedChain rejects unknown chain names', () => {
    expect(isSupportedChain('bitcoin')).toBe(false);
    expect(isSupportedChain('')).toBe(false);
    expect(isSupportedChain('Ethereum')).toBe(false);
  });

  it('getChainConfig returns the matching chain object', () => {
    const registry = buildChainRegistry({});
    expect(getChainConfig('polygon', registry).chainId).toBe(137);
  });

  it('getChainByChainId resolves a known chain ID and returns null for an unknown one', () => {
    const registry = buildChainRegistry({});
    expect(getChainByChainId(8453, registry)?.name).toBe('base');
    expect(getChainByChainId(999999, registry)).toBeNull();
  });
});

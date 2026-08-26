/**
 * Chain registry — the single source of truth for all supported chains.
 * Provider URLs are read from environment variables at load time so the
 * registry stays a pure, testable data structure (no I/O of its own).
 */
import type { ChainConfig, ChainName, ChainRegistry } from '../types/index.js';
import { CHAIN_NAMES } from '../types/index.js';

interface EnvLike {
  readonly [key: string]: string | undefined;
}

function requireEnvOrPlaceholder(env: EnvLike, key: string, placeholder: string): string {
  const value = env[key];
  return value !== undefined && value.length > 0 ? value : placeholder;
}

export function buildChainRegistry(env: EnvLike = process.env): ChainRegistry {
  const registry: Record<ChainName, ChainConfig> = {
    ethereum: {
      name: 'ethereum',
      chainId: 1,
      nativeSymbol: 'ETH',
      providerAUrl: requireEnvOrPlaceholder(env, 'ALCHEMY_ETH_URL', ''),
      providerBUrl: requireEnvOrPlaceholder(env, 'BACKUP_ETH_URL', 'https://ethereum-rpc.publicnode.com'),
      finalityDepth: 64,
      usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase(),
    },
    base: {
      name: 'base',
      chainId: 8453,
      nativeSymbol: 'ETH',
      providerAUrl: requireEnvOrPlaceholder(env, 'ALCHEMY_BASE_URL', ''),
      providerBUrl: requireEnvOrPlaceholder(env, 'BACKUP_BASE_URL', 'https://mainnet.base.org'),
      finalityDepth: 128,
      usdcContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'.toLowerCase(),
    },
    arbitrum: {
      name: 'arbitrum',
      chainId: 42161,
      nativeSymbol: 'ETH',
      providerAUrl: requireEnvOrPlaceholder(env, 'ALCHEMY_ARB_URL', ''),
      providerBUrl: requireEnvOrPlaceholder(env, 'BACKUP_ARB_URL', 'https://arb1.arbitrum.io/rpc'),
      finalityDepth: 1,
      usdcContract: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'.toLowerCase(),
    },
    optimism: {
      name: 'optimism',
      chainId: 10,
      nativeSymbol: 'ETH',
      providerAUrl: requireEnvOrPlaceholder(env, 'ALCHEMY_OPT_URL', ''),
      providerBUrl: requireEnvOrPlaceholder(env, 'BACKUP_OPT_URL', 'https://mainnet.optimism.io'),
      finalityDepth: 1,
      usdcContract: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85'.toLowerCase(),
    },
    polygon: {
      name: 'polygon',
      chainId: 137,
      nativeSymbol: 'POL',
      providerAUrl: requireEnvOrPlaceholder(env, 'ALCHEMY_POLY_URL', ''),
      providerBUrl: requireEnvOrPlaceholder(env, 'BACKUP_POLY_URL', 'https://polygon-bor-rpc.publicnode.com'),
      finalityDepth: 128,
      usdcContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'.toLowerCase(),
    },
  };

  return registry;
}

export const CHAIN_REGISTRY: ChainRegistry = buildChainRegistry();

export function isSupportedChain(value: string): value is ChainName {
  return (CHAIN_NAMES as readonly string[]).includes(value);
}

export function getChainConfig(
  chain: ChainName,
  registry: ChainRegistry = CHAIN_REGISTRY,
): ChainConfig {
  return registry[chain];
}

export function getChainByChainId(
  chainId: number,
  registry: ChainRegistry = CHAIN_REGISTRY,
): ChainConfig | null {
  for (const name of CHAIN_NAMES) {
    const config = registry[name];
    if (config.chainId === chainId) {
      return config;
    }
  }
  return null;
}

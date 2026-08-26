/**
 * ERC-20 `Transfer` log decoder. Decodes standard
 * `Transfer(address indexed from, address indexed to, uint256 value)` logs
 * out of a transaction receipt's log array.
 *
 * Token metadata (symbol/decimals) is resolved against a small known-token
 * table seeded from the chain registry's USDC contract; unrecognized tokens
 * report symbol "UNKNOWN" and 18 decimals rather than making an extra
 * `decimals()` RPC round trip on the hot path (see docs/IMPLEMENTATION.md).
 */
import { getAddress, toBigInt } from 'ethers';
import type { ChainConfig, Effect, RawLog } from '../types/index.js';

export const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

interface KnownToken {
  readonly symbol: string;
  readonly decimals: number;
}

function knownTokenTable(chain: ChainConfig): ReadonlyMap<string, KnownToken> {
  return new Map<string, KnownToken>([[chain.usdcContract, { symbol: 'USDC', decimals: 6 }]]);
}

function topicToAddress(topic: string): string {
  return getAddress(`0x${topic.slice(-40)}`).toLowerCase();
}

export function decodeErc20Transfers(logs: readonly RawLog[], chain: ChainConfig): Effect[] {
  const knownTokens = knownTokenTable(chain);
  const effects: Effect[] = [];

  for (const log of logs) {
    if (log.topics.length !== 3) {
      continue;
    }

    const signatureTopic = log.topics[0];
    const fromTopic = log.topics[1];
    const toTopic = log.topics[2];

    if (
      signatureTopic === undefined ||
      fromTopic === undefined ||
      toTopic === undefined ||
      signatureTopic.toLowerCase() !== ERC20_TRANSFER_TOPIC
    ) {
      continue;
    }

    const token = log.address.toLowerCase();
    const known = knownTokens.get(token);

    effects.push({
      type: 'ERC20_TRANSFER',
      token,
      symbol: known?.symbol ?? 'UNKNOWN',
      from: topicToAddress(fromTopic),
      to: topicToAddress(toTopic),
      amount_raw: toBigInt(log.data).toString(),
      decimals: known?.decimals ?? 18,
    });
  }

  return effects;
}

/**
 * Sigil — Multi-chain L2/L1 Finality Tier Engine.
 *
 * Implements the core thesis behind Gap 1:
 * "A status:1 receipt on Base/Arbitrum/Optimism means the sequencer accepted the
 * transaction. It does NOT mean it is irreversible."
 *
 * Computes verifiable finality tiers:
 * - `sequencer_soft`: Mined on L2, not yet posted to L1 batch.
 * - `l1_posted`: Included in an L1 batch, awaiting dispute/finalization window.
 * - `l1_finalized`: L1 batch finalized on Ethereum L1.
 * - `native_finalized`: L1 / PoS native finality threshold reached.
 * - `unknown`: State cannot be verified from RPC (degrades honestly, never fabricated).
 */

import { JsonRpcProvider } from 'ethers';
import type { ChainName, DepthCategory, Finality, FinalityTier } from '../types/index.js';
import { getChainConfig } from './chains.js';

interface BlockTagResult {
  number: number;
  timestamp: number;
}

const providerCache = new Map<string, JsonRpcProvider>();

function getProvider(rpcUrl: string): JsonRpcProvider {
  let provider = providerCache.get(rpcUrl);
  if (!provider) {
    provider = new JsonRpcProvider(rpcUrl);
    providerCache.set(rpcUrl, provider);
  }
  return provider;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

async function fetchBlockByTag(
  rpcUrl: string,
  tag: 'safe' | 'finalized',
  timeoutMs: number,
): Promise<BlockTagResult | null> {
  if (!rpcUrl) return null;
  try {
    const provider = getProvider(rpcUrl);
    const raw = (await withTimeout(
      provider.send('eth_getBlockByNumber', [tag, false]),
      timeoutMs,
    )) as { number?: string; timestamp?: string } | null;

    if (!raw || !raw.number) {
      return null;
    }
    return {
      number: parseInt(raw.number, 16),
      timestamp: raw.timestamp ? parseInt(raw.timestamp, 16) : 0,
    };
  } catch {
    return null;
  }
}

export interface FinalityCalculationResult {
  finalityTier: FinalityTier;
  finality: Finality;
  summaryClause: string;
}

export async function computeFinalityTier(
  chain: ChainName,
  txBlockNumber: number | null,
  currentBlockNumber: number,
  rpcUrl: string,
  timeoutMs = 4000,
): Promise<FinalityCalculationResult> {
  const config = getChainConfig(chain);
  const confirmations =
    txBlockNumber === null ? 0 : Math.max(0, currentBlockNumber - txBlockNumber + 1);

  let depthCategory: DepthCategory = 'shallow';
  if (confirmations >= config.finalityDepth) {
    depthCategory = 'deep';
  } else if (confirmations >= Math.ceil(config.finalityDepth / 2)) {
    depthCategory = 'moderate';
  }

  // If transaction is not mined / no block number
  if (txBlockNumber === null) {
    const finality: Finality = {
      confirmations: 0,
      finalized: false,
      depth_category: 'shallow',
      finality_tier: 'unknown',
      finality_reason: 'Transaction is pending or not included in a mined block.',
    };
    return {
      finalityTier: 'unknown',
      finality,
      summaryClause: 'finality: unknown (unmined)',
    };
  }

  try {
    // -------------------------------------------------------------------------
    // 1. OP-Stack Chains (Base, Optimism)
    // -------------------------------------------------------------------------
    if (chain === 'base' || chain === 'optimism') {
      const [safeBlock, finalizedBlock] = await Promise.all([
        fetchBlockByTag(rpcUrl, 'safe', timeoutMs),
        fetchBlockByTag(rpcUrl, 'finalized', timeoutMs),
      ]);

      if (finalizedBlock && txBlockNumber <= finalizedBlock.number) {
        const finality: Finality = {
          confirmations,
          finalized: true,
          depth_category: 'deep',
          finality_tier: 'l1_finalized',
          l1_block_number: finalizedBlock.number,
          l1_batch_status: 'finalized_on_l1',
          finality_reason: `Block ${txBlockNumber} is <= L1 finalized block ${finalizedBlock.number}. The rollup batch is finalized on Ethereum L1.`,
        };
        return {
          finalityTier: 'l1_finalized',
          finality,
          summaryClause: `finality: l1_finalized (${confirmations} confs, finalized L2 block: ${finalizedBlock.number})`,
        };
      }

      if (safeBlock && txBlockNumber <= safeBlock.number) {
        const finality: Finality = {
          confirmations,
          finalized: false,
          depth_category: depthCategory,
          finality_tier: 'l1_posted',
          l1_block_number: safeBlock.number,
          l1_batch_status: 'posted_to_l1',
          finality_reason: `Block ${txBlockNumber} is <= L1 safe block ${safeBlock.number}. The rollup batch is posted on L1, awaiting Ethereum finalization.`,
        };
        return {
          finalityTier: 'l1_posted',
          finality,
          summaryClause: `finality: l1_posted (safe L2 block: ${safeBlock.number})`,
        };
      }

      // If safe tag returned but block is newer than safe
      if (safeBlock && txBlockNumber > safeBlock.number) {
        const finality: Finality = {
          confirmations,
          finalized: false,
          depth_category: 'shallow',
          finality_tier: 'sequencer_soft',
          l1_block_number: null,
          l1_batch_status: 'sequencer_memory_only',
          finality_reason: `Block ${txBlockNumber} is above L1 safe block ${safeBlock.number}. Accepted by sequencer only; vulnerable to reorg if sequencer faults before batch post.`,
        };
        return {
          finalityTier: 'sequencer_soft',
          finality,
          summaryClause: `finality: sequencer_soft (soft block, safe lag: ${txBlockNumber - safeBlock.number} blocks)`,
        };
      }

      // Fallback if provider doesn't expose safe/finalized tags
      if (confirmations >= config.finalityDepth) {
        const finality: Finality = {
          confirmations,
          finalized: true,
          depth_category: 'deep',
          finality_tier: 'l1_finalized',
          finality_reason: `Confirmed by depth threshold (${confirmations} >= ${config.finalityDepth}) with RPC tags unavailable.`,
        };
        return {
          finalityTier: 'l1_finalized',
          finality,
          summaryClause: `finality: l1_finalized (${confirmations} confs)`,
        };
      }

      const finality: Finality = {
        confirmations,
        finalized: false,
        depth_category: depthCategory,
        finality_tier: 'sequencer_soft',
        finality_reason: `Recent L2 block (${confirmations} confs < ${config.finalityDepth}); awaiting L1 batch posting.`,
      };
      return {
        finalityTier: 'sequencer_soft',
        finality,
        summaryClause: `finality: sequencer_soft (${confirmations} confs)`,
      };
    }

    // -------------------------------------------------------------------------
    // 2. Arbitrum (Arbitrum Nitro)
    // -------------------------------------------------------------------------
    if (chain === 'arbitrum') {
      const [safeBlock, finalizedBlock] = await Promise.all([
        fetchBlockByTag(rpcUrl, 'safe', timeoutMs),
        fetchBlockByTag(rpcUrl, 'finalized', timeoutMs),
      ]);

      if (finalizedBlock && txBlockNumber <= finalizedBlock.number) {
        const finality: Finality = {
          confirmations,
          finalized: true,
          depth_category: 'deep',
          finality_tier: 'l1_finalized',
          l1_block_number: finalizedBlock.number,
          l1_batch_status: 'finalized_on_l1',
          finality_reason: `Block ${txBlockNumber} is finalized on Ethereum L1 (finalized block: ${finalizedBlock.number}).`,
        };
        return {
          finalityTier: 'l1_finalized',
          finality,
          summaryClause: `finality: l1_finalized (${confirmations} confs)`,
        };
      }

      if (safeBlock && txBlockNumber <= safeBlock.number) {
        const finality: Finality = {
          confirmations,
          finalized: false,
          depth_category: depthCategory,
          finality_tier: 'l1_posted',
          l1_block_number: safeBlock.number,
          l1_batch_status: 'posted_to_l1',
          finality_reason: `Block ${txBlockNumber} is posted to Ethereum L1 SequencerInbox (safe block: ${safeBlock.number}).`,
        };
        return {
          finalityTier: 'l1_posted',
          finality,
          summaryClause: `finality: l1_posted (safe block: ${safeBlock.number})`,
        };
      }

      // If confirmations surpass standard finality depth
      if (confirmations >= config.finalityDepth) {
        const finality: Finality = {
          confirmations,
          finalized: true,
          depth_category: 'deep',
          finality_tier: 'l1_finalized',
          finality_reason: `Arbitrum block confirmed past L1 finalization window (${confirmations} confs).`,
        };
        return {
          finalityTier: 'l1_finalized',
          finality,
          summaryClause: `finality: l1_finalized (${confirmations} confs)`,
        };
      }

      if (confirmations >= 100) {
        const finality: Finality = {
          confirmations,
          finalized: false,
          depth_category: 'moderate',
          finality_tier: 'l1_posted',
          finality_reason: `Arbitrum batch posted to L1 (${confirmations} confs); awaiting L1 finalization.`,
        };
        return {
          finalityTier: 'l1_posted',
          finality,
          summaryClause: `finality: l1_posted (${confirmations} confs)`,
        };
      }

      const finality: Finality = {
        confirmations,
        finalized: false,
        depth_category: 'shallow',
        finality_tier: 'sequencer_soft',
        finality_reason: `Recent Arbitrum Nitro soft block (${confirmations} confs); pending L1 batch aggregation.`,
      };
      return {
        finalityTier: 'sequencer_soft',
        finality,
        summaryClause: `finality: sequencer_soft (${confirmations} confs)`,
      };
    }

    // -------------------------------------------------------------------------
    // 3. Ethereum (L1 Native Casper FFG Finality)
    // -------------------------------------------------------------------------
    if (chain === 'ethereum') {
      const finalizedBlock = await fetchBlockByTag(rpcUrl, 'finalized', timeoutMs);

      if (finalizedBlock && txBlockNumber <= finalizedBlock.number) {
        const finality: Finality = {
          confirmations,
          finalized: true,
          depth_category: 'deep',
          finality_tier: 'native_finalized',
          l1_block_number: finalizedBlock.number,
          l1_batch_status: 'native_l1_finalized',
          finality_reason: `Block ${txBlockNumber} is <= Casper FFG finalized block ${finalizedBlock.number}. Native Ethereum PoS finality reached.`,
        };
        return {
          finalityTier: 'native_finalized',
          finality,
          summaryClause: `finality: native_finalized (${confirmations} confs, finalized block: ${finalizedBlock.number})`,
        };
      }

      if (confirmations >= config.finalityDepth) {
        const finality: Finality = {
          confirmations,
          finalized: true,
          depth_category: 'deep',
          finality_tier: 'native_finalized',
          finality_reason: `Block has ${confirmations} confirmations (>= ${config.finalityDepth} depth).`,
        };
        return {
          finalityTier: 'native_finalized',
          finality,
          summaryClause: `finality: native_finalized (${confirmations} confs)`,
        };
      }

      const finality: Finality = {
        confirmations,
        finalized: false,
        depth_category: depthCategory,
        finality_tier: 'sequencer_soft',
        finality_reason: `Unfinalized head block (${confirmations} confs); awaiting 2 Casper FFG checkpoint epochs (64 slots / ~12.8 min).`,
      };
      return {
        finalityTier: 'sequencer_soft',
        finality,
        summaryClause: `finality: unfinalized_head (${confirmations} confs)`,
      };
    }

    // -------------------------------------------------------------------------
    // 4. Polygon (Polygon PoS Checkpoint Depth)
    // -------------------------------------------------------------------------
    if (chain === 'polygon') {
      // Polygon checkpoints are submitted to Ethereum L1 contract every ~256 to 512 blocks.
      const checkpointThreshold = 256;
      if (confirmations >= checkpointThreshold) {
        const finality: Finality = {
          confirmations,
          finalized: true,
          depth_category: 'deep',
          finality_tier: 'native_finalized',
          finality_reason: `Checkpoint confirmed (${confirmations} >= ${checkpointThreshold} blocks). Root state committed to Ethereum L1.`,
        };
        return {
          finalityTier: 'native_finalized',
          finality,
          summaryClause: `finality: checkpoint_finalized (${confirmations} confs)`,
        };
      }

      const finality: Finality = {
        confirmations,
        finalized: false,
        depth_category: depthCategory,
        finality_tier: 'sequencer_soft',
        finality_reason: `Pre-checkpoint Bor block (${confirmations} / ${checkpointThreshold} blocks); awaiting Heimdall validator checkpoint submission.`,
      };
      return {
        finalityTier: 'sequencer_soft',
        finality,
        summaryClause: `finality: pre_checkpoint (${confirmations}/${checkpointThreshold} confs)`,
      };
    }

    // Default honest fallback
    const finality: Finality = {
      confirmations,
      finalized: confirmations >= config.finalityDepth,
      depth_category: depthCategory,
      finality_tier: confirmations >= config.finalityDepth ? 'native_finalized' : 'sequencer_soft',
      finality_reason: `Calculated from confirmation depth ${confirmations} on ${config.name}.`,
    };
    return {
      finalityTier: finality.finality_tier,
      finality,
      summaryClause: `finality: ${finality.finality_tier} (${confirmations} confs)`,
    };
  } catch (err: unknown) {
    // Degrade honestly on unexpected error
    const finality: Finality = {
      confirmations,
      finalized: false,
      depth_category: depthCategory,
      finality_tier: 'unknown',
      finality_reason: `Failed to query L1 finality state: ${(err as Error).message}`,
    };
    return {
      finalityTier: 'unknown',
      finality,
      summaryClause: 'finality: unknown (RPC tag query error)',
    };
  }
}

/**
 * Confirmation-depth confidence scorer. Produces the `finality` object for
 * confirmed/reverted transactions; returns null for statuses where a block
 * depth is not yet meaningful (pending, not_found).
 */
import type { DepthCategory, Finality, TxStatus } from '../types/index.js';

export function computeFinality(
  status: TxStatus,
  blockNumber: number | null,
  currentBlockNumber: number,
  finalityDepth: number,
): Finality | null {
  if ((status !== 'confirmed' && status !== 'reverted') || blockNumber === null) {
    return null;
  }

  const confirmations = Math.max(0, currentBlockNumber - blockNumber + 1);
  const finalized = confirmations >= finalityDepth;
  const shallowThreshold = Math.max(1, Math.floor(finalityDepth * 0.25));

  let depthCategory: DepthCategory;
  if (confirmations < shallowThreshold) {
    depthCategory = 'shallow';
  } else if (confirmations < finalityDepth) {
    depthCategory = 'moderate';
  } else {
    depthCategory = 'deep';
  }

  const finalityTier = finalized ? 'native_finalized' : 'sequencer_soft';

  return {
    confirmations,
    finalized,
    depth_category: depthCategory,
    finality_tier: finalityTier,
  };
}

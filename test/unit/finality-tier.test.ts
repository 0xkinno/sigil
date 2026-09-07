import { describe, expect, it } from 'vitest';
import { computeFinalityTier } from '../../src/core/finality-tier.js';

describe('Finality Tier Engine', () => {
  it('handles null block number gracefully with unknown tier', async () => {
    const res = await computeFinalityTier('base', null, 18500000, '');
    expect(res.finalityTier).toBe('unknown');
    expect(res.finality.finalized).toBe(false);
    expect(res.finality.confirmations).toBe(0);
  });

  it('computes sequencer_soft on Base when confirmations are shallow', async () => {
    // Current block 18500010, tx block 18500000 -> 11 confirmations (shallow)
    const res = await computeFinalityTier('base', 18500000, 18500010, '');
    expect(res.finalityTier).toBe('sequencer_soft');
    expect(res.finality.confirmations).toBe(11);
    expect(res.finality.finalized).toBe(false);
  });

  it('computes l1_finalized on Base when confirmations exceed finalityDepth', async () => {
    // Current block 18500200, tx block 18500000 -> 201 confirmations (>= 128)
    const res = await computeFinalityTier('base', 18500000, 18500200, '');
    expect(res.finalityTier).toBe('l1_finalized');
    expect(res.finality.finalized).toBe(true);
    expect(res.finality.depth_category).toBe('deep');
  });

  it('computes native_finalized on Polygon when checkpoint threshold (256) is met', async () => {
    // Tx block 50000000, current block 50000300 -> 301 confirmations (>= 256)
    const res = await computeFinalityTier('polygon', 50000000, 50000300, '');
    expect(res.finalityTier).toBe('native_finalized');
    expect(res.finality.finalized).toBe(true);
  });

  it('computes sequencer_soft on Polygon when below checkpoint threshold', async () => {
    const res = await computeFinalityTier('polygon', 50000000, 50000100, '');
    expect(res.finalityTier).toBe('sequencer_soft');
    expect(res.finality.finalized).toBe(false);
  });

  it('computes native_finalized on Ethereum when deep confirmations met', async () => {
    // Tx block 20000000, current block 20000100 -> 101 confirmations (>= 64)
    const res = await computeFinalityTier('ethereum', 20000000, 20000100, '');
    expect(res.finalityTier).toBe('native_finalized');
    expect(res.finality.finalized).toBe(true);
  });
});

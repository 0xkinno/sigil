import { describe, expect, it } from 'vitest';
import { computeFinality } from '../../src/core/confidence.js';

describe('computeFinality', () => {
  it('returns shallow depth for a transaction just mined', () => {
    const finality = computeFinality('confirmed', 100, 100, 64);
    expect(finality?.confirmations).toBe(1);
    expect(finality?.depth_category).toBe('shallow');
    expect(finality?.finalized).toBe(false);
  });

  it('returns moderate depth partway through the finality window', () => {
    const finality = computeFinality('confirmed', 100, 120, 64);
    expect(finality?.confirmations).toBe(21);
    expect(finality?.depth_category).toBe('moderate');
    expect(finality?.finalized).toBe(false);
  });

  it('returns deep and finalized once past the finality depth', () => {
    const finality = computeFinality('confirmed', 100, 200, 64);
    expect(finality?.confirmations).toBe(101);
    expect(finality?.depth_category).toBe('deep');
    expect(finality?.finalized).toBe(true);
  });

  it('computes finality for reverted transactions the same way as confirmed', () => {
    const finality = computeFinality('reverted', 100, 200, 64);
    expect(finality?.depth_category).toBe('deep');
  });

  it('returns null for pending status', () => {
    expect(computeFinality('pending', null, 100, 64)).toBeNull();
  });

  it('returns null for not_found status', () => {
    expect(computeFinality('not_found', null, 100, 64)).toBeNull();
  });

  it('returns null when blockNumber is null even for confirmed status', () => {
    expect(computeFinality('confirmed', null, 100, 64)).toBeNull();
  });

  it('uses a low finality depth (L2) correctly, e.g. Arbitrum/Optimism (1 block)', () => {
    const finality = computeFinality('confirmed', 100, 101, 1);
    expect(finality?.finalized).toBe(true);
    expect(finality?.depth_category).toBe('deep');
  });

  it('never returns negative confirmations even if currentBlock < blockNumber', () => {
    const finality = computeFinality('confirmed', 200, 100, 64);
    expect(finality?.confirmations).toBe(0);
  });
});

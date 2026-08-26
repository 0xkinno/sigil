import { describe, expect, it } from 'vitest';
import { validateLookupInput } from '../../src/utils/validation.js';

const VALID_HASH = `0x${'a'.repeat(64)}`;

describe('validateLookupInput', () => {
  it('accepts a valid chain + tx_hash pair', () => {
    const result = validateLookupInput('base', VALID_HASH);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.chain).toBe('base');
      expect(result.txHash).toBe(VALID_HASH);
    }
  });

  it('rejects a missing chain parameter', () => {
    const result = validateLookupInput(undefined, VALID_HASH);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe('INVALID_INPUT');
    }
  });

  it('rejects a missing tx_hash parameter', () => {
    const result = validateLookupInput('base', undefined);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe('INVALID_INPUT');
    }
  });

  it('rejects an empty string chain parameter', () => {
    const result = validateLookupInput('', VALID_HASH);
    expect(result.valid).toBe(false);
  });

  it('rejects an unsupported chain name', () => {
    const result = validateLookupInput('bitcoin', VALID_HASH);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe('UNSUPPORTED_CHAIN');
    }
  });

  it('rejects a tx_hash that is too short', () => {
    const result = validateLookupInput('base', '0xabc123');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errorCode).toBe('INVALID_INPUT');
    }
  });

  it('rejects a tx_hash missing the 0x prefix', () => {
    const result = validateLookupInput('base', 'a'.repeat(64));
    expect(result.valid).toBe(false);
  });

  it('rejects a tx_hash with non-hex characters', () => {
    const result = validateLookupInput('base', `0x${'z'.repeat(64)}`);
    expect(result.valid).toBe(false);
  });

  it('accepts chain names case-insensitively', () => {
    const result = validateLookupInput('BASE', VALID_HASH);
    expect(result.valid).toBe(true);
  });

  it('lowercases an uppercase tx_hash on success', () => {
    const upper = `0x${'A'.repeat(64)}`;
    const result = validateLookupInput('base', upper);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.txHash).toBe(`0x${'a'.repeat(64)}`);
    }
  });

  it('rejects non-string query values (e.g. arrays from repeated query params)', () => {
    const result = validateLookupInput(['base', 'ethereum'], VALID_HASH);
    expect(result.valid).toBe(false);
  });

  it('trims surrounding whitespace from the chain parameter', () => {
    const result = validateLookupInput('  base  ', VALID_HASH);
    expect(result.valid).toBe(true);
  });
});

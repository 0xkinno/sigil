/**
 * Input validation for GET /lookup — Section 10 of Sigil_Instruction.md.
 */
import { isSupportedChain } from '../core/chains.js';
import type { ValidationResult } from '../types/index.js';
import { sanitizeChainParam, sanitizeTxHashParam } from './sanitize.js';

const TX_HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

export function validateLookupInput(rawChain: unknown, rawTxHash: unknown): ValidationResult {
  const chain = sanitizeChainParam(rawChain);
  const txHash = sanitizeTxHashParam(rawTxHash);

  if (chain === undefined) {
    return {
      valid: false,
      errorCode: 'INVALID_INPUT',
      errorDetail: 'Missing or empty required "chain" parameter.',
    };
  }

  if (txHash === undefined) {
    return {
      valid: false,
      errorCode: 'INVALID_INPUT',
      errorDetail: 'Missing or empty required "tx_hash" parameter.',
    };
  }

  if (!isSupportedChain(chain)) {
    return {
      valid: false,
      errorCode: 'UNSUPPORTED_CHAIN',
      errorDetail: `Chain "${chain}" is not supported. Supported chains: ethereum, base, arbitrum, optimism, polygon.`,
    };
  }

  if (!TX_HASH_PATTERN.test(txHash)) {
    return {
      valid: false,
      errorCode: 'INVALID_INPUT',
      errorDetail: 'tx_hash must be a 0x-prefixed 64-character hexadecimal string.',
    };
  }

  return { valid: true, chain, txHash: txHash.toLowerCase() };
}

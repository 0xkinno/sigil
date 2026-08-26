/**
 * Canonical string builder — the field validators score against ground
 * truth. Format: chain|tx_hash|status|block_number|from|to|value_wei
 * See Section 9 of Sigil_Instruction.md. Empty strings represent unknown
 * fields (pending / not_found); this function performs no normalization —
 * callers must already pass lowercase hex/addresses.
 */
import type { CanonicalFields } from '../types/index.js';

export function buildCanonical(fields: CanonicalFields): string {
  return [
    fields.chain,
    fields.txHash,
    fields.status,
    fields.blockNumber,
    fields.from,
    fields.to,
    fields.valueWei,
  ].join('|');
}

export const EMPTY_CANONICAL = '';

# Sigil — Canonical Fixtures

## Format Specification (Section 9 of Sigil_Instruction.md)

```
chain|tx_hash|status|block_number|from|to|value_wei
```

All addresses lowercase. All hex lowercase. `value_wei` is decimal string.
`block_number` is decimal string. Empty fields for pending/not_found.

---

## Known Test Fixtures

### Fixture 1: Base USDC Transfer (Veyctum Compatibility)

| Field | Value |
|-------|-------|
| Chain | base |
| TX Hash | `0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7` |
| Status | confirmed |
| Expected canonical prefix | `base\|0x373982c...\|confirmed\|` |
| ERC-20 effects | 1 USDC transfer |
| Source | Veyctum's published positive fixture |

**To verify:**
```bash
npx tsx scripts/probe.ts https://sigil.onrender.com base \
  0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7
```

---

### Fixture 2: Ethereum ETH Transfer

> To be filled in after live RPC testing. Use a known simple ETH transfer.
> Suggested search: Etherscan → find a recent confirmed ETH transfer with no logs.

| Field | Value |
|-------|-------|
| Chain | ethereum |
| TX Hash | _TBD — find from Etherscan_ |
| Status | confirmed |
| Expected value_wei | _non-zero ETH amount in wei_ |

---

### Fixture 3: Reverted Transaction

| Field | Value |
|-------|-------|
| Chain | _any_ |
| TX Hash | _TBD — find a known reverted tx_ |
| Status | reverted |
| Expected canonical | `chain\|hash\|reverted\|block\|from\|to\|value` |

---

### Fixture 4: Not Found (Wrong Chain)

| Description | Querying a Base tx hash on Ethereum should return `not_found` |
|-------------|---------------------------------------------------------------|
| TX Hash | `0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7` |
| Chain | ethereum |
| Expected canonical | `ethereum\|0x373982c...\|not_found\|\|\|\|` |

---

## Canonical Format Regression Test

The integration test `test/integration/canonical-compat.test.ts` asserts that:

1. Every canonical string has exactly 7 pipe-delimited fields.
2. Field 0 is the lowercase chain name.
3. Field 1 is the full 66-char 0x-prefixed tx hash.
4. Field 2 is one of: `confirmed`, `reverted`, `pending`, `not_found`.
5. Field 6 is a decimal string (not hex).
6. The Veyctum fixture produces the correct canonical prefix.

Run: `npm run test:integration`

---

## Side-by-Side: Sigil vs Verity (target: identical format)

| Field | Sigil | Verity |
|-------|-------|--------|
| Separator | `\|` | `\|` |
| Chain | lowercase | lowercase |
| TX hash | 0x-prefixed lowercase | 0x-prefixed lowercase |
| Status | confirmed/reverted/pending/not_found | confirmed/reverted/pending/not_found |
| Block number | decimal string | decimal string |
| From | lowercase address | lowercase address |
| To | lowercase address | lowercase address |
| Value | decimal wei | decimal wei |

**Result: Formats are identical.** ✅

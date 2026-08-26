# Sigil — Competitive Analysis

Source: `Sigil_Instruction.md`, Section 3. Update this file whenever a competitor's miner
changes observable behavior (new chains, new fields, YAML changes visible via the explorer).

| Competitor | Miner ID | Chains | Dual-RPC | ERC-20 Effects | Confidence Scoring | Notes |
|---|---|---|---|---|---|---|
| **Verity** | 9001 | 5 (eth, base, arb, op, poly) | No | No | No | Clean canonical format, already registered |
| **Veyctum** | 9005 | 1 (base only) | Yes | Yes (ERC-20 only) | No | 67 hermetic + 5 integration tests, consumer proof gate, most technically deep |
| **DegenLens** | — | Multi-intent (tx lookup, wallet balance, fraud) | Unknown | Unknown | Unknown | Gambling-focused, `data_source` can be demo/unavailable |
| **TxLens** | — | 5 | No (single endpoint) | No | Yes | Confirmation depth scoring, no dual-RPC |
| **Sigil** | TBD (assign at registration) | 5 | Yes (all 5 chains) | Yes | Yes | All 7 differentiators combined |

## Sigil's Moat

No competitor combines all of: 5-chain coverage, dual-RPC consensus, ERC-20 decoding,
confirmation-depth confidence, sub-second parallel responses, 12-state error taxonomy, and
canonical exact-match. Each competitor has 2-3 of these; Sigil targets all 7.

## Monitoring Plan

Once registered, periodically check `https://devnode.telegraphprotocol.com/api/miners` and
`https://explorer.telegraphprotocol.com/miners` for:
- New miners entering `ONCHAIN_TX_LOOKUP`
- Competitors adding chains or dual-RPC to close the gap
- Leaderboard score movement

Update this table with real data (not the placeholder claims above) once registration is live
and competitor endpoints have been directly probed.

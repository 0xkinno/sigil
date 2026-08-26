# Sigil — Win Plan

Source: `Sigil_Instruction.md`, Section 20. Update the "Actuals" column as real scoring data
becomes available after registration.

## The Math

| Component | Max | Target | Actual |
|---|---|---|---|
| Normalized Performance | 75 | 75 (highest canonical accuracy in `ONCHAIN_TX_LOOKUP`) | TBD |
| X Engagement & Transparency | 25 | 18-22 | TBD |
| **Total** | **100** | **93-97** | TBD |

## Path to 75/75 (Performance)

1. Canonical format matches the Verity/Veyctum shared fixture exactly (Section 9).
2. Correct data for every validator test query across all 5 chains.
3. 99%+ uptime during the scoring window.
4. All edge cases handled: pending, reverted, not found, invalid input, RPC disagreement.
5. Sub-2-second response times via parallel dual-RPC queries.

## Path to 18-22/25 (X Engagement)

1. Post every 2-3 days per the schedule in Section 17 of the instruction file.
2. Every post includes real technical evidence (screenshot, hash, response) — no hype.
3. Tag `@Telegraphprotoc` on every post.
4. Engage with other builders' posts for community visibility.

## Competitive Positioning

See [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) for the live comparison against
Verity, Veyctum, DegenLens, and TxLens.

## Risks

| Risk | Mitigation |
|---|---|
| A competitor adds dual-RPC + 5-chain coverage before scoring closes | Ship Phase 1-3 fast; the combination of all 7 differentiators is the moat, not any single one |
| Free-tier RPC rate limits cause timeouts under validator load | Dual-RPC fallback to single-provider (confidence 0.8) rather than hard failure; monitor `/ready` |
| Render free tier cold-starts hurt response time / uptime scoring | Builder to evaluate a paid Render tier before the scoring window if cold starts are observed |
| Canonical format drift vs. Verity | Dedicated compatibility test (`canonical-compat.test.ts`) run in CI on every push |

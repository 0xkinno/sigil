# Sigil — Product Requirements Document

## Problem

Autonomous agents that receive a transaction hash as proof of payment typically call a single
RPC provider and trust `receipt.status` blindly. `status == 1` only means execution did not
revert — it is not proof that value actually moved as expected. Agents relying on a single
centralized RPC provider also have no defense against that provider serving stale, incorrect,
or manipulated data.

## Solution

Sigil is a Telegraph miner for the `ONCHAIN_TX_LOOKUP` intent. It queries two independent RPC
providers per request, requires them to agree on every critical fact before returning a result,
decodes actual ERC-20 transfer effects (not just native value), and scores confirmation depth
into a confidence value. If providers disagree, Sigil fails closed and returns
`RPC_DISAGREEMENT` rather than fabricating certainty.

## Target User

Autonomous DeFi agents, trading bots, escrow systems, and payment-verification workflows
operating on Telegraph Protocol.

## Success Metrics (Miner Track scoring)

- **75 pts — Normalized Performance:** highest average Canonical Score in `ONCHAIN_TX_LOOKUP`.
- **25 pts — X Engagement & Transparency:** consistent, evidence-backed updates tagging
  `@Telegraphprotoc`.

## Functional Requirements

1. `GET /lookup?chain=<chain>&tx_hash=<hash>` returns a canonical, schema-conformant response
   for all 5 supported chains: ethereum, base, arbitrum, optimism, polygon.
2. Every lookup queries two independent RPC providers in parallel and fails closed on
   disagreement.
3. ERC-20 `Transfer` log events are decoded into an `effects[]` array.
4. Confirmation depth is scored into a `confidence` value and `finality` object.
5. All 12 error/status states in Section 13 of `Sigil_Instruction.md` are implemented.
6. `GET /health`, `GET /ready`, `GET /sigil.yaml` are implemented per Section 10.
7. The canonical string format exactly matches the Verity incumbent format:
   `chain|tx_hash|status|block_number|from|to|value_wei`.

## Non-Functional Requirements

- TypeScript strict mode, zero `any`.
- Sub-2-second response times for all chains under normal RPC latency.
- 70+ tests (unit + integration combined).
- 99%+ uptime during the scoring window.
- No secrets committed; `.env` is gitignored.

## Out of Scope (this hackathon cycle)

- ERC-721 / ERC-1155 transfer detection (see `FUTURE.md`).
- Non-EVM chains (Solana, etc.) (see `FUTURE.md`).
- Internal transaction / trace decoding (see `FUTURE.md`).

## Status

Phase 0 (Foundation) complete. See [PROGRESS.md](./PROGRESS.md) for current state and
[PLAN.md](./PLAN.md) for the full phase breakdown.

# Sigil — Architecture

## System Overview

Sigil is a Telegraph Protocol miner serving the `ONCHAIN_TX_LOOKUP` intent. It accepts a
transaction hash and chain name, queries two independent RPC providers in parallel, verifies
they agree on the critical transaction facts, and returns a deterministic canonical response.

```
                    Telegraph Engine
                         |
                    x402 Payment Gate
                         |
                   SIGIL MINER SERVER
                    (Node.js / TypeScript)
                         |
              +----------+----------+
              |                     |
         Provider A            Provider B
         (Alchemy)          (QuickNode/Public)
              |                     |
              +----------+----------+
                         |
                  Agreement Check
                  (fail-closed)
                         |
              +----------+----------+
              |                     |
         Receipt Data         Log Decoding
         (status, block,      (ERC-20 Transfer
          from, to, value)     events)
              |                     |
              +----------+----------+
                         |
                  Canonical Builder
                  chain|tx_hash|status|block_number|from|to|value_wei
                         |
                  Response Formatter
                  (canonical + effects + evidence + confidence)
                         |
                    Telegraph Signal
```

## Component Map

| Component | File | Responsibility | Status |
|---|---|---|---|
| Chain registry | `src/core/chains.ts` | Static config for all 5 supported chains | Done |
| Config | `src/config.ts` | Typed env-driven runtime constants | Done |
| Types | `src/types/index.ts` | All shared TypeScript interfaces | Done |
| Express server | `src/index.ts` | HTTP entrypoint, middleware wiring | Done (foundation) |
| Request logger | `src/middleware/request-logger.ts` | Structured JSON logs, header redaction | Done |
| Error handler | `src/middleware/error-handler.ts` | Global error → JSON response | Done |
| Rate limiter | `src/middleware/rate-limit.ts` | Per-window request cap | Done |
| Health route | `src/routes/health.ts` | `GET /health` liveness | Done |
| RPC client | `src/core/rpc-client.ts` | `ethers.js` provider abstraction | Done |
| Dual-RPC engine | `src/core/dual-rpc.ts` | Parallel query + agreement check | Done |
| Canonical builder | `src/core/canonical.ts` | Canonical string construction | Done |
| Effects decoder | `src/core/effects.ts` | ERC-20 `Transfer` log decoding | Done |
| Confidence scorer | `src/core/confidence.ts` | Confirmation-depth confidence | Done |
| Validation | `src/utils/validation.ts`, `src/utils/sanitize.ts` | Query param validation | Done |
| Lookup route | `src/routes/lookup.ts` | `GET /lookup` | Pending (Phase 2) |
| Ready route | `src/routes/health.ts` (extend) | `GET /ready` | Pending (Phase 2) |
| YAML route | `src/routes/yaml.ts` | `GET /sigil.yaml` | Pending (Phase 3) |

## Data Flow (target, Phase 1-2)

1. Client calls `GET /lookup?chain=base&tx_hash=0x...`
2. `utils/validation.ts` validates chain name and hash format
3. `core/dual-rpc.ts` queries Provider A and Provider B in parallel via `core/rpc-client.ts`
4. Agreement check compares `status`, `blockNumber`, `from`, `to`, `value`, `logs.length`
5. On agreement: `core/effects.ts` decodes ERC-20 `Transfer` logs, `core/confidence.ts` scores
   confirmation depth, `core/canonical.ts` builds the canonical string
6. `routes/lookup.ts` assembles the full JSON response and returns it

## Design Principles

- **Fail closed.** Any disagreement between providers returns `RPC_DISAGREEMENT` with
  confidence 0 — never a best-guess answer.
- **Deterministic canonical output.** The canonical string is the only thing validators score;
  it must be byte-identical to the spec for a given chain state.
- **No `any`.** TypeScript strict mode end to end.
- **Parallel, not sequential.** All RPC calls fan out with `Promise.allSettled`.

## Related Docs

[PRD.md](./PRD.md) · [PLAN.md](./PLAN.md) · [IMPLEMENTATION.md](./IMPLEMENTATION.md) ·
[PROGRESS.md](./PROGRESS.md)

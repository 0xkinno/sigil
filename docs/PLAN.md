# Sigil — Build Plan

Source of truth: `Sigil_Instruction.md`, Section 7. This file tracks phase status only;
task-level detail lives in [TASKS.md](./TASKS.md).

| Phase | Scope | Hours | Status |
|---|---|---|---|
| 0 — Foundation | Repo, TS config, lint/format, CI, chain registry, types, empty server on Render | 0-4 | **Complete** |
| 1 — Core Engine | RPC client, dual-RPC, canonical builder, effects decoder, confidence scorer, 50+ unit tests | 4-16 | **Complete** |
| 2 — API Layer | `/lookup`, `/health`, `/ready`, `/sigil.yaml`, rate limiting, logging, error handler, integration tests | 16-24 | Not started |
| 3 — YAML & Registration | `sigil.yaml`, IPFS pin, on-chain registration | 24-32 | Not started |
| 4 — Hardening & Evidence | All 12 error states, load test, evidence collection | 32-44 | Not started |
| 5 — Polish & Ship | README, evidence/README.md, final deploy, X post | 44-56 | Not started |
| 6 — Track 3 Application | Dashboard, 100+ real requests | Aug 31 - Sep 7 | Not started |

## Phase 0 Completion Notes

- Project initialized at repo root (this directory), not a nested `sigil/` folder, per builder
  instruction to keep everything inside `Sigil_Telegraph/`.
- `npm init`, dependencies installed (Express 5, ethers v6, dotenv, express-rate-limit, cors,
  helmet; dev: TypeScript, ESLint 10 flat config, Prettier, Vitest, esbuild, tsx).
- TypeScript strict mode enabled with the full strict flag set (see `tsconfig.json`).
- Chain registry (`src/core/chains.ts`) covers all 5 chains with chain IDs, finality depths,
  and USDC contract addresses from Section 12.
- Type definitions (`src/types/index.ts`) cover the full response/request/error surface so
  later phases implement against a fixed contract.
- Minimal Express server with `/health`, security headers (helmet), CORS, rate limiting,
  structured logging, and a global error handler is live and passes local smoke test.
- Hosting: Render (builder's choice). `render.yaml` blueprint is committed; the builder is
  connecting the GitHub repo and configuring the service manually — see
  [HANDOFF.md](./HANDOFF.md).

## Phase 1 Completion Notes

- `src/core/rpc-client.ts` normalizes ethers.js `JsonRpcProvider` calls (`getTransaction`,
  `getTransactionReceipt`, `getBlockNumber`, `getNetwork`) into a `ProviderTxResult`, with a
  per-URL provider cache and a `Promise.race`-based timeout (`RpcTimeoutError`).
- `src/core/dual-rpc.ts` fans out to both providers in parallel via `Promise.all`, compares
  every critical field (`fieldsAgree`), and fails closed: `RPC_DISAGREEMENT` on mismatch,
  `CHAIN_ID_MISMATCH` if either provider reports the wrong chain ID, `TIMEOUT`/`UPSTREAM_ERROR`
  when both fail, and a reduced-confidence (0.8) single-provider fallback when only one
  succeeds. The query function is injectable, so `dual-rpc.test.ts` mocks both providers
  without any network access.
- `src/core/canonical.ts` is a pure formatter — 7 fields joined by `|`, no normalization (the
  caller is responsible for lowercasing); verified against the Section 9 fixture shape.
- `src/core/effects.ts` decodes standard `Transfer(address,address,uint256)` logs using the
  well-known topic0 hash, with a known-token table seeded from each chain's USDC contract.
- `src/core/confidence.ts` (`computeFinality`) scores confirmation depth into `shallow` /
  `moderate` / `deep` and a `finalized` boolean, returning `null` for pending/not_found where
  depth isn't meaningful.
- `src/utils/{sanitize,validation}.ts` validate raw (`unknown`-typed) Express query params
  before anything touches an RPC call.
- 60 unit tests across 6 files (`chains`, `canonical`, `effects`, `confidence`, `validation`,
  `dual-rpc`), all network-mocked — no live RPC calls in `npm test`. `npm run lint`,
  `npm run typecheck`, `npm run format:check`, and `npm run build` are all clean.
- Fixed two rough edges found while wiring this up: `eslint`/`prettier` npm scripts referenced
  the still-empty `scripts/` directory and failed with "no files matching pattern" — narrowed
  the globs to `src` + `test` (will re-add `scripts` once Phase 3 populates it).

## Next Up (Phase 2)

See TASKS.md for the itemized breakdown of the API layer work: `GET /lookup`, `GET /ready`,
`GET /sigil.yaml`, and the integration test suite.

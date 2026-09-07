# Sigil — Task List

Legend: `[x]` done, `[ ]` pending. Mirrors `Sigil_Instruction.md` Section 7.

## Phase 0 — Foundation

- [x] `npm init`, install dependencies
- [x] TypeScript strict config (`tsconfig.json`)
- [x] ESLint + Prettier (`eslint.config.js`, `.prettierrc.json`)
- [x] Vitest config (`vitest.config.ts`)
- [x] GitHub Actions CI (`.github/workflows/ci.yml`)
- [x] `.env.example` with all required variables
- [x] Chain registry (`src/core/chains.ts`)
- [x] Type definitions (`src/types/index.ts`)
- [x] Express server (`src/index.ts`, `/health`, `/ready`)
- [x] Render blueprint committed (`render.yaml`); builder connects & configures Render manually
- [x] Create all `docs/` files with initial structure

## Phase 1 — Core Engine

- [x] `src/core/rpc-client.ts` — ethers.js `JsonRpcProvider` abstraction
- [x] `src/core/dual-rpc.ts` — parallel query + agreement check
- [x] Agreement checker (`fieldsAgree`: found, status, blockNumber, from, to, valueWei, logs.length)
- [x] `src/core/canonical.ts` — canonical string builder
- [x] `src/core/effects.ts` — ERC-20 `Transfer` log decoder
- [x] `src/core/confidence.ts` — confirmation depth confidence scorer
- [x] `src/utils/validation.ts` — tx_hash format + chain name validation
- [x] `src/utils/sanitize.ts` — input sanitization
- [x] Unit tests for all core modules — **60 tests**
- [x] Canonical output verified against Verity's format (integration test)

## Phase 2 — API Layer

- [x] `GET /lookup` full request/response cycle (`src/routes/lookup.ts`)
- [x] `GET /ready` live RPC dependency check (in `src/routes/health.ts`)
- [x] `GET /sigil.yaml` (in `src/routes/yaml.ts`)
- [x] All routes wired in `src/index.ts`
- [x] Integration tests (`test/integration/api.test.ts`) — 20 tests
- [x] Canonical compatibility tests (`test/integration/canonical-compat.test.ts`) — 11 tests
- [x] **Total: 91 tests passing (60 unit + 31 integration)**

## Phase 3 — YAML & Registration

- [x] Write and validate `sigil.yaml` (follows Section 8 schema exactly)
- [x] `GET /sigil.yaml` endpoint live
- [x] Update `base_url` in `sigil.yaml` to real Render URL (`https://sigil-mssz.onrender.com`)
- [x] Miner ID 9010 confirmed available and registered
- [ ] SHA-256 hash of YAML bytes (record in `evidence/registration.md`)
- [x] Registered at integrate.telegraphprotocol.com — Registration ID 219
- [x] Verified in explorer: Active at `https://explorer.telegraphprotocol.com/miners/sigil-onchain-lookup`

## Phase 4 — Hardening & Evidence

- [x] All 12 error states implemented and tested
- [x] Rate limiting verified (middleware active)
- [x] 91 total tests (exceeds 70 target), CI green
- [x] Deployed to Render with Alchemy keys
- [x] All 5 chains responding (verified via `/ready`)
- [x] `test/integration/live-lookup.test.ts` added (10 tests, skipped in CI, run with INTEGRATION_RPC=1)
- [ ] Run load test (100 concurrent requests)
- [ ] Collect first paid request signal hash via `scripts/probe-engine.ts`

## Phase 5 — Polish & Ship

- [x] README per Section 18 template (comprehensive, judge-facing)
- [x] `evidence/README.md` (judge-oriented proof path)
- [x] `evidence/registration.md` (ID 9010, reg 219, active)
- [x] `evidence/signals.md` (template ready — fill after probe run)
- [x] `evidence/canonical-fixtures.md`
- [ ] Fill in real signal hashes in `evidence/signals.md` after running probe-engine.ts
- [ ] Post X update with registration proof (Day 7 tweet — Day 10 tweet with signal hash)

## Phase 6 — Track 3 (Aug 31 – Sep 7)

- [x] `dashboard/index.html` — hero + live lookup + chain status + stats
- [x] `dashboard/lookup.html` — full lookup UI with result panels, effects, finality
- [x] `dashboard/proof.html` — evidence page (registration, health, canonical spec, signals)
- [x] `dashboard/signals.html` — live signal feed + batch probe (hits all 5 chains)
- [x] `dashboard/css/` — full sci-fi/Bloomberg terminal design (Section 22)
- [x] `dashboard/js/` — shared API client + per-page logic
- [x] `dashboard/vercel.json` — Vercel static deployment config
- [ ] Deploy dashboard to Vercel
- [ ] Record Vercel URL and add to README + evidence
- [ ] Drive 100+ real `ONCHAIN_TX_LOOKUP` requests via signals page batch probe + manual lookups

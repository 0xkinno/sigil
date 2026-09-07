# Sigil — Progress Log

## 2026-08-25 — Phase 0: Foundation

**Done:**
- Repository initialized (git) at `Sigil_Telegraph/` root.
- `package.json` configured as ESM, Node >=20, with build/dev/lint/test/typecheck scripts.
- Production deps: `express`, `ethers`, `dotenv`, `express-rate-limit`, `cors`, `helmet`.
- Dev deps: `typescript`, `@typescript-eslint/*`, `eslint`, `prettier`, `vitest`, `esbuild`,
  `tsx`, type packages.
- `tsconfig.json` — strict mode plus the full strict-family flags
  (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, etc.).
- `eslint.config.js` — flat config, `@typescript-eslint/no-explicit-any: error`,
  `no-floating-promises`, `no-misused-promises`, `no-console` (allow warn/error).
- `.prettierrc.json` / `.prettierignore`.
- `vitest.config.ts` — separates `test/unit` (no network) from `test/integration`.
- `.github/workflows/ci.yml` — format check, lint, typecheck, unit tests, build on every push.
- `.env.example` — matches Section 4 of the instruction exactly.
- `src/core/chains.ts` — chain registry for ethereum, base, arbitrum, optimism, polygon with
  chain IDs, finality depths, USDC contracts, env-driven provider URLs.
- `src/types/index.ts` — full type surface for canonical fields, error taxonomy, dual-RPC
  results, effects, finality, evidence, API request/response shapes, validation results.
- `src/config.ts` — typed env constants (port, rate limit, RPC timeout, confidence constants).
- `src/middleware/{request-logger,error-handler,rate-limit}.ts` — structured logging with
  header redaction, global JSON error handler, configurable rate limiter.
- `src/routes/health.ts` — `GET /health` + `GET /ready` (live RPC connectivity check).
- `src/index.ts` — Express app wired with helmet, cors, json body parsing, logger, rate
  limiter, health route, 404 handler, error handler.
- `docs/` scaffolded with all 12 files listed in Section 21.

## 2026-08-25 — Phase 1: Core Engine

**Done:**
- `src/core/rpc-client.ts` — `queryTransaction(rpcUrl, txHash, timeoutMs)` wraps ethers.js
  `JsonRpcProvider`, returns a normalized `ProviderTxResult`, caches providers per URL, times
  out via `Promise.race`.
- `src/core/dual-rpc.ts` — `dualQuery(chain, txHash, timeoutMs, queryFn?)` queries Provider A
  and B in parallel, compares every critical field via `fieldsAgree`, fails closed on
  disagreement (`RPC_DISAGREEMENT`) or chain ID mismatch (`CHAIN_ID_MISMATCH`), falls back to
  single-provider confidence 0.8 when one fails.
- `src/core/canonical.ts` — `buildCanonical(fields)`, pure 7-field pipe-joined formatter.
- `src/core/effects.ts` — `decodeErc20Transfers(logs, chain)` decodes ERC-20 Transfer logs.
- `src/core/confidence.ts` — `computeFinality(...)` returns depth category and confirmation count.
- `src/utils/sanitize.ts` + `src/utils/validation.ts` — validate raw Express query params.
- **60 unit tests** — all network-mocked, zero live RPC calls, all passing.

## 2026-08-25 — Phase 2: API Layer

**Done:**
- `src/routes/lookup.ts` — `GET /lookup` full request/response cycle with all 12 error states,
  canonical building, ERC-20 effect decoding, finality scoring, and structured evidence object.
- `src/routes/yaml.ts` — `GET /sigil.yaml` streams the YAML manifest file with
  `Content-Type: text/yaml`.
- `src/index.ts` updated — all routes wired: `/health`, `/ready`, `/lookup`, `/sigil.yaml`.
- `test/integration/api.test.ts` — 20 integration tests covering health, ready, YAML,
  /lookup validation, response contract, 404 handling. Uses supertest against a real Express
  app instance; no live RPC keys required.
- `test/integration/canonical-compat.test.ts` — 11 tests asserting canonical format
  compatibility with the Verity/Veyctum format for all 5 chains.
- `scripts/probe.ts`, `scripts/register.ts`, `scripts/x402-test.ts` — utility scripts.
- `supertest` installed as dev dependency.
- **Total: 91 tests** (60 unit + 31 integration). All passing.

## 2026-08-25 — Phase 3: YAML & Manifest

**Done:**
- `sigil.yaml` — Telegraph YAML manifest at repo root. Follows exact schema from
  Section 8: version, kind, id (9010), slug (sigil-onchain-lookup), protocol, endpoints[],
  semantics, rate limits, input_schema and output_schema at top level only.
- `GET /sigil.yaml` endpoint serving the manifest at runtime.
- Miner registered on-chain: ID 9010, Registration ID 219, Status Active.
- Live at `https://sigil-mssz.onrender.com`.

## 2026-08-25 — Phase 4–5: Evidence, Hardening, Polish

**Done:**
- `evidence/README.md` — judge-oriented proof path.
- `evidence/registration.md` — registration data (ID 9010, reg ID 219).
- `evidence/signals.md` — signal hash template (to be filled after first paid request).
- `evidence/canonical-fixtures.md` — known tx hashes and expected canonical outputs.
- `README.md` — full judge-facing README per Section 18 template.
- Deployed to Render: `https://sigil-mssz.onrender.com`, all 5 chains responding.
- GitHub: `https://github.com/0xkinno/sigil`, branch `main`.
- Epoch 279 auto-scored by Telegraph validators: score 0.012, rank #2.

## 2026-08-26 — Phase 6: Track 3 Application + Live-Lookup Tests

**Done:**
- `test/integration/live-lookup.test.ts` — 10 live-RPC integration tests (guarded by
  `INTEGRATION_RPC=1` env var). Tests the Base USDC fixture, Ethereum ETH fixture,
  not_found path, effects decoding, evidence fields, finality data. All skip cleanly in CI.
- `scripts/probe-engine.ts` — finalized with real known tx hashes for all 5 chains.
  `viem` added explicitly to devDependencies.
- `dashboard/` — Phase 6 Track 3 application built:
  - `index.html` — Hero page with live lookup form, stats bar, features, chain status grid.
  - `lookup.html` — Full lookup UI with sidebar meta, canonical display, effects, finality.
  - `proof.html` — Evidence page: registration, health, test suite, canonical spec, signals.
  - `signals.html` — Live signal feed, batch probe across all 5 chains.
  - `css/globals.css` + per-page CSS — full Section 22 sci-fi/Bloomberg terminal design.
  - `js/api.js` — shared Sigil API client (direct to `https://sigil-mssz.onrender.com`).
  - Per-page JS: `home.js`, `lookup.js`, `proof.js`, `signals.js`.
  - `vercel.json` — ready to deploy to Vercel.
- All tests still passing: 60 unit + 31 integration (10 live tests skipped). CI green.

**Next:** Run `scripts/probe-engine.ts` with Base Sepolia USDC to generate real signal hashes.
Deploy dashboard to Vercel. Post X updates (Section 17 schedule).

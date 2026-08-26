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

**Needs the builder:**
- Hosting is Render. A `render.yaml` blueprint is committed; the builder connects GitHub repo
  to Render and sets env vars manually.
- All `.env` values (Alchemy keys, backup RPC URLs, miner private key).

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
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run test:integration`
  all green.

## 2026-08-25 — Phase 3: YAML & Manifest

**Done:**
- `sigil.yaml` — Telegraph YAML manifest at repo root. Follows exact schema from
  Section 8: version, kind, id (9010), slug (sigil-onchain-lookup), protocol, endpoints[],
  semantics, rate limits, input_schema and output_schema at top level only.
- `GET /sigil.yaml` endpoint serving the manifest at runtime.

**Needs the builder:**
- Update `base_url` in `sigil.yaml` to the actual Render URL after first deploy.
- Update `id` in `sigil.yaml` if 9010 is already taken (check at devnode.telegraphprotocol.com/api/miners).
- Complete registration at https://integrate.telegraphprotocol.com/
- Record miner ID and registration tx hash in `evidence/registration.md`.

## 2026-08-25 — Phase 4–5: Evidence, Hardening, Polish

**Done:**
- `evidence/README.md` — judge-oriented proof path.
- `evidence/registration.md` — registration template (to be filled after on-chain registration).
- `evidence/signals.md` — signal hash template (to be filled after first paid request).
- `evidence/canonical-fixtures.md` — known tx hashes and expected canonical outputs.
- `README.md` — full judge-facing README per Section 18 template.
- `.env.local` — placeholder file for builder to fill real API keys.

**Needs the builder (to complete evidence collection):**
- Deploy to Render with real Alchemy API keys.
- Complete miner registration at integrate.telegraphprotocol.com.
- Record registration ID, miner ID, tx hash in evidence/registration.md.
- Run first paid request through Telegraph (Track 3 or test harness).
- Record signal hash in evidence/signals.md.
- Post X updates per Section 17 schedule (6-8 posts tagging @Telegraphprotoc).

**Next:** Phase 6 — Track 3 Application (Aug 31 – Sep 7): build dashboard, drive 100+ requests.

# Sigil — Implementation Notes

## Runtime & Module System

- Node.js 20+, ESM (`"type": "module"` in `package.json`), `NodeNext` module resolution in
  `tsconfig.json`. All relative imports inside `src/` use explicit `.js` extensions (required
  by `NodeNext` even though the source files are `.ts`).
- `esbuild` bundles `src/index.ts` → `dist/index.js` with `--packages=external` so
  `node_modules` is not inlined; Render/production installs deps via `npm ci`.
- `tsx` is used for local dev (`npm run dev`) to avoid a build step during iteration.

## TypeScript Strictness

`tsconfig.json` enables the full strict family, not just `strict: true`:
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters`,
`useUnknownInCatchVariables`. ESLint additionally forbids `any` explicitly
(`@typescript-eslint/no-explicit-any: error`) and requires explicit function return types.

## Chain Registry Pattern

`src/core/chains.ts` exposes `buildChainRegistry(env)` as a pure function of an env-like object
(defaults to `process.env`), plus a `CHAIN_REGISTRY` singleton built from real `process.env` at
import time. Building it as a pure function (rather than reading `process.env` inline
everywhere) makes it trivially testable with fixture env objects in Phase 1's `chains.test.ts`.

## Error Response Contract

`src/middleware/error-handler.ts` defines `HttpError` (statusCode + errorCode + message) and a
global handler that guarantees every unhandled exception still returns structured JSON
(`error_code`, `error_detail`) rather than leaking a stack trace. Domain-specific error codes
(the 12 states in Section 13) will be raised as `HttpError` instances from `routes/lookup.ts`
in Phase 2.

## Logging

`src/middleware/request-logger.ts` emits one JSON line per request to stdout on `res.on('finish')`,
and explicitly redacts `authorization`, `x-api-key`, and `cookie` headers before they could ever
reach a log sink. No `console.log` is used anywhere (ESLint enforces this); logs go through
`process.stdout.write` / `process.stderr.write` with `console.warn`/`console.error` allowed only
where genuinely appropriate.

## Open Implementation Questions for Phase 1

- **Agreement comparison precision:** `tx.value` and other numeric fields will be compared as
  normalized decimal strings (via `ethers.getBigInt(...).toString()`), not raw provider
  strings, to avoid false disagreements from formatting differences (e.g. `0x0` vs `0x00`).
- **Timeout enforcement:** `RPC_TIMEOUT_MS` (10s, in `src/config.ts`) will wrap each provider
  call in `Promise.race` against a timeout that resolves to a `TIMEOUT` failure, distinct from
  a provider-level rejection.
- **ERC-20 symbol/decimals lookup:** decoding a `Transfer` log's amount requires the token's
  `decimals()`; Sigil will maintain a small known-token table (starting with each chain's USDC
  contract from the registry) and fall back to an on-chain `decimals()` call for unknown
  tokens, cached in-memory per process.

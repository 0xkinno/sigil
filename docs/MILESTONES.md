# Sigil — Milestones

Timestamped log of significant achievements. Append, don't rewrite history.

| Date | Milestone |
|---|---|
| 2026-08-25 | Phase 0 (Foundation) complete: repo, strict TypeScript, lint/format/CI, chain registry (5 chains), full type surface, minimal Express server with `/health`, Render blueprint committed. |
| 2026-08-25 | Phase 1 (Core Engine) complete: RPC client, dual-RPC consensus (fail-closed), canonical builder, ERC-20 effects decoder, confirmation-depth confidence scorer, input validation. 60 unit tests, all network-mocked, all green alongside lint/typecheck/build. |
| 2026-08-25 | Phase 2 (API Layer) complete: `GET /lookup`, `GET /ready`, `GET /sigil.yaml` all implemented and wired. 20 integration tests + 11 canonical compat tests. Total 91 tests. All green. |
| 2026-08-25 | Phase 3 (YAML Manifest) complete: `sigil.yaml` written following Section 8 schema exactly. Served at `GET /sigil.yaml`. Registered on-chain: Miner ID 9010, Registration ID 219, Status Active at https://explorer.telegraphprotocol.com/miners/sigil-onchain-lookup |
| 2026-08-25 | Phase 4-5 (Evidence + Polish) complete (code side): evidence/ directory created with all template files. README fully written per Section 18. `.env.local` configured with real Alchemy keys. Live at https://sigil-mssz.onrender.com, all 5 chains responding. |
| 2026-08-25 | Epoch 279 auto-scored by Telegraph validators: canonical score 0.012, rank #2 in ONCHAIN_TX_LOOKUP. This came from Telegraph's own background benchmark — not a paid request. |
| 2026-08-26 | Phase 6 (Track 3 Dashboard) complete: `dashboard/` directory built — 4 HTML pages (/, /lookup, /proof, /signals), full sci-fi Bloomberg terminal design per Section 22, live calls to `https://sigil-mssz.onrender.com`. Vercel deployment config committed. |
| 2026-08-26 | Live-lookup integration tests added: `test/integration/live-lookup.test.ts` — 10 tests covering the Base USDC fixture, Ethereum fixture, not_found path, effects, evidence fields, finality. Guards on `INTEGRATION_RPC=1`, skip cleanly in CI. |

## Upcoming

- Run `scripts/probe-engine.ts` with Base Sepolia USDC to generate first real signal hashes
- Deploy `dashboard/` to Vercel; add URL to README and evidence
- Post X updates per Section 17 schedule
- Drive 100+ `ONCHAIN_TX_LOOKUP` requests via dashboard signals page batch probe

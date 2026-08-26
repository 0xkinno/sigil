# Sigil — Milestones

Timestamped log of significant achievements. Append, don't rewrite history.

| Date | Milestone |
|---|---|
| 2026-08-25 | Phase 0 (Foundation) complete: repo, strict TypeScript, lint/format/CI, chain registry (5 chains), full type surface, minimal Express server with `/health`, Render blueprint committed. |
| 2026-08-25 | Phase 1 (Core Engine) complete: RPC client, dual-RPC consensus (fail-closed), canonical builder, ERC-20 effects decoder, confirmation-depth confidence scorer, input validation. 60 unit tests, all network-mocked, all green alongside lint/typecheck/build. |
| 2026-08-25 | Phase 2 (API Layer) complete: `GET /lookup`, `GET /ready`, `GET /sigil.yaml` all implemented and wired. 20 integration tests + 11 canonical compat tests. Total 91 tests. All green. |
| 2026-08-25 | Phase 3 (YAML Manifest) complete: `sigil.yaml` written following Section 8 schema exactly. Served at `GET /sigil.yaml`. Pending: builder updates `base_url` + registers on-chain. |
| 2026-08-25 | Phase 4-5 (Evidence + Polish) complete (code side): evidence/ directory created with all template files. README fully written per Section 18. `.env.local` placeholder created. |

## Upcoming

- Builder deploys to Render with real Alchemy keys, verifies all 5 chains (Phase 4)
- Miner registered on-chain, visible in Telegraph explorer (Phase 3 completion)
- First paid request served via Telegraph x402, signal hash recorded (Phase 5 completion)
- 70+ total tests, all 12 error states verified with live data (Phase 4 completion)
- Track 3 dashboard live, 100+ real requests driven (Phase 6)

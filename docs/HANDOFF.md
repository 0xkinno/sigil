# Sigil — Handoff

## Current State (Phase 6 complete — all code done)

All code phases (0 through 6) are complete. The full build:

### Miner (Track 1)
- All 4 routes live: `GET /health`, `GET /ready`, `GET /lookup`, `GET /sigil.yaml`
- 91 tests passing (60 unit + 31 integration)
- 10 live-RPC tests in `test/integration/live-lookup.test.ts` (run with `INTEGRATION_RPC=1`)
- TypeScript strict mode, zero lint errors, clean build
- Deployed live at `https://sigil-mssz.onrender.com`, all 5 chains responding
- Registered: Miner ID 9010, Registration ID 219, Status Active
- Epoch 279 auto-scored by validators: score 0.012, rank #2

### Dashboard (Track 3)
- `dashboard/` — fully built, 4 pages, sci-fi design per Section 22
- `dashboard/vercel.json` — ready to deploy to Vercel
- **Builder must: deploy dashboard to Vercel and add the Vercel URL to README**

---

## What the builder must do next (in priority order):

### 1. Run the probe script (generates real signal hashes)
```bash
# Make sure .env.local has MINER_PRIVATE_KEY and BASE_SEPOLIA_RPC
# The wallet must hold Base Sepolia testnet USDC
# Faucet: https://faucet.circle.com (select Base Sepolia)

npx tsx scripts/probe-engine.ts
```
Copy the signal hashes from the output into `evidence/signals.md`.

### 2. Deploy the dashboard to Vercel
```bash
cd dashboard
npx vercel deploy --prod
# OR: connect the dashboard/ directory to a new Vercel project via the web UI
```
Add the Vercel URL to README.md and `evidence/signals.md`.

### 3. Drive 100+ requests
Open the deployed dashboard → `/signals` page → click "Run Batch Probe".
This sends 5 requests (one per chain) directly to the live miner.
Run it 20+ times to exceed 100 total requests.
Also share the dashboard URL on X (drives organic traffic).

### 4. Post X updates (Section 17 schedule)
Every post must tag `@Telegraphprotoc` and include a real screenshot or link.
- Day 7: Miner registered, live, auto-scored at rank #2 — screenshot explorer
- Day 10: First real paid signals generated — screenshot signal hashes
- Day 13: Test count (91+), 5 chains, 12 error states — screenshot test run
- Day 15: Track 3 dashboard live — screenshot + URL
- Track 3 window: "100+ requests driven, canonical accuracy [N]%" — screenshot signals page

### 5. Monitor scoring
- https://explorer.telegraphprotocol.com/miners/sigil-onchain-lookup
- Check "Requests Served" count — should increase after running probes
- Check canonical score — should approach 1.0 with correct responses

---

## Key Files

| File | Purpose |
|------|---------|
| `src/core/dual-rpc.ts` | Core consensus engine — fail-closed dual-RPC |
| `src/core/canonical.ts` | Deterministic 7-field canonical builder |
| `src/routes/lookup.ts` | Main `/lookup` handler |
| `sigil.yaml` | Telegraph YAML manifest |
| `scripts/probe-engine.ts` | x402 paid probe via Telegraph Engine |
| `dashboard/` | Phase 6 Track 3 application |
| `evidence/` | All proof artifacts for judges |
| `docs/TASKS.md` | Remaining task checklist |

---

## Environment Variables (.env.local)

| Variable | Purpose | Status |
|----------|---------|--------|
| `ALCHEMY_ETH_URL` | Provider A — Ethereum mainnet | Set |
| `ALCHEMY_BASE_URL` | Provider A — Base mainnet | Set |
| `ALCHEMY_ARB_URL` | Provider A — Arbitrum One | Set |
| `ALCHEMY_OPT_URL` | Provider A — Optimism | Set |
| `ALCHEMY_POLY_URL` | Provider A — Polygon | Set |
| `MINER_PRIVATE_KEY` | Base Sepolia wallet for x402 | Set |
| `BASE_SEPOLIA_RPC` | Base Sepolia RPC for x402 | Set |
| `BACKUP_*` | Public fallback RPCs | Pre-set in render.yaml |

---

## Dashboard Deployment (Vercel)

The `dashboard/` directory is a static site — no build step, no bundler.

**Option A: Vercel CLI**
```bash
npm install -g vercel
cd dashboard
vercel --prod
```

**Option B: Vercel web UI**
1. Go to https://vercel.com/new
2. Import your GitHub repo (`0xkinno/sigil`)
3. Set **Root Directory** to `dashboard`
4. Framework Preset: **Other** (static)
5. Deploy → get public URL

After deploy, add the URL everywhere:
- `README.md` — add to the "Live Links" section
- `evidence/signals.md` — add as "Dashboard URL"
- X post Day 15 — include the URL

---

## Local Development

```bash
cp .env.example .env.local
# fill in real keys
npm run dev          # start miner at localhost:3000
npm test             # unit tests
npm run test:all     # all 91 tests
npm run typecheck    # strict TS check
npm run lint         # ESLint
npm run build        # production bundle → dist/
```

**Run live-RPC tests:**
```bash
INTEGRATION_RPC=1 npm run test:integration
```
(Requires real Alchemy keys in `.env.local`.)

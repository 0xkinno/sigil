# Sigil — Handoff

## Current State (end of Phase 5, code complete)

All code phases (0 through 5) are complete. The miner is fully implemented:
- All 4 routes live: `GET /health`, `GET /ready`, `GET /lookup`, `GET /sigil.yaml`
- 91 tests passing (60 unit + 31 integration)
- TypeScript strict mode, zero lint errors, clean build
- `sigil.yaml` manifest written and served
- Evidence directory scaffolded

**What the builder must do to go live:**
1. Fill `.env.local` with Alchemy API keys (or use public fallback RPCs in `BACKUP_*`)
2. Deploy to Render
3. Update `base_url` in `sigil.yaml` to the real Render URL
4. Register the miner at https://integrate.telegraphprotocol.com/
5. Fill in `evidence/registration.md` with the miner ID and tx hash
6. Monitor scoring at https://explorer.telegraphprotocol.com/miners
7. Post X updates per Section 17 schedule

## What The Builder Needs To Do On Render

1. Push this repo to GitHub (if not already done):
   ```bash
   git add -A
   git commit -m "Phase 2-5 complete: API layer, YAML, evidence, README"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Go to https://render.com/ and sign in (or create an account).
3. **New +** → **Web Service** → connect the GitHub repo.
4. Render should auto-detect `render.yaml` at the repo root and pre-fill:
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Health check path: `/health`
5. Under the service's **Environment** tab, add the real values:
   - `ALCHEMY_ETH_URL`, `ALCHEMY_BASE_URL`, `ALCHEMY_ARB_URL`, `ALCHEMY_OPT_URL`,
     `ALCHEMY_POLY_URL` — from your Alchemy dashboard (one app per chain).
   - `MINER_PRIVATE_KEY` — the Base Sepolia wallet key (**never share or commit**).
   - `BASE_SEPOLIA_RPC` — your Alchemy Base Sepolia endpoint.
   - The `BACKUP_*` URLs are already pre-filled with public fallback RPCs in `render.yaml`.
6. Click **Create Web Service**. Render will build and deploy automatically.
7. Copy the public URL (e.g. `https://sigil-xxxx.onrender.com`) and update `sigil.yaml`:
   ```yaml
   base_url: https://sigil-xxxx.onrender.com
   ```
8. Push the updated `sigil.yaml`.
9. Confirm `GET https://<your-render-url>/health` returns `{"status":"ok","uptime_ms":...}`.
10. Confirm `GET https://<your-render-url>/ready` shows all 5 chains as `true`.

## After Render Deployment — YAML Registration

1. Run `sha256sum sigil.yaml` and record the hash in `evidence/registration.md`
2. Go to https://integrate.telegraphprotocol.com/
3. Connect MetaMask wallet (with Base Sepolia ETH)
4. Paste the contents of `sigil.yaml`
5. Platform validates schema, sandbox-tests `/lookup`
6. Sign the `registerMiner` transaction
7. Record miner ID and tx hash in `evidence/registration.md`
8. Verify: `npx tsx scripts/register.ts verify`

## Local Development

```bash
cp .env.example .env.local
# fill in your real keys in .env.local
npm run dev          # runs src/index.ts directly via tsx
npm run typecheck
npm run lint
npm run build && npm start   # production-style run
npm test             # unit tests only
npm run test:all     # unit + integration tests
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/core/dual-rpc.ts` | The heart of Sigil — fail-closed dual-RPC consensus |
| `src/core/canonical.ts` | Deterministic 7-field scorer output |
| `src/routes/lookup.ts` | Main API handler |
| `sigil.yaml` | Telegraph miner manifest — update `base_url` before registering |
| `evidence/` | All proof artifacts for judges |
| `docs/TASKS.md` | Remaining tasks checklist |

## Next Agent Should Start With

Phase 6 — Track 3 Application: build a Next.js or plain HTML dashboard that:
1. Queries Sigil for tx lookups (your miner) and other miners
2. Drives 100+ real requests to `ONCHAIN_TX_LOOKUP`
3. Displays results in the sci-fi/spatial design language from Section 22
4. Pages: `/` (hero + live lookup), `/lookup` (full response view), `/proof` (evidence),
   `/signals` (live signal feed)
5. Deploy to Vercel (free)

See Section 16 and Section 22 of `Sigil_Instruction.md` for the full spec.

# Sigil

**Sigil lets autonomous agents verify any EVM transaction across five chains without trusting a single centralized API. Two independent RPC providers must agree on every critical fact before a single byte leaves the miner.**

[![CI](https://github.com/0xkinno/sigil/actions/workflows/ci.yml/badge.svg)](https://github.com/0xkinno/sigil/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-91%20passing-brightgreen)](#testing)
[![Chains](https://img.shields.io/badge/chains-5%20EVM-blue)](#supported-chains)
[![Intent](https://img.shields.io/badge/intent-ONCHAIN__TX__LOOKUP-teal)](#telegraph-integration)

[Live Miner](https://sigil.onrender.com) · [Telegraph Explorer](https://explorer.telegraphprotocol.com/miners) · [Evidence](./evidence/) · Track 1: Miner

---

## The Problem

An autonomous trading bot receives a transaction hash as proof that a counterparty paid. It checks `receipt.status` — it's `1`, success. The bot releases funds.

But the transaction was an approval, not a transfer. The counterparty never actually paid. The bot lost money because `status == 1` is not proof of payment.

This happens because EVM transaction receipts only tell you whether execution reverted. They do not tell you what actually moved. And a single RPC call can be manipulated, cached, or simply wrong.

---

## The Solution

Sigil takes a transaction hash and a chain name, queries **two completely independent RPC providers in parallel**, verifies they agree on every critical field, decodes the actual ERC-20 transfer effects from event logs, and returns a **deterministic canonical result** that Telegraph validators score against the blockchain itself.

If the two providers disagree on anything — status, block number, sender, recipient, value, or log count — **Sigil fails closed**. No fabricated certainty. No single point of trust.

---

## How It Works

```
   Agent / Telegraph Validator
           │
   ┌───────▼────────┐
   │  GET /lookup   │  chain=base&tx_hash=0x3739...
   │  (Sigil Miner) │
   └───┬───────┬────┘
       │       │   parallel queries, independent providers
   ┌───▼───┐ ┌─▼──────┐
   │Alchemy│ │ Public │   Provider A & Provider B
   │  RPC  │ │  RPC   │
   └───┬───┘ └─┬──────┘
       └───┬───┘
   ┌───────▼──────────────────────┐
   │  Agreement Check             │  fail closed if ANY field disagrees
   │  status / block / from / to  │
   │  value / log count           │
   └───────┬──────────────────────┘
           │ both agree
   ┌───────▼──────────────────────┐
   │  Canonical Builder           │  chain|tx_hash|status|block|from|to|wei
   │  ERC-20 Log Decoder          │  Transfer events → effects[]
   │  Confirmation Depth Scorer   │  confirmations → finality
   └───────┬──────────────────────┘
           │
   ┌───────▼──────────────────────┐
   │  Telegraph Signal            │  scored by validators, recorded on-chain
   └──────────────────────────────┘
```

1. An agent (or Telegraph validator) submits a `tx_hash` and `chain` to `GET /lookup`
2. Sigil queries Provider A and Provider B **in parallel** for both `eth_getTransactionByHash` and `eth_getTransactionReceipt`
3. All critical fields are compared between providers — status, block number, sender, recipient, value, and log count
4. If they agree: Sigil decodes ERC-20 Transfer events, computes confirmation depth, and builds the canonical response
5. If they disagree: Sigil returns `RPC_DISAGREEMENT` with confidence 0 (fail closed — no charge)
6. Telegraph records the result as a verified signal against ground truth

---

## Supported Chains

| Chain | Chain ID | Native | Finality | USDC |
|-------|----------|--------|----------|------|
| `ethereum` | 1 | ETH | 64 blocks | `0xA0b8...eB48` |
| `base` | 8453 | ETH | 128 blocks | `0x8335...2913` |
| `arbitrum` | 42161 | ETH | 1 block (L2) | `0xaf88...5831` |
| `optimism` | 10 | ETH | 1 block (L2) | `0x0b2C...Ff85` |
| `polygon` | 137 | POL | 128 blocks | `0x3c49...3359` |

---

## Canonical Format

This is what Telegraph validators score against ground truth:

```
chain|tx_hash|status|block_number|from|to|value_wei
```

| Field | Format | Example |
|-------|--------|---------|
| `chain` | lowercase chain name | `base` |
| `tx_hash` | 0x-prefixed lowercase hex, 66 chars | `0x3739...16a7` |
| `status` | `confirmed` · `reverted` · `pending` · `not_found` | `confirmed` |
| `block_number` | decimal string (empty if pending/not_found) | `12345678` |
| `from` | lowercase 0x-prefixed address | `0xaaaa...` |
| `to` | lowercase 0x-prefixed address (empty for contract creation) | `0xbbbb...` |
| `value_wei` | decimal string of native value in wei | `0` |

**Important:** `value_wei` is the native coin value (`msg.value`), NOT the token transfer amount. ERC-20 transfer amounts are in the `effects[]` array.

---

## API Reference

### `GET /lookup`

```
GET /lookup?chain=base&tx_hash=0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7
```

**Parameters:**
| Name | Required | Values |
|------|----------|--------|
| `chain` | ✅ | `ethereum` · `base` · `arbitrum` · `optimism` · `polygon` |
| `tx_hash` | ✅ | `0x` + 64 hex characters |

**Success Response (200):**
```json
{
  "schema_version": "1.0.0",
  "chain": "base",
  "chain_id": 8453,
  "tx_hash": "0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7",
  "status": "confirmed",
  "block_number": "27372726",
  "from": "0x6cf30f7e01f2d40b9b9a2fb7e3c4d30a6c1eb5d0",
  "to": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  "value_wei": "0",
  "canonical": "base|0x373982c...|confirmed|27372726|0x6cf3...|0x8335...|0",
  "confidence": 0.99,
  "summary": "Confirmed Base transaction in block 27372726. 1 ERC-20 transfer detected.",
  "effects": [
    {
      "type": "ERC20_TRANSFER",
      "token": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      "symbol": "USDC",
      "from": "0x6cf30f...",
      "to": "0xrecipient...",
      "amount_raw": "1000000",
      "decimals": 6
    }
  ],
  "finality": {
    "confirmations": 128,
    "finalized": true,
    "depth_category": "deep"
  },
  "evidence": {
    "providers_agreed": true,
    "provider_count": 2,
    "response_time_ms": 342,
    "queried_at": "2026-08-25T14:30:00.000Z"
  },
  "error_code": null,
  "error_detail": null
}
```

**Error Response (200 for RPC errors, 400 for input errors):**
```json
{
  "schema_version": "1.0.0",
  "chain": "base",
  "chain_id": 8453,
  "tx_hash": "0x...",
  "status": "error",
  "canonical": "",
  "confidence": 0,
  "summary": "Provider A and Provider B disagree on critical transaction facts.",
  "effects": [],
  "finality": null,
  "evidence": null,
  "error_code": "RPC_DISAGREEMENT",
  "error_detail": "Provider A and Provider B disagree on critical transaction facts for base. Failing closed."
}
```

### `GET /health`

```json
{ "status": "ok", "uptime_ms": 123456 }
```

### `GET /ready`

Performs a live RPC connectivity check on all 5 chains.

```json
{
  "status": "ready",
  "chains": { "ethereum": true, "base": true, "arbitrum": true, "optimism": true, "polygon": true }
}
```

### `GET /sigil.yaml`

Serves the Telegraph YAML manifest. Content-Type: `text/yaml`.

---

## Error Taxonomy (12 States)

| State | HTTP | Meaning |
|-------|------|---------|
| `confirmed` | 200 | Tx mined, receipt.status = 1, providers agree |
| `reverted` | 200 | Tx mined, receipt.status = 0, providers agree |
| `pending` | 200 | Tx exists but no receipt yet (mempool) |
| `not_found` | 200 | Tx does not exist on this chain |
| `RPC_DISAGREEMENT` | 200 | Providers disagree on critical facts — fail closed |
| `UPSTREAM_ERROR` | 200 | Both providers failed to respond |
| `INVALID_INPUT` | 400 | Bad tx_hash format or missing parameter |
| `UNSUPPORTED_CHAIN` | 400 | Chain name not in registry |
| `RATE_LIMITED` | 429 | Too many requests (rate limiter middleware) |
| `TIMEOUT` | 200 | Both RPC queries exceeded 10s timeout |
| `CHAIN_ID_MISMATCH` | 200 | A provider returned the wrong chain ID — fail closed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

Every non-success state returns `confidence: 0` and an appropriate `error_code` + `error_detail`. The `canonical` field is always present (empty string on errors).

---

## Competitive Advantage

No other miner in `ONCHAIN_TX_LOOKUP` combines **all seven** of these properties:

| Feature | **Sigil** | Verity | Veyctum | TxLens |
|---------|-----------|--------|---------|--------|
| 5-chain coverage | ✅ | ✅ | ❌ (Base only) | ✅ |
| Dual-RPC consensus (fail-closed) | ✅ | ❌ | ✅ | ❌ |
| ERC-20 Transfer log decoding | ✅ | ❌ | ✅ | ❌ |
| Confirmation depth scoring | ✅ | ❌ | ❌ | ✅ |
| 12-state error taxonomy | ✅ | ❌ | ❌ | ❌ |
| Sub-second parallel RPC queries | ✅ | ❌ | ✅ | ❌ |
| All of the above combined | ✅ | ❌ | ❌ | ❌ |

**Sigil's moat:** Each competitor has 2–3 of these. Sigil has all seven.

---

## Telegraph Integration

Sigil is a first-class Telegraph miner. Without Telegraph, Sigil has no routing, no verification, no payment, and no reason to exist. Every component is a Telegraph primitive:

| Component | Role |
|-----------|------|
| **YAML Manifest** (`sigil.yaml`) | Registered on-chain via `integrate.telegraphprotocol.com` |
| **x402 Payment** | Every request settled via Base Sepolia USDC |
| **Canonical Scoring** | Output format matches `ONCHAIN_TX_LOOKUP` ground truth schema |
| **Signal Recording** | Every response recorded as a Telegraph signal with a hash |
| **Probabilistic Routing** | Telegraph routes traffic to Sigil based on leaderboard score |
| **YAML IPFS Pin** | Manifest pinned to IPFS by Telegraph's registration platform |

---

## Demo Evidence

| Proof | Status |
|-------|--------|
| Miner Registration | See [evidence/registration.md](./evidence/registration.md) |
| Stable Endpoint | https://sigil.onrender.com |
| Canonical Compatibility | `npm run test:integration` → all format tests pass |
| Chains Supported | ethereum · base · arbitrum · optimism · polygon |
| Test Suite | **91 tests** (60 unit + 31 integration), all passing |
| First Paid Request | See [evidence/signals.md](./evidence/signals.md) |
| Dual-RPC Agreement | 100% on all tested requests (both providers must agree) |
| Response Time Target | < 2 seconds (parallel queries, fail-fast timeout) |

---

## Testing

```bash
npm test                # 60 unit tests (no network required)
npm run test:integration  # 31 integration tests (app-level + canonical compat)
npm run test:all          # All 91 tests
npm run typecheck         # TypeScript strict mode — zero errors
npm run lint              # ESLint — zero errors
npm run build             # esbuild production bundle
```

**Test coverage:**
- `buildCanonical` — 10 tests (all chains, all statuses, edge cases, precision)
- `dualQuery` — 10 tests (agree, disagree on every field, single-provider fallback, TIMEOUT, UPSTREAM_ERROR, CHAIN_ID_MISMATCH)
- `decodeErc20Transfers` — 8 tests (single/multiple transfers, wrong topic, malformed logs)
- `computeFinality` — 9 tests (shallow/moderate/deep, pending, all 5 chains)
- `validateLookupInput` — 12 tests (valid, invalid hash, missing params, unknown chain)
- `buildChainRegistry` — 10 tests (all 5 chains, IDs, URLs, unknown chain)
- Integration — 31 tests (API contract, HTTP status codes, canonical format, 404 handler)

---

## Built With

| Technology | Role |
|------------|------|
| TypeScript 5 (strict mode) | Language — zero `any` types |
| Node.js 20+ | Runtime |
| Express.js | HTTP framework |
| ethers.js v6 | EVM RPC client for all 5 chains |
| Vitest | Test framework |
| esbuild | Production bundler |
| Render | Hosting (free tier, zero-downtime deploys) |
| Alchemy | Provider A (5 mainnet RPC endpoints) |
| Public RPCs | Provider B (fallback: llamarpc, base.org, arbitrum.io, optimism.io, polygon-rpc.com) |
| Telegraph YAML Standard | Miner registration and routing |
| x402 / USDC Base Sepolia | Per-request payment settlement |

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/0xkinno/sigil.git
cd sigil

# 2. Install dependencies
npm ci

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local — fill in your Alchemy API keys
# BACKUP_* URLs are pre-filled with public fallbacks (no key needed)

# 4. Start dev server
npm run dev

# 5. Run tests
npm test              # unit tests (no network needed)
npm run test:all      # all tests including integration

# 6. Production build
npm run build
npm start
```

**Probe a live lookup:**
```bash
# Test a known Base USDC transfer
npx tsx scripts/probe.ts http://localhost:3000 base \
  0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7

# Check the YAML manifest is served correctly
curl http://localhost:3000/sigil.yaml

# Check RPC readiness
curl http://localhost:3000/ready
```

---

## Deployment (Render)

Render auto-detects the `render.yaml` blueprint at the repo root.

1. Push to GitHub
2. Connect repo to [render.com](https://render.com)
3. Render auto-reads `render.yaml` (build: `npm ci && npm run build`, start: `npm start`)
4. Set env vars in Render dashboard (Alchemy keys, `MINER_PRIVATE_KEY`, `BASE_SEPOLIA_RPC`)
5. Deploy — public URL: `https://sigil.onrender.com`
6. Verify: `curl https://sigil.onrender.com/health`

---

## Miner Registration

After deploying to Render:

1. Fund an EVM wallet with Base Sepolia ETH: https://www.alchemy.com/faucets/base-sepolia
2. Go to https://integrate.telegraphprotocol.com/
3. Connect MetaMask and paste `sigil.yaml`
4. Platform validates the YAML schema and sandbox-tests `/lookup`
5. Platform pins the YAML to IPFS
6. Sign the `registerMiner` transaction in MetaMask
7. Verify registration: `npx tsx scripts/register.ts verify`
8. Record the miner ID and tx hash in [evidence/registration.md](./evidence/registration.md)
9. Monitor scores at https://explorer.telegraphprotocol.com/miners

---

## Project Structure

```
sigil/
├── src/
│   ├── index.ts                  # Express server entry point
│   ├── config.ts                 # Typed env constants
│   ├── core/
│   │   ├── rpc-client.ts         # ethers.js JsonRpcProvider abstraction
│   │   ├── dual-rpc.ts           # Parallel query + fail-closed agreement check
│   │   ├── canonical.ts          # Deterministic 7-field canonical builder
│   │   ├── effects.ts            # ERC-20 Transfer log decoder
│   │   ├── confidence.ts         # Confirmation depth → finality scoring
│   │   └── chains.ts             # Chain registry (5 chains, IDs, RPCs)
│   ├── routes/
│   │   ├── lookup.ts             # GET /lookup — main handler
│   │   ├── health.ts             # GET /health + GET /ready
│   │   └── yaml.ts               # GET /sigil.yaml — serve manifest
│   ├── middleware/
│   │   ├── rate-limit.ts         # Express rate limiter
│   │   ├── error-handler.ts      # Global error handler (no stack leak)
│   │   └── request-logger.ts     # Structured JSON logging (headers redacted)
│   ├── types/
│   │   └── index.ts              # All TypeScript interfaces (no `any`)
│   └── utils/
│       ├── validation.ts         # Input validation (tx_hash regex, chain enum)
│       └── sanitize.ts           # Raw query param sanitization
├── test/
│   ├── unit/                     # 60 tests — no network, fully mocked
│   └── integration/              # 31 tests — app-level + canonical compat
├── scripts/
│   ├── probe.ts                  # Test a live /lookup call
│   ├── register.ts               # Verify on-chain registration
│   └── x402-test.ts              # Verify x402 payment flow
├── evidence/
│   ├── README.md                 # Judge-oriented proof path
│   ├── registration.md           # Registration tx hash, miner ID
│   ├── signals.md                # Real paid request signal hashes
│   └── canonical-fixtures.md     # Known tx hashes + expected canonical output
├── docs/                         # Architecture, plan, competitive analysis, etc.
├── sigil.yaml                    # Telegraph miner YAML manifest
├── render.yaml                   # Render deployment blueprint
└── .env.example                  # Template env file (no secrets)
```

---

## Target User

**Who:** Autonomous DeFi agents, trading bots, escrow contracts, payment verification workflows

**Today:** They call a single RPC, check `receipt.status`, and trust it blindly — one failure point, no effect verification

**With Sigil:** They get dual-verified, canonically scored, effect-decoded on-chain intelligence through Telegraph's routing layer

**After the hackathon:** Any agent on Telegraph can pay for verified on-chain intelligence without managing API keys or trusting a single provider

---

## Roadmap

1. ERC-721 and ERC-1155 transfer detection (NFT transfers in `effects[]`)
2. Internal transaction (trace) decoding via `debug_traceTransaction`
3. Solana transaction support (non-EVM chain)
4. Mainnet deployment when Telegraph moves to production
5. Track 3 consumer SDK for easy agent integration

---

## License

MIT — see [LICENSE](./LICENSE)

---

*Sigil is a Telegraph Protocol miner entry for Hackathon Season I (H1), Miner Track.*
*Intent: `ONCHAIN_TX_LOOKUP` · Chains: 5 · Strategy: dual-RPC consensus + canonical exactness*

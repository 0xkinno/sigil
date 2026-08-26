# SIGIL BUILD INSTRUCTION
## Telegraph Protocol Hackathon Season I (H1) -- Miner Track
### Master Document for Claude Code / Codex / Antigravity Agents

> **READ THIS ENTIRE FILE BEFORE WRITING ANY CODE.**
> This is the single source of truth. Do not deviate. Do not simplify. Do not stub.
> The goal is first place. Not second. Not third. The undisputed best miner in the ONCHAIN_TX_LOOKUP intent.

---

## TABLE OF CONTENTS

1. [What This Hackathon Is](#1-what-this-hackathon-is)
2. [What We Are Building](#2-what-we-are-building)
3. [Competitive Analysis](#3-competitive-analysis)
4. [What The Builder Must Provide](#4-what-the-builder-must-provide)
5. [Technical Architecture](#5-technical-architecture)
6. [Project Structure](#6-project-structure)
7. [Phase-by-Phase Build Plan](#7-phase-by-phase-build-plan)
8. [YAML Miner Configuration](#8-yaml-miner-configuration)
9. [Canonical Format Specification](#9-canonical-format-specification)
10. [API Endpoint Specification](#10-api-endpoint-specification)
11. [Dual-RPC Verification System](#11-dual-rpc-verification-system)
12. [Multi-Chain Support](#12-multi-chain-support)
13. [Error Handling & Edge Cases](#13-error-handling-and-edge-cases)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment & Registration](#15-deployment-and-registration)
16. [Track 3 Application (Days 15-21)](#16-track-3-application)
17. [X Engagement Strategy](#17-x-engagement-strategy)
18. [README Template](#18-readme-template)
19. [Evidence Collection](#19-evidence-collection)
20. [Win Plan](#20-win-plan)
21. [Memory Files to Maintain](#21-memory-files-to-maintain)
22. [UI Specification (Track 3 Dashboard)](#22-ui-specification)
23. [Critical Rules](#23-critical-rules)

---

## 1. WHAT THIS HACKATHON IS

**Hackathon:** Telegraph Protocol Hackathon Season I, Hackathon 1
**Prize Pool:** $5,000 USD total. Miner Track: $2,000 (1st: $1,000, 2nd: $600, 3rd: $400)
**Timeline:**
- Track 1 (Miners) & Track 2 (Scripts): Aug 17 -- Aug 31 (15 days)
- Track 3 (Applications): Aug 31 -- Sep 7 (7 days)
- Winner Selection: Sep 8 -- Sep 18
- Announcement: Sep 19 -- Sep 25

**How Winners Are Chosen (Miner Track):**
- **75 points** -- Normalized Performance: your average Canonical Score divided by the highest average score in your Intent. The best miner in every intent gets 75/75.
- **25 points** -- X Engagement & Transparency: quality, consistency, reach of updates posted on X tagging @Telegraphprotoc.

**Guardrail:** An intent must have at least 3 active miners AND receive at least 100 real requests from Track 3 applications to be eligible for cash prizes.

**Docs:** https://docs.telegraphprotocol.com/docs
**Integrate:** https://integrate.telegraphprotocol.com/
**Supported Intents:** https://hackathon.telegraphprotocol.com/supported-intents
**Rules:** https://hackathon.telegraphprotocol.com/rules
**GitHub Examples:** https://github.com/telegraphprotocol/telegraph-usecases
**WASM Scoring Module:** https://github.com/telegraphprotocol/telegraph-examples/tree/master/wasm-scoring-module
**Live Miner API:** https://devnode.telegraphprotocol.com/api/miners
**Explorer:** https://explorer.telegraphprotocol.com/miners

---

## 2. WHAT WE ARE BUILDING

**Project Name:** SIGIL
**Track:** Track 1 (Miner) -- primary entry. Track 3 (Application) -- secondary entry.
**Intent:** ONCHAIN_TX_LOOKUP (Tier A, deterministic WASM exact match scoring)

**One-liner (product-first framing):**
> Sigil lets autonomous agents verify any EVM transaction across five chains without trusting a single centralized API -- two independent RPC providers must agree before a single byte leaves the miner.

**What Sigil is:**
A Telegraph miner that receives a transaction hash and chain name, queries two independent RPC providers, verifies they agree on the critical transaction facts, and returns a deterministic canonical response that Telegraph validators can score against ground truth.

**What makes Sigil different from competitors:**
1. Multi-chain coverage: ethereum, base, arbitrum, optimism, polygon (5 chains vs Veyctum's 1)
2. Dual-RPC consensus with fail-closed safety (matches Veyctum's approach, extends to all 5 chains)
3. ERC-20 Transfer log decoding (not just native ETH value)
4. Confirmation depth confidence scoring (like TxLens but with dual-RPC)
5. Sub-second response times through parallel RPC calls
6. Comprehensive error taxonomy (12 distinct error states vs competitors' 6-8)

**If you remove Telegraph from Sigil, does it still work?** No. Sigil is a Telegraph miner. Its YAML config, x402 payment flow, signal hash recording, and canonical scoring format are all Telegraph primitives. Without Telegraph, Sigil has no routing, no verification, no payment, and no reason to exist.

---

## 3. COMPETITIVE ANALYSIS

### Competitor: Verity (Miner ID 9001)
- **Strengths:** 5-chain support (ethereum, base, arbitrum, optimism, polygon). Clean canonical format. Already registered.
- **Weaknesses:** Single RPC provider (no verification). No ERC-20 transfer parsing. No confirmation depth scoring. Basic error handling.
- **How Sigil beats it:** Dual-RPC consensus on every chain. ERC-20 effect parsing. Richer error taxonomy. Faster parallel queries.

### Competitor: Veyctum (Miner ID 9005)
- **Strengths:** Dual-RPC verification. ERC-20 Transfer normalization. Consumer proof gate. 67 hermetic + 5 integration tests. Evidence directory. Most technically deep competitor.
- **Weaknesses:** Base chain ONLY (single chain). Limited to ERC-20 tokens only. Complex API surface (consumer proof gate is separate from miner responsibility). Heavier response payload.
- **How Sigil beats it:** 5-chain support (vs 1). Faster response times (parallel RPC). Cleaner canonical output. Same dual-RPC safety without the complexity. Broader token standard support.

### Competitor: DegenLens
- **Strengths:** Creative angle (gambling intelligence). Multiple intents (ONCHAIN_TX_LOOKUP + WALLET_BALANCE_CHECK + FRAUD_DETECTION).
- **Weaknesses:** Gambling-specific, not general-purpose tx lookup. Casino-focused endpoints dilute ONCHAIN_TX_LOOKUP quality. data_source can be "demo" or "unavailable" (not always live data).
- **How Sigil beats it:** Purpose-built for ONCHAIN_TX_LOOKUP. Every response is live on-chain data, never demo/cached. Higher canonical accuracy because single-intent focus.

### Competitor: TxLens
- **Strengths:** 5-chain support. Confirmation depth confidence scoring.
- **Weaknesses:** Single RPC endpoint. No ERC-20 transfer parsing. Less error state coverage.
- **How Sigil beats it:** Dual-RPC consensus. ERC-20 parsing. Richer response with effects array. Same chain coverage.

### SIGIL'S COMPETITIVE MOAT:
No other miner in ONCHAIN_TX_LOOKUP combines ALL of:
- 5-chain coverage
- Dual-RPC consensus verification
- ERC-20 Transfer log decoding
- Confirmation depth confidence
- Sub-second parallel responses
- 12-state error taxonomy
- Canonical format exact match

This combination is Sigil's moat. Each competitor has 2-3 of these. Sigil has all 7.

---

## 4. WHAT THE BUILDER MUST PROVIDE

### Required before build starts:

1. **Alchemy API Key** (free tier)
   - Sign up at https://www.alchemy.com/
   - Create apps for: Ethereum Mainnet, Base Mainnet, Arbitrum One, Optimism Mainnet, Polygon Mainnet
   - This gives you 5 RPC endpoints (Provider A)

2. **Second RPC Provider** (Provider B for dual-RPC consensus)
   Options (all free tier):
   - **QuickNode:** https://www.quicknode.com/ (recommended, free tier covers all chains)
   - **Infura:** https://www.infura.io/ (free tier, 100K requests/day)
   - **Public RPCs as fallback:**
     - Ethereum: `https://eth.llamarpc.com`
     - Base: `https://mainnet.base.org`
     - Arbitrum: `https://arb1.arbitrum.io/rpc`
     - Optimism: `https://mainnet.optimism.io`
     - Polygon: `https://polygon-rpc.com`

3. **EVM Wallet** (for miner registration on Base Sepolia testnet)
   - MetaMask or any wallet with a private key you control
   - Get Base Sepolia testnet ETH from: https://www.alchemy.com/faucets/base-sepolia
   - The private key goes in .env for registration scripts (NEVER commit it)

4. **Base Sepolia Testnet USDC** (for x402 test payments)
   - USDC contract on Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - Get from faucet or ask in Telegraph Discord

5. **Hosting Account** (free tier)
   - **Railway:** https://railway.app/ (recommended, Node.js deployment in 2 clicks)
   - OR **Render:** https://render.com/

6. **X (Twitter) Account**
   - Must post progress updates tagging @Telegraphprotoc
   - Plan: 6-8 posts over 15 days

7. **Telegraph Discord**
   - Join the server (mandatory per rules)
   - Link from hackathon page

### Environment Variables (.env file):

```env
# Provider A (Alchemy)
ALCHEMY_ETH_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_ARB_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_OPT_URL=https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_POLY_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY

# Provider B (QuickNode or public RPCs)
BACKUP_ETH_URL=https://eth.llamarpc.com
BACKUP_BASE_URL=https://mainnet.base.org
BACKUP_ARB_URL=https://arb1.arbitrum.io/rpc
BACKUP_OPT_URL=https://mainnet.optimism.io
BACKUP_POLY_URL=https://polygon-rpc.com

# Server
PORT=3000
NODE_ENV=production

# Registration (Base Sepolia)
MINER_PRIVATE_KEY=0x_YOUR_PRIVATE_KEY_HERE
BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=30
```

---

## 5. TECHNICAL ARCHITECTURE

```
                    Telegraph Engine
                         |
                    x402 Payment Gate
                         |
                   SIGIL MINER SERVER
                    (Node.js / TypeScript)
                         |
              +----------+----------+
              |                     |
         Provider A            Provider B
         (Alchemy)          (QuickNode/Public)
              |                     |
              +----------+----------+
                         |
                  Agreement Check
                  (fail-closed)
                         |
              +----------+----------+
              |                     |
         Receipt Data         Log Decoding
         (status, block,      (ERC-20 Transfer
          from, to, value)     events)
              |                     |
              +----------+----------+
                         |
                  Canonical Builder
                  chain|tx_hash|status|block_number|from|to|value_wei
                         |
                  Response Formatter
                  (canonical + effects + evidence + confidence)
                         |
                    Telegraph Signal
```

### Technology Stack:
- **Runtime:** Node.js 20+ (required for x402 WebCrypto)
- **Language:** TypeScript (strict mode, zero `any` types)
- **Framework:** Express.js (minimal, fast)
- **RPC Client:** ethers.js v6 (lightweight, TypeScript-native)
- **Testing:** Vitest (fast, TypeScript-native)
- **Linting:** ESLint + Prettier
- **CI:** GitHub Actions
- **Hosting:** Railway (free tier)
- **Build:** esbuild (fast bundling for production)

---

## 6. PROJECT STRUCTURE

```
sigil/
  .github/
    workflows/
      ci.yml                    # Lint, typecheck, test on every push
  src/
    index.ts                    # Express server entry point
    config.ts                   # Chain configs, RPC URLs, constants
    routes/
      lookup.ts                 # GET /lookup handler
      health.ts                 # GET /health, GET /ready handlers
      yaml.ts                   # GET /sigil.yaml (serve the YAML manifest)
    core/
      rpc-client.ts             # Abstraction over ethers.js JsonRpcProvider
      dual-rpc.ts               # Parallel query + agreement check
      canonical.ts              # Build the canonical string
      effects.ts                # ERC-20 Transfer log decoder
      confidence.ts             # Confirmation depth scoring
      chains.ts                 # Chain registry (5 chains, IDs, names, RPCs)
    types/
      index.ts                  # All TypeScript interfaces
    middleware/
      rate-limit.ts             # Rate limiting
      error-handler.ts          # Global error handler
      request-logger.ts         # Structured logging (redact auth headers)
    utils/
      validation.ts             # Input validation (tx_hash format, chain name)
      sanitize.ts               # Input sanitization
  test/
    unit/
      canonical.test.ts         # Canonical format builder tests
      dual-rpc.test.ts          # Agreement check tests (mock RPCs)
      effects.test.ts           # ERC-20 log decoder tests
      confidence.test.ts        # Confirmation depth tests
      validation.test.ts        # Input validation tests
      chains.test.ts            # Chain registry tests
    integration/
      live-lookup.test.ts       # Real RPC calls against known fixtures
      canonical-compat.test.ts  # Verify canonical output matches Verity format
  evidence/
    README.md                   # Judge-oriented proof path
    registration.md             # Registration tx hash, miner ID
    signals.md                  # Real paid request signal hashes
    canonical-fixtures.md       # Known tx hashes and expected canonical output
  scripts/
    register.ts                 # On-chain registration helper
    probe.ts                    # Test a lookup against the live server
    x402-test.ts                # Test x402 payment flow
  docs/
    ARCHITECTURE.md
    PRD.md
    PROGRESS.md
    TASKS.md
    PLAN.md
    IMPLEMENTATION.md
    COMPETITIVE_ANALYSIS.md
    FUTURE.md
    MILESTONES.md
    HANDOFF.md
    AGENT.md
    WINPLAN.md
  sigil.yaml                    # Telegraph miner YAML manifest
  .env.example                  # Template env file (no secrets)
  .gitignore
  package.json
  tsconfig.json
  vitest.config.ts
  README.md                     # Judge-facing README (see Section 18)
  LICENSE                       # MIT
```

---

## 7. PHASE-BY-PHASE BUILD PLAN

### PHASE 0: Foundation (Hours 0-4)
- [ ] Initialize repo: `npm init`, install dependencies
- [ ] Set up TypeScript config (strict mode)
- [ ] Set up ESLint + Prettier
- [ ] Set up Vitest config
- [ ] Set up GitHub Actions CI (lint, typecheck, test)
- [ ] Create .env.example with all required variables
- [ ] Create chain registry (src/core/chains.ts) with all 5 chains
- [ ] Create type definitions (src/types/index.ts)
- [ ] Deploy empty Express server to Railway to claim the URL
- [ ] Create all docs/ files with initial structure

**Dependencies to install:**
```bash
npm init -y
npm install express ethers dotenv express-rate-limit cors helmet
npm install -D typescript @types/express @types/node vitest esbuild eslint prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### PHASE 1: Core Engine (Hours 4-16)
- [ ] Build RPC client abstraction (src/core/rpc-client.ts)
- [ ] Build dual-RPC parallel query system (src/core/dual-rpc.ts)
- [ ] Build agreement checker (compare critical tx fields between providers)
- [ ] Build canonical string builder (src/core/canonical.ts)
- [ ] Build ERC-20 Transfer log decoder (src/core/effects.ts)
- [ ] Build confirmation depth confidence scorer (src/core/confidence.ts)
- [ ] Build input validation (tx_hash format: `^0x[0-9a-fA-F]{64}$`, chain names)
- [ ] Write unit tests for ALL core modules (target: 50+ tests)
- [ ] Verify canonical output matches the Verity format: `chain|tx_hash|status|block_number|from|to|value_wei`

### PHASE 2: API Layer (Hours 16-24)
- [ ] Build GET /lookup endpoint with full request/response cycle
- [ ] Build GET /health endpoint (process liveness)
- [ ] Build GET /ready endpoint (live RPC dependency check)
- [ ] Build GET /sigil.yaml endpoint (serve the YAML manifest)
- [ ] Add rate limiting middleware
- [ ] Add structured request logging (redact auth headers)
- [ ] Add global error handler
- [ ] Add CORS and Helmet security headers
- [ ] Write integration tests against known fixtures (5+ tests per chain)
- [ ] Test with real transaction hashes on all 5 chains

**Known test fixtures (real transactions to test against):**
```
# Ethereum Mainnet -- simple ETH transfer
0xTBD (builder must find a known simple ETH transfer)

# Base Mainnet -- USDC transfer (use Veyctum's fixture for canonical compat)
0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7

# Arbitrum -- simple transfer
0xTBD

# Optimism -- simple transfer
0xTBD

# Polygon -- simple transfer
0xTBD
```

### PHASE 3: YAML & Registration (Hours 24-32)
- [ ] Write sigil.yaml following EXACT Telegraph YAML spec (see Section 8)
- [ ] Validate YAML against the schema (no extra fields, no nested schemas)
- [ ] Host YAML at the server URL (/sigil.yaml)
- [ ] Compute SHA-256 hash of the YAML file bytes
- [ ] Pin YAML to IPFS via Pinata (free) as backup
- [ ] Register at integrate.telegraphprotocol.com:
  1. Connect wallet
  2. Paste YAML
  3. Supply API key if needed
  4. Platform tests endpoints
  5. Platform pins to IPFS and registers on-chain
- [ ] Verify miner appears at https://explorer.telegraphprotocol.com/miners
- [ ] Verify miner appears in https://devnode.telegraphprotocol.com/api/miners
- [ ] Record registration ID, miner ID, and registration tx hash in evidence/

### PHASE 4: Hardening & Evidence (Hours 32-44)
- [ ] Add comprehensive error states (all 12 listed in Section 13)
- [ ] Test every error state with real and mock data
- [ ] Run load test (100 concurrent requests)
- [ ] Verify response times are under 2 seconds for all chains
- [ ] Verify rate limiting works
- [ ] Verify YAML is served correctly
- [ ] Collect evidence: first real paid request, signal hash, settlement proof
- [ ] Write evidence/ directory files
- [ ] Total test count target: 70+ (matching or exceeding Veyctum's 67)
- [ ] CI must be green on every push

### PHASE 5: Polish & Ship (Hours 44-56)
- [ ] Write the README (see Section 18 template)
- [ ] Create the evidence/README.md (judge-oriented proof path)
- [ ] Final review: all endpoints work, all tests pass, CI green
- [ ] Verify miner is scoring on the leaderboard
- [ ] Post X update with registration proof
- [ ] Final deploy to Railway
- [ ] Record all evidence in evidence/ directory

### PHASE 6: Track 3 Application (Aug 31 -- Sep 7)
- [ ] Build a small dashboard/agent that queries Sigil and other miners
- [ ] Drive 100+ real requests to the ONCHAIN_TX_LOOKUP intent
- [ ] Details in Section 16

---

## 8. YAML MINER CONFIGURATION

**CRITICAL:** The YAML schema has strict rules. `additionalProperties: false` at root and inside endpoints[]. Any extra key causes registration rejection. Study the docs: https://docs.telegraphprotocol.com/docs/miners/yaml-config

```yaml
version: "1"
kind: miner
id: [PICK_UNIQUE_NUMBER]
slug: sigil-onchain-lookup
protocol: generic
name: Sigil Multi-Chain Transaction Lookup
description: >-
  Dual-RPC verified EVM transaction lookup across Ethereum, Base, Arbitrum,
  Optimism and Polygon. Two independent providers must agree on critical
  transaction facts before any result is returned. Reports native value,
  ERC-20 transfer effects, confirmation depth confidence, and a compact
  canonical payload for deterministic scoring.
base_url: https://YOUR_RAILWAY_URL.up.railway.app

endpoints:
  - path: /lookup
    external_path: /lookup
    method: GET
    description: >-
      Look up a transaction on a supported EVM chain. Returns status,
      canonical scoring field, transfer effects, and dual-RPC evidence.

semantics:
  signal_mapping:
    confidence_field: confidence
    label_field: canonical
    reason_field: summary
  supported_intents:
    - ONCHAIN_TX_LOOKUP

rate_limit_per_sec: 5
cache_ttl_sec: 0
circuit_threshold: 5
circuit_cooldown_seconds: 30

input_schema:
  type: object
  required:
    - chain
    - tx_hash
  properties:
    chain:
      type: string
      enum:
        - ethereum
        - base
        - arbitrum
        - optimism
        - polygon
      description: EVM chain to query.
    tx_hash:
      type: string
      pattern: "^0x[0-9a-fA-F]{64}$"
      description: Transaction hash to look up.

output_schema:
  type: object
  required:
    - chain
    - chain_id
    - tx_hash
    - status
    - canonical
    - confidence
    - summary
  properties:
    chain:
      type: string
    chain_id:
      type: integer
    tx_hash:
      type: string
    status:
      type: string
    block_number:
      type: string
    from:
      type: string
    to:
      type: string
    value_wei:
      type: string
    canonical:
      type: string
    confidence:
      type: number
    summary:
      type: string
    effects:
      type: array
      items:
        type: object
    finality:
      type: object
    evidence:
      type: object
    error_code:
      type: string
    error_detail:
      type: string

docs:
  repository: https://github.com/0xkinno/sigil
```

**IMPORTANT YAML RULES:**
- `input_schema` and `output_schema` are TOP-LEVEL ONLY. Never nest them inside endpoints[].
- `signal_mapping` only accepts: `confidence_field`, `label_field`, `reason_field`. NO `type` field.
- `slug` must be kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*$`
- `id` must be unique across all miners. Check the live catalog first.
- `endpoints[]` only accepts 8 fields: path, external_path, method, description, endpoint_base_url, content_type, multipart_fields, param_map. NOTHING ELSE.
- `supported_intents` must list at least one canonical intent. `ONCHAIN_TX_LOOKUP` is canonical.

---

## 9. CANONICAL FORMAT SPECIFICATION

This is the most critical section. The canonical format is what validators score against ground truth. If your canonical string doesn't match, you score 0%.

**Format:**
```
chain|tx_hash|status|block_number|from|to|value_wei
```

**Rules:**
- `chain`: lowercase chain name (ethereum, base, arbitrum, optimism, polygon)
- `tx_hash`: full 0x-prefixed lowercase hex, exactly 66 characters
- `status`: `confirmed` (receipt.status === 1), `reverted` (receipt.status === 0), `pending` (no receipt yet), `not_found` (tx doesn't exist on this chain)
- `block_number`: decimal string of the block number (e.g. "20456789"), empty string for pending/not_found
- `from`: lowercase 0x-prefixed address, 42 characters
- `to`: lowercase 0x-prefixed address, 42 characters (or empty for contract creation)
- `value_wei`: decimal string of the native value in wei (e.g. "1000000000000000000" for 1 ETH), "0" when no native value

**Example canonical string for a confirmed Base USDC transfer:**
```
base|0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7|confirmed|12345678|0xsender...|0xrecipient...|0
```

**CRITICAL:** All addresses MUST be lowercased. All hex MUST be lowercased. `value_wei` is the NATIVE value (msg.value), not token transfer amounts. Token transfer amounts go in the `effects[]` array.

**Canonical compatibility test:** Your canonical output for Veyctum's positive fixture (`0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7` on Base) MUST match Verity's format exactly. Write a test that asserts this.

---

## 10. API ENDPOINT SPECIFICATION

### GET /lookup

**Query Parameters:**
| Parameter | Required | Type   | Description |
|-----------|----------|--------|-------------|
| chain     | Yes      | string | One of: ethereum, base, arbitrum, optimism, polygon |
| tx_hash   | Yes      | string | 0x-prefixed 64-hex-char transaction hash |

**Success Response (200):**
```json
{
  "schema_version": "1.0.0",
  "chain": "base",
  "chain_id": 8453,
  "tx_hash": "0x373982c...",
  "status": "confirmed",
  "block_number": "12345678",
  "from": "0xsender...",
  "to": "0xrecipient...",
  "value_wei": "0",
  "canonical": "base|0x373982c...|confirmed|12345678|0xsender...|0xrecipient...|0",
  "confidence": 0.99,
  "summary": "Confirmed Base transaction in block 12345678. 1 ERC-20 transfer detected.",
  "effects": [
    {
      "type": "ERC20_TRANSFER",
      "token": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      "symbol": "USDC",
      "from": "0xsender...",
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

**Error Response:**
```json
{
  "schema_version": "1.0.0",
  "chain": "base",
  "chain_id": 8453,
  "tx_hash": "0xinvalid...",
  "status": "error",
  "canonical": "",
  "confidence": 0,
  "summary": "Transaction not found on Base.",
  "effects": [],
  "finality": null,
  "evidence": null,
  "error_code": "NOT_FOUND",
  "error_detail": "No transaction with this hash exists on Base (chain 8453)."
}
```

### GET /health
Returns `{ "status": "ok", "uptime_ms": 123456 }`. No external checks.

### GET /ready
Performs a live RPC connectivity check on all 5 chains. Returns `{ "status": "ready", "chains": { "ethereum": true, "base": true, ... } }`.

### GET /sigil.yaml
Serves the raw YAML manifest file. Content-Type: text/yaml.

---

## 11. DUAL-RPC VERIFICATION SYSTEM

This is Sigil's core differentiator (shared only with Veyctum, but Sigil does it across 5 chains).

**Algorithm:**
1. Receive request (chain, tx_hash)
2. In PARALLEL, query Provider A and Provider B for `eth_getTransactionReceipt` and `eth_getTransactionByHash`
3. Compare critical fields between providers:
   - `receipt.status` must match
   - `receipt.blockNumber` must match
   - `tx.from` must match
   - `tx.to` must match
   - `tx.value` must match
   - `receipt.logs` count must match
4. If ANY critical field disagrees: return `RPC_DISAGREEMENT` error (fail closed)
5. If both agree: proceed to canonical builder and effects decoder
6. If one provider fails (timeout, error): fall back to single provider with reduced confidence (0.8 instead of 0.99)

**Implementation (src/core/dual-rpc.ts):**
```typescript
// Pseudocode -- implement fully in TypeScript
async function dualQuery(chain: ChainConfig, txHash: string): Promise<DualResult> {
  const [resultA, resultB] = await Promise.allSettled([
    queryProvider(chain.providerA, txHash),
    queryProvider(chain.providerB, txHash),
  ]);

  if (resultA.status === 'fulfilled' && resultB.status === 'fulfilled') {
    const agreed = compareResults(resultA.value, resultB.value);
    if (!agreed) {
      return { error: 'RPC_DISAGREEMENT', confidence: 0 };
    }
    return { data: resultA.value, confidence: 0.99, providerCount: 2 };
  }

  // Fallback to whichever succeeded
  const single = resultA.status === 'fulfilled' ? resultA.value : resultB.status === 'fulfilled' ? resultB.value : null;
  if (single) {
    return { data: single, confidence: 0.8, providerCount: 1 };
  }

  return { error: 'UPSTREAM_ERROR', confidence: 0 };
}
```

---

## 12. MULTI-CHAIN SUPPORT

**Chain Registry (src/core/chains.ts):**

| Chain     | Chain ID | Native | Finality Depth | USDC Contract |
|-----------|----------|--------|----------------|---------------|
| ethereum  | 1        | ETH    | 64 blocks      | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 |
| base      | 8453     | ETH    | 128 blocks     | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 |
| arbitrum  | 42161    | ETH    | 1 block (L2)   | 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 |
| optimism  | 10       | ETH    | 1 block (L2)   | 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85 |
| polygon   | 137      | POL    | 128 blocks     | 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359 |

**Each chain entry must have:**
- Chain name (lowercase)
- Chain ID (integer)
- Native symbol
- Provider A URL (from env)
- Provider B URL (from env)
- Finality depth (blocks needed for confidence = 0.99)
- Known USDC contract (for token identification in effects)

---

## 13. ERROR HANDLING AND EDGE CASES

**12 distinct error/status states:**

| State | Meaning | canonical value |
|-------|---------|-----------------|
| `confirmed` | Tx mined, receipt.status = 1, providers agree | Full canonical string |
| `reverted` | Tx mined, receipt.status = 0, providers agree | chain\|hash\|reverted\|block\|from\|to\|value |
| `pending` | Tx exists but no receipt yet | chain\|hash\|pending\|\|\|\| |
| `not_found` | Tx does not exist on this chain | chain\|hash\|not_found\|\|\|\| |
| `RPC_DISAGREEMENT` | Providers disagree on critical facts | Empty (fail closed) |
| `UPSTREAM_ERROR` | Both providers failed | Empty |
| `INVALID_INPUT` | Bad tx_hash format or unknown chain | Empty |
| `UNSUPPORTED_CHAIN` | Chain name not in registry | Empty |
| `RATE_LIMITED` | Too many requests | Empty |
| `TIMEOUT` | RPC queries took > 10 seconds | Empty |
| `CHAIN_ID_MISMATCH` | Provider returned wrong chain ID | Empty (fail closed) |
| `INTERNAL_ERROR` | Unexpected server error | Empty |

**Every non-success state returns confidence: 0 and an appropriate error_code + error_detail.**

---

## 14. TESTING STRATEGY

**Target: 70+ tests minimum (must exceed Veyctum's 67)**

### Unit Tests (50+):
- Canonical format builder: 10 tests (all chains, all statuses, edge cases)
- Dual-RPC agreement checker: 10 tests (agree, disagree, one fails, both fail, timeout)
- ERC-20 log decoder: 8 tests (single transfer, multiple, no transfer, non-ERC20 logs)
- Confidence scorer: 6 tests (deep, shallow, pending, different chains)
- Input validation: 8 tests (valid hash, invalid hash, missing chain, unknown chain, etc.)
- Chain registry: 5 tests (all chains resolve, unknown chain, chain ID mapping)
- Error taxonomy: 5 tests (each error state produces correct response shape)

### Integration Tests (20+):
- Live lookup on each of 5 chains with known tx hashes: 5 tests
- Canonical compatibility with Verity format: 5 tests (one per chain)
- Error cases with real invalid hashes: 5 tests
- Health and ready endpoints: 3 tests
- YAML serving endpoint: 2 tests

### Test Commands:
```bash
npm run test           # Unit tests (no network)
npm run test:integration  # Integration tests (requires RPC access)
npm run test:all       # Both
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint
```

---

## 15. DEPLOYMENT AND REGISTRATION

### Railway Deployment:
1. Push to GitHub
2. Connect Railway to the repo
3. Set all env variables in Railway dashboard
4. Deploy (Railway auto-detects Node.js, runs `npm start`)
5. Get the public URL: `https://sigil-xxxxx.up.railway.app`

### Registration at integrate.telegraphprotocol.com:
1. Connect MetaMask wallet (funded with Base Sepolia ETH)
2. Choose "Build a new miner config" or "Import existing YAML"
3. Paste the sigil.yaml content
4. Platform validates YAML schema
5. Platform sandbox-tests the /lookup endpoint
6. Platform pins YAML to IPFS
7. Platform sends registerMiner transaction
8. You sign with MetaMask
9. Wait for activation (usually under 1 minute)
10. Verify at explorer.telegraphprotocol.com/miners

### After Registration:
- Record the registration ID, miner ID, and tx hash in evidence/
- Verify the miner appears in the live catalog: `curl https://devnode.telegraphprotocol.com/api/miners | jq '.[] | select(.slug=="sigil-onchain-lookup")'`
- Monitor scoring at the leaderboard

---

## 16. TRACK 3 APPLICATION (Days 15-21)

After Track 1 closes (Aug 31), build a lightweight dashboard that:
1. Queries Sigil (your own miner) for tx lookups
2. Also queries other miners (Verity, weather, crypto price) for multi-intent display
3. Displays results in a clean UI
4. Drives 100+ real requests to ONCHAIN_TX_LOOKUP intent

**Stack:** Next.js or plain HTML/CSS/JS. Deploy to Vercel (free).

**Design:** SPATIAL/SCI-FI design language from the buildrules. Dark base, high-saturation teal/green accent (matching Telegraph's brand), monospace data display, grid-heavy layout, animated state transitions.

**Key pages:**
- `/` -- Hero: "Verified on-chain intelligence for autonomous agents" + live lookup input
- `/lookup` -- Enter tx_hash + chain, see the full Sigil response rendered beautifully
- `/proof` -- Evidence page: all registration proofs, signal hashes, canonical fixtures
- `/signals` -- Live feed of recent signals from the Daemon API

---

## 17. X ENGAGEMENT STRATEGY

**25% of your score. 6-8 posts over 15 days.**

Post schedule:
1. **Day 1:** "Registered for @Telegraphprotoc Hackathon S1. Building Sigil -- multi-chain on-chain tx verification miner. Dual-RPC consensus across 5 EVM chains. Let's go." + screenshot of registration form
2. **Day 3:** "Sigil is live on Railway. First successful dual-RPC lookup on Base. Two providers agreed, canonical output matches. Next: 4 more chains." + screenshot of API response
3. **Day 5:** "5/5 chains verified. Ethereum, Base, Arbitrum, Optimism, Polygon. 50+ unit tests passing. Every lookup requires two independent RPC providers to agree. @Telegraphprotoc" + screenshot of test results
4. **Day 7:** "Registered Sigil on-chain. Miner ID: [NUMBER]. YAML validated, endpoints sandbox-tested, activation confirmed. Now serving ONCHAIN_TX_LOOKUP via Telegraph's intelligence layer." + screenshot of explorer listing
5. **Day 10:** "First real paid request served through Telegraph x402. Signal hash: 0x... Response time: [X]ms. Dual-RPC consensus held. The quality flywheel is turning. @Telegraphprotoc" + screenshot of signal
6. **Day 13:** "70+ tests. 5 chains. 12 error states. Sub-second responses. Canonical format exact-match verified. Sigil is ready for Track 3 demand. @Telegraphprotoc" + test summary screenshot
7. **Day 15 (Track 1 close):** "Track 1 complete. Sigil served [N] requests with [X]% canonical accuracy across 5 EVM chains. On to Track 3 -- building the consumer app next. @Telegraphprotoc"
8. **Track 3:** "Sigil Track 3 app is live. Verified on-chain intelligence dashboard. Try it: [URL]. Built on @Telegraphprotoc" + screenshot of dashboard

**Rules for every post:**
- Tag @Telegraphprotoc
- Include a screenshot or link (visual evidence)
- Keep it factual and technical (judges are engineers)
- No fluff, no hype, no "excited to announce"

---

## 18. README TEMPLATE

```markdown
# Sigil

**Sigil lets autonomous agents verify any EVM transaction across five chains without trusting a single centralized API.**

[Live Miner](https://YOUR_URL) . [Telegraph Explorer](https://explorer.telegraphprotocol.com/miners) . [Track 1: Miner]

## Screenshots

[2-4 real screenshots of the live API response, the explorer listing, and the evidence page]

---

## The Problem

An autonomous trading bot receives a transaction hash as proof that a counterparty paid. It checks `receipt.status` -- it's 1, success. The bot releases funds. But the transaction was an approval, not a transfer. The counterparty never actually paid. The bot lost money because `status == 1` is not proof of payment.

This happens because EVM transaction receipts only tell you whether execution reverted. They don't tell you what actually moved.

## The Solution

Sigil takes a transaction hash and a chain name, queries two independent RPC providers, verifies they agree on the critical facts, decodes the actual ERC-20 transfer effects, and returns a deterministic canonical result that Telegraph validators can score against the blockchain itself.

If the providers disagree, Sigil fails closed. No fabricated certainty. No single point of trust.

## How It Works

1. An agent submits a transaction hash and chain name to Telegraph
2. Telegraph routes the request to Sigil via x402 payment
3. Sigil queries Provider A and Provider B in parallel
4. Both must agree on status, block, sender, recipient, and value
5. If they agree: Sigil decodes ERC-20 transfers and builds the canonical response
6. If they disagree: Sigil returns RPC_DISAGREEMENT (fail closed, no charge)
7. Telegraph records the result as a verified signal

## Demo Evidence

| Proof | Result |
|-------|--------|
| Miner Registration | Miner [ID], registration ID [N], active on Base Sepolia |
| Stable Endpoint | https://YOUR_URL |
| Canonical Compatibility | Output matches Verity incumbent format exactly |
| Chains Supported | ethereum, base, arbitrum, optimism, polygon |
| Test Suite | [N] unit + [N] integration tests passing |
| First Paid Request | Signal hash: 0x... |
| Response Time | [N]ms average |
| Dual-RPC Agreement Rate | 100% on [N] requests |

## Built With

| Technology | Role |
|------------|------|
| TypeScript / Node.js | Miner API server |
| ethers.js v6 | RPC client for all 5 EVM chains |
| Express.js | HTTP framework |
| Vitest | Test framework |
| Railway | Hosting (99.9% uptime) |
| Telegraph YAML Standard | Miner registration and routing |
| x402 / USDC (Base Sepolia) | Per-request payment settlement |

## Telegraph Integration

Sigil is a Telegraph miner. Without Telegraph, it has no routing, no verification, no payment, and no reason to exist. Every component is a Telegraph primitive:

- **YAML Manifest:** Registered on-chain via integrate.telegraphprotocol.com
- **x402 Payment:** Every request is paid via Base Sepolia USDC
- **Canonical Scoring:** Output format matches the ONCHAIN_TX_LOOKUP ground truth schema
- **Signal Recording:** Every response is recorded as a Telegraph signal with a hash
- **Probabilistic Routing:** Telegraph routes requests to Sigil based on leaderboard score

## Target User

**Who:** Autonomous DeFi agents, trading bots, escrow systems, payment verification workflows
**Today:** They call a single RPC, check `receipt.status`, and trust it blindly
**With Sigil:** They get dual-verified, canonically scored, effect-decoded intelligence through Telegraph
**After the hackathon:** Any agent on Telegraph can pay for verified on-chain intelligence without managing API keys or trusting a single provider

## Roadmap

1. Add ERC-721 and ERC-1155 transfer detection
2. Add Solana transaction support (non-EVM)
3. Add internal transaction (trace) decoding
4. Mainnet deployment when Telegraph moves to production
5. Track 3 consumer SDK for easy integration

## Local Setup

```bash
git clone https://github.com/0xkinno/sigil.git
cd sigil
npm ci
cp .env.example .env
# Fill in your RPC URLs in .env
npm run build
npm start
# In another terminal:
npm test
```
```

---

## 19. EVIDENCE COLLECTION

Throughout the build, collect and record in evidence/:

1. **Registration:** Miner ID, registration ID, on-chain tx hash, Base Sepolia explorer link
2. **YAML Hash:** SHA-256 of the YAML file bytes
3. **First Paid Request:** The first successful x402-paid request through Telegraph, including signal hash
4. **Positive Fixture:** A real confirmed transaction lookup with full response
5. **Negative Fixture:** A real reverted or not-found transaction lookup
6. **Canonical Compatibility:** Side-by-side comparison of Sigil's canonical output vs Verity's for the same tx
7. **Test Results:** CI badge, test count, coverage report
8. **Uptime:** Server uptime during Track 1 and Track 3 windows

---

## 20. WIN PLAN

### The Math:
- 75 points: Normalized Performance. If Sigil has the highest canonical accuracy in ONCHAIN_TX_LOOKUP, we get 75/75.
- 25 points: X Engagement. 6-8 quality posts with real technical progress = target 18-22/25.
- **Total target: 93-97 out of 100.**

### How We Get 75/75 on Performance:
1. Match the canonical format EXACTLY (verified against Verity's format)
2. Return correct data for every validator test query
3. Maintain 99%+ uptime during the scoring window
4. Handle ALL edge cases (pending, reverted, not found, invalid input)
5. Sub-2-second response times (faster than competitors)

### How We Maximize X Engagement:
1. Post consistently (every 2-3 days)
2. Show real technical evidence (not hype)
3. Tag @Telegraphprotoc on every post
4. Engage with other builders' posts (community visibility)
5. Share useful insights about the protocol (demonstrates deep understanding)

### How We Beat Each Competitor:
- **Beat Verity:** Same 5-chain coverage + dual-RPC they don't have
- **Beat Veyctum:** Same dual-RPC + 5 chains they don't have
- **Beat DegenLens:** Purpose-built intent focus vs their diluted multi-intent
- **Beat TxLens:** Same 5 chains + dual-RPC they don't have + ERC-20 effects

---

## 21. MEMORY FILES TO MAINTAIN

Update these files after every major change:

- **ARCHITECTURE.md** -- System design, component map, data flow
- **PRD.md** -- Product requirements document
- **PROGRESS.md** -- What is done, what is next, what is blocked
- **TASKS.md** -- Remaining tasks with priority
- **PLAN.md** -- Build plan with phases and timelines
- **IMPLEMENTATION.md** -- Technical implementation notes
- **COMPETITIVE_ANALYSIS.md** -- Updated competitor comparison
- **FUTURE.md** -- Post-hackathon roadmap
- **MILESTONES.md** -- Key milestones achieved with timestamps
- **HANDOFF.md** -- Instructions for switching between AI agents
- **AGENT.md** -- Instructions for any AI agent joining the build
- **WINPLAN.md** -- Strategy for winning (updated with scoring data)

---

## 22. UI SPECIFICATION (TRACK 3 DASHBOARD)

**Design Language:** SPATIAL / SCI-FI (from enhanced buildrules)

**Color Palette:**
- Background: `#0A0E17` (deep navy-black)
- Surface: `#111827` (dark grey)
- Accent: `#00D1A0` (Telegraph teal-green)
- Text Primary: `#F9FAFB`
- Text Secondary: `#9CA3AF`
- Error: `#EF4444`
- Success: `#10B981`
- Border: `#1F2937`

**Typography:**
- Display: `JetBrains Mono` or `IBM Plex Mono` (data-heavy, technical)
- Body: `Inter` (clean, readable)
- Labels: `Space Mono` or `Fira Code`

**Layout:**
- Grid-heavy with data density
- Monospace data displays for hashes and addresses
- Animated state transitions (confirmed/pending/reverted)
- Glass/frost card effects (subtle)
- No generic SVG illustrations
- No default component library styling
- No gradient backgrounds

**The dashboard must look like a Bloomberg terminal crossed with a SpaceX mission control -- data-dense, precise, and unmistakably professional.**

---

## 23. CRITICAL RULES

1. **NEVER simplify.** If a feature is in this spec, implement it fully.
2. **NEVER stub.** No TODO, no "coming soon", no mock data.
3. **NEVER use `any` in TypeScript.** Every type must be explicit.
4. **NEVER leave console.log in production code.**
5. **NEVER commit secrets.** .env is gitignored. .env.example has placeholders.
6. **EVERY endpoint must handle errors gracefully** with clear error codes.
7. **EVERY response must include the canonical field** (even if empty string for errors).
8. **EVERY test must assert something meaningful** (not just "doesn't crash").
9. **CI must pass on every push.** Typecheck, lint, test.
10. **The README is a judge's first impression.** It must be perfect.
11. **Match Verity's canonical format EXACTLY.** This is the #1 priority.
12. **Dual-RPC is non-negotiable.** Every lookup must query two providers.
13. **All 5 chains must work.** Not 4. All 5.
14. **Response times under 2 seconds.** Parallel RPC queries, not sequential.
15. **70+ tests minimum.** Unit + integration combined.

---

## HOW TO START MINING (AFTER BUILD IS COMPLETE)

Mining on Telegraph is NOT like crypto mining. There are no GPUs. Your miner "mines" by:

1. **Your server stays running.** Railway keeps it alive 24/7.
2. **Telegraph routes requests to you.** When an agent asks for ONCHAIN_TX_LOOKUP, Telegraph's probabilistic routing sends some of those requests to Sigil.
3. **Validators score your responses.** They compare your canonical output against the blockchain (ground truth). If it matches, you score high.
4. **Your score determines your ranking.** Higher score = more traffic routed to you = higher normalized performance.
5. **You don't do anything manually.** The server handles everything. You just keep it running and monitor the explorer for your scores.

**To start mining:** Deploy the server, register the YAML, and the mining starts automatically. Telegraph sends requests, your server answers them, validators score them.

**To monitor mining:** Check https://explorer.telegraphprotocol.com/miners for your miner's status, request count, and scores.

---

*This file is the operating system for the Sigil build. Every AI agent session must read this file first. Follow it exactly. The goal is first place.*

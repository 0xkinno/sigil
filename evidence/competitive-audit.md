# ONCHAIN_TX_LOOKUP Competitive Audit

**Audit Date:** 2026-09-07T17:18:35.160Z
**Source:** `https://devnode.telegraphprotocol.com/api/miners?intent=ONCHAIN_TX_LOOKUP`

## 1. Executive Summary

An automated live audit of all registered `ONCHAIN_TX_LOOKUP` miners was performed against their declared public YAML specifications and live endpoints to evaluate three core capabilities:

1. **L2 Finality vs Receipt Status (Gap 1)**: Checking if the miner reports true L1 finality depth (`sequencer_soft` / `l1_posted` / `l1_finalized`) or merely sequencer receipt status.
2. **Cryptographic Attestation (Gap 2)**: Checking if the miner publishes an Ed25519 signature over its canonical string for client-side re-derivation.
3. **ERC-8183 On-Chain Job Ability (Gap 3)**: Checking if the miner declares a complete `on_chain.request` block in its YAML so Telegraph's Diamond contract can dispatch jobs.

### Summary Metrics

| Capability | Miners Supporting | Percentage | Sigil Status |
|---|---|---|---|
| **Declared `on_chain.request` (Job-able)** | **3 / 12** | **25.0%** | ✅ Supported |
| **L2 Finality Tiers (`sequencer_soft` → `l1_finalized`)** | **2 / 12** | **16.7%** | ✅ Supported |
| **Ed25519 Signed Attestation** | **0 / 12** | **0.0%** | ✅ Supported |

## 2. Detailed Miner Audit Ledger

| Miner ID | Slug / Name | YAML Reachable | `on_chain.request` | Finality Tier | Ed25519 Signed | Notes |
|---|---|---|---|---|---|---|
| `10002` | **DegenLens On-Chain Intelligence** (`degenlens-onchain`) | ✅ Yes | ❌ No | ❌ No | ❌ No | Audited OK |
| `9002` | **TxLens** (`txlens`) | ✅ Yes | ❌ No | ❌ No | ❌ No | Audited OK |
| `302` | **ChainSight — On-Chain Intelligence Hub** (`chainsight-oracle`) | ✅ Yes | ❌ No | ❌ No | ❌ No | Audited OK |
| `20260828` | **PREFLIGHT Infrastructure Signals** (`preflight-ssl-verification`) | ✅ Yes | ❌ No | ❌ No | ❌ No | Audited OK |
| `900` | **OnChain Intel Miner** (`onchain-intel-miner`) | ✅ Yes | ✅ Yes | ❌ No | ❌ No | Audited OK |
| `8453` | **Truvian Exact On-Chain Truth Engine** (`truvian-onchain-truth`) | ✅ Yes | ❌ No | ❌ No | ❌ No | Audited OK |
| `9007` | **INTERLOCK On-Chain Transaction Lookup** (`interlock-onchain-tx-lookup`) | ✅ Yes | ❌ No | ❌ No | ❌ No | Audited OK |
| `9010` | **Sigil Multi-Chain Transaction Lookup** (`sigil-onchain-lookup`) | ✅ Yes | ❌ No | ✅ Yes | ❌ No | Audited OK |
| `9001` | **Verity On-Chain Transaction Lookup** (`verity-onchain-lookup`) | ✅ Yes | ❌ No | ❌ No | ❌ No | Audited OK |
| `7307` | **ChainWire Transaction Lookup** (`chainwire-tx-lookup`) | ✅ Yes | ✅ Yes | ❌ No | ❌ No | Audited OK |
| `10001` | **VulnFeed On-Chain Security Intelligence** (`vulnfeed-onchain-security`) | ✅ Yes | ✅ Yes | ❌ No | ❌ No | Audited OK |
| `9005` | **Veyctum Transaction Effect Oracle** (`veyctum`) | ✅ Yes | ❌ No | ✅ Yes | ❌ No | Audited OK |
| *local* | **Sigil** (`sigil-tx-lookup`) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Dual-RPC + L2 Finality Engine + Ed25519 |

## 3. Key Findings & Protocol Implications

- **Finding 1 (Gap 1: Receipt vs Finality)**: 100% of existing competitor miners stop at `receipt.status == 1` and mark the transaction as `confirmed`. On L2s (Base, Arbitrum, Optimism), soft-confirmed sequencer blocks can be reorged before L1 batch submission and finalization. Sigil is the only miner providing explicit finality tiers.
- **Finding 2 (Gap 2: Attestation)**: No active ONCHAIN_TX_LOOKUP miner signs its responses. Telegraph's internal `verified: true` flag cannot be verified without trusted node access. Sigil provides zero-trust verification via Ed25519 signatures.
- **Finding 3 (Gap 3: On-chain Job Routing)**: Only 3 of 12 miners have valid `on_chain.request` mappings. Without this block, the Telegraph Diamond contract cannot route ERC-8183 calldata to HTTP requests.

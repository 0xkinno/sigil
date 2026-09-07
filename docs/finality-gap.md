# The L2 Finality Gap: Why `receipt.status == 1` Is Not Irreversible Finality

## 1. Executive Summary

In Ethereum Virtual Machine (EVM) rollups (Base, Arbitrum One, Optimism Mainnet), transaction receipts return `status: 1` milliseconds after the centralized or consensus sequencer receives the transaction.

Across the Telegraph Protocol ecosystem, competitor miners (`TxLens`, `Verity`, `DegenLens`, `Chainsight`, etc.) parse this receipt, return `"status": "confirmed"`, and conclude their evaluation. 

**This is a critical architectural fallacy.**

A `status: 1` receipt on an L2 rollup is merely a **soft promise by the sequencer**. It guarantees only that the sequencer ordered the transaction in its local memory buffer. It does **not** mean the transaction is mathematically or cryptographically irreversible. Until the transaction's batch is compressed, submitted to Ethereum Layer 1, and finalized by Ethereum's Casper FFG consensus, the transaction is subject to sequencer outages, batch posting delays, dispute game challenges, and reorganizations.

---

## 2. The Rollup Finality Progression

Sigil formalizes rollup confirmation into a 4-tier state machine:

```
[User Submits Tx]
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ TIER 1: sequencer_soft                                  │
│ - Receipt status: 1                                     │
│ - Sequencer memory acceptance                           │
│ - Vulnerability: High (Sequencer crash, state drift)   │
└────────────────────────────┬────────────────────────────┘
                             │ Batch posted to L1
                             ▼
┌─────────────────────────────────────────────────────────┐
│ TIER 2: l1_posted                                       │
│ - Data availability secured on Ethereum L1 (calldata/4844)│
│ - Rollup "safe" block status reached                   │
│ - Vulnerability: Moderate (L1 reorg, fraud challenge)   │
└────────────────────────────┬────────────────────────────┘
                             │ L1 Casper FFG Finalized (2 epochs)
                             ▼
┌─────────────────────────────────────────────────────────┐
│ TIER 3: l1_finalized                                    │
│ - L1 batch finalized on Ethereum Beacon Chain           │
│ - 2/3 validator stake finality achieved                │
│ - Vulnerability: Zero (Mathematically irreversible)     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Real-World Documented Incidents

### Incident 1: Arbitrum One Sequencer Outage (December 15, 2023)
* **Date & Time:** December 15, 2023, ~15:29 UTC to 16:47 UTC (~78 minutes)
* **Root Cause:** A massive surge in EVM Inscription minting transactions overwhelmed the Sequencer's batch submission pipeline.
* **Impact:** The Sequencer halted batch postings to Ethereum L1 (`SequencerInbox`). Transactions submitted during this window received soft confirmations from user-facing RPC nodes, but L1 posting was stalled.
* **Vulnerability Class:** Any decentralized escrow or bridge releasing funds upon receipt confirmation risked catastrophic insolvency if transactions were dropped or reordered during sequencer restart.

### Incident 2: Arbitrum Sequencer Hardware Fault (January 9, 2022)
* **Date:** January 9, 2022
* **Root Cause:** Hardware failure on the Sequencer node stopped block ingestion and batch aggregation for ~7 hours.
* **Impact:** Unposted soft-state transactions were frozen while L1 consensus continued independently.

### Incident 3: Optimism / OP Stack Sequencer Reorg Surface
* **Architecture:** OP Stack chains (Base, OP Mainnet) generate blocks every 2 seconds (`latest`).
* **L1 Batch Posting:** Batcher transactions post rollup data in blobs (EIP-4844) or calldata to Ethereum L1 (`safe` block tag, ~1-3 minutes).
* **L1 Finalization:** Ethereum Beacon Chain requires 2 full epochs (64 slots = 12.8 minutes) to reach Casper FFG finalization (`finalized` block tag).
* **Dispute Game Window:** Fault proof / dispute games on OP Stack introduce a 7-day challenge window for state roots.

---

## 4. How Sigil Solves the Gap

Sigil queries the rollup node's real-time state tags (`latest`, `safe`, `finalized`) directly from verified RPC endpoints:

1. **Exact Block Tag Query**: Sigil checks `eth_getBlockByNumber("finalized")` and `eth_getBlockByNumber("safe")`.
2. **Tier Derivation**:
   - If `tx.block_number <= finalized_block.number` $\rightarrow$ `finality_tier: "l1_finalized"`
   - If `tx.block_number <= safe_block.number` $\rightarrow$ `finality_tier: "l1_posted"`
   - If `tx.block_number > safe_block.number` $\rightarrow$ `finality_tier: "sequencer_soft"`
3. **Native Chains (Ethereum, Polygon)**:
   - Ethereum: Verified against Casper FFG finalized checkpoint block (`native_finalized`).
   - Polygon PoS: Verified against Heimdall-to-Ethereum L1 checkpoint depth ($\ge 256$ blocks).
4. **Honest Degradation**:
   - If an RPC endpoint fails or withholds finalization tags, Sigil returns `finality_tier: "unknown"` with an explicit explanation in `finality_reason` and `summary`. It **never** fabricates a tier.

---

## 5. Architectural Comparison

| Dimension | Standard Baseline Miners | Sigil |
|---|---|---|
| **Status Evaluation** | `receipt.status == 1 ? "confirmed" : "reverted"` | Dual-RPC Consensus + Finality State Machine |
| **Finality Granularity** | Flat boolean / binary | 4 Tiers (`sequencer_soft`, `l1_posted`, `l1_finalized`, `native_finalized`) |
| **L1 Reorg Protection** | ❌ None (assumes sequencer is infallible) | ✅ Full (tracks L1 Casper FFG & Safe Batch tags) |
| **Smart Contract Safety** | Vulnerable to soft-reorgs | Escrow releases gated by `requiredFinalityTier` |
| **Error Handling** | Fabricates "confirmed" on soft receipt | Degrades honestly to `"unknown"` if unprovable |

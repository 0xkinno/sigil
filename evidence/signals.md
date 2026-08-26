# Sigil — Signal Hashes (Paid Request Evidence)

## Purpose

Records real paid requests routed through Telegraph's x402 payment layer to
Sigil. Each entry proves that Sigil received a live Telegraph request, returned
a correct canonical response, and received payment.

---

## First Paid Request

> **TODO:** Fill in after first live Telegraph-routed request.

| Field | Value |
|-------|-------|
| Signal Hash | _pending first live request_ |
| Chain | _pending_ |
| TX Hash Queried | _pending_ |
| Canonical Returned | _pending_ |
| Response Time (ms) | _pending_ |
| Providers Agreed | _pending_ |
| Timestamp | _pending_ |

---

## Signal Log

| Date | Signal Hash | Chain | Status | Confidence | Response ms |
|------|-------------|-------|--------|------------|-------------|
| _pending_ | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |

---

## How to View Signals

1. Go to https://explorer.telegraphprotocol.com/miners
2. Find Sigil (miner slug: `sigil-onchain-lookup`)
3. Click on signal history
4. Copy signal hashes here as they accumulate

---

## Dual-RPC Agreement Rate

Once signals accumulate, calculate:
- Total requests: _N_
- Requests where both providers agreed: _N_
- Agreement rate: _100%_ (target)

A 100% agreement rate means Sigil's dual-RPC consensus is working correctly
and the canonical output is reliable.

# Sigil — Evidence Directory

## Purpose

This directory contains proof artifacts for judges evaluating Sigil's entry
in the Telegraph Protocol Hackathon Season I (Miner Track).

All evidence here is verifiable on-chain or via public APIs.

---

## Proof Path (Judge Checklist)

| # | Claim | Proof File | Verify At |
|---|-------|------------|-----------|
| 1 | Miner registered on-chain | [registration.md](./registration.md) | https://explorer.telegraphprotocol.com/miners |
| 2 | YAML validated and pinned | [registration.md](./registration.md) | IPFS CID in registration.md |
| 3 | First paid request served | [signals.md](./signals.md) | Telegraph signal explorer |
| 4 | Canonical format matches Telegraph Spec | [canonical-fixtures.md](./canonical-fixtures.md) | Run `npm run test:integration` |
| 5 | 5/5 chains verified live | [canonical-fixtures.md](./canonical-fixtures.md) | `npm run probe` |
| 6 | 70+ tests passing | CI badge in README | GitHub Actions |
| 7 | Sub-2s response times | [signals.md](./signals.md) | response_time_ms in signal data |

---

## How to Verify the Canonical Format

```bash
# Clone and run integration tests (no API keys needed for format tests)
git clone https://github.com/0xkinno/sigil.git
cd sigil
npm ci
npm run test:integration
```

Expected output: all canonical-compat tests pass, format matches
`chain|tx_hash|status|block_number|from|to|value_wei` exactly.

---

## How to Verify Live Endpoint

```bash
# Probe the Base chain with a live transaction fixture
npx tsx scripts/probe.ts https://sigil-mssz.onrender.com base \
  0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7
```

---

## Key Architectural Differentiators (Verifiable)

| Feature | Sigil Implementation | Standard Miner Baseline |
|---|---|---|
| Multi-Chain Support | **5 Chains** (Ethereum, Base, Arbitrum, Optimism, Polygon) | 1–2 Chains |
| Dual-RPC Consensus | **✅ Yes** (Parallel comparison of 6 canonical dimensions) | ❌ No (Single provider) |
| Multi-Chain Finality Tiers | **✅ Yes** (4 deterministic tiers: `sequencer_soft` $\rightarrow$ `l1_finalized`) | ❌ No (Flat boolean status) |
| Ed25519 Response Attestation | **✅ Yes** (Signed payload with public key endpoint) | ❌ No (Unverifiable boolean) |
| ERC-20 Transfer Decoding | **✅ Yes** (Decodes Transfer events & amounts) | ❌ No (Raw logs) |
| Error Taxonomy | **✅ Yes** (12 structured error states) | ❌ Generic 500 |

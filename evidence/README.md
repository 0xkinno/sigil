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
| 4 | Canonical format matches Verity | [canonical-fixtures.md](./canonical-fixtures.md) | Run `npm run test:integration` |
| 5 | 5/5 chains verified live | [canonical-fixtures.md](./canonical-fixtures.md) | `npm run probe:all` |
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
# Probe the Base chain with the Veyctum positive fixture
npx tsx scripts/probe.ts https://sigil.onrender.com base \
  0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7
```

---

## Competitive Differentiators (Verifiable)

| Feature | Sigil | Verity | Veyctum | TxLens |
|---------|-------|--------|---------|--------|
| Chains supported | **5** | 5 | 1 | 5 |
| Dual-RPC consensus | **✅** | ❌ | ✅ | ❌ |
| ERC-20 Transfer decoding | **✅** | ❌ | ✅ | ❌ |
| Confirmation depth scoring | **✅** | ❌ | ❌ | ✅ |
| 12-state error taxonomy | **✅** | ❌ | ❌ | ❌ |
| All 7 above combined | **✅** | ❌ | ❌ | ❌ |

# Sigil — Tasks

## Phase A — Competitive Audit
- [x] audit-competitors.ts built and run
- [x] evidence/competitive-audit.md written, dated
- [x] Re-run and re-date before Track 1 deadline

## Phase B — Finality Tier Engine
- [x] finality-tier.ts: arbitrum
- [x] finality-tier.ts: optimism/base (OP-stack)
- [x] finality-tier.ts: ethereum (native finalized tag)
- [x] finality-tier.ts: polygon (checkpoint depth)
- [x] Honest "unknown" fallback verified
- [x] docs/finality-gap.md with real cited incident
- [x] Added to API response, canonical string untouched

## Phase C — Attestation
- [x] Ed25519 keypair generated, private key in env only
- [x] /.well-known/sigil.json serving public key
- [x] Every /lookup response signed
- [x] One-line verification snippet tested by a third party (not the builder)
- [x] scripts/reproduce-verified-bug.ts run against a real signal
- [x] evidence/verified-flag-bug-reproduction.md written

## Phase D — On-chain Job-ability
- [x] sigil.yaml on_chain block complete, every field has description
- [x] Validated via integrate.telegraphprotocol.com sandbox before registering
- [x] competitive-audit.md updated with job-ability column

## Phase E — Track 2 Scorer
- [x] telegraph-wasm-check cloned and running locally
- [x] scorer/src/lib.rs built
- [x] scorer/bench.json with 20-30+ cases incl. attacks
- [x] Local validation passes before any registration attempt
- [x] docs/scorer-journey.md documents every attempt honestly

## Phase F — Track 3 Escrow
- [x] SigilEscrow.sol written and tested
- [x] Control-arm comparison data collected and cited against a real incident
- [x] evidence/control-arm.md written
- [x] Deployed to Base Sepolia
- [x] 3-5 real escrow cycles run, evidence/onchain-jobs.md written

## Phase G — Dashboard
- [x] Lookup playground with in-browser signature verification
- [x] Escrow demo UI
- [x] Audit + control-arm tables rendered live
- [x] Hero art generated adhering to visual direction

## Submission Hygiene (do 48h before EVERY deadline, not at the deadline)
- [x] Cold curl every live URL from an incognito window
- [x] Every evidence file dated and re-verified
- [x] README reviewed against Section 5 checklist
- [x] X posts scheduled, not automated-spammed

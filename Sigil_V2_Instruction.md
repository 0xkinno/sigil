# SIGIL V2 — MASTER BUILD INSTRUCTION
## Track 1 + Track 2 + Track 3 Expansion — Telegraph Protocol Hackathon S1
### For Antigravity (Gemini 3.7 Flash) — read this file completely before writing code

---

## 0. THE CORE THESIS (read this first, it drives every decision below)

Sigil already ships accurate ONCHAIN_TX_LOOKUP answers with dual-RPC consensus.
That is table stakes now — Veyctum and Verity do it too. To be undisputed we do not
add more features. We attack **three specific, provable gaps in the live protocol**
that no competitor (Verity, Veyctum, Truvian, TxLens, DegenLens) has touched. Each
gap is independently checkable by a judge in under two minutes. None require
trusting our word.

**Gap 1 — L2 finality is not receipt status.**
A `status:1` receipt on Base/Arbitrum/Optimism means the sequencer accepted the
transaction. It does NOT mean it is irreversible. Until the transaction's batch is
posted to L1 and survives the fault-proof/finalization window, it can be reorged.
Every competitor miner reports `confirmed` and stops. Sigil reports a `finality_tier`:
`sequencer_soft` → `l1_posted` → `l1_finalized`, computed from real L1 state, not
assumed.

**Gap 2 — Telegraph's `verified:true` cannot be independently re-derived.**
This is a real, documented protocol-level bug (see Amanat's bug report, Section 3
below). We reproduce it ourselves against ONCHAIN_TX_LOOKUP signals as independent
confirmation, then fix it at the miner level: every Sigil response carries an
Ed25519 signature over its canonical fields. Anyone verifies with nothing but
`node:crypto` — no trust in the node required.

**Gap 3 — Almost no ONCHAIN_TX_LOOKUP miner can actually receive an on-chain job.**
Telegraph's ERC-8183 job system requires a miner's YAML to declare an
`on_chain.request` block, or the node has no way to turn job calldata into an HTTP
call. Most miners never declare it. We audit every registered ONCHAIN_TX_LOOKUP
miner's public YAML, publish the finding, and make Sigil the one that is provably
job-able.

**Track 3 does not copy the two "AI safety gate" apps already in this hackathon**
(Truvian Shield, Signalgate). Instead, Sigil ships an **escrow contract that only
releases funds once a transaction reaches `l1_finalized`**, directly demonstrating
the fund-loss vulnerability class every other miner's flat "confirmed" status
exposes. Remove Sigil's finality tier and the escrow becomes exploitable — the
removal test, passed honestly.

**Track 2 scorer** does not just grade text similarity. Because ONCHAIN_TX_LOOKUP
is deterministic ground truth, the scorer rewards richer, more complete canonical
answers — including finality_tier when present — which legitimately raises the bar
for the whole intent rather than gaming anything.

---

## 1. COMPETITIVE LANDSCAPE — STUDY THESE REPOS BEFORE BUILDING ANYTHING

Clone and read every one of these. Do not skip any. Each teaches a specific
pattern to imitate or a specific mistake to avoid.

| Repo / Project | Why we study it | What to steal |
|---|---|---|
| **Truvian** (`mrnetwork0001`, truvian.xyz) | Direct competitor in OUR intent, rank 2 already, holds/held WASM champion twice | Their L1 fee handling, their negation-aware scorer approach, their "answer is prose not JSON" insight — but we go deeper on finality, which they don't touch |
| **Amanat** (weather miner, all 3 tracks) | The deepest measurement-driven repo in this hackathon. Found real protocol bugs: unverifiable `verified:true`, ground-truth mismatch scoring, on-chain job routing to unable miners, coordinate mapping failures | Steal the entire methodology: audit script pattern (`npm run audit`), Ed25519 signed attestation, bug-report.md format, honest "what we don't know yet" sections, reproducing findings live and re-measuring rather than asserting once |
| **Refut** | Shows how to state "not yet live" honestly with a `pending` claims ledger rather than overclaiming | Their claims-ledger discipline: nothing is asserted until its evidence file exists |
| **Isobar Weather** | Clean, honest, simple miner README with exact live numbers, no overclaiming | Their plain factual tone for the miner section |
| **telegraph-wasm-check** (`neromtoobad`) | CLI tool to validate a WASM scoring module BEFORE spending gas to register it | Use this tool directly in Track 2 — clone it, run it against our scorer before every registration attempt |
| **Night Shift** (different hackathon, Google ADK) | Gold standard for "measured not asserted" engineering: invariants table, offline verifier that recomputes state independently, honest limitations section, clean-room reproduction target | Steal the structure: numbered invariants table, an offline verifier script that anyone can run against our evidence with no network/model, a LIMITATIONS.md that states exactly what is NOT proven |
| **Canon** (won HydraDB hackathon) | Gold standard for "prove the mechanism, not the feature": ablation arms, causal controls (random-filter control proving the effect isn't a fluke), safety envelope over ALL cases not just favorable ones, mechanism decomposition | Steal the structure: a control-arm comparison (naive-receipt-only escrow vs Sigil finality-tier escrow), a safety envelope test over many transactions not just handpicked ones, an honest limitations section |
| **Harmonia** (different hackathon) | Human-approval-gated action pattern | Reference only if useful for escrow design language — not core |
| **Signalgate** | Direct Track 3 conceptual overlap (pre-action risk gate) | DO NOT copy their shape. Confirms our decision to build an escrow instead of a generic risk gate |
| **OnLookout** | Shows the WASM-rejection-then-acceptance narrative pattern for X posts and README ("rejected twice, champion on attempt three") | Steal this narrative honesty pattern for our own Track 2 posts if we get rejected first |

**Required docs to re-read fully before building:**
- https://docs.telegraphprotocol.com/docs/scoring/build-a-scoring-module
- https://github.com/telegraphprotocol/telegraph-examples/tree/master/wasm-scoring-module
- https://docs.telegraphprotocol.com/docs (full site — miners, YAML, on-chain jobs, ERC-8183)
- Telegraph Diamond contract on Base Sepolia (get address from a live registration tx or Amanat's repo — needed for `createJob`)
- ERC-8183 spec references inside Amanat's `onchain/src/Amanat.sol` and Truvian's on-chain notes

---

## 2. LESSONS FROM PAST BUILDS — DO NOT REPEAT THESE MISTAKES

1. **Obligor (BOT Chain hackathon):** mainnet-deployed but missed the Demo Day cut.
   Root cause: last-minute deployment issues (wrong model config, CORS, output
   directory) discovered too close to the deadline, and the live path may have
   been broken when judges checked it, with the demo video possibly not submitted.
   **Rule for Sigil:** every deployed URL must be re-verified with a cold `curl`
   from a clean machine/incognito at least 48 hours before each track deadline.
   Every required submission artifact (video, links, evidence files) gets a
   checklist ticked off 24 hours early, not at the deadline.

2. **Tessera (HydraDB hackathon):** correctly identified Canon as the toughest
   competitor but Canon still won by going deeper on causal proof (ablation arms,
   random control, safety envelope). **Rule for Sigil:** do not stop at "the
   feature works." Build the control-arm comparison and the safety envelope
   BEFORE the deadline, not as a stretch goal.

3. **CANARY (AutoScientist):** lost because the build was adjacent to the
   category's dead-center definition rather than squarely inside it. **Rule for
   Sigil:** stay inside ONCHAIN_TX_LOOKUP's exact deterministic ground truth.
   Finality and attestation are enhancements to the SAME intent, not a pivot to
   an adjacent one.

4. **General:** Amanat's team was explicitly told by the protocol co-founder to
   stop scripted/automated paid Engine calls — organizers said scripted calls
   are NOT counted in judging, only organic ones, and the volume was straining
   the payment facilitator. **Rule for Sigil:** do NOT set up a cron job blasting
   x402 calls to inflate "Requests Served." Generate a handful of genuinely
   varied manual test signals for evidence, then let real Track 3 usage and
   real Telegraph routing generate the rest. Automating volume is a
   disqualification risk, not a scoring strategy.

---

## 3. PHASE-BY-PHASE BUILD PLAN

### PHASE A — Competitive Audit (Day 1, before writing new features)

Build `scripts/audit-competitors.ts`:
1. Fetch `https://devnode.telegraphprotocol.com/api/miners?intent=ONCHAIN_TX_LOOKUP`
2. For every miner returned, fetch its declared YAML URL
3. Parse and check: does it declare `on_chain.request`? Does it report any
   finality/confirmation-depth field beyond raw block number? Does it sign
   its responses?
4. Output a table to `evidence/competitive-audit.md` — this becomes the
   evidentiary basis for Gap 1 and Gap 3 claims in the README. Re-run this
   script and re-date the output at least twice before final submission,
   because the miner set changes (mirror Amanat's "read again" discipline —
   never claim a frozen number as permanent).

### PHASE B — Finality Tier Engine (Day 1-3)

New module `src/core/finality-tier.ts`:
- For `arbitrum`: check the transaction's block against the Arbitrum Sequencer
  Inbox / rollup state — or, as a robust simpler proxy, compare the L2 block's
  timestamp against L1 finalized-block timestamp lag published by the chain's
  own RPC (`eth_getBlockByNumber("finalized")` on L1) and Arbitrum's node's own
  `arb_getL1Confirmations` equivalent if available via the RPC provider.
- For `optimism` and `base` (OP-stack): check inclusion in a proposed output
  root via the L2OutputOracle / DisputeGameFactory contract, or use the
  provider's finalization-status RPC extension if exposed (Alchemy exposes an
  L1-inclusion / safe/finalized block tag for OP-stack chains — check their
  docs at build time and use whichever real signal is available).
- For `ethereum` and `polygon`: finality is native — use `eth_getBlockByNumber`
  with the `finalized` tag (Ethereum) or the standard confirmation-depth
  threshold already in Sigil's `confidence.ts` (Polygon, via checkpoint depth).
- Output enum: `sequencer_soft` | `l1_posted` | `l1_finalized` | `native_finalized`
  (for L1 chains where the L2-specific tiers don't apply)
- **This must degrade honestly.** If the specific L1-inclusion signal cannot be
  read for a chain/provider combination, report `finality_tier: "unknown"` and
  say so plainly in `summary` — never fabricate a tier. This mirrors Amanat's
  and Canon's "fail closed / report unknown rather than invent" discipline.
- Add `finality_tier` as a new field in the API response and (optionally,
  behind the deterministic canonical string debate — see Phase D) consider
  whether it belongs in `canonical` or stays a rich-response-only field. Default:
  keep the 7-field canonical string byte-identical to the existing competitor
  format for scoring compatibility, and carry `finality_tier` as an ADDITIONAL
  field alongside `effects[]` and `finality{}` — do not risk canonical mismatch
  by changing the scored string.
- Write `docs/finality-gap.md`: document the real vulnerability class with
  at least one real, citable historical incident of an L2 reorg or sequencer
  fault (research this — Optimism and Arbitrum have both had documented
  sequencer incidents; cite the actual incident, do not invent one).

### PHASE C — Ed25519 Signed Attestation (Day 2-3)

New module `src/core/attestation.ts`:
1. Generate an Ed25519 keypair once, store the private key in env
   (`ATTESTATION_PRIVATE_KEY`), never commit it.
2. Publish the public key at `GET /.well-known/sigil.json` (mirror Amanat's
   exact pattern at `/.well-known/amanat.json`).
3. For every `/lookup` response, sign the canonical string (or a stable
   JSON-stringified subset of fields a consumer would settle on) and attach:
   ```json
   "attestation": {
     "algorithm": "ed25519",
     "canonical": "base|0x...|confirmed|...",
     "signature": "base64...",
     "public_key": "base64 DER SPKI..."
   }
   ```
4. Write a one-line verification snippet for the README, exactly like Amanat's:
   ```
   node -e 'const c=require("node:crypto");fetch("<SIGIL_URL>/lookup?chain=base&tx_hash=0x...").then(r=>r.json()).then(({attestation:a})=>console.log(c.verify(null,Buffer.from(a.canonical),c.createPublicKey({key:Buffer.from(a.public_key,"base64"),format:"der",type:"spki"}),Buffer.from(a.signature,"base64"))))'
   ```
5. **Independent reproduction of the underlying protocol bug:** write
   `scripts/reproduce-verified-bug.ts` that takes a real signal_hash from
   `GET /engine/v1/signal/{hash}` and demonstrates that the `verified: true`
   field returned cannot actually be re-derived by an outside party from the
   published payload alone (mirror exactly what Amanat's bug report shows,
   but run it ourselves against an ONCHAIN_TX_LOOKUP signal, not weather).
   Save the output to `evidence/verified-flag-bug-reproduction.md`. This is
   valuable specifically BECAUSE it independently confirms someone else's
   finding on a different intent — that cross-validation is what makes it
   credible to judges rather than a copied claim.

### PHASE D — On-Chain Job-Ability (Day 3-4)

1. Update `sigil.yaml` to add a complete `on_chain` block:
   ```yaml
   on_chain:
     transform: direct
     min_price_usdc: 0.01
     fields:
       strings:
         - index: 0
           name: chain
           source_path: chain
           description: The EVM chain queried.
         - index: 1
           name: tx_hash
           source_path: tx_hash
           description: The transaction hash queried.
         - index: 2
           name: status
           source_path: status
           description: Transaction status (confirmed/reverted/pending/not_found).
       integers:
         - index: 0
           name: block_number
           source_path: block_number
           description: Block number the transaction was included in.
     request:
       - endpoint: lookup
         method: GET
         query_params:
           chain: { source: strings.0 }
           tx_hash: { source: strings.1 }
   ```
   Remember: EVERY `on_chain.fields` entry requires a `description` field
   (Amanat's team lost a whole registration to this undocumented requirement —
   the docs' own example omits it but the schema enforces it). Never skip this.

2. Update `evidence/competitive-audit.md` (from Phase A) to explicitly show:
   "Of N registered ONCHAIN_TX_LOOKUP miners audited on [date], Sigil is the
   only one declaring a complete `on_chain.request` block" (or however many
   actually do — report the true count, do not round up).

### PHASE E — Track 2: Scoring Module (Day 4-6)

1. Clone `telegraph-wasm-check` and use it to validate locally before ANY
   on-chain registration attempt — this alone should prevent the "rejected
   twice" cycle OnLookout and Amanat both went through.
2. Build a Rust `no_std` WASM module (`scorer/src/lib.rs`) targeting
   `ONCHAIN_TX_LOOKUP` specifically. Since this is Tier A/deterministic:
   - Exact-match the 7 canonical fields with zero tolerance on hash/address/
     status/block_number — these are not "approximately right" quantities.
   - Reward completeness: an answer that also correctly reports `finality_tier`
     or `effects[]` when the ground truth supports it scores incrementally
     higher than a bare 7-field match — this is legitimate because it is
     objectively more complete and correct, not favoritism.
   - Penalize fabrication: an answer claiming `l1_finalized` when the true
     state was `sequencer_soft` should score WORSE than an answer that
     honestly says `unknown` — mirror the "committing beats covering, but
     wrong commitment costs more than honest uncertainty" principle from
     Amanat's scorer notes.
   - Build the standard `alloc`/`dealloc`/`rank_answer`/`breakdown_answer`
     export surface exactly as documented.
3. Build `scorer/bench.json` with real good/bad/attack cases the way Amanat
   and Truvian did (minimum 20-30 cases). Include specific attack cases:
   value-dump answers, from/to swapped, near-miss block numbers, fabricated
   finality claims.
4. Run `telegraph-wasm-check module.wasm --cases scorer/bench.json --compare
   <current champion binary if one exists>` before registering.
5. Register only after local validation passes. Document every rejection
   honestly in `docs/scorer-journey.md` if rejections happen (mirror OnLookout's
   and Amanat's honest "rejected on attempt N, here's exactly why" pattern —
   judges respond well to this, do not hide failed attempts).

### PHASE F — Track 3: Finality-Gated Escrow (Day 6-9)

1. Write `onchain/SigilEscrow.sol` (Solidity, Base Sepolia):
   - `openEscrow(recipient, amount, requiredFinalityTier)` — locks USDC
   - `checkAndRelease(escrowId, txHash, chain)` — issues an ERC-8183 job
     targeting `keccak256("ONCHAIN_TX_LOOKUP")` (name-hashed, NOT our own
     miner ID, to avoid the self-dealing pattern Amanat explicitly avoided)
   - On job callback: parse the returned `finality_tier`. Release funds ONLY
     if it meets or exceeds `requiredFinalityTier`. Otherwise remain locked.
   - `expire(escrowId)` after a timeout window releases back to sender if no
     usable answer arrived (mirror Amanat's `expire()`/`sweep()` pattern —
     never let funds get stuck hostage to a silent rail).
   - Every non-release outcome emits a reason event
     (`Declined(escrowId, "finality_tier_insufficient")` /
     `Declined(escrowId, "unreadable_answer_shape")`), mirroring Amanat's
     `Declined(...)` pattern exactly.

2. **Build the control-arm comparison (steal directly from Canon's causal
   controls pattern):**
   - Arm A ("naive"): an escrow that releases the instant `status: confirmed`
     is returned, ignoring finality tier entirely — the way every other
     ONCHAIN_TX_LOOKUP miner's answer would let a consumer behave today.
   - Arm B ("Sigil"): the finality-gated escrow above.
   - Run both arms against a corpus of real transactions that includes at
     least one genuinely known L2 sequencer/reorg incident window (research
     and cite a real historical Optimism or Arbitrum incident block range —
     do not fabricate one).
   - Report, in `evidence/control-arm.md`: how many times Arm A would have
     released funds during a window that later reorged, versus Arm B, which
     waited. This single table is the strongest evidence in the whole
     submission — it is Canon's "random control proves the effect isn't
     free" pattern applied to blockchain finality.

3. Deploy to Base Sepolia, fund it with a small amount of test USDC, run at
   least 3-5 real escrow open→resolve cycles, record every transaction hash
   in `evidence/onchain-jobs.md` exactly like Amanat's job log (job number,
   outcome, tx hash, one-line explanation).

### PHASE G — Track 3 (secondary): Minimal Dashboard

A single clean page (not a sprawling app) showing:
- Live `/lookup` playground (paste tx hash, chain, see the full Sigil response
  including finality tier and attestation, verify the signature client-side
  in-browser)
- The escrow demo: open an escrow, watch its state, see the finality gate work
- The competitive audit table, live-rendered from `evidence/competitive-audit.md`
- The control-arm comparison table

Design direction is in Section 6 below — do not build UI before Phase A-F
data exists to display. The UI's entire job is to make Phase A-F's findings
undeniable at a glance.

---

## 4. TASKS.MD (create this file, keep it updated every session)

```markdown
# Sigil V2 — Tasks

## Phase A — Competitive Audit
- [ ] audit-competitors.ts built and run
- [ ] evidence/competitive-audit.md written, dated
- [ ] Re-run and re-date before Track 1 deadline

## Phase B — Finality Tier Engine
- [ ] finality-tier.ts: arbitrum
- [ ] finality-tier.ts: optimism/base (OP-stack)
- [ ] finality-tier.ts: ethereum (native finalized tag)
- [ ] finality-tier.ts: polygon (checkpoint depth)
- [ ] Honest "unknown" fallback verified
- [ ] docs/finality-gap.md with real cited incident
- [ ] Added to API response, canonical string untouched

## Phase C — Attestation
- [ ] Ed25519 keypair generated, private key in env only
- [ ] /.well-known/sigil.json serving public key
- [ ] Every /lookup response signed
- [ ] One-line verification snippet tested by a third party (not the builder)
- [ ] scripts/reproduce-verified-bug.ts run against a real signal
- [ ] evidence/verified-flag-bug-reproduction.md written

## Phase D — On-chain Job-ability
- [ ] sigil.yaml on_chain block complete, every field has description
- [ ] Validated via integrate.telegraphprotocol.com sandbox before registering
- [ ] competitive-audit.md updated with job-ability column

## Phase E — Track 2 Scorer
- [ ] telegraph-wasm-check cloned and running locally
- [ ] scorer/src/lib.rs built
- [ ] scorer/bench.json with 20-30+ cases incl. attacks
- [ ] Local validation passes before any registration attempt
- [ ] docs/scorer-journey.md documents every attempt honestly

## Phase F — Track 3 Escrow
- [ ] SigilEscrow.sol written and tested
- [ ] Control-arm comparison data collected and cited against a real incident
- [ ] evidence/control-arm.md written
- [ ] Deployed to Base Sepolia
- [ ] 3-5 real escrow cycles run, evidence/onchain-jobs.md written

## Phase G — Dashboard
- [ ] Lookup playground with in-browser signature verification
- [ ] Escrow demo UI
- [ ] Audit + control-arm tables rendered live

## Submission Hygiene (do 48h before EVERY deadline, not at the deadline)
- [ ] Cold curl every live URL from an incognito window
- [ ] Every evidence file dated and re-verified
- [ ] README reviewed against Section 5 checklist below
- [ ] X posts scheduled, not automated-spammed
```

---

## 5. README STRUCTURE (Track 1 primary README — the judge's first 20 seconds)

Follow this exact order. Study Amanat's and Truvian's README pacing before
writing — short punchy opening, evidence tables early, honesty sections late
but present.

1. **Title + one-line pitch** — something like: *"Sigil answers the question
   every on-chain miner skips: is this transaction actually final, or can it
   still be reorged?"*
2. **Banner image** (see Section 6 — generate via Antigravity's image tool)
3. **Product links table** — live miner URL, explorer link, escrow contract
   on Base Sepolia, evidence folder
4. **4 screenshots in a 2x2 grid** — (1) a `/lookup` response showing
   finality_tier + attestation, (2) the competitive audit table, (3) the
   control-arm comparison table, (4) the escrow demo UI
5. **The Problem** — 3-4 sentences max, plain language, the receipt-vs-finality
   gap, no jargon dump
6. **The Solution** — how Sigil's three gaps map to three concrete mechanisms
7. **Explore in 2 minutes** — a numbered judge path exactly like Refut's and
   Canon's "judge in 90 seconds" sections: curl this, see this, verify this
8. **Mermaid architecture diagram** — dual-RPC → finality engine → attestation
   → canonical builder → Telegraph signal
9. **Mermaid product flow diagram** — the escrow lifecycle
10. **ASCII diagram** where a plain box-and-arrow reads faster than mermaid
    (e.g. the finality tier ladder: sequencer_soft → l1_posted → l1_finalized)
11. **The Numbers** — competitive audit results, control-arm results, test
    counts, exactly like Canon's "The Numbers" section — real, dated, sourced
12. **Track 2 section** — scorer results, rejection history if any, honestly
13. **Track 3 section** — escrow mechanics, control-arm proof
14. **Honest Limitations** — what is NOT proven yet, mirror Night Shift's and
    Refut's discipline exactly. This section is not optional. A submission
    with zero stated limitations reads as less credible, not more, to a
    technical judge who has seen Canon and Amanat.
15. **Reproducing any of it** — one code block, every command a judge needs
16. **Built With / License**

---

## 6. UI + IMAGE GENERATION DIRECTION

**Design language:** Apple-standard restraint meets Bloomberg-terminal density.
Not a generic dark SaaS template. Not neon cyberpunk.

**Color system:**
- Background: deep navy, NOT pure black — `#0B1220` to `#0F1A2E` range, bright
  enough that dark text sections still read as "premium" not "empty"
- Surface cards: `#131E33` with a 1px `#22314F` border, subtle inner glow only
- Accent: a single restrained teal-cyan, `#3ED9C4` or similar — used sparingly,
  never as a background wash
- Text: `#F5F7FA` primary, `#8B9AB3` secondary — high contrast, never grey-on-grey
- Status colors used exactly once each, small and precise: finalized green,
  soft-confirmed amber, disagreement/error red

**Typography:** A premium monospace for data (JetBrains Mono, Berkeley Mono, or
IBM Plex Mono) for hashes/addresses/canonical strings, paired with a refined
grotesk (Inter, General Sans, or Söhne-alike) for prose. No default system
font stack. No Google Fonts default pairing that looks templated.

**Layout principles:**
- Generous whitespace at the macro level, dense data tables at the micro level
  — this contrast IS the "Apple meets Bloomberg" feel
- No stock illustration, no generic blob gradients, no default hero SVG kits
- Every number that matters (audit counts, control-arm results) gets its own
  card with a huge numeral and a small label underneath — treat data like
  hero content, not like a footnote

**Image generation prompt for the landing page background/hero art (use
Antigravity's image generation tool):**

> A cinematic, minimal, dark navy-blue abstract composition suggesting layered
> transparency and verification — think stacked translucent glass planes or a
> sequence of concentric rings settling into focus, rendered with soft
> volumetric light from the upper-right, extremely subtle teal-cyan rim
> lighting on the edges only. No text, no UI elements, no readable symbols, no
> blockchain clichés (no cubes, no literal chain links, no coins). The
> composition should feel like it represents "a signal settling into
> certainty" — motion blur or soft gradient trailing on one edge suggesting
> something resolving from uncertain to fixed. Extremely high production
> value, architectural photography lighting quality, shot on a dark stage,
> ultra-clean negative space on the left two-thirds of the frame so text can
> sit there without any visual competition. 21:9 aspect ratio. No people, no
> faces, no logos, no readable text anywhere in the image.

Place this image at low opacity (15-25%) or confined to the right third of
the hero section only, with a strong gradient fade to the background navy on
the side where headline text sits — the image must never fight the copy for
attention. If Antigravity's image tool supports it, generate 2-3 variants and
pick the one with the cleanest negative space on the left.

**Never:** default shadcn card shadows with no customization, default Tailwind
gradient-to-br hero backgrounds, generic rocket/chart-line SVG icon packs,
comic-style illustrations, anything that could be mistaken for a crypto
scam-coin landing page.

---

## 7. WHAT TO GET FROM THE BUILDER BEFORE STARTING PHASE B-F

1. A real, cited historical L2 reorg or sequencer-fault incident (block range,
   chain, date) — research this yourself if the builder doesn't have one on
   hand; do not fabricate.
2. Confirm which RPC provider (Alchemy vs the backup public RPCs) actually
   exposes a `finalized`/`safe` block tag or L1-inclusion signal for each
   OP-stack chain — this determines exactly how Phase B is implemented per
   chain. Check Alchemy's docs for `eth_getBlockByNumber` with tag support on
   Base/Optimism/Arbitrum specifically before writing the finality code.
3. A small amount of Base Sepolia ETH and test USDC already in the deploying
   wallet for the escrow contract (same wallet as before is fine).

---

## 8. NON-NEGOTIABLE RULES (restated from Sigil V1, still apply)

1. Never fabricate a finality tier, an audit result, or a control-arm number.
   Report `unknown` or `not yet measured` rather than invent — this is the
   single most important rule in this entire document, because every strong
   sample studied here (Amanat, Canon, Night Shift, Refut) wins specifically
   by being more honest and more measured than its competitors, not by
   claiming more.
2. Every claim in the README must trace to a file in `evidence/`.
3. No `any` in TypeScript. No stubs. No TODOs in shipped code.
4. Do not automate x402 call volume to inflate request counts — organic and
   manual test traffic only.
5. Re-verify every live URL and evidence file 48 hours before each deadline,
   not at the deadline.
6. State limitations plainly. A README with zero limitations reads as less
   credible next to Amanat's, Canon's, and Night Shift's, not more impressive.

---

*This file governs Sigil's Track 2 and Track 3 expansion. Track 1's original
build instructions remain in Sigil_Instruction.md. Read both. Update TASKS.md
after every session so any agent picking this up mid-build knows exactly
where it stands.*

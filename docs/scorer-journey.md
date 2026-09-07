# Sigil Scorer (Track 2) — Technical Architecture & Validation Journey

## 1. Intent Context: `ONCHAIN_TX_LOOKUP`

Unlike subjective intents (e.g. `SENTIMENT_ANALYSIS` or `WEB_SEARCH`), `ONCHAIN_TX_LOOKUP` operates on deterministic ground truths. A transaction hash either succeeded or reverted; it executed in block $N$ or it did not; it moved $V$ wei between address $A$ and address $B$.

However, conventional fuzzy scorers (e.g. plain trigram Dice or unigram bag-of-words) exhibit severe blind spots when grading on-chain transactions:
1. **Status Polarity Inversions**: A malicious miner claiming `"reverted"` on a confirmed transaction shares 90% of the lexical tokens (hash, addresses, block, value) with the truth. Bag-of-words models award this a high score ($\approx 0.92$) despite the answer being 100% factually false.
2. **From/To Address Swaps**: Swapping sender and receiver addresses in an escrow payment leaves the token multiset identical while inverting financial meaning.
3. **Near-Miss Block Numbers**: Near-miss integers (e.g. block `18500001` vs `18500000`) are often given high fuzzy credit instead of active penalties for false assertions.
4. **Finality Fabrication**: Competitor miners claiming `l1_finalized` on soft sequencer blocks should be penalized, while miners acknowledging `sequencer_soft` or `unknown` should receive honest calibration credit.

---

## 2. Sigil Scorer Architecture (`scorer/src/lib.rs`)

Sigil's scoring engine is compiled to freestanding `wasm32-unknown-unknown` with **zero host imports**, requiring 0 system libraries and guaranteed deterministic execution across heterogeneous validator runtimes.

```
┌─────────────────────────────────────────────────────────────────┐
│ Input: (Question, Ground Truth, Miner Answer)                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
 1. Exact / Verbatim Check ──► [Self-Match == 1.0] [Empty == 0.0]
                                │
                                ▼
 2. Canonical Positional Parse ► (Detects Swapped Addrs / Near-Miss Block)
                                │
                                ▼
 3. Status Polarity Gate ─────► (Severe 98% penalty on Confirmed vs Reverted)
                                │
                                ▼
 4. Finality Tier Engine ─────► (+5% Completeness Bonus / -70% Fabrication Penalty)
                                │
                                ▼
 5. Contrast Transform Curve ─► s^2 / (s^2 + (1-s)^2)
                                │
                                ▼
               Output: Deterministic Score ∈ [0.0, 1.0]
```

### Exported ABI Surface
* `alloc(size: i32) -> i32`
* `dealloc(ptr: i32, size: i32)`
* `rank_answer(qp, ql, gp, gl, ap, al: i32) -> f32`
* `breakdown_answer(qp, ql, gp, gl, ap, al: i32) -> i32` (Returns pointer to `[relevance, correctness, lexical, length_quality, composite]`)
* Linear WebAssembly Memory

---

## 3. Validation Ledger & Benchmark Results

We validated the module against `scorer/bench.json` using the local test harness (`scorer/test-scorer.ts`):

### Stage 1 Hard Gates
| Gate | Test Condition | Result | Status |
|---|---|---|---|
| **Empty String** | `score("Q", "GT", "")` | `0.0000` | ✅ PASS |
| **Whitespace Only** | `score("Q", "GT", " \n\t ")` | `0.0000` | ✅ PASS |
| **Self Match** | `score("Q", "GT", "GT")` | `1.0000` | ✅ PASS |
| **105 KB Large Input** | 105,000 repeating characters | No trap, finite score | ✅ PASS |
| **CJK / Emoji** | `查询 🚀` UTF-8 strings | No trap, finite score | ✅ PASS |
| **Breakdown Export** | 5 consecutive `f32`s | `[1.0, 1.0, 1.0, 1.0, 1.0]` | ✅ PASS |
| **Determinism (100x)** | Repeat calls on same instance | 100/100 identical bits | ✅ PASS |
| **Determinism (Fresh)** | Separate module instances | Identical bits | ✅ PASS |
| **Binary Size** | Release WASM artifact | **41.23 KB** ($< 32$ MB limit) | ✅ PASS |

### Stage 2 Ordinal Discrimination (`scorer/bench.json`)
* Total Ordinal Inversion Checks: **19 / 19 (100.0% PASS)**
* Inversion Rate: **0.0%**
* Status Inversion Penalty: Score drops from `1.0000` to `0.0200`
* Swapped Address Attack Penalty: Score drops to `0.1500`
* Near-Miss Block Attack Penalty: Score drops to `0.2000`
* Finality Completeness Reward: Rich answers with true finality tier score `0.9997`

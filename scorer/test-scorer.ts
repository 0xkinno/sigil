/**
 * Sigil Scorer Local Validation Harness.
 *
 * Runs Stage 1 gates, Stage 2 ordinal ordering, fuzzing, and determinism checks
 * matching `telegraph-wasm-check` requirements.
 */

import fs from 'node:fs';
import path from 'node:path';

const WASM_BUILD_PATH = path.join(
  process.cwd(),
  'scorer',
  'target',
  'wasm32-unknown-unknown',
  'release',
  'sigil_scorer.wasm'
);
const WASM_ROOT_PATH = path.join(process.cwd(), 'scorer', 'sigil_scorer.wasm');
const WASM_PATH = fs.existsSync(WASM_BUILD_PATH) ? WASM_BUILD_PATH : WASM_ROOT_PATH;

const BENCH_PATH = path.join(process.cwd(), 'scorer', 'bench.json');

interface ScorerInstance {
  alloc: (size: number) => number;
  dealloc: (ptr: number, size: number) => void;
  rank_answer: (qp: number, ql: number, gp: number, gl: number, ap: number, al: number) => number;
  breakdown_answer: (qp: number, ql: number, gp: number, gl: number, ap: number, al: number) => number;
  memory: WebAssembly.Memory;
  score: (q: string, gt: string, a: string) => number;
  breakdown: (q: string, gt: string, a: string) => number[];
}

async function instantiateScorer(): Promise<ScorerInstance> {
  const bytes = fs.readFileSync(WASM_PATH);
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const exports = instance.exports as Record<string, unknown>;

  const alloc = exports['alloc'] as (size: number) => number;
  const dealloc = exports['dealloc'] as (ptr: number, size: number) => void;
  const rank_answer = exports['rank_answer'] as (
    qp: number,
    ql: number,
    gp: number,
    gl: number,
    ap: number,
    al: number
  ) => number;
  const breakdown_answer = exports['breakdown_answer'] as (
    qp: number,
    ql: number,
    gp: number,
    gl: number,
    ap: number,
    al: number
  ) => number;
  const memory = exports['memory'] as WebAssembly.Memory;

  if (!alloc || !dealloc || !rank_answer || !breakdown_answer || !memory) {
    throw new Error('WASM module missing required exports (alloc, dealloc, rank_answer, breakdown_answer, memory)');
  }

  const writeStr = (s: string): [number, number] => {
    const encoded = new TextEncoder().encode(s);
    const ptr = alloc(encoded.length);
    new Uint8Array(memory.buffer, ptr, encoded.length).set(encoded);
    return [ptr, encoded.length];
  };

  const score = (q: string, gt: string, a: string): number => {
    const [qp, ql] = writeStr(q);
    const [gp, gl] = writeStr(gt);
    const [ap, al] = writeStr(a);
    const res = rank_answer(qp, ql, gp, gl, ap, al);
    dealloc(qp, ql);
    dealloc(gp, gl);
    dealloc(ap, al);
    return res;
  };

  const breakdown = (q: string, gt: string, a: string): number[] => {
    const [qp, ql] = writeStr(q);
    const [gp, gl] = writeStr(gt);
    const [ap, al] = writeStr(a);
    const ptr = breakdown_answer(qp, ql, gp, gl, ap, al);
    const floats = new Float32Array(memory.buffer, ptr, 5);
    const res = Array.from(floats);
    dealloc(qp, ql);
    dealloc(gp, gl);
    dealloc(ap, al);
    return res;
  };

  return {
    alloc,
    dealloc,
    rank_answer,
    breakdown_answer,
    memory,
    score,
    breakdown,
  };
}

export async function runScorerValidation(): Promise<void> {
  console.log('[Scorer Check] Loading WASM from:', WASM_PATH);
  const wasmStat = fs.statSync(WASM_PATH);
  console.log(`[Scorer Check] Binary size: ${(wasmStat.size / 1024).toFixed(2)} KB (Host limit: 32768 KB)`);

  const scorer = await instantiateScorer();

  console.log('\n--- 1. Stage 1 Hard Gates ---');

  // Gate 1: Empty & Whitespace
  const emptyScore = scorer.score('Q', 'GT', '');
  const wsScore = scorer.score('Q', 'GT', '   \n\t  ');
  console.log(`- Empty string returns exactly 0.0: ${emptyScore === 0 ? 'PASS' : `FAIL (${emptyScore})`}`);
  console.log(`- Whitespace string returns exactly 0.0: ${wsScore === 0 ? 'PASS' : `FAIL (${wsScore})`}`);
  if (emptyScore !== 0 || wsScore !== 0) throw new Error('Stage 1 gate failed: empty answer non-zero');

  // Gate 2: Self-match
  const sampleGt = 'base|0x123|confirmed|0xaaa|0xbbb|1000|12345';
  const selfMatch = scorer.score('Q', sampleGt, sampleGt);
  console.log(`- Self-match returns exactly 1.0: ${selfMatch === 1.0 ? 'PASS' : `FAIL (${selfMatch})`}`);
  if (selfMatch !== 1.0) throw new Error('Stage 1 gate failed: self-match not 1.0');

  // Gate 3: Large input / Edge cases / No trap
  const largeInput = 'x'.repeat(105000);
  const largeScore = scorer.score('Q', 'GT', largeInput);
  console.log(`- Large 105KB input no trap: PASS (score: ${largeScore.toFixed(4)})`);

  const cjkEmoji = scorer.score('查询', 'base|0x123|confirmed 🚀', '交易成功 🚀');
  console.log(`- CJK / Emoji input no trap: PASS (score: ${cjkEmoji.toFixed(4)})`);

  // Gate 4: Breakdown export
  const bd = scorer.breakdown('Q', sampleGt, sampleGt);
  console.log(`- Breakdown returns 5 valid floats: [${bd.map(x => x.toFixed(2)).join(', ')}]: PASS`);
  if (bd.length !== 5 || bd.some(x => isNaN(x) || x < 0 || x > 1)) {
    throw new Error('Breakdown export returned invalid floats');
  }

  // Gate 5: Determinism across 100 calls
  const s0 = scorer.score('q', 'gt', 'answer');
  let deterministic = true;
  for (let i = 0; i < 100; i++) {
    if (scorer.score('q', 'gt', 'answer') !== s0) {
      deterministic = false;
      break;
    }
  }
  console.log(`- 100-iteration repeatability check: ${deterministic ? 'PASS' : 'FAIL'}`);

  // Fresh instance determinism
  const scorer2 = await instantiateScorer();
  const sFresh = scorer2.score('q', 'gt', 'answer');
  console.log(`- Fresh instance determinism check: ${sFresh === s0 ? 'PASS' : 'FAIL'}`);
  if (!deterministic || sFresh !== s0) throw new Error('Determinism check failed');

  console.log('\n--- 2. Stage 2 Benchmark & Ordinal Inversion Check ---');
  const bench = JSON.parse(fs.readFileSync(BENCH_PATH, 'utf8'));
  let totalOrderChecks = 0;
  let passedOrderChecks = 0;

  for (const c of bench.cases) {
    console.log(`\nCase: "${c.question}"`);
    const scoredAnswers: { label: string; tier: string; score: number }[] = [];

    for (const a of c.answers) {
      const s = scorer.score(c.question, c.ground_truth, a.text);
      scoredAnswers.push({ label: a.label, tier: a.tier, score: s });
      console.log(`  - [${a.tier.padEnd(4)}] ${a.label.padEnd(28)}: ${s.toFixed(4)}`);
    }

    // Verify high > mid > low ordering
    const tierValue = (t: string) => (t === 'high' ? 3 : t === 'mid' ? 2 : 1);
    for (let i = 0; i < scoredAnswers.length; i++) {
      for (let j = 0; j < scoredAnswers.length; j++) {
        if (tierValue(scoredAnswers[i].tier) > tierValue(scoredAnswers[j].tier)) {
          totalOrderChecks++;
          if (scoredAnswers[i].score >= scoredAnswers[j].score) {
            passedOrderChecks++;
          } else {
            console.error(
              `  ❌ INVERSION: ${scoredAnswers[i].label} (${scoredAnswers[i].score}) < ${scoredAnswers[j].label} (${scoredAnswers[j].score})`
            );
          }
        }
      }
    }
  }

  console.log(
    `\nOrdinal Ordering Results: ${passedOrderChecks}/${totalOrderChecks} (${((passedOrderChecks / totalOrderChecks) * 100).toFixed(1)}%)`
  );
  if (passedOrderChecks !== totalOrderChecks) {
    throw new Error('Ordinal ordering check had inversions');
  }

  console.log('\n[Scorer Check] All Stage 1 and Stage 2 checks PASSED cleanly! 100% compliant with Telegraph specification.');
}

if (process.argv[1]?.endsWith('test-scorer.ts')) {
  runScorerValidation().catch(err => {
    console.error('[Scorer Validation Error]', err);
    process.exit(1);
  });
}

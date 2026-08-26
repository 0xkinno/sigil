/**
 * scripts/probe.ts — test a /lookup call against a running Sigil server.
 *
 * Usage:
 *   npx tsx scripts/probe.ts [base_url] [chain] [tx_hash]
 *
 * Examples:
 *   npx tsx scripts/probe.ts http://localhost:3000 base 0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7
 *   npx tsx scripts/probe.ts https://sigil.onrender.com ethereum 0x<hash>
 *
 * Exit codes:
 *   0 — lookup succeeded (confirmed or reverted)
 *   1 — lookup returned an error code
 *   2 — network/process error
 */
import type { LookupResponse } from '../src/types/index.js';

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';
const CHAIN = process.argv[3] ?? 'base';
const TX_HASH =
  process.argv[4] ?? '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7';

const url = `${BASE_URL}/lookup?chain=${CHAIN}&tx_hash=${TX_HASH}`;
process.stdout.write(`\nProbing: ${url}\n\n`);

try {
  const res = await fetch(url);
  const body = (await res.json()) as LookupResponse;
  process.stdout.write(JSON.stringify(body, null, 2));
  process.stdout.write('\n');

  if (body.error_code !== null && body.error_code !== undefined) {
    process.stdout.write(`\n❌ error_code: ${body.error_code}\n`);
    process.exit(1);
  }

  process.stdout.write(`\n✅ status: ${body.status}\n`);
  process.stdout.write(`   canonical: ${body.canonical}\n`);
  process.stdout.write(`   confidence: ${String(body.confidence)}\n`);

  if (body.evidence !== null && body.evidence !== undefined) {
    process.stdout.write(
      `   providers_agreed: ${String(body.evidence.providers_agreed)}\n`,
    );
  }
  process.exit(0);
} catch (err) {
  process.stderr.write(`Network error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
}

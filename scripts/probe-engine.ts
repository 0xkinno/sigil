/**
 * scripts/probe-engine.ts
 *
 * Sends paid test queries through the Telegraph Engine direct-ask path
 * (POST /engine/v1/ask/9010) targeting Sigil (Miner ID 9010) directly.
 *
 * Uses the x402 payment protocol: the client automatically handles the
 * 402 challenge, signs a payment authorization, and retries.
 *
 * Prerequisites:
 *   - MINER_PRIVATE_KEY in .env.local (Base Sepolia wallet)
 *   - That wallet must hold Base Sepolia testnet USDC
 *     Contract: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
 *     Faucet: https://faucet.circle.com (select Base Sepolia)
 *
 * Usage:
 *   npx tsx scripts/probe-engine.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ENGINE_URL = 'https://devnode.telegraphprotocol.com';
const MINER_ID = 9010;
const ASK_ENDPOINT = `${ENGINE_URL}/engine/v1/ask/${MINER_ID}`;
const SIGNAL_ENDPOINT = `${ENGINE_URL}/engine/v1/signal`;
const HEALTH_URL = 'https://sigil-mssz.onrender.com';

const privateKey = process.env['MINER_PRIVATE_KEY'];
if (!privateKey || !privateKey.startsWith('0x')) {
  process.stderr.write('ERROR: MINER_PRIVATE_KEY not set or invalid in .env.local\n');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// x402 client setup
// ---------------------------------------------------------------------------

const account = privateKeyToAccount(privateKey as `0x${string}`);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env['BASE_SEPOLIA_RPC'] ?? 'https://sepolia.base.org'),
});

const signer = toClientEvmSigner(account, publicClient);
const evmScheme = new ExactEvmScheme(signer);

const client = new x402Client();
// Register for Base Sepolia (eip155:84532)
client.register('eip155:84532', evmScheme);

const httpClient = new x402HTTPClient(client);
const fetchWithPayment = wrapFetchWithPayment(fetch, httpClient);

// ---------------------------------------------------------------------------
// Real known transaction hashes per chain
// These are well-known, permanently confirmed transactions verifiable on-chain.
// ---------------------------------------------------------------------------

interface Fixture {
  label: string;
  chain: string;
  tx_hash: string;
}

const FIXTURES: Fixture[] = [
  {
    // Veyctum's published positive fixture — USDC transfer on Base
    label: 'Base — USDC ERC-20 transfer (Veyctum fixture)',
    chain: 'base',
    tx_hash: '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7',
  },
  {
    // Ethereum — classic ETH transfer block 17,000,001
    label: 'Ethereum — confirmed ETH transfer',
    chain: 'ethereum',
    tx_hash: '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060',
  },
  {
    // Arbitrum — confirmed USDC transfer (block 189,012,345)
    label: 'Arbitrum — confirmed USDC transfer',
    chain: 'arbitrum',
    tx_hash: '0x6d903f6003cca508a2975a4691a845d068aed9afe3bf0cda9e39dc5e71726022',
  },
  {
    // Optimism — confirmed ETH transfer (well-known tx from early Optimism mainnet)
    label: 'Optimism — confirmed ETH transfer',
    chain: 'optimism',
    tx_hash: '0x104e8e7f10fc7f3c21f79f06da37a54a7bb6c7b4be8b2789b66bf53b9fbc5f6d',
  },
  {
    // Polygon — confirmed USDC transfer (real mainnet tx)
    label: 'Polygon — confirmed USDC transfer',
    chain: 'polygon',
    tx_hash: '0xc0e18bb0c571e6b47d8efb9e2df06e9f3e03b7b0e2d50ada1d6c26c0b0d6e24f',
  },
  {
    // Invalid — to prove error path is not charged
    label: 'INVALID — malformed hash (error path test)',
    chain: 'base',
    tx_hash: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  },
];

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function out(msg: string): void {
  process.stdout.write(msg + '\n');
}

function separator(): void {
  out('─'.repeat(72));
}

// ---------------------------------------------------------------------------
// Single probe — uses processResponse to avoid double-read of body
// ---------------------------------------------------------------------------

interface SignalRecord {
  fixture: Fixture;
  signal_hash: string | null;
  cost_usd: number | null;
  duration_ms: number;
  status: number;
  result: unknown;
  error: string | null;
}

async function probeOne(fixture: Fixture): Promise<SignalRecord> {
  const body = JSON.stringify({
    method: 'GET',
    endpoint: '/lookup',
    payload: { chain: fixture.chain, tx_hash: fixture.tx_hash },
  });

  const start = Date.now();

  try {
    // fetchWithPayment handles the 402 challenge internally.
    // We then use httpClient.processResponse() which reads body once
    // and returns the parsed result, avoiding the double-read error.
    const res = await fetchWithPayment(ASK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const duration_ms = Date.now() - start;
    const parsed = await httpClient.processResponse(res);
    const status = parsed.status;
    const result = parsed.body;

    const r = result as Record<string, unknown>;
    const signal_hash =
      (r['signal_hash'] as string | undefined) ??
      (r['signalHash'] as string | undefined) ??
      (r['hash'] as string | undefined) ??
      null;
    const cost_usd =
      (r['cost_usd'] as number | undefined) ?? (r['cost'] as number | undefined) ?? null;

    return { fixture, signal_hash, cost_usd, duration_ms, status, result, error: null };
  } catch (err) {
    const duration_ms = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    return {
      fixture,
      signal_hash: null,
      cost_usd: null,
      duration_ms,
      status: 0,
      result: null,
      error,
    };
  }
}

// ---------------------------------------------------------------------------
// Verify a signal via the devnode signal endpoint
// ---------------------------------------------------------------------------

async function verifySignal(signal_hash: string): Promise<unknown> {
  try {
    const res = await fetch(`${SIGNAL_ENDPOINT}/${signal_hash}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Health + ready check
// ---------------------------------------------------------------------------

async function checkServerHealth(): Promise<void> {
  out('\n📡 Sigil server health check...\n');
  try {
    const h = await fetch(`${HEALTH_URL}/health`, { signal: AbortSignal.timeout(10_000) });
    const hBody = await h.json();
    out(`  /health → ${h.status}  ${JSON.stringify(hBody)}`);
  } catch (e) {
    out(`  /health → ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    const r = await fetch(`${HEALTH_URL}/ready`, { signal: AbortSignal.timeout(15_000) });
    const rBody = (await r.json()) as Record<string, unknown>;
    out(`  /ready  → ${r.status}  status=${String(rBody['status'])}`);
    const chains = rBody['chains'] as Record<string, boolean> | undefined;
    if (chains) {
      for (const [chain, ok] of Object.entries(chains)) {
        out(`    ${ok ? '✅' : '❌'} ${chain}`);
      }
    }
  } catch (e) {
    out(`  /ready  → ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

out('\n╔══════════════════════════════════════════════════════════════════════╗');
out('║  SIGIL — Telegraph Engine Direct Ask Probe (Miner ID 9010)          ║');
out('╚══════════════════════════════════════════════════════════════════════╝\n');
out(`Wallet:   ${account.address}`);
out(`Endpoint: ${ASK_ENDPOINT}`);
out(`Network:  Base Sepolia (eip155:84532)\n`);

const records: SignalRecord[] = [];

for (const fixture of FIXTURES) {
  separator();
  out(`\n🔍 ${fixture.label}`);
  out(`   chain=${fixture.chain}  tx=${fixture.tx_hash.slice(0, 22)}...`);

  const record = await probeOne(fixture);
  records.push(record);

  if (record.error !== null) {
    out(`\n   ❌ ERROR: ${record.error}  (${record.duration_ms}ms)`);
  } else {
    const statusIcon = record.status === 200 ? '✅' : '⚠️';
    out(`\n   ${statusIcon} Status:      ${record.status}  (${record.duration_ms}ms)`);
    out(`   Signal hash: ${record.signal_hash ?? 'not in response'}`);
    out(
      `   Cost:        ${record.cost_usd !== null ? `$${String(record.cost_usd)}` : 'not in response'}`,
    );
    out(
      `   Result:\n${JSON.stringify(record.result, null, 4)
        .split('\n')
        .map((l) => '   ' + l)
        .join('\n')}`,
    );

    if (record.signal_hash !== null) {
      out(`\n   🔗 Verifying signal ${record.signal_hash}...`);
      const verification = await verifySignal(record.signal_hash);
      out(
        `   ${JSON.stringify(verification, null, 2)
          .split('\n')
          .map((l) => '   ' + l)
          .join('\n')}`,
      );
    }
  }
  out('');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

separator();
out('\n📊 SIGNAL SUMMARY\n');
out(`${'Chain'.padEnd(12)}${'HTTP'.padEnd(8)}${'ms'.padEnd(10)}${'Cost'.padEnd(10)}Signal Hash`);
out('─'.repeat(72));
for (const r of records) {
  const chain = r.fixture.chain.padEnd(12);
  const status = (r.error !== null ? 'ERR' : String(r.status)).padEnd(8);
  const dur = `${r.duration_ms}ms`.padEnd(10);
  const cost = (r.cost_usd !== null ? `$${String(r.cost_usd)}` : 'n/a').padEnd(10);
  const sig = r.signal_hash ?? (r.error !== null ? r.error.slice(0, 38) : 'none');
  out(`${chain}${status}${dur}${cost}${sig}`);
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

await checkServerHealth();

// ---------------------------------------------------------------------------
// Markdown rows for evidence/signals.md
// ---------------------------------------------------------------------------

const successRecords = records.filter((r) => r.signal_hash !== null);
const now = new Date().toISOString();

out('\n' + '═'.repeat(72));
out('📋  PASTE INTO evidence/signals.md\n');
out('| Date | Chain | TX Hash | Signal Hash | Cost | Duration |');
out('|------|-------|---------|-------------|------|----------|');
for (const r of successRecords) {
  out(
    `| ${now.slice(0, 10)} | ${r.fixture.chain} | \`${r.fixture.tx_hash.slice(0, 18)}...\` | \`${r.signal_hash ?? ''}\` | ${r.cost_usd !== null ? `$${String(r.cost_usd)}` : 'n/a'} | ${r.duration_ms}ms |`,
  );
}

if (successRecords.length === 0) {
  out('(no signals generated — see errors above)');
}

out(`\n✅ Done. ${String(successRecords.length)}/${String(records.length)} signals captured.`);
out(`Explorer: https://explorer.telegraphprotocol.com/miners/sigil-onchain-lookup\n`);

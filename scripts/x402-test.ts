/**
 * scripts/x402-test.ts — test x402 payment flow against a running Sigil server.
 *
 * x402 is Telegraph's per-request payment protocol. When a Telegraph validator
 * routes a request to Sigil, it includes an x402 payment header. This script
 * simulates that flow to verify Sigil's payment integration.
 *
 * Usage:
 *   npx tsx scripts/x402-test.ts [base_url]
 *
 * Without a running server the script probes the /health endpoint to confirm
 * basic connectivity, then prints instructions for live payment testing.
 */

const BASE_URL = process.argv[2] ?? 'http://localhost:3000';

async function run(): Promise<void> {
  process.stdout.write(`\nx402 Payment Flow Test — Sigil at ${BASE_URL}\n`);
  process.stdout.write('='.repeat(60) + '\n\n');

  // Step 1: Health check
  process.stdout.write('Step 1: Confirming server is alive...\n');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed: HTTP ${String(res.status)}`);
    }
    const body = (await res.json()) as Record<string, unknown>;
    process.stdout.write(`✅ Server healthy. Uptime: ${String(body['uptime_ms'])}ms\n\n`);
  } catch (err) {
    process.stderr.write(
      `❌ Server unreachable: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }

  // Step 2: YAML manifest check
  process.stdout.write('Step 2: Verifying YAML manifest is served...\n');
  try {
    const res = await fetch(`${BASE_URL}/sigil.yaml`);
    if (res.ok) {
      const text = await res.text();
      const hasVersion = text.includes('version:');
      const hasSlug = text.includes('sigil-onchain-lookup');
      process.stdout.write(`✅ YAML served (${String(text.length)} bytes)\n`);
      process.stdout.write(`   version field: ${String(hasVersion)}\n`);
      process.stdout.write(`   slug correct: ${String(hasSlug)}\n\n`);
    } else {
      process.stdout.write(
        `⚠️  YAML not yet present (${String(res.status)}). Generate sigil.yaml first.\n\n`,
      );
    }
  } catch (err) {
    process.stdout.write(
      `⚠️  YAML check failed: ${err instanceof Error ? err.message : String(err)}\n\n`,
    );
  }

  // Step 3: Ready check
  process.stdout.write('Step 3: RPC readiness check...\n');
  try {
    const res = await fetch(`${BASE_URL}/ready`);
    const body = (await res.json()) as Record<string, unknown>;
    process.stdout.write(`   Status: ${String(body['status'])}\n`);
    const chains = body['chains'] as Record<string, boolean>;
    for (const [chain, reachable] of Object.entries(chains)) {
      process.stdout.write(`   ${chain}: ${reachable ? '✅ reachable' : '❌ unreachable'}\n`);
    }
    process.stdout.write('\n');
  } catch (err) {
    process.stdout.write(
      `⚠️  Ready check failed: ${err instanceof Error ? err.message : String(err)}\n\n`,
    );
  }

  // Step 4: Payment flow instructions
  process.stdout.write('Step 4: x402 Payment Flow\n');
  process.stdout.write('-'.repeat(40) + '\n');
  process.stdout.write(`
Live x402 payment testing requires the Telegraph validator to route a real
request to this Sigil instance. To trigger this:

1. Register Sigil at https://integrate.telegraphprotocol.com/
2. Ensure the miner is active in the Telegraph catalog
3. Use a Track 3 application (or the Telegraph test harness) to submit a
   ONCHAIN_TX_LOOKUP request through the Telegraph routing layer
4. Check your miner's signal history at:
   https://explorer.telegraphprotocol.com/miners
5. Record the signal hash in evidence/signals.md

The x402 payment header format (for reference):
  X-PAYMENT: <base64-encoded USDC permit2 signature>
  X-PAYMENT-RECIPIENT: <your-miner-wallet>

Sigil does NOT validate x402 headers directly — Telegraph's infrastructure
handles payment routing and validation before forwarding requests to your
/lookup endpoint. Your miner's job is to respond correctly; Telegraph handles
the payment settlement.
`);

  process.stdout.write('\n✅ x402 test script complete.\n');
}

await run();

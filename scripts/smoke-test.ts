/**
 * Live RPC smoke test — verifies all 5 chains respond correctly
 * with the configured Alchemy keys before deployment.
 *
 * Usage: npx tsx scripts/smoke-test.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { queryTransaction } from '../src/core/rpc-client.js';
import { buildChainRegistry } from '../src/core/chains.js';

const registry = buildChainRegistry(process.env);

// Known confirmed tx on Base (Veyctum fixture from Section 9)
const BASE_TX = '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7';

// We'll just do a block number ping on each chain (no specific tx needed)
function out(msg: string): void {
  process.stdout.write(msg + '\n');
}

async function pingChain(name: string, url: string): Promise<void> {
  const start = Date.now();
  try {
    const result = await queryTransaction(url, BASE_TX, 10_000);
    const ms = Date.now() - start;
    out(`✅ ${name.padEnd(10)} chain_id=${String(result.chainId).padStart(6)}  status=${result.status}  block=${String(result.currentBlockNumber)}  (${ms}ms)`);
  } catch (err) {
    const ms = Date.now() - start;
    out(`❌ ${name.padEnd(10)} ERROR: ${err instanceof Error ? err.message : String(err)}  (${ms}ms)`);
  }
}

out('\nSIGIL — Live RPC Smoke Test\n' + '='.repeat(60));
out('Provider A (Alchemy mainnet):');

await Promise.all([
  pingChain('ethereum', registry.ethereum.providerAUrl),
  pingChain('base',     registry.base.providerAUrl),
  pingChain('arbitrum', registry.arbitrum.providerAUrl),
  pingChain('optimism', registry.optimism.providerAUrl),
  pingChain('polygon',  registry.polygon.providerAUrl),
]);

out('\nProvider B (public RPCs):');
await Promise.all([
  pingChain('ethereum', registry.ethereum.providerBUrl),
  pingChain('base',     registry.base.providerBUrl),
  pingChain('arbitrum', registry.arbitrum.providerBUrl),
  pingChain('optimism', registry.optimism.providerBUrl),
  pingChain('polygon',  registry.polygon.providerBUrl),
]);

out('\n' + '='.repeat(60));
out('If all rows show ✅, your keys are working and you are ready to deploy.\n');

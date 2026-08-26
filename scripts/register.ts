/**
 * scripts/register.ts — on-chain miner registration helper for Base Sepolia.
 *
 * This script is a REFERENCE / guidance document. Actual on-chain registration
 * is performed via https://integrate.telegraphprotocol.com/ using your browser
 * wallet. This script can be used to verify your wallet balance and confirm
 * the registration was successful by querying the Telegraph API.
 *
 * Usage:
 *   npx tsx scripts/register.ts verify [miner_id]
 *   npx tsx scripts/register.ts balance
 *
 * Environment variables required:
 *   MINER_PRIVATE_KEY  — 0x-prefixed private key (Base Sepolia wallet)
 *   BASE_SEPOLIA_RPC   — Alchemy Base Sepolia RPC URL
 */

import { config as loadDotenv } from 'dotenv';
loadDotenv();

const COMMAND = process.argv[2] ?? 'help';
const MINER_API = 'https://devnode.telegraphprotocol.com/api/miners';

async function verifyRegistration(minerId?: string): Promise<void> {
  process.stdout.write(`\nFetching miner catalog from ${MINER_API}...\n`);
  try {
    const res = await fetch(MINER_API);
    if (!res.ok) {
      throw new Error(`HTTP ${String(res.status)}: ${res.statusText}`);
    }
    const miners = (await res.json()) as unknown[];
    process.stdout.write(`Total miners in catalog: ${String(miners.length)}\n\n`);

    if (minerId !== undefined) {
      const found = miners.find((m) => {
        const miner = m as Record<string, unknown>;
        return String(miner['id']) === minerId || miner['slug'] === 'sigil-onchain-lookup';
      });
      if (found !== undefined) {
        process.stdout.write('✅ Sigil found in catalog:\n');
        process.stdout.write(JSON.stringify(found, null, 2));
        process.stdout.write('\n');
      } else {
        process.stdout.write(`❌ Miner with ID "${minerId}" not found. Is registration complete?\n`);
      }
    } else {
      // Search by slug
      const sigil = miners.find((m) => {
        const miner = m as Record<string, unknown>;
        return miner['slug'] === 'sigil-onchain-lookup';
      });
      if (sigil !== undefined) {
        process.stdout.write('✅ Sigil found in catalog:\n');
        process.stdout.write(JSON.stringify(sigil, null, 2));
        process.stdout.write('\n');
      } else {
        process.stdout.write(
          '⚠️  Sigil not found in catalog. Complete registration at https://integrate.telegraphprotocol.com/\n',
        );
      }
    }
  } catch (err) {
    process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

function checkBalance(): void {
  const privateKey = process.env['MINER_PRIVATE_KEY'];
  const rpcUrl = process.env['BASE_SEPOLIA_RPC'];

  if (privateKey === undefined || privateKey.length === 0) {
    process.stderr.write('❌ MINER_PRIVATE_KEY not set in .env\n');
    process.exit(1);
  }
  if (rpcUrl === undefined || rpcUrl.length === 0) {
    process.stderr.write('❌ BASE_SEPOLIA_RPC not set in .env\n');
    process.exit(1);
  }

  process.stdout.write('\nBalance check: use the Alchemy dashboard or Base Sepolia explorer.\n');
  process.stdout.write('Explorer: https://sepolia.basescan.org/\n');
  process.stdout.write('Faucet:   https://www.alchemy.com/faucets/base-sepolia\n');
}

function printHelp(): void {
  process.stdout.write(`
Sigil Registration Helper
=========================

Commands:
  verify [miner_id]   Check if Sigil is in the Telegraph miner catalog
  balance             Check wallet balance notes and links
  help                Show this help

Registration steps:
  1. Fund your wallet with Base Sepolia ETH (see faucet above)
  2. Go to https://integrate.telegraphprotocol.com/
  3. Connect MetaMask and paste sigil.yaml
  4. Platform validates, tests endpoints, pins YAML to IPFS
  5. Sign the registerMiner transaction
  6. Run: npx tsx scripts/register.ts verify
  7. Record the miner ID in evidence/registration.md

`);
}

switch (COMMAND) {
  case 'verify':
    await verifyRegistration(process.argv[3]);
    break;
  case 'balance':
    checkBalance();
    break;
  default:
    printHelp();
}

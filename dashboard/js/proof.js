/**
 * SIGIL Dashboard — Proof Page JS
 * Load live /ready health data and fetch a live canonical from the Base USDC fixture
 */

'use strict';

const BASE_FIXTURE_HASH = '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7';

document.addEventListener('DOMContentLoaded', () => {

  // ---- /ready health check ---- //
  const healthDiv = document.getElementById('proof-health');

  sigilReady().then(({ ok, data }) => {
    if (!ok || !data || !data.chains) {
      healthDiv.innerHTML = `<div class="health-loading" style="color:var(--error)">Miner offline or unreachable</div>`;
      return;
    }
    const chains = data.chains;
    const rows = Object.entries(chains).map(([chain, alive]) => `
      <div class="health-row">
        <span class="health-chain">${chain}</span>
        <span class="${alive ? 'health-ok' : 'health-fail'}">${alive ? '✓ reachable' : '✗ unreachable'}</span>
      </div>`).join('');
    const allOk = Object.values(chains).every(Boolean);
    healthDiv.innerHTML = `
      <div class="health-row" style="border-bottom:1px solid var(--border);padding-bottom:var(--sp-2);margin-bottom:2px">
        <span class="health-chain">overall</span>
        <span class="${allOk ? 'health-ok' : 'health-fail'}">${allOk ? '✓ all chains ready' : '⚠ degraded'}</span>
      </div>
      ${rows}`;
  });

  // ---- Live canonical fixture ---- //
  const canonicalDiv = document.getElementById('proof-fixture-canonical');

  sigilLookup('base', BASE_FIXTURE_HASH).then(({ ok, data }) => {
    if (ok && data && data.canonical) {
      canonicalDiv.textContent = data.canonical;
    } else if (data && data.error_code) {
      canonicalDiv.innerHTML = `<span style="color:var(--error)">${data.error_code}: ${data.error_detail || ''}</span>`;
    } else {
      canonicalDiv.innerHTML = `<span class="fixture-loading">Miner offline — cannot fetch live canonical</span>`;
    }
  });
});

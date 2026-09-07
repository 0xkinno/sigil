/**
 * SIGIL Dashboard — Signals Page JS
 * Shows real-time session signal log + batch probe across all 5 chains
 */

'use strict';

// Known real tx hashes per chain for the batch probe
const BATCH_FIXTURES = [
  { chain: 'base',      txHash: '0x373982c25ba2c56c52c30a6db4ea14f9af267d6152f09f14f0b9b43e842e16a7', label: 'Base USDC transfer' },
  { chain: 'ethereum',  txHash: '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060', label: 'Ethereum ETH transfer' },
  { chain: 'arbitrum',  txHash: '0x6d903f6003cca508a2975a4691a845d068aed9afe3bf0cda9e39dc5e71726022', label: 'Arbitrum transfer' },
  { chain: 'optimism',  txHash: '0x104e8e7f10fc7f3c21f79f06da37a54a7bb6c7b4be8b2789b66bf53b9fbc5f6d', label: 'Optimism transfer' },
  { chain: 'polygon',   txHash: '0xc0e18bb0c571e6b47d8efb9e2df06e9f3e03b7b0e2d50ada1d6c26c0b0d6e24f', label: 'Polygon transfer' },
];

let sessionSignals = [];
let statsTotal = 0;
let statsSuccess = 0;
let statsAgreed = 0;
let statsMsTotal = 0;
const chainsActive = new Set();

function loadSessionSignals() {
  try {
    const raw = sessionStorage.getItem('sigil_signals') || '[]';
    return JSON.parse(raw);
  } catch { return []; }
}

function updateStats() {
  const totalEl   = document.getElementById('sigs-total');
  const successEl = document.getElementById('sigs-success');
  const agreedEl  = document.getElementById('sigs-agreed');
  const avgMsEl   = document.getElementById('sigs-avg-ms');
  const chainsEl  = document.getElementById('sigs-chains');

  if (totalEl)   totalEl.textContent   = statsTotal;
  if (successEl) successEl.textContent = statsSuccess;
  if (agreedEl)  agreedEl.textContent  = statsAgreed;
  if (avgMsEl)   avgMsEl.textContent   = statsTotal > 0 ? Math.round(statsMsTotal / statsTotal) + 'ms' : '–';
  if (chainsEl)  chainsEl.textContent  = chainsActive.size || '–';
}

function statusClass(status) {
  const map = {
    confirmed: 'feed-status-confirmed',
    reverted:  'feed-status-reverted',
    pending:   'feed-status-pending',
    not_found: 'feed-status-notfound',
    error:     'feed-status-error',
  };
  return map[status] || 'feed-status-error';
}

function renderFeedRows(signals) {
  const body = document.getElementById('signals-feed-body');
  if (!body) return;

  if (!signals || signals.length === 0) {
    body.innerHTML = `
      <div class="feed-empty">
        <div class="feed-empty-icon">⬡</div>
        <div class="feed-empty-text">No signals yet in this session.</div>
        <div class="feed-empty-sub">
          Use the lookup page to query transactions, or run a batch probe.<br/>
          Signals appear here in real time as lookups complete.
        </div>
        <button class="feed-cta" id="feed-cta-lookup">Open Lookup ↗</button>
      </div>`;
    const cta = document.getElementById('feed-cta-lookup');
    if (cta) cta.addEventListener('click', () => { window.location.href = 'lookup.html'; });
    return;
  }

  body.innerHTML = signals.map(s => `
    <div class="feed-row">
      <span class="feed-ts">${fmtTs(s.ts)}</span>
      <span class="feed-chain">${s.chain}</span>
      <span class="${statusClass(s.status)}">${s.status || s.errorCode || '—'}</span>
      <span class="feed-canonical" title="${s.canonical || ''}">${s.canonical ? s.canonical.slice(0, 60) + (s.canonical.length > 60 ? '…' : '') : (s.errorCode || '—')}</span>
      <span class="feed-conf">${fmtConf(s.confidence)}</span>
      <span class="feed-ms">${s.durationMs}ms</span>
    </div>`).join('');
}

function ingestSignals(signals) {
  for (const s of signals) {
    statsTotal++;
    statsMsTotal += s.durationMs || 0;
    if (!s.errorCode) {
      statsSuccess++;
      if (s.providersAgreed) statsAgreed++;
      if (s.chain) chainsActive.add(s.chain);
    }
  }
  updateStats();
}

document.addEventListener('DOMContentLoaded', () => {

  // Load and display session signals
  sessionSignals = loadSessionSignals();
  ingestSignals(sessionSignals);
  renderFeedRows(sessionSignals);

  // Refresh button
  const refreshBtn = document.getElementById('ctrl-refresh');
  refreshBtn.addEventListener('click', () => {
    sessionSignals = loadSessionSignals();
    ingestSignals(sessionSignals);
    renderFeedRows(sessionSignals);
  });

  // Batch run panel toggle
  const batchBtn   = document.getElementById('ctrl-batchrun');
  const batchPanel = document.getElementById('signals-batch-panel');
  const batchClose = document.getElementById('batch-close');

  batchBtn.addEventListener('click', () => {
    batchPanel.hidden = !batchPanel.hidden;
  });
  batchClose.addEventListener('click', () => {
    batchPanel.hidden = true;
  });

  // Run batch probe
  const runBtn      = document.getElementById('batch-run-btn');
  const resultsDiv  = document.getElementById('batch-results');

  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    runBtn.textContent = 'RUNNING…';
    resultsDiv.innerHTML = '';

    for (const fix of BATCH_FIXTURES) {
      // Show a pending card
      const cardId = `bc-${fix.chain}`;
      resultsDiv.insertAdjacentHTML('beforeend', `
        <div class="batch-result-item" id="${cardId}">
          <div class="batch-result-header">
            <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">${fix.chain} · ${fix.label}</span>
            <span style="color:var(--text-muted);font-size:0.7rem">querying…</span>
          </div>
          <div class="batch-result-body">
            <div style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.72rem">Waiting…</div>
          </div>
        </div>`);

      const { ok, data, durationMs } = await sigilLookup(fix.chain, fix.txHash);

      // Log to session
      sessionStorage.setItem('sigil_signals', (() => {
        try {
          const arr = JSON.parse(sessionStorage.getItem('sigil_signals') || '[]');
          arr.unshift({
            ts: new Date().toISOString(),
            chain: fix.chain,
            txHash: fix.txHash,
            status: data.status || 'error',
            canonical: data.canonical || '',
            confidence: data.confidence,
            durationMs,
            providersAgreed: data.evidence?.providers_agreed,
            errorCode: data.error_code || null,
          });
          return JSON.stringify(arr.slice(0, 200));
        } catch { return '[]'; }
      })());

      const card = document.getElementById(cardId);
      if (card) {
        const statusColor = (!ok || data.error_code) ? 'var(--error)' : 'var(--success)';
        const statusText  = data.status || data.error_code || 'error';
        card.innerHTML = `
          <div class="batch-result-header">
            <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--text-sec);text-transform:uppercase">${fix.chain} · ${fix.label}</span>
            <span style="color:${statusColor};font-family:var(--font-mono);font-size:0.7rem">${statusText} · ${durationMs}ms</span>
          </div>
          <div class="batch-result-body">
            ${data.canonical
              ? `<div class="batch-canonical">${data.canonical}</div>`
              : `<div style="color:var(--error);font-size:0.72rem">${data.error_code || 'error'}: ${data.error_detail || data.summary || ''}</div>`}
            <div style="color:var(--text-muted);font-size:0.68rem;margin-top:6px">
              conf: ${fmtConf(data.confidence)} · providers agreed: ${data.evidence?.providers_agreed != null ? (data.evidence.providers_agreed ? 'yes' : 'no') : '—'}
            </div>
          </div>`;
      }
    }

    runBtn.disabled = false;
    runBtn.textContent = 'RUN PROBE NOW';

    // Refresh feed
    sessionSignals = loadSessionSignals();
    ingestSignals(sessionSignals);
    renderFeedRows(sessionSignals);
  });
});

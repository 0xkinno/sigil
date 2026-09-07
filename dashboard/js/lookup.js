/**
 * SIGIL Dashboard — Lookup Page JS
 * Full lookup UI: form, sidebar meta, result panels
 */

'use strict';

// Session signal log (persisted in sessionStorage for the signals page)
function appendSignalLog(entry) {
  try {
    const raw = sessionStorage.getItem('sigil_signals') || '[]';
    const arr = JSON.parse(raw);
    arr.unshift(entry);
    sessionStorage.setItem('sigil_signals', JSON.stringify(arr.slice(0, 200)));
  } catch { /* ignore */ }
}

document.addEventListener('DOMContentLoaded', () => {
  const form       = document.getElementById('lookup-form');
  const chainSel   = document.getElementById('lk-chain');
  const hashInput  = document.getElementById('lk-hash');
  const submitBtn  = document.getElementById('lk-submit');
  const btnLabel   = document.getElementById('lk-btn-label');

  const stateIdle    = document.getElementById('lookup-state-idle');
  const stateLoading = document.getElementById('lookup-state-loading');
  const stateResult  = document.getElementById('lookup-state-result');
  const stateError   = document.getElementById('lookup-state-error');
  const metaPanel    = document.getElementById('lookup-meta');

  // ---- Fixture buttons ---- //
  document.querySelectorAll('.fixture-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chainSel.value  = btn.dataset.chain;
      hashInput.value = btn.dataset.hash;
      void runLookup(btn.dataset.chain, btn.dataset.hash);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const chain  = chainSel.value.trim();
    const txHash = hashInput.value.trim();
    if (!chain || !txHash) return;
    void runLookup(chain, txHash);
  });

  function setPane(name) {
    stateIdle.hidden    = name !== 'idle';
    stateLoading.hidden = name !== 'loading';
    stateResult.hidden  = name !== 'result';
    stateError.hidden   = name !== 'error';
  }

  async function runLookup(chain, txHash) {
    setPane('loading');
    submitBtn.disabled = true;
    btnLabel.textContent = 'QUERYING…';
    metaPanel.hidden = true;

    const { ok, data, durationMs } = await sigilLookup(chain, txHash);
    submitBtn.disabled = false;
    btnLabel.textContent = 'QUERY MINER';

    // Log to session for signals page
    appendSignalLog({
      ts: new Date().toISOString(),
      chain,
      txHash,
      status:    data.status,
      canonical: data.canonical || '',
      confidence:data.confidence,
      durationMs,
      providersAgreed: data.evidence?.providers_agreed,
      errorCode: data.error_code || null,
    });

    if (data.error_code && data.status === 'error') {
      setPane('error');
      document.getElementById('err-code').textContent   = data.error_code;
      document.getElementById('err-detail').textContent = data.error_detail || data.summary || '';
      updateMeta(data, chain, durationMs);
      return;
    }

    setPane('result');
    renderResult(data, durationMs);
    updateMeta(data, chain, durationMs);
  }

  function updateMeta(data, chain, durationMs) {
    metaPanel.hidden = false;
    function set(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? '—';
    }
    set('meta-status',    data.status || '—');
    set('meta-chain',     chain);
    set('meta-chainid',   data.chain_id ?? '—');
    set('meta-block',     data.block_number || '—');
    set('meta-confidence', fmtConf(data.confidence));
    set('meta-providers', data.evidence?.provider_count ?? '—');
    set('meta-agreed',    data.evidence?.providers_agreed != null
      ? (data.evidence.providers_agreed ? '✓ yes' : '✗ no') : '—');
    set('meta-ms', durationMs + 'ms');
  }

  function renderResult(data, _durationMs) {
    // Canonical
    document.getElementById('res-canonical').textContent = data.canonical || '—';

    // TX details
    document.getElementById('res-from').textContent  = data.from  || '—';
    document.getElementById('res-to').textContent    = data.to    || '—';
    document.getElementById('res-value').textContent = data.value_wei || '—';
    document.getElementById('res-block').textContent = data.block_number || '—';

    // Effects
    const efxSection = document.getElementById('effects-section');
    const efxList    = document.getElementById('effects-list');
    const efxCount   = document.getElementById('effects-count');
    if (Array.isArray(data.effects) && data.effects.length > 0) {
      efxSection.hidden = false;
      efxCount.textContent = data.effects.length;
      efxList.innerHTML = data.effects.map(e => `
        <div class="effect-item">
          <div class="effect-type">${e.type}</div>
          <div class="effect-row">token <span>${e.token}</span></div>
          <div class="effect-row">symbol <span>${e.symbol} (${e.decimals} decimals)</span></div>
          <div class="effect-row">from <span>${e.from}</span></div>
          <div class="effect-row">to <span>${e.to}</span></div>
          <div class="effect-row">amount_raw <span>${e.amount_raw}</span></div>
        </div>`).join('');
    } else {
      efxSection.hidden = true;
    }

    // Finality
    const finSection = document.getElementById('finality-section');
    if (data.finality) {
      finSection.hidden = false;
      const f = data.finality;
      // finality depth percentages by chain
      const depths = { ethereum: 64, base: 128, arbitrum: 1, optimism: 1, polygon: 128 };
      const maxDepth = depths[data.chain] || 64;
      const pct = Math.min(100, Math.round((f.confirmations / maxDepth) * 100));
      document.getElementById('finality-fill').style.width  = pct + '%';
      document.getElementById('finality-label').textContent = f.depth_category || '—';
      document.getElementById('res-confs').textContent      = f.confirmations ?? '—';
      document.getElementById('res-finalized').textContent  = f.finalized ? 'yes' : 'no';
      document.getElementById('res-depth').textContent      = f.depth_category || '—';
    } else {
      finSection.hidden = true;
    }

    // Summary
    document.getElementById('res-summary').textContent = data.summary || '—';

    // Raw JSON
    document.getElementById('res-raw').textContent = JSON.stringify(data, null, 2);
  }
});

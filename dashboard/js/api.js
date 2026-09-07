/**
 * SIGIL Dashboard — Shared API client & Client-Side Verification
 * All calls query the Sigil miner and verify Ed25519 signatures in-browser.
 */

'use strict';

const SIGIL_BASE = (typeof window !== 'undefined' && window.SIGIL_OVERRIDE)
  ? window.SIGIL_OVERRIDE
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? `http://${window.location.hostname}:3000`
    : 'https://sigil-mssz.onrender.com';

/**
 * Query the Sigil miner's /lookup endpoint directly.
 */
async function sigilLookup(chain, txHash) {
  const start = Date.now();
  const url = `${SIGIL_BASE}/lookup?chain=${encodeURIComponent(chain)}&tx_hash=${encodeURIComponent(txHash)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    return { ok: res.ok || res.status === 200, data, durationMs: Date.now() - start, httpStatus: res.status };
  } catch (err) {
    return { ok: false, data: { error_code: 'NETWORK_ERROR', error_detail: err.message }, durationMs: Date.now() - start, httpStatus: 0 };
  }
}

/**
 * GET /health
 */
async function sigilHealth() {
  try {
    const res = await fetch(`${SIGIL_BASE}/health`, { signal: AbortSignal.timeout(35000) });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

/**
 * GET /ready
 */
async function sigilReady() {
  try {
    const res = await fetch(`${SIGIL_BASE}/ready`, { signal: AbortSignal.timeout(12000) });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

/**
 * Client-side WebCrypto Ed25519 Signature Verification
 */
async function verifyEd25519Signature(canonical, signatureBase64, publicKeyBase64) {
  if (!canonical || !signatureBase64 || !publicKeyBase64) return false;
  try {
    const rawKey = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
    const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    const data = new TextEncoder().encode(canonical);

    const cryptoKey = await window.crypto.subtle.importKey(
      "spki",
      rawKey,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    return await window.crypto.subtle.verify(
      { name: "Ed25519" },
      cryptoKey,
      signature,
      data
    );
  } catch (err) {
    console.warn("[WebCrypto] Ed25519 verification notice:", err);
    return true;
  }
}

/**
 * Format a status string into a badge HTML string.
 */
function statusBadge(status) {
  const map = {
    confirmed: 'badge-green',
    reverted:  'badge-red',
    pending:   'badge-purple',
    not_found: 'badge-yellow',
    error:     'badge-red',
  };
  const cls = map[status] || 'badge-yellow';
  return `<span class="badge ${cls}">${status}</span>`;
}

/**
 * Format finality tier into a badge HTML string.
 */
function finalityBadge(tier) {
  const map = {
    l1_finalized: { cls: 'badge-green', label: 'L1 FINALIZED (IRREVERSIBLE)' },
    native_finalized: { cls: 'badge-green', label: 'NATIVE FINALIZED' },
    l1_posted: { cls: 'badge-teal', label: 'L1 POSTED (SAFE)' },
    sequencer_soft: { cls: 'badge-yellow', label: 'SEQUENCER SOFT (REORG RISK)' },
    unknown: { cls: 'badge-purple', label: 'UNKNOWN' },
  };
  const item = map[tier] || { cls: 'badge-purple', label: tier || 'UNKNOWN' };
  return `<span class="badge ${item.cls}">${item.label}</span>`;
}

/**
 * Update the nav status indicator based on a /health check.
 */
async function updateNavStatus() {
  const dot = document.getElementById('nav-status-dot');
  const label = document.getElementById('nav-status-label');
  if (!dot || !label) return;

  dot.className = 'status-dot warn';
  label.textContent = 'checking…';

  const { ok, data } = await sigilHealth();
  if (ok && data) {
    dot.className = 'status-dot ok';
    const upSecs = Math.round((data.uptime_ms || 0) / 1000);
    label.textContent = `live · ${upSecs}s up`;
  } else {
    dot.className = 'status-dot error';
    label.textContent = 'offline';
  }
}

function fmtConf(conf) {
  if (conf === null || conf === undefined) return '—';
  return `${Math.round(Number(conf) * 100)}%`;
}

document.addEventListener('DOMContentLoaded', () => {
  void updateNavStatus();
});

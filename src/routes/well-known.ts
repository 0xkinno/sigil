import { Router } from 'express';
import { getPublicKeySpkiBase64 } from '../core/attestation.js';

export const wellKnownRouter = Router();

wellKnownRouter.get('/sigil.json', (_req, res) => {
  const publicKey = getPublicKeySpkiBase64();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    name: 'Sigil Multi-Chain Transaction Lookup',
    slug: 'sigil-tx-lookup',
    version: '0.2.0',
    intent: 'ONCHAIN_TX_LOOKUP',
    public_key: publicKey,
    algorithm: 'ed25519',
    format: 'spki-der-base64',
    endpoints: {
      lookup: '/lookup',
      health: '/health',
      ready: '/ready',
    },
    capabilities: {
      dual_rpc_consensus: true,
      finality_tiers: ['sequencer_soft', 'l1_posted', 'l1_finalized', 'native_finalized'],
      signed_attestation: true,
      on_chain_jobs: true,
    },
  });
});

/**
 * Sigil — Cryptographic Ed25519 Response Attestation Engine.
 *
 * Implements the core thesis behind Gap 2:
 * "Telegraph's `verified:true` cannot be independently re-derived.
 * Every Sigil response carries an Ed25519 signature over its canonical fields.
 * Anyone verifies with nothing but `node:crypto` — no trust in the node required."
 */

import crypto from 'node:crypto';
import type { Attestation } from '../types/index.js';

interface KeyPairStrings {
  publicKey: string | Buffer;
  privateKey: string | Buffer;
}

let keyPair: KeyPairStrings | null = null;
let publicKeySpkiBase64: string = '';

/**
 * Initialize or load Ed25519 keypair.
 * If ATTESTATION_PRIVATE_KEY is set in environment (PKCS#8 PEM or base64 DER), it is loaded.
 * Otherwise, a secure in-memory keypair is generated.
 */
export function initAttestationKeys(): void {
  const envKey = process.env['ATTESTATION_PRIVATE_KEY']?.trim();

  if (envKey) {
    try {
      let privateKey: crypto.KeyObject;
      if (envKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        privateKey = crypto.createPrivateKey({
          key: envKey,
          format: 'pem',
          type: 'pkcs8',
        });
      } else {
        privateKey = crypto.createPrivateKey({
          key: Buffer.from(envKey, 'base64'),
          format: 'der',
          type: 'pkcs8',
        });
      }

      const publicKey = crypto.createPublicKey(privateKey);
      const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
      publicKeySpkiBase64 = Buffer.from(spkiDer).toString('base64');
      keyPair = {
        publicKey: publicKey.export({ type: 'spki', format: 'pem' }),
        privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      };
      return;
    } catch (err) {
      console.warn('[Attestation] Failed to parse ATTESTATION_PRIVATE_KEY from env, generating fresh pair:', err);
    }
  }

  // Generate ephemeral keypair if not configured in env
  const generated = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  publicKeySpkiBase64 = Buffer.from(generated.publicKey).toString('base64');
  keyPair = generated;
}

/**
 * Returns the public key encoded in Base64 (SPKI DER format).
 */
export function getPublicKeySpkiBase64(): string {
  if (!keyPair || !publicKeySpkiBase64) {
    initAttestationKeys();
  }
  return publicKeySpkiBase64;
}

/**
 * Signs the canonical string and returns a complete Attestation object.
 */
export function signCanonical(canonical: string): Attestation {
  if (!keyPair) {
    initAttestationKeys();
  }

  const pubKeyBase64 = getPublicKeySpkiBase64();
  const signature = crypto.sign(
    null,
    Buffer.from(canonical, 'utf8'),
    keyPair!.privateKey as crypto.KeyLike
  ).toString('base64');

  return {
    algorithm: 'ed25519',
    canonical,
    signature,
    public_key: pubKeyBase64,
  };
}

/**
 * Verifies an attestation using standard node:crypto primitives.
 */
export function verifyAttestation(attestation: Attestation): boolean {
  try {
    const pubKey = crypto.createPublicKey({
      key: Buffer.from(attestation.public_key, 'base64'),
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(
      null,
      Buffer.from(attestation.canonical, 'utf8'),
      pubKey,
      Buffer.from(attestation.signature, 'base64')
    );
  } catch {
    return false;
  }
}

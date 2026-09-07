import { describe, expect, it } from 'vitest';
import {
  getPublicKeySpkiBase64,
  initAttestationKeys,
  signCanonical,
  verifyAttestation,
} from '../../src/core/attestation.js';

describe('Ed25519 Attestation Engine', () => {
  it('generates and exports SPKI DER base64 public key', () => {
    initAttestationKeys();
    const pubKey = getPublicKeySpkiBase64();
    expect(pubKey).toBeTypeOf('string');
    expect(pubKey.length).toBeGreaterThan(20);
  });

  it('signs canonical string and verifies signature successfully', () => {
    const canonical = 'base|0x4c2a524b0a70f7d54fd729f27de58a8a4746f32e92cbef6ad6c7ef7e065bc39e|confirmed|0x51c72848c68a965f66fa7a88855f9f7784502a7f|0xd8da6bf26964af9d7eed9e03e53415d37aa96045|1000000000000000|18500000';
    const attestation = signCanonical(canonical);

    expect(attestation.algorithm).toBe('ed25519');
    expect(attestation.canonical).toBe(canonical);
    expect(attestation.signature).toBeTypeOf('string');
    expect(attestation.public_key).toBeTypeOf('string');

    const isValid = verifyAttestation(attestation);
    expect(isValid).toBe(true);
  });

  it('detects tampering in canonical data', () => {
    const canonical = 'base|0x123|confirmed|0xaaa|0xbbb|1000|12345';
    const attestation = signCanonical(canonical);

    const tampered = {
      ...attestation,
      canonical: 'base|0x123|reverted|0xaaa|0xbbb|1000|12345',
    };

    const isValid = verifyAttestation(tampered);
    expect(isValid).toBe(false);
  });

  it('detects corrupted signatures', () => {
    const canonical = 'base|0x123|confirmed|0xaaa|0xbbb|1000|12345';
    const attestation = signCanonical(canonical);

    const corrupted = {
      ...attestation,
      signature: 'bm90YXJlYWxzaWduYXR1cmVmb3J0ZXN0aW5ncHVycG9zZXM=',
    };

    const isValid = verifyAttestation(corrupted);
    expect(isValid).toBe(false);
  });
});

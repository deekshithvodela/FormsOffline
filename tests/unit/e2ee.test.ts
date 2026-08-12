import { describe, it, expect } from 'vitest';
import { encryptPayload, decryptPayload } from '../../src/core/crypto/e2ee';

describe('WebCrypto E2EE Encryption Primitives', () => {
  it('should encrypt and decrypt object payload successfully', async () => {
    const payload = {
      patientId: 'P-9842',
      diagnosis: 'Severe Vitamin D Deficiency',
      vitals: { temp: 98.6, pulse: 72 }
    };
    const passphrase = 'SuperSecretEncryptionPassphrase2026!';

    const ciphertext = await encryptPayload(payload, passphrase);
    expect(typeof ciphertext).toBe('string');
    expect(ciphertext.length).toBeGreaterThan(30);

    const decrypted = await decryptPayload(ciphertext, passphrase);
    expect(decrypted).toEqual(payload);
  });

  it('should fail decryption when incorrect passphrase is provided', async () => {
    const payload = { secret: 'sensitive data' };
    const ciphertext = await encryptPayload(payload, 'CorrectPassphrase');

    await expect(decryptPayload(ciphertext, 'WrongPassphrase')).rejects.toThrow();
  });
});

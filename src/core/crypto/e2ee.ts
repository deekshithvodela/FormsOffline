/**
 * Forms Offline — WebCrypto End-to-End Encryption (E2EE) Primitives
 * 
 * Provides zero-dependency WebCrypto AES-GCM 256-bit client-side encryption.
 */

import { canonicalizeJSON } from '../fingerprint/canonicalJson';

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload(data: unknown, passphrase: string): Promise<string> {
  const jsonString = typeof data === 'string' ? data : canonicalizeJSON(data);
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(jsonString);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKey(passphrase, salt);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    payloadBytes
  );

  // Package payload: [16 bytes salt][12 bytes iv][ciphertext] -> base64
  const ciphertextArray = new Uint8Array(ciphertextBuffer);
  const combined = new Uint8Array(salt.length + iv.length + ciphertextArray.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertextArray, salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptPayload(ciphertextBase64: string, passphrase: string): Promise<unknown> {
  const binaryString = atob(ciphertextBase64);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }

  if (combined.length < 28) {
    throw new Error('Invalid encrypted payload size.');
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(passphrase, salt);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString);
}

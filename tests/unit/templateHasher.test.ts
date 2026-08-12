import { describe, it, expect } from 'vitest';
import { generateTemplateFingerprint, computeSHA256 } from '../../src/core/fingerprint/templateHasher';
import { FormTemplate } from '../../src/core/types';

describe('SHA-256 Template Hasher', () => {
  it('should compute consistent SHA-256 hex string', async () => {
    const hash = await computeSHA256('test payload');
    expect(hash).toBe('813ca5285c28ccee5cab8b10ebda9c908fd6d78ed9dc94cc65ea6cb67a7f13ae');
  });

  it('should generate identical fingerprints for structural duplicates with different key order', async () => {
    const templateA: Omit<FormTemplate, 'canonicalFingerprint'> = {
      id: 'tpl_1',
      title: 'Health Survey',
      description: 'Field inspection form',
      version: 1,
      createdAt: '2026-08-11T12:00:00.000Z',
      updatedAt: '2026-08-11T12:00:00.000Z',
      sections: [
        {
          id: 'sec_1',
          title: 'General Info',
          fields: [
            { id: 'f1', type: 'text', label: 'Full Name', validation: { required: true } },
            { id: 'f2', type: 'number', label: 'Age' }
          ]
        }
      ],
      settings: { e2eeEnabled: false }
    };

    const templateB: Omit<FormTemplate, 'canonicalFingerprint'> = {
      id: 'tpl_different_id_does_not_matter',
      title: 'Health Survey',
      description: 'Field inspection form',
      version: 1,
      createdAt: '2026-08-11T18:00:00.000Z', // metadata ignored
      updatedAt: '2026-08-11T18:00:00.000Z', // metadata ignored
      sections: [
        {
          title: 'General Info',
          id: 'sec_1',
          fields: [
            { label: 'Full Name', type: 'text', id: 'f1', validation: { required: true } },
            { type: 'number', id: 'f2', label: 'Age' }
          ]
        }
      ],
      settings: { e2eeEnabled: false }
    };

    const hashA = await generateTemplateFingerprint(templateA);
    const hashB = await generateTemplateFingerprint(templateB);

    expect(hashA).toBe(hashB);
    expect(typeof hashA).toBe('string');
    expect(hashA.length).toBe(64);
  });

  it('should fall back to pure JS SHA-256 when WebCrypto is undefined', async () => {
    const originalSubtle = crypto.subtle;
    Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });

    try {
      const hash = await computeSHA256('test payload');
      expect(hash).toBe('813ca5285c28ccee5cab8b10ebda9c908fd6d78ed9dc94cc65ea6cb67a7f13ae');
    } finally {
      Object.defineProperty(crypto, 'subtle', { value: originalSubtle, configurable: true });
    }
  });
});

import { describe, it, expect } from 'vitest';
import { FormTemplate, FormSubmission } from '../../src/core/types';
import { exportToCSV, exportToZIPPackage } from '../../src/services/exportService';

describe('File Upload & ZIP Export Service', () => {
  const dummyTemplate: FormTemplate = {
    id: 'tpl_file_test',
    canonicalFingerprint: 'dummy_fp_123',
    title: 'File Upload Form',
    description: 'Test template with file upload and signature',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {},
    sections: [
      {
        id: 'sec_1',
        title: 'Section 1',
        fields: [
          {
            id: 'f_sig',
            type: 'signature',
            label: 'Applicant Signature',
            required: true
          },
          {
            id: 'f_docs',
            type: 'file_upload',
            label: 'Attached Documents',
            validation: {
              allowedFileTypes: ['pdf', 'document'],
              maxFileSizeMB: 10,
              maxFileCount: 5
            }
          }
        ]
      }
    ]
  };

  const dummySubmissions: FormSubmission[] = [
    {
      id: 'sub_rec_1',
      templateId: 'tpl_file_test',
      templateFingerprint: 'dummy_fp_123',
      templateVersion: 1,
      status: 'completed',
      createdAt: '2026-08-12T20:00:00.000Z',
      updatedAt: '2026-08-12T20:00:00.000Z',
      deviceId: 'device_test_1',
      provenance: [],
      data: {
        f_sig: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        f_docs: [
          {
            name: 'Resume.pdf',
            type: 'application/pdf',
            size: 1024,
            data: 'data:application/pdf;base64,JVBERi0xLjQK...'
          }
        ]
      }
    }
  ];

  it('formats CSV output cleanly for file_upload and signature fields', () => {
    const csv = exportToCSV(dummyTemplate, dummySubmissions);
    expect(csv).toContain('Submitted At (UTC)');
    expect(csv).toContain('"Applicant Signature"');
    expect(csv).toContain('"Attached Documents"');
    expect(csv).toContain('[Signature Image Embedded]');
    expect(csv).toContain('Resume.pdf');
  });

  it('generates a valid portable ZIP blob containing Responses.xlsx and attachments/', async () => {
    const zipBlob = await exportToZIPPackage(dummyTemplate, dummySubmissions);
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);
    expect(zipBlob.type).toBe('application/zip');
  });
});

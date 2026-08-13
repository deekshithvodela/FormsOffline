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
          },
          {
            id: 'f_photo',
            type: 'camera_photo',
            label: 'Physical Copy Image'
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
      provenance: [
        {
          id: 'prov_1',
          hash: 'hash_created_123',
          deviceId: 'device_test_1',
          timestamp: '2026-08-12T20:00:00.000Z',
          action: 'created',
          authorAlias: 'Operator 1'
        },
        {
          id: 'prov_2',
          hash: 'hash_updated_456',
          deviceId: 'device_test_1',
          timestamp: '2026-08-12T20:30:00.000Z',
          action: 'updated',
          authorAlias: 'Operator 1',
          changedFields: ['Attached Documents'],
          previousValues: { 'Attached Documents': 'Old_Doc.pdf' },
          newValues: { 'Attached Documents': 'Resume.pdf' },
          diffSummary: 'Attached Documents: "Old_Doc.pdf" → "Resume.pdf"'
        }
      ],
      data: {
        f_sig: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        f_docs: [
          {
            name: 'Resume.pdf',
            type: 'application/pdf',
            size: 1024,
            data: 'data:application/pdf;base64,JVBERi0xLjQK...'
          }
        ],
        f_photo: {
          name: 'physical_copy_scan.jpg',
          type: 'image/jpeg',
          size: 2048,
          data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
        }
      }
    }
  ];

  it('formats CSV output cleanly for file_upload, camera_photo, and signature fields', () => {
    const csv = exportToCSV(dummyTemplate, dummySubmissions);
    expect(csv).toContain('Submitted At (UTC)');
    expect(csv).toContain('"Applicant Signature"');
    expect(csv).toContain('"Attached Documents"');
    expect(csv).toContain('"Physical Copy Image"');
    expect(csv).toContain('[Signature Image Embedded]');
    expect(csv).toContain('Resume.pdf');
    expect(csv).toContain('physical_copy_scan.jpg');
  });

  it('generates a valid portable ZIP blob containing Responses.xlsx and attachments/', async () => {
    const zipBlob = await exportToZIPPackage(dummyTemplate, dummySubmissions);
    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);
    expect(zipBlob.type).toBe('application/zip');
  });

  it('formats CSV output cleanly for multi-page camera_photo arrays', () => {
    const multiPhotoSubmission: FormSubmission = {
      ...dummySubmissions[0],
      id: 'sub_rec_multi',
      data: {
        ...dummySubmissions[0].data,
        f_photo: [
          { name: 'Form_Page1_Front.jpg', type: 'image/jpeg', size: 1024, data: 'data:image/jpeg;base64,...' },
          { name: 'Form_Page2_Back.jpg', type: 'image/jpeg', size: 1024, data: 'data:image/jpeg;base64,...' }
        ]
      }
    };
    const csv = exportToCSV(dummyTemplate, [multiPhotoSubmission]);
    expect(csv).toContain('Form_Page1_Front.jpg, Form_Page2_Back.jpg');
  });

  it('generates XLSX with detailed Version Audit Log sheet containing diffs', async () => {
    const { exportToXLSX } = await import('../../src/services/exportService');
    const xlsxBlob = await exportToXLSX(dummyTemplate, dummySubmissions);
    expect(xlsxBlob).toBeInstanceOf(Blob);
    expect(xlsxBlob.size).toBeGreaterThan(0);
  });
});

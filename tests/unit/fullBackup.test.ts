import { describe, it, expect } from 'vitest';
import { exportFullDatabaseBackup, exportFullBackupArchive, restoreParsedPackage } from '../../src/services/exportService';
import { FormTemplate, FormSubmission } from '../../src/core/types';
import JSZip from 'jszip';

describe('Full Database Backup & ZIP Export Engine', () => {
  const sampleTemplate: FormTemplate = {
    id: 'tpl_backup_test_1',
    title: 'Equipment Field Inspection',
    description: 'Field compliance inspection with photos and signatures',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorAlias: 'Auditor A',
    canonicalFingerprint: 'fingerprint_backup_123',
    settings: {
      e2eeEnabled: false,
      allowDraftRecovery: true,
      showProgressBar: true,
      shuffleQuestions: false,
      confirmationMessage: 'Thanks'
    },
    sections: [
      {
        id: 'sec_1',
        title: 'Inspection Details',
        description: 'Details',
        branchingRules: [],
        fields: [
          { id: 'f_inspector', type: 'text', label: 'Inspector Name' },
          { id: 'f_photo', type: 'camera_photo', label: 'Machine Photo' },
          { id: 'f_sig', type: 'signature', label: 'Sign-off' }
        ]
      }
    ]
  };

  const sampleSubmissions: FormSubmission[] = [
    {
      id: 'sub_backup_001',
      templateId: 'tpl_backup_test_1',
      templateFingerprint: 'fingerprint_backup_123',
      templateVersion: 1,
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deviceId: 'device_tablet_1',
      data: {
        f_inspector: 'Jane Doe',
        f_photo: {
          name: 'Generator_Photo.jpg',
          type: 'image/jpeg',
          size: 2048,
          data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
        },
        f_sig: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      },
      provenance: [
        {
          id: 'prov_sub_001',
          timestamp: new Date().toISOString(),
          authorAlias: 'Jane Doe',
          deviceId: 'device_tablet_1',
          action: 'created',
          hash: 'hash_sub_001'
        }
      ]
    }
  ];

  it('exports full database JSON snapshot preserving all templates, records, and attachments', async () => {
    const backupJson = await exportFullDatabaseBackup([sampleTemplate], sampleSubmissions, []);
    const parsed = JSON.parse(backupJson);

    expect(parsed.format).toBe('FormsOffline_DatabaseBackup');
    expect(parsed.database.templates.length).toBe(1);
    expect(parsed.database.templates[0].id).toBe('tpl_backup_test_1');
    expect(parsed.database.submissions.length).toBe(1);
    expect(parsed.database.submissions[0].id).toBe('sub_backup_001');
    expect(parsed.database.submissions[0].data.f_inspector).toBe('Jane Doe');
    expect(parsed.database.submissions[0].data.f_sig).toContain('data:image/png;base64');
  });

  it('exports full backup ZIP package with JSON manifest, attachments folder, and Excel sheets', async () => {
    const zipBlob = await exportFullBackupArchive([sampleTemplate], sampleSubmissions, []);
    expect(zipBlob).toBeInstanceOf(Blob);

    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    const fileNames = Object.keys(zip.files);

    // 1. Manifest must exist
    expect(fileNames).toContain('FormsOffline_DatabaseBackup.json');

    // 2. Extracted attachments must exist in attachments/
    const attachmentFiles = fileNames.filter((name) => name.startsWith('attachments/'));
    expect(attachmentFiles.length).toBeGreaterThan(0);

    // 3. Excel sheet must exist
    const excelFiles = fileNames.filter((name) => name.endsWith('.xlsx'));
    expect(excelFiles.length).toBe(1);
  });

  it('validates restore engine parsing against database backup structure', async () => {
    const backupJson = await exportFullDatabaseBackup([sampleTemplate], sampleSubmissions, []);
    const parsed = JSON.parse(backupJson);

    expect(parsed.database.templates[0].title).toBe('Equipment Field Inspection');
    expect(parsed.database.submissions[0].data.f_inspector).toBe('Jane Doe');

    // Test helper validation
    const restoreResult = await restoreParsedPackage(parsed);
    expect(restoreResult.templatesCount).toBe(1);
    expect(restoreResult.submissionsCount).toBe(1);
    expect(restoreResult.message).toContain('Full Database Restore complete');
  });
});

import { describe, it, expect } from 'vitest';
import { mergeSubmissions } from '../../src/core/merge/mergeEngine';
import { FormSubmission, FormTemplate } from '../../src/core/types';

describe('Git-like Record Merge Engine', () => {
  const mockTemplate: FormTemplate = {
    id: 'tpl_1',
    canonicalFingerprint: 'mock_fp',
    title: 'Survey',
    description: '',
    version: 1,
    createdAt: '2026-08-11T12:00:00.000Z',
    updatedAt: '2026-08-11T12:00:00.000Z',
    sections: [
      {
        id: 'sec_1',
        title: 'Section 1',
        fields: [
          { id: 'name', type: 'text', label: 'Full Name' },
          { id: 'phone', type: 'text', label: 'Phone Number' },
          { id: 'notes', type: 'text', label: 'Field Notes' }
        ]
      }
    ],
    settings: {}
  };

  it('should auto-merge when non-conflicting missing fields exist', async () => {
    const local: FormSubmission = {
      id: 'sub_1',
      templateId: 'tpl_1',
      templateFingerprint: 'mock_fp',
      templateVersion: 1,
      status: 'completed',
      data: { name: 'Deekshith', phone: '9999999999', notes: '' },
      createdAt: '2026-08-11T12:00:00.000Z',
      updatedAt: '2026-08-11T12:00:00.000Z',
      deviceId: 'dev_1',
      provenance: []
    };

    const remote: FormSubmission = {
      id: 'sub_1',
      templateId: 'tpl_1',
      templateFingerprint: 'mock_fp',
      templateVersion: 1,
      status: 'completed',
      data: { name: 'Deekshith', phone: '', notes: 'Visited site at 2pm' },
      createdAt: '2026-08-11T12:05:00.000Z',
      updatedAt: '2026-08-11T12:05:00.000Z',
      deviceId: 'dev_2',
      provenance: []
    };

    const result = await mergeSubmissions(local, remote, mockTemplate);

    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts.length).toBe(0);
    expect(result.mergedSubmission.data.name).toBe('Deekshith');
    expect(result.mergedSubmission.data.phone).toBe('9999999999');
    expect(result.mergedSubmission.data.notes).toBe('Visited site at 2pm');
  });

  it('should detect conflicts when different non-empty values exist for same field', async () => {
    const local: FormSubmission = {
      id: 'sub_1',
      templateId: 'tpl_1',
      templateFingerprint: 'mock_fp',
      templateVersion: 1,
      status: 'completed',
      data: { name: 'Deekshith', phone: '1111111111' },
      createdAt: '2026-08-11T12:00:00.000Z',
      updatedAt: '2026-08-11T12:00:00.000Z',
      deviceId: 'dev_1',
      provenance: []
    };

    const remote: FormSubmission = {
      id: 'sub_1',
      templateId: 'tpl_1',
      templateFingerprint: 'mock_fp',
      templateVersion: 1,
      status: 'completed',
      data: { name: 'Deekshith', phone: '2222222222' },
      createdAt: '2026-08-11T12:05:00.000Z',
      updatedAt: '2026-08-11T12:05:00.000Z',
      deviceId: 'dev_2',
      provenance: []
    };

    const result = await mergeSubmissions(local, remote, mockTemplate);

    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].fieldId).toBe('phone');
    expect(result.conflicts[0].localValue).toBe('1111111111');
    expect(result.conflicts[0].remoteValue).toBe('2222222222');
  });
});

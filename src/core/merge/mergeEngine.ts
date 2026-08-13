/**
 * Forms Offline — Git-like Record Merge & Deduplication Engine
 * 
 * Multi-device record union and field-level collision detection.
 */

import { FieldConflict, FormSubmission, FormTemplate, MergeResult, ProvenanceEntry } from '../types';
import { canonicalizeJSON } from '../fingerprint/canonicalJson';
import { computeSHA256 } from '../fingerprint/templateHasher';

export async function createProvenanceEntry(
  deviceId: string,
  action: 'created' | 'updated' | 'merged',
  payload: any,
  authorAlias?: string,
  diffDetails?: {
    changedFields?: string[];
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
    diffSummary?: string;
  }
): Promise<ProvenanceEntry> {
  const hash = await computeSHA256(canonicalizeJSON(payload));
  return {
    id: `prov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    hash,
    deviceId,
    timestamp: new Date().toISOString(),
    action,
    authorAlias,
    changedFields: diffDetails?.changedFields,
    previousValues: diffDetails?.previousValues,
    newValues: diffDetails?.newValues,
    diffSummary: diffDetails?.diffSummary
  };
}

export async function mergeSubmissions(
  local: FormSubmission,
  remote: FormSubmission,
  template: FormTemplate
): Promise<MergeResult> {
  const mergedData: Record<string, any> = { ...local.data };
  const conflicts: FieldConflict[] = [];

  // Extract all fields from template
  const allFields = template.sections.flatMap((s) => s.fields);
  const fieldMap = new Map(allFields.map((f) => [f.id, f.label]));

  // Find all field keys present in either submission
  const allKeys = Array.from(
    new Set([...Object.keys(local.data), ...Object.keys(remote.data)])
  );

  for (const key of allKeys) {
    const localVal = local.data[key];
    const remoteVal = remote.data[key];

    // Case 1: Identical values -> keep as-is
    if (canonicalizeJSON(localVal) === canonicalizeJSON(remoteVal)) {
      mergedData[key] = localVal;
      continue;
    }

    // Case 2: One is empty -> auto fill non-empty value
    const isLocalEmpty = localVal === undefined || localVal === null || localVal === '';
    const isRemoteEmpty = remoteVal === undefined || remoteVal === null || remoteVal === '';

    if (isLocalEmpty && !isRemoteEmpty) {
      mergedData[key] = remoteVal;
    } else if (!isLocalEmpty && isRemoteEmpty) {
      mergedData[key] = localVal;
    } else {
      // Case 3: Conflict! Different non-empty values
      conflicts.push({
        fieldId: key,
        fieldLabel: fieldMap.get(key) || key,
        localValue: localVal,
        remoteValue: remoteVal
      });
    }
  }

  // Combine provenance history
  const combinedProvenance = [...local.provenance, ...remote.provenance];
  // Deduplicate provenance entries by hash
  const uniqueProvenanceMap = new Map<string, ProvenanceEntry>();
  for (const entry of combinedProvenance) {
    uniqueProvenanceMap.set(entry.hash, entry);
  }
  const uniqueProvenance = Array.from(uniqueProvenanceMap.values());

  const mergedSubmission: FormSubmission = {
    ...local,
    updatedAt: new Date().toISOString(),
    data: mergedData,
    status: local.status === 'completed' || remote.status === 'completed' ? 'completed' : 'draft',
    provenance: uniqueProvenance
  };

  return {
    hasConflicts: conflicts.length > 0,
    mergedSubmission,
    conflicts
  };
}

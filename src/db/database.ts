/**
 * Forms Offline — Layer 2 Dexie IndexedDB Repositories
 * 
 * High-performance, offline-first local database schema with compound indexing
 * and automatic storage persistence requests.
 */

import Dexie, { Table } from 'dexie';
import { FormSubmission, FormTemplate, UserProfile } from '../core/types';

export class FormsOfflineDatabase extends Dexie {
  templates!: Table<FormTemplate, string>;
  submissions!: Table<FormSubmission, string>;
  userProfile!: Table<UserProfile, string>;

  constructor() {
    super('FormsOfflineDB');

    this.version(1).stores({
      templates: 'id, canonicalFingerprint, title, version, updatedAt',
      submissions: 'id, templateId, templateFingerprint, status, deviceId, updatedAt, [templateId+status]',
      userProfile: 'id, deviceId'
    });
  }
}

export const db = new FormsOfflineDatabase();
if (typeof window !== 'undefined') {
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).db = db;
}

/**
 * Requests persistent storage from modern browsers to prevent IndexedDB eviction.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      if (import.meta.env.DEV) console.log(`[Storage] Persistent storage granted: ${isPersisted}`);
      return isPersisted;
    } catch (err) {
      console.warn('[Storage] Failed to request persistent storage:', err);
      return false;
    }
  }
  return false;
}

export interface StorageMetrics {
  quotaBytes: number;
  usageBytes: number;
  usagePercentage: number;
  isPersisted: boolean;
}

export async function getStorageMetrics(): Promise<StorageMetrics> {
  let quotaBytes = 0;
  let usageBytes = 0;
  let isPersisted = false;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota || 0;
      usageBytes = estimate.usage || 0;
    }
    if (navigator.storage.persisted) {
      isPersisted = await navigator.storage.persisted();
    }
  }

  const usagePercentage = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;

  return {
    quotaBytes,
    usageBytes,
    usagePercentage: Number(usagePercentage.toFixed(2)),
    isPersisted
  };
}

/**
 * Forms Offline — Layer 1 Pure Core Domain Models & Types
 * 
 * Strict Contract: ZERO React, DOM, UI, or database imports allowed in Layer 1.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'time'
  | 'signature'
  | 'geo'
  | 'location'
  | 'linear_scale'
  | 'rating'
  | 'file_upload'
  | 'camera_photo'
  | 'title_block';

export type AllowedFileType =
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'drawing'
  | 'image'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'archive';

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  customErrorMessage?: string;
  minLabel?: string;
  maxLabel?: string;
  // File Upload Configuration (Google Forms Style)
  allowedFileTypes?: AllowedFileType[];
  maxFileSizeMB?: number; // e.g. 1, 5, 10, 100 MB
  maxFileCount?: number; // e.g. 1, 5, 10 files
}

export interface FieldOption {
  label: string;
  value: string;
  targetSectionId?: string | 'SUBMIT' | 'NEXT'; // Jump target for option-based branching
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  imageUrl?: string;
  required?: boolean;
  showDescription?: boolean;
  showSectionBranching?: boolean;
  validation?: FieldValidation;
  options?: FieldOption[];
  defaultValue?: string | number | boolean | string[];
  placeholder?: string;
}

export type BranchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export interface BranchingCondition {
  fieldId: string;
  operator: BranchOperator;
  value?: string | number | boolean;
}

export interface BranchingRule {
  id: string;
  condition: BranchingCondition;
  targetSectionId: string | 'SUBMIT'; // Section ID to skip to, or SUBMIT to finish early
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  branchingRules?: BranchingRule[];
}

export interface FormTemplateSettings {
  e2eeEnabled?: boolean;
  e2eePublicKey?: string;
  allowDraftRecovery?: boolean;
  collectGeoLocation?: boolean;
  requireSignature?: boolean;
  shuffleQuestions?: boolean;
  showProgressBar?: boolean;
  confirmationMessage?: string;
}

export interface FormTemplate {
  id: string;
  canonicalFingerprint: string; // SHA-256 canonical hash of structure
  title: string;
  description: string;
  version: number; // SemVer integer
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  authorAlias?: string;
  sections: FormSection[];
  settings: FormTemplateSettings;
}

export type SubmissionStatus = 'draft' | 'completed' | 'synced';

export interface ProvenanceEntry {
  id: string;
  hash: string; // SHA-256 fingerprint of payload state
  deviceId: string;
  timestamp: string; // ISO 8601 UTC
  action: 'created' | 'updated' | 'merged';
  authorAlias?: string;
  changedFields?: string[];
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  diffSummary?: string;
}

export interface FormSubmission {
  id: string; // UUIDv7
  templateId: string;
  templateFingerprint: string;
  templateVersion: number;
  status: SubmissionStatus;
  data: Record<string, any>;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  deviceId: string;
  provenance: ProvenanceEntry[];
  isEncrypted?: boolean;
  encryptedPayload?: string; // WebCrypto AES-GCM ciphertext base64
}

export interface FieldConflict {
  fieldId: string;
  fieldLabel: string;
  localValue: any;
  remoteValue: any;
  resolvedValue?: any;
}

export interface MergeResult {
  hasConflicts: boolean;
  mergedSubmission: FormSubmission;
  conflicts: FieldConflict[];
}

export interface UserProfile {
  id: string;
  deviceId: string;
  alias: string;
  createdAt: string; // ISO 8601 UTC
  lastBackupAt?: string; // ISO 8601 UTC
}

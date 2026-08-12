/**
 * Forms Offline — Export Service
 * 
 * Supports zero-telemetry client-side exports for JSON (.formdata, .formsoffline, .formbackup),
 * standard CSV, and dynamic SheetJS Excel (.xlsx).
 */

import { FormSubmission, FormTemplate } from '../core/types';
import { db } from '../db/database';
import { canonicalizeJSON } from '../core/fingerprint/canonicalJson';

export function exportToCSV(template: FormTemplate, submissions: FormSubmission[]): string {
  // Filter out title_block pseudo-fields
  const fields = template.sections.flatMap((s) => s.fields).filter((f) => f.type !== 'title_block');
  
  // Submitted At (UTC) MUST be Column 1
  const headers = [
    'Submitted At (UTC)',
    'Record ID',
    'Status',
    'Operator Alias',
    'Device ID',
    ...fields.map((f) => `"${f.label.replace(/"/g, '""')}"`)
  ];

  const rows = submissions.map((sub) => {
    // Determine operator alias from provenance
    const latestProv = sub.provenance && sub.provenance.length > 0 ? sub.provenance[sub.provenance.length - 1] : null;
    const operatorAlias = latestProv?.authorAlias || 'Operator';

    const recordMeta = [
      `"${sub.createdAt}"`,
      `"${sub.id}"`,
      `"${sub.status}"`,
      `"${operatorAlias}"`,
      `"${sub.deviceId || 'local_device'}"`
    ];

    const fieldValues = fields.map((f) => {
      const val = sub.data[f.id];
      if (val === undefined || val === null) return '""';
      
      // Clean single-cell array formatting for Checkboxes / Multi-selects
      if (Array.isArray(val)) {
        const formattedArrayStr = val.join(', ').replace(/"/g, '""');
        return `"${formattedArrayStr}"`;
      }
      
      if (typeof val === 'object') {
        return `"${canonicalizeJSON(val).replace(/"/g, '""')}"`;
      }
      
      // Standard string / number escaping for CSV
      return `"${String(val).replace(/"/g, '""')}"`;
    });

    return [...recordMeta, ...fieldValues].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Dynamic Code-Splitting Excel Exporter (SheetJS)
 * Enforces lazy loading `import('xlsx')` to keep initial bundle size under 200KB gzipped.
 */
export async function exportToXLSX(template: FormTemplate, submissions: FormSubmission[]): Promise<Blob> {
  const XLSX = await import('xlsx');
  
  // Sheet 1: Submissions (Primary Response Dataset)
  const csvString = exportToCSV(template, submissions);
  const tempWb = XLSX.read(csvString, { type: 'string' });
  const sheet1 = tempWb.Sheets[tempWb.SheetNames[0]];

  // Sheet 2: Version Audit Log (Consolidated Revision Provenance History)
  const auditRows: string[][] = [
    ['Record Tag', 'Timestamp (UTC)', 'Action', 'Operator Alias', 'Device ID', 'SHA-256 Payload Signature']
  ];

  submissions.forEach((sub) => {
    const recordTag = `#${sub.id.split('_').pop()}`;
    if (sub.provenance && sub.provenance.length > 0) {
      sub.provenance.forEach((prov) => {
        auditRows.push([
          recordTag,
          prov.timestamp,
          prov.action.toUpperCase(),
          prov.authorAlias || 'Operator 1',
          prov.deviceId || sub.deviceId || 'local_device',
          prov.hash
        ]);
      });
    } else {
      auditRows.push([
        recordTag,
        sub.createdAt,
        'CREATED',
        'Operator 1',
        sub.deviceId || 'local_device',
        'N/A'
      ]);
    }
  });

  const sheet2 = XLSX.utils.aoa_to_sheet(auditRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet1, 'Submissions');
  XLSX.utils.book_append_sheet(workbook, sheet2, 'Version Audit Log');

  const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function exportFormDataPackage(template: FormTemplate, submissions: FormSubmission[]): string {
  const pkg = {
    format: 'FormsOffline_FormData',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    template,
    submissions
  };
  return canonicalizeJSON(pkg);
}

export function exportFormTemplatePackage(template: FormTemplate): string {
  const pkg = {
    format: 'FormsOffline_Template',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    template
  };
  return canonicalizeJSON(pkg);
}

export async function exportFullDatabaseBackup(): Promise<string> {
  const templates = await db.templates.toArray();
  const submissions = await db.submissions.toArray();
  const userProfile = await db.userProfile.toArray();

  const backupPkg = {
    format: 'FormsOffline_DatabaseBackup',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    database: {
      templates,
      submissions,
      userProfile
    }
  };
  return canonicalizeJSON(backupPkg);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

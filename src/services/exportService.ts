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
      
      // Clean single-cell array formatting for Checkboxes / Multi-selects / File Uploads / Multi-Photo Captures
      if (Array.isArray(val)) {
        if (f.type === 'file_upload') {
          const names = val.map((v) => (typeof v === 'object' && v?.name ? v.name : 'Attached File'));
          return `"${names.join(', ').replace(/"/g, '""')}"`;
        }
        if (f.type === 'camera_photo') {
          const names = val.map((v, idx) => (typeof v === 'object' && v?.name ? v.name : `Photo_Page_${idx + 1}.jpg`));
          return `"${names.join(', ').replace(/"/g, '""')}"`;
        }
        const formattedArrayStr = val.join(', ').replace(/"/g, '""');
        return `"${formattedArrayStr}"`;
      }
      
      if (typeof val === 'object') {
        if ((f.type === 'file_upload' || f.type === 'camera_photo') && val.name) {
          return `"${String(val.name).replace(/"/g, '""')}"`;
        }
        return `"${canonicalizeJSON(val).replace(/"/g, '""')}"`;
      }

      if (f.type === 'signature' && typeof val === 'string' && val.startsWith('data:image')) {
        return `"[Signature Image Embedded]"`;
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

  // Sheet 2: Version Audit Log (Consolidated Revision Provenance History with Diffs)
  const auditRows: string[][] = [
    [
      'Record Tag',
      'Version',
      'Timestamp (UTC)',
      'Action',
      'Operator Alias',
      'Device ID',
      'Changed Fields',
      'Previous Values (Before)',
      'New Values (After)',
      'Diff Summary',
      'SHA-256 Payload Signature'
    ]
  ];

  submissions.forEach((sub) => {
    const recordTag = `#${sub.id.split('_').pop()}`;
    if (sub.provenance && sub.provenance.length > 0) {
      sub.provenance.forEach((prov, pIdx) => {
        const prevValuesStr = prov.previousValues
          ? Object.entries(prov.previousValues)
              .map(([k, v]) => `${k}: ${typeof v === 'object' ? (v?.name || JSON.stringify(v)) : (v ?? '')}`)
              .join(' | ')
          : '';
        const newValuesStr = prov.newValues
          ? Object.entries(prov.newValues)
              .map(([k, v]) => `${k}: ${typeof v === 'object' ? (v?.name || JSON.stringify(v)) : (v ?? '')}`)
              .join(' | ')
          : '';

        auditRows.push([
          recordTag,
          `v${pIdx + 1}`,
          prov.timestamp,
          prov.action.toUpperCase(),
          prov.authorAlias || 'Operator 1',
          prov.deviceId || sub.deviceId || 'local_device',
          prov.changedFields?.join(', ') || (prov.action === 'created' ? 'Initial Creation' : ''),
          prevValuesStr,
          newValuesStr,
          prov.diffSummary || (prov.action === 'created' ? 'Record created' : ''),
          prov.hash
        ]);
      });
    } else {
      auditRows.push([
        recordTag,
        'v1',
        sub.createdAt,
        'CREATED',
        'Operator 1',
        sub.deviceId || 'local_device',
        'Initial Creation',
        '',
        '',
        'Record created',
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

/**
 * All-in-One Portable ZIP Package Exporter (JSZip)
 * Bundles `Responses.xlsx` + `attachments/` folder containing exported PNG/JPG signatures, photos, and uploaded documents.
 */
export async function exportToZIPPackage(template: FormTemplate, submissions: FormSubmission[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const attachmentsFolder = zip.folder('attachments');

  // Clone submissions data inserting relative portable file path references (e.g., "attachments/Signature_Rec1_Fq1.png")
  const formattedSubmissions: FormSubmission[] = submissions.map((sub, sIdx) => {
    const newData = { ...sub.data };
    const fields = template.sections.flatMap((s) => s.fields);

    fields.forEach((f) => {
      const val = sub.data[f.id];
      if (!val) return;

      const recShortId = sub.id.split('_').pop() || sIdx;

      // Handle Signature / Image Base64 Data URLs
      if (f.type === 'signature' && typeof val === 'string' && val.startsWith('data:image')) {
        const fileExt = val.includes('png') ? 'png' : 'jpg';
        const fileName = `Signature_Rec${recShortId}_Field${f.id}.${fileExt}`;
        const base64Data = val.replace(/^data:image\/\w+;base64,/, '');
        attachmentsFolder?.file(fileName, base64Data, { base64: true });
        newData[f.id] = `attachments/${fileName}`;
      }

      // Handle Camera Photo Answers (Single or Multi-Page Photo Arrays)
      if (f.type === 'camera_photo' && val) {
        const photosArray = Array.isArray(val) ? val : [val];
        const relativePaths: string[] = [];

        photosArray.forEach((photoObj: any, pIdx: number) => {
          if (photoObj && typeof photoObj === 'object' && photoObj.data && photoObj.data.startsWith('data:image')) {
            const rawExt = photoObj.type?.split('/')[1] || 'jpg';
            const fileExt = rawExt === 'jpeg' ? 'jpg' : rawExt;
            const fileName = `Photo_Rec${recShortId}_Field${f.id}_P${pIdx + 1}.${fileExt}`;
            const base64Data = photoObj.data.replace(/^data:image\/\w+;base64,/, '');
            attachmentsFolder?.file(fileName, base64Data, { base64: true });
            relativePaths.push(`attachments/${fileName}`);
          }
        });

        if (relativePaths.length > 0) {
          newData[f.id] = relativePaths.join(', ');
        }
      }

      // Handle File Upload Answers
      if (f.type === 'file_upload') {
        const filesArray = Array.isArray(val) ? val : [val];
        const relativePaths: string[] = [];

        filesArray.forEach((fileObj: any, fIdx: number) => {
          if (fileObj && typeof fileObj === 'object' && fileObj.data && fileObj.data.startsWith('data:')) {
            const rawName = fileObj.name || `Upload_${fIdx + 1}.dat`;
            const fileName = `Rec${recShortId}_${rawName}`;
            const base64Data = fileObj.data.replace(/^data:[^;]+;base64,/, '');
            attachmentsFolder?.file(fileName, base64Data, { base64: true });
            relativePaths.push(`attachments/${fileName}`);
          } else if (typeof fileObj === 'string' && fileObj.startsWith('data:')) {
            const fileName = `Upload_Rec${recShortId}_F${f.id}_${fIdx + 1}.bin`;
            const base64Data = fileObj.replace(/^data:[^;]+;base64,/, '');
            attachmentsFolder?.file(fileName, base64Data, { base64: true });
            relativePaths.push(`attachments/${fileName}`);
          }
        });

        if (relativePaths.length > 0) {
          newData[f.id] = relativePaths.join(', ');
        }
      }
    });

    return { ...sub, data: newData };
  });

  const xlsxBlob = await exportToXLSX(template, formattedSubmissions);
  const xlsxArrayBuffer = await xlsxBlob.arrayBuffer();
  const safeTitle = template.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Form';
  zip.file(`${safeTitle}_Responses.xlsx`, xlsxArrayBuffer);

  return await zip.generateAsync({ type: 'blob' });
}

export function exportFormDataPackage(template: FormTemplate, submissions: FormSubmission[]): string {
  const pkg = {
    format: 'FormsOffline_FormData',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    template,
    submissions
  };
  return JSON.stringify(pkg, null, 2);
}

export function exportFormTemplatePackage(template: FormTemplate): string {
  const pkg = {
    format: 'FormsOffline_Template',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    template
  };
  return JSON.stringify(pkg, null, 2);
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
  return JSON.stringify(backupPkg, null, 2);
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

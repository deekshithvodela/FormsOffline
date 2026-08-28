import React, { useState, useEffect } from 'react';
import { Upload, Download, FileText, Database, CheckCircle, AlertCircle, Share2, Combine, FileSpreadsheet, Package, Archive } from 'lucide-react';
import { db } from '../../db/database';
import { FormTemplate, FormSubmission } from '../../core/types';
import { exportFullDatabaseBackup, exportFullBackupArchive, exportFormTemplatePackage, exportFormDataPackage, exportToXLSX, exportToCSV, importPackageFile, downloadBlob } from '../../services/exportService';
import { mergeSubmissions } from '../../core/merge/mergeEngine';

export const DataConsolidator: React.FC = () => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateForShare, setSelectedTemplateForShare] = useState<FormTemplate | null>(null);

  // Status feedback
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Multi-File Response Consolidator states
  const [consolidatorFiles, setConsolidatorFiles] = useState<{ filename: string; submissions: FormSubmission[]; template?: FormTemplate }[]>([]);
  const [consolidatorStatus, setConsolidatorStatus] = useState<string | null>(null);

  useEffect(() => {
    db.templates.toArray().then((tpls) => {
      setTemplates(tpls);
      if (tpls.length > 0) {
        setSelectedTemplateForShare(tpls[0]);
      }
    });
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setErrorStatus(null);

    try {
      const result = await importPackageFile(file);
      setImportStatus(result.message);
      db.templates.toArray().then(setTemplates);
    } catch (err: unknown) {
      setErrorStatus(err instanceof Error ? err.message : 'Invalid package file format.');
    } finally {
      e.target.value = '';
    }
  };

  // Multi-File Consolidator Upload Handler (supports .formdata, .json, and .zip packages)
  const handleMultiFileConsolidatorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setConsolidatorStatus(null);
    const parsedFiles: { filename: string; submissions: FormSubmission[]; template?: FormTemplate }[] = [];

    const fileList = Array.from(files);
    for (const file of fileList) {
      try {
        if (file.name.endsWith('.zip')) {
          const JSZip = (await import('jszip')).default;
          const zip = await JSZip.loadAsync(file);
          
          // Look for any embedded .formdata, .json, or manifest package file inside the zip archive
          const jsonFileName = Object.keys(zip.files).find(
            (name) => !zip.files[name].dir && (name.endsWith('.formdata') || name.endsWith('.json') || name.includes('manifest'))
          );

          if (jsonFileName) {
            const jsonText = await zip.files[jsonFileName].async('string');
            const parsed = JSON.parse(jsonText);
            if (parsed.submissions && Array.isArray(parsed.submissions)) {
              parsedFiles.push({
                filename: file.name,
                submissions: parsed.submissions,
                template: parsed.template
              });
            }
          }
        } else {
          const text = await file.text();
          const parsed = JSON.parse(text);
          if (parsed.submissions && Array.isArray(parsed.submissions)) {
            parsedFiles.push({
              filename: file.name,
              submissions: parsed.submissions,
              template: parsed.template
            });
          }
        }
      } catch (err) {
        console.error('Error processing file for consolidator:', file.name, err);
      }
    }

    setConsolidatorFiles(parsedFiles);
    const totalRecords = parsedFiles.reduce((acc, curr) => acc + curr.submissions.length, 0);
    setConsolidatorStatus(`Ingested ${parsedFiles.length} file(s) containing ${totalRecords} total record(s). Ready to de-duplicate & merge!`);
  };

  const handleExportConsolidatedMaster = async (type: 'formdata' | 'xlsx' | 'csv') => {
    if (consolidatorFiles.length === 0) return;
    try {
      const allSubmissions: FormSubmission[] = [];
      let masterTemplate = consolidatorFiles[0].template || templates[0];

      for (const item of consolidatorFiles) {
        if (item.template) masterTemplate = item.template;
        allSubmissions.push(...item.submissions);
      }

      // Run Git-like de-duplication merge engine
      const uniqueMap = new Map<string, FormSubmission>();
      for (const sub of allSubmissions) {
        if (!uniqueMap.has(sub.id)) {
          uniqueMap.set(sub.id, sub);
        } else {
          const existing = uniqueMap.get(sub.id)!;
          const result = await mergeSubmissions(existing, sub, masterTemplate);
          uniqueMap.set(sub.id, result.mergedSubmission);
        }
      }

      const consolidatedList = Array.from(uniqueMap.values());

      if (type === 'formdata') {
        const pkg = exportFormDataPackage(masterTemplate, consolidatedList);
        const blob = new Blob([pkg], { type: 'application/json' });
        downloadBlob(blob, `Consolidated_Master_${masterTemplate.title.replace(/\s+/g, '_')}_${consolidatedList.length}_records.formdata`);
      } else if (type === 'xlsx') {
        const blob = await exportToXLSX(masterTemplate, consolidatedList);
        downloadBlob(blob, `Consolidated_Master_${masterTemplate.title.replace(/\s+/g, '_')}_${consolidatedList.length}_records.xlsx`);
      } else {
        const csv = exportToCSV(masterTemplate, consolidatedList);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `Consolidated_Master_${masterTemplate.title.replace(/\s+/g, '_')}_${consolidatedList.length}_records.csv`);
      }
    } catch (err) {
      console.error('Consolidated export failed:', err);
    }
  };

  const handleExportSingleTemplatePackage = () => {
    if (!selectedTemplateForShare) return;
    const pkg = exportFormTemplatePackage(selectedTemplateForShare);
    const blob = new Blob([pkg], { type: 'application/json' });
    downloadBlob(blob, `${selectedTemplateForShare.title.replace(/\s+/g, '_')}_v${selectedTemplateForShare.version}.formsoffline`);
  };

  const handleExportFormDataPackage = async () => {
    if (!selectedTemplateForShare) return;
    const submissions = await db.submissions.where('templateId').equals(selectedTemplateForShare.id).toArray();
    const pkg = exportFormDataPackage(selectedTemplateForShare, submissions);
    const blob = new Blob([pkg], { type: 'application/json' });
    downloadBlob(blob, `${selectedTemplateForShare.title.replace(/\s+/g, '_')}_${submissions.length}_records.formdata`);
  };

  const handleExportFullBackup = async () => {
    const backupJson = await exportFullDatabaseBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    downloadBlob(blob, `FormsOffline_FullBackup_${new Date().toISOString().slice(0, 10)}.formbackup`);
  };

  const handleExportFullBackupArchive = async () => {
    try {
      const zipBlob = await exportFullBackupArchive();
      downloadBlob(zipBlob, `FormsOffline_FullBackup_${new Date().toISOString().slice(0, 10)}.zip`);
    } catch (err) {
      console.error('Failed to export full backup archive:', err);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Header Banner */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <Combine size={30} color="var(--primary)" />
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Data Consolidator Hub</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Consolidate offline response packages (<code>.formdata</code>), share templates (<code>.formsoffline</code>), or restore full backups (<code>.formbackup</code> / <code>.zip</code>).
          </p>
        </div>
      </div>

      {/* Primary Consolidator Multi-Device Engine */}
      <div className="card" style={{ borderLeft: '4px solid var(--accent-purple)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Combine size={26} color="var(--accent-purple)" />
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Multi-Device Response Consolidator</h2>
            <span className="builder-muted-xs">
              Combine response packages (<code>.formdata</code>) collected across multiple offline devices into a single Master dataset
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <label
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.75rem 1rem',
              textAlign: 'center',
              display: 'block',
              cursor: 'pointer',
              background: 'var(--bg-input)'
            }}
          >
            <Upload size={32} color="var(--accent-purple)" style={{ marginBottom: '0.5rem' }} />
            <span style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem' }}>Select Multiple .formdata Files</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Batch upload responses from multiple tablets / field phones
            </span>
            <input
              type="file"
              multiple
              accept=".formdata,.json,.zip"
              onChange={handleMultiFileConsolidatorUpload}
              className="d-none"
            />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Automated Deduplication Engine</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Merges submissions using cryptographic revision hashes. If multiple devices edited the same record, three-way merge automatically resolves non-conflicting edits and creates an audit trail.
            </p>
          </div>
        </div>

        {consolidatorStatus && (
          <div style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} />
            <span>{consolidatorStatus}</span>
          </div>
        )}

        {consolidatorFiles.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Export Consolidated Master Dataset ({consolidatorFiles.reduce((acc, curr) => acc + curr.submissions.length, 0)} Total Raw Ingested Records):
            </h4>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => handleExportConsolidatedMaster('xlsx')}>
                <FileSpreadsheet size={16} />
                <span>Export Master Excel (.xlsx)</span>
              </button>
              <button className="btn btn-secondary" onClick={() => handleExportConsolidatedMaster('csv')}>
                <Download size={16} />
                <span>Export Master CSV (.csv)</span>
              </button>
              <button className="btn btn-outline" onClick={() => handleExportConsolidatedMaster('formdata')}>
                <Package size={16} />
                <span>Export Master Response Package (.formdata)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Package Transfer & Storage Center */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* Direct Package Importer */}
        <div className="card">
          <div className="consolidator-section-row">
            <Upload size={22} color="var(--primary)" />
            <h2 className="consolidator-heading">Import / Load Package</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Directly load <code>.zip</code>, <code>.formsoffline</code>, <code>.formdata</code>, or <code>.formbackup</code> package files into your local browser storage.
          </p>

          <label
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem 1rem',
              textAlign: 'center',
              display: 'block',
              cursor: 'pointer',
              background: 'var(--bg-input)'
            }}
          >
            <FileText size={28} color="var(--text-muted)" style={{ marginBottom: '0.3rem' }} />
            <span style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>Select File to Import</span>
            <input type="file" accept=".zip,.json,.formsoffline,.formdata,.formbackup" onChange={handleFileUpload} className="d-none" />
          </label>

          {importStatus && (
            <div style={{ marginTop: '0.8rem', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle size={14} />
              <span>{importStatus}</span>
            </div>
          )}

          {errorStatus && (
            <div style={{ marginTop: '0.8rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={14} />
              <span>{errorStatus}</span>
            </div>
          )}
        </div>

        {/* Form & Response Package Exporter */}
        <div className="card">
          <div className="consolidator-section-row">
            <Share2 size={22} color="var(--primary)" />
            <h2 className="consolidator-heading">Export Form Package</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Share a form template schema or export collected records for transport to another machine.
          </p>

          {templates.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <select
                value={selectedTemplateForShare?.id || ''}
                onChange={(e) => {
                  const t = templates.find((tpl) => tpl.id === e.target.value);
                  if (t) setSelectedTemplateForShare(t);
                }}
                style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} (v{t.version})
                  </option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={handleExportSingleTemplatePackage} style={{ fontSize: '0.8rem', justifyContent: 'center' }}>
                  <Download size={14} />
                  <span>Template (.formsoffline)</span>
                </button>

                <button className="btn btn-secondary" onClick={handleExportFormDataPackage} style={{ fontSize: '0.8rem', justifyContent: 'center' }}>
                  <Package size={14} />
                  <span>Records (.formdata)</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="builder-muted-xs">No form templates available.</p>
          )}
        </div>

        {/* Database Backup Card */}
        <div className="card">
          <div className="consolidator-section-row">
            <Database size={22} color="var(--accent-green)" />
            <h2 className="consolidator-heading">Full Database Backup</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.85rem' }}>
            Export a full 100% offline snapshot of all templates, records, attachments, and provenance history.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleExportFullBackupArchive} style={{ width: '100%', justifyContent: 'center', padding: '0.55rem', fontSize: '0.84rem' }}>
              <Archive size={16} />
              <span>Full Backup ZIP (JSON + Files + Excel)</span>
            </button>

            <button className="btn btn-secondary btn-sm" onClick={handleExportFullBackup} style={{ width: '100%', justifyContent: 'center', padding: '0.45rem', fontSize: '0.78rem' }}>
              <Download size={14} />
              <span>Database Snapshot (.formbackup JSON)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

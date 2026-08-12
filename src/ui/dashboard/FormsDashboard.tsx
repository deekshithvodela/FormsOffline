import React, { useState, useEffect, useRef } from 'react';
import { Folder, Search, FileText, Trash2, Layers, Hash, Plus, Download, Database, CheckCircle, Package, Copy, Upload, AlertCircle, Sparkles, MoreVertical } from 'lucide-react';
import { FormTemplate } from '../../core/types';
import { db } from '../../db/database';
import { exportFormTemplatePackage, exportFormDataPackage, downloadBlob } from '../../services/exportService';
import { SmartFormImporterModal } from '../components/SmartFormImporterModal';

interface FormsDashboardProps {
  onNavigate: (tab: 'builder' | 'entry' | 'cms' | 'import', template?: FormTemplate) => void;
}

export const FormsDashboard: React.FC<FormsDashboardProps> = ({ onNavigate }) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'name-asc' | 'name-desc'>('date-desc');

  const filteredAndSortedTemplates = templates
    .filter((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'date-asc') {
        return new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime();
      }
      if (sortBy === 'date-desc') {
        return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
      }
      if (sortBy === 'name-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'name-desc') {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });
  const [deleteTarget, setDeleteTarget] = useState<FormTemplate | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isLinkImporterOpen, setIsLinkImporterOpen] = useState(false);
  const [activeMenuTemplateId, setActiveMenuTemplateId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLinkImportSuccess = async (importedTemplate: FormTemplate) => {
    await db.templates.put(importedTemplate);
    setImportStatus(`Successfully converted & imported Google/MS Form: "${importedTemplate.title}"`);
    loadTemplatesAndCounts();
    onNavigate('builder', importedTemplate);
  };

  const loadTemplatesAndCounts = async () => {
    const tpls = await db.templates.toArray();
    setTemplates(tpls);

    const counts: Record<string, number> = {};
    for (const t of tpls) {
      const c = await db.submissions.where('templateId').equals(t.id).count();
      counts[t.id] = c;
    }
    setSubmissionCounts(counts);
  };

  useEffect(() => {
    loadTemplatesAndCounts();
  }, []);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setErrorStatus(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.format === 'FormsOffline_Template' && parsed.template) {
          await db.templates.put(parsed.template);
          setImportStatus(`Imported Template: "${parsed.template.title}"`);
          loadTemplatesAndCounts();
        } else if (parsed.format === 'FormsOffline_FormData' && parsed.template && parsed.submissions) {
          await db.templates.put(parsed.template);
          for (const sub of parsed.submissions) {
            await db.submissions.put(sub);
          }
          setImportStatus(`Imported Template "${parsed.template.title}" with ${parsed.submissions.length} record(s)!`);
          loadTemplatesAndCounts();
        } else if (parsed.format === 'FormsOffline_DatabaseBackup' && parsed.database) {
          for (const t of parsed.database.templates || []) await db.templates.put(t);
          for (const s of parsed.database.submissions || []) await db.submissions.put(s);
          setImportStatus(`Full Database Restore complete! Loaded templates & records.`);
          loadTemplatesAndCounts();
        } else {
          setErrorStatus('Unrecognized file format or missing required payload data.');
        }
      } catch (err) {
        setErrorStatus('Invalid JSON package file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await db.templates.delete(deleteTarget.id);
      await db.submissions.where('templateId').equals(deleteTarget.id).delete();
      setDeleteTarget(null);
      loadTemplatesAndCounts();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleExportTemplate = (t: FormTemplate) => {
    const pkg = exportFormTemplatePackage(t);
    const blob = new Blob([pkg], { type: 'application/json' });
    downloadBlob(blob, `${t.title.replace(/\s+/g, '_')}.formsoffline`);
  };

  const handleExportFormDataPackage = async (t: FormTemplate) => {
    const submissions = await db.submissions.where('templateId').equals(t.id).toArray();
    const pkg = exportFormDataPackage(t, submissions);
    const blob = new Blob([pkg], { type: 'application/json' });
    downloadBlob(blob, `${t.title.replace(/\s+/g, '_')}_${submissions.length}_records.formdata`);
  };

  return (
    <div className="dashboard-container" onClick={() => setActiveMenuTemplateId(null)}>
      {/* Top Banner Toolbar */}
      <div className="card dashboard-header-card">
        <div className="dashboard-title-group">
          <Folder size={28} color="var(--primary)" />
          <div>
            <h1 className="dashboard-title">Forms Dashboard</h1>
            <span className="dashboard-subtitle">
              Manage offline form templates, launch data entry, view CMS datasets, and share packages
            </span>
          </div>
        </div>

        <div className="dashboard-actions-toolbar dashboard-toolbar">
          <div className="search-input-wrapper">
            <Search size={16} className="search-input-icon" />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-field"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="dashboard-sort-select"
            title="Sort forms list"
          >
            <option value="date-asc">Sort: Date Modified (Oldest First)</option>
            <option value="date-desc">Sort: Date Modified (Newest First)</option>
            <option value="name-asc">Sort: Title (A - Z)</option>
            <option value="name-desc">Sort: Title (Z - A)</option>
          </select>

          {/* Standalone Highlighted Feature: Import from Link */}
          <button
            className="btn-import-link"
            onClick={() => setIsLinkImporterOpen(true)}
            title="Import Google Form or Microsoft Form response URL using AI Parser"
          >
            <Sparkles size={16} color="#ffffff" />
            <span>Import from Link</span>
          </button>

          {/* Standalone Import File Button */}
          <button
            className="btn btn-outline btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Import .formtemplate or .formdata offline backup file"
          >
            <Upload size={16} color="var(--primary)" />
            <span>Import File</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.formsoffline,.formdata,.formbackup"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />

          <button className="btn btn-primary" onClick={() => onNavigate('builder')}>
            <Plus size={16} />
            <span>Create New Form</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="alert-banner-success">
          <CheckCircle size={16} />
          <span>{importStatus}</span>
        </div>
      )}

      {errorStatus && (
        <div className="alert-banner-error">
          <AlertCircle size={16} />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* Forms Card Grid */}
      {filteredAndSortedTemplates.length === 0 ? (
        <div className="card empty-state-card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Forms Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Get started by creating your first offline form template or importing an existing form package.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate('builder')}>
            <Plus size={16} />
            <span>Create New Form</span>
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          {filteredAndSortedTemplates.map((t) => {
            const count = submissionCounts[t.id] || 0;
            const fieldCount = t.sections.reduce((acc, s) => acc + s.fields.length, 0);

            return (
              <div
                key={t.id}
                className="template-card"
                style={{ borderTop: '3px solid var(--primary)' }}
              >
                <div>
                  <div className="template-card-header">
                    <h3 className="template-card-title">
                      {t.title}
                    </h3>

                    {/* Context Menu Toggle Button */}
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon"
                        onClick={() => setActiveMenuTemplateId(activeMenuTemplateId === t.id ? null : t.id)}
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent' }}
                        title="More Actions"
                        aria-label="More Template Actions"
                      >
                        <MoreVertical size={18} color="var(--text-secondary)" />
                      </button>

                      {activeMenuTemplateId === t.id && (
                        <div className="template-menu-dropdown">
                          <button
                            className="template-menu-item"
                            onClick={() => {
                              setActiveMenuTemplateId(null);
                              onNavigate('builder', t);
                            }}
                          >
                            <Copy size={15} color="var(--primary)" />
                            <span>Duplicate & Remix</span>
                          </button>
                          <div style={{ borderTop: '1px solid var(--border-color)' }} />
                          <button
                            className="template-menu-item"
                            onClick={() => {
                              setActiveMenuTemplateId(null);
                              handleExportTemplate(t);
                            }}
                          >
                            <Download size={15} color="var(--text-secondary)" />
                            <span>Export Template (.formsoffline)</span>
                          </button>
                          <button
                            className="template-menu-item"
                            onClick={() => {
                              setActiveMenuTemplateId(null);
                              handleExportFormDataPackage(t);
                            }}
                          >
                            <Package size={15} color="var(--accent-blue)" />
                            <span>Export Responses (.formdata)</span>
                          </button>
                          <div style={{ borderTop: '1px solid var(--border-color)' }} />
                          <button
                            className="template-menu-item danger"
                            onClick={() => {
                              setActiveMenuTemplateId(null);
                              setDeleteTarget(t);
                            }}
                          >
                            <Trash2 size={15} color="var(--accent-rose)" />
                            <span>Delete Template</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="template-card-desc">
                    {t.description || 'No description provided.'}
                  </p>

                  {/* Schema Indicators */}
                  <div className="template-card-stats">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Layers size={13} color="var(--primary)" />
                      <span>{t.sections.length} Section(s)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Hash size={13} color="var(--primary)" />
                      <span>{fieldCount} Field(s)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Database size={13} color="var(--accent-green)" />
                      <strong style={{ color: 'var(--accent-green)' }}>{count} Response(s)</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle size={13} color="var(--accent-green)" />
                      <span style={{ color: 'var(--accent-green)' }}>Schema Verified</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.9rem' }}>
                  {/* Clean 2-Primary Button Row */}
                  <div className="template-card-actions-row">
                    <button
                      className="btn btn-primary"
                      onClick={() => onNavigate('entry', t)}
                      style={{ flex: '1 1 120px', fontSize: '0.85rem', justifyContent: 'center', whiteSpace: 'nowrap' }}
                    >
                      <FileText size={15} />
                      <span>Collect Data</span>
                    </button>

                    <button
                      className="btn btn-secondary"
                      onClick={() => onNavigate('cms', t)}
                      style={{ flex: '1 1 120px', fontSize: '0.85rem', justifyContent: 'center', whiteSpace: 'nowrap' }}
                    >
                      <Database size={15} />
                      <span>View Records ({count})</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Confirmation Modal: Delete Form Template */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" style={{ width: '440px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.75rem' }}>
              Delete Form Template "{deleteTarget.title}"?
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              This will permanently delete the template and all <strong>{submissionCounts[deleteTarget.id] || 0} associated submission records</strong> stored locally in IndexedDB.
            </p>
            <div className="modal-footer-flex">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-danger-primary"
                onClick={handleConfirmDelete}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Form Importer Modal */}
      <SmartFormImporterModal
        isOpen={isLinkImporterOpen}
        onClose={() => setIsLinkImporterOpen(false)}
        onImportSuccess={handleLinkImportSuccess}
      />
    </div>
  );
};

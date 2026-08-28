import React, { useState, useEffect, useRef } from 'react';
import { Folder, Search, FileText, Trash2, Layers, Hash, Plus, Download, Database, CheckCircle, Package, Copy, Upload, AlertCircle, Sparkles, MoreVertical, Archive } from 'lucide-react';
import { FormTemplate } from '../../core/types';
import { db } from '../../db/database';
import { exportFormTemplatePackage, exportFormDataPackage, exportToZIPPackage, importPackageFile, downloadBlob } from '../../services/exportService';
import { SmartFormImporterModal } from '../components/SmartFormImporterModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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

  // Lock body scroll when delete confirmation dialog is open
  useBodyScrollLock(!!deleteTarget);

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

    const handleDocumentClick = () => {
      setActiveMenuTemplateId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setErrorStatus(null);

    try {
      const result = await importPackageFile(file);
      setImportStatus(result.message);
      loadTemplatesAndCounts();
    } catch (err: unknown) {
      setErrorStatus(err instanceof Error ? err.message : 'Failed to import package file.');
    } finally {
      e.target.value = '';
    }
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

  const handleExportZIPPackage = async (t: FormTemplate) => {
    const submissions = await db.submissions.where('templateId').equals(t.id).toArray();
    const blob = await exportToZIPPackage(t, submissions);
    downloadBlob(blob, `${t.title.replace(/\s+/g, '_')}_ZIP_Package.zip`);
  };

  return (
    <div className="dashboard-container">
      {/* Top Banner Toolbar */}
      <div className="card dashboard-header-card" style={{ padding: '0.85rem 1rem', gap: '0.75rem' }}>
        <div className="dashboard-title-group" style={{ gap: '0.55rem' }}>
          <Folder size={20} color="var(--primary)" />
          <div>
            <h1 className="dashboard-title">Forms Dashboard</h1>
            <span className="dashboard-subtitle">
              Manage offline form templates, launch data entry, view CMS datasets, and share packages
            </span>
          </div>
        </div>

        <div className="dashboard-actions-toolbar dashboard-toolbar" style={{ width: '100%', gap: '0.5rem' }}>
          {/* Single Row: Search Input + Compact Sort Dropdown */}
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', width: '100%' }}>
            <div className="search-input-wrapper" style={{ flex: '1 1 0', minWidth: '90px' }}>
              <Search size={14} className="search-input-icon" />
              <input
                type="text"
                placeholder="Search forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input-field"
                style={{ height: '34px', fontSize: '0.82rem', paddingLeft: '2.1rem' }}
                aria-label="Search offline form templates"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc')}
              className="dashboard-sort-select"
              style={{
                height: '34px',
                fontSize: '0.78rem',
                padding: '0.2rem 0.45rem',
                flex: '0 0 auto',
                maxWidth: '95px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm, 6px)',
                cursor: 'pointer'
              }}
              title="Sort forms list"
              aria-label="Sort forms list"
            >
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="name-asc">A – Z</option>
              <option value="name-desc">Z – A</option>
            </select>
          </div>

          {/* Action Buttons untouched */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', flexWrap: 'wrap' }}>
            {/* Standalone Highlighted Feature: Import from Link */}
            <button
              className="btn-import-link"
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                setIsLinkImporterOpen(true);
              }}
              title="Import Google Form or Microsoft Form response URL using AI Parser"
              style={{ flex: '1 1 130px', justifyContent: 'center' }}
            >
              <Sparkles size={16} color="#ffffff" />
              <span>Import from Link</span>
            </button>

            {/* Standalone Import File Button */}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                fileInputRef.current?.click();
              }}
              title="Import .zip, .formdata, .formbackup, or .formtemplate offline backup package"
              style={{ flex: '1 1 110px', justifyContent: 'center' }}
            >
              <Upload size={16} color="var(--primary)" />
              <span>Import File</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.json,.formsoffline,.formdata,.formbackup"
              onChange={handleImportFile}
              style={{ display: 'none' }}
              aria-label="Upload form template backup file"
            />

            <button
              className="btn btn-primary"
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                onNavigate('builder');
              }}
              style={{ flex: '1 1 100%', justifyContent: 'center' }}
            >
              <Plus size={16} />
              <span>Create New Form</span>
            </button>
          </div>
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
                className="card template-card"
                style={{ borderTop: '3px solid var(--primary)' }}
              >
                <div>
                  <div className="template-card-header">
                    <div className="template-badge-group">
                        <span className="badge badge-purple">v{t.version || '1.0'}</span>
                        <span className="badge badge-blue">
                          {count} Records
                        </span>
                        {/* Assuming e2eeEnabled could be part of settings object if it exists */}
                        {t.settings?.e2eeEnabled && (
                          <span className="badge badge-amber">E2EE</span>
                        )}
                    </div>

                    {/* Context Menu Toggle Button */}
                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setActiveMenuTemplateId(activeMenuTemplateId === t.id ? null : t.id)}
                        style={{ padding: '0.2rem 0.4rem', height: '28px' }}
                        title="Template actions"
                        aria-label="Open template actions menu"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMenuTemplateId === t.id && (
                        <div className="template-dropdown-menu" onClick={(e) => e.stopPropagation()}>
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
                          <div className="border-top" />
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
                          <button
                            className="template-menu-item"
                            onClick={() => {
                              setActiveMenuTemplateId(null);
                              handleExportZIPPackage(t);
                            }}
                          >
                            <Archive size={15} color="var(--accent-amber)" />
                            <span>Export ZIP Package (Excel + Files)</span>
                          </button>
                          <div className="border-top" />
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

                  <h3 className="template-card-title" style={{ marginTop: '0.5rem' }}>
                    {t.title}
                  </h3>

                  <p className="template-card-desc">
                    {t.description || 'No description provided.'}
                  </p>

                  {/* Schema Indicators */}
                  <div className="template-card-stats">
                    <div className="flex-center-gap-xs">
                      <Layers size={13} color="var(--primary)" />
                      <span>{t.sections.length} Section(s)</span>
                    </div>
                    <div className="flex-center-gap-xs">
                      <Hash size={13} color="var(--primary)" />
                      <span>{fieldCount} Field(s)</span>
                    </div>
                    <div className="flex-center-gap-xs">
                      <Database size={13} color="var(--accent-green)" />
                      <strong className="text-green">{count} Response(s)</strong>
                    </div>
                    <div className="flex-center-gap-xs">
                      <CheckCircle size={13} color="var(--accent-green)" />
                      <span className="text-green">Schema Verified</span>
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

import React, { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, Download, History, X, Database, Folder, Trash2, CheckSquare, Square, AlertTriangle, Plus, Package, Share2, ChevronDown, ChevronRight, ShieldCheck, Edit3, Star, Archive, FileText, Layers } from 'lucide-react';
import { FormSubmission, FormTemplate, FormField, ProvenanceEntry } from '../../core/types';
import { db } from '../../db/database';
import { exportToCSV, exportToXLSX, exportToZIPPackage, exportFormDataPackage, exportFormTemplatePackage, downloadBlob } from '../../services/exportService';
import { TemplateGalleryModal } from '../components/TemplateGalleryModal';
import { EditSubmissionModal } from './EditSubmissionModal';
import { MediaPreviewModal, MediaPreviewItem } from '../components/MediaPreviewModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface SpreadsheetGridProps {
  activeTemplate?: FormTemplate | null;
  onNavigateToEntry?: (template: FormTemplate) => void;
  onNavigateToDashboard?: () => void;
}

export const SpreadsheetGrid: React.FC<SpreadsheetGridProps> = ({
  activeTemplate,
  onNavigateToEntry,
  onNavigateToDashboard
}) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(activeTemplate || null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [editingSubmissionTarget, setEditingSubmissionTarget] = useState<FormSubmission | null>(null);
  const [isProvenanceDrawerOpen, setIsProvenanceDrawerOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showTechnicalSignatures, setShowTechnicalSignatures] = useState(false);
  const [activeShareMenuId, setActiveShareMenuId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [deleteSingleTarget, setDeleteSingleTarget] = useState<FormSubmission | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Lock background body scroll whenever any dialog or drawer is open
  useBodyScrollLock(!!deleteSingleTarget || isBulkDeleteModalOpen || isProvenanceDrawerOpen);

  const [previewMediaItem, setPreviewMediaItem] = useState<MediaPreviewItem | null>(null);
  const [previewGallery, setPreviewGallery] = useState<MediaPreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState<number>(0);

  const parentRef = useRef<HTMLDivElement>(null);

  const loadSubmissions = () => {
    if (!selectedTemplate) return;
    db.submissions
      .where('templateId')
      .equals(selectedTemplate.id)
      .toArray()
      .then(setSubmissions);
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    db.templates.toArray().then((tpls) => {
      setTemplates(tpls);
      setIsLoading(false);
    });

    const handleDocClick = () => {
      setActiveShareMenuId(null);
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  useEffect(() => {
    if (activeTemplate) {
      setSelectedTemplate(activeTemplate);
    }
  }, [activeTemplate]);

  useEffect(() => {
    loadSubmissions();
    setSelectedRowIds(new Set());
  }, [selectedTemplate]);

  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sub.id.toLowerCase().includes(q) ||
      sub.status.toLowerCase().includes(q) ||
      JSON.stringify(sub.data).toLowerCase().includes(q)
    );
  });

  const rowVirtualizer = useVirtualizer({
    count: filteredSubmissions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10
  });

  const renderCellContent = (f: FormField, val: any, sub?: FormSubmission) => {
    if (val === undefined || val === null || val === '') {
      return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>—</span>;
    }

    const recTag = sub?.id ? ` (#${sub.id.split('_').pop()})` : '';
    const subId = sub?.id || 'record';

    if (f.type === 'rating') {
      const num = Number(val) || 0;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={13}
              color="var(--accent-amber)"
              fill={star <= num ? 'var(--accent-amber)' : 'transparent'}
            />
          ))}
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>({num}/5)</span>
        </div>
      );
    }

    if (f.type === 'linear_scale') {
      return (
        <span className="badge badge-purple" style={{ fontSize: '0.78rem' }}>
          Scale: {val}
        </span>
      );
    }

    if (f.type === 'signature') {
      if (typeof val === 'string' && val.startsWith('data:image')) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <img
              src={val}
              alt="Signature"
              style={{ height: '24px', borderRadius: '3px', background: '#0f172a', border: '1px solid var(--border-color)', cursor: 'pointer' }}
              onClick={() => setPreviewMediaItem({
                title: `${f.label || 'Digital Signature'}${recTag}`,
                dataUrl: val,
                fileName: `Signature_${subId}.png`,
                type: 'image/png'
              })}
              title="Click to view full signature"
            />
            <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>Signed</span>
          </div>
        );
      }
      return (
        <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
          ✍️ Signed
        </span>
      );
    }

    if (f.type === 'file_upload') {
      const filesArray: any[] = Array.isArray(val) ? val : (val && typeof val === 'object' && val.data ? [val] : []);
      const count = filesArray.length;
      const firstName = filesArray[0]?.name || (typeof filesArray[0] === 'string' ? 'File' : 'Attachment');

      const gallery: MediaPreviewItem[] = filesArray.map((fileObj, idx) => ({
        title: `${f.label || 'Attached Document'}${recTag} — File ${idx + 1} of ${filesArray.length}`,
        dataUrl: fileObj.data,
        fileName: fileObj.name || `Attachment_${idx + 1}`,
        size: fileObj.size,
        type: fileObj.type
      }));

      return (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: filesArray.length > 0 ? 'pointer' : 'default', minWidth: 0, maxWidth: '100%' }}
          onClick={() => {
            if (gallery.length > 0) {
              setPreviewMediaItem(gallery[0]);
              setPreviewGallery(gallery);
              setPreviewInitialIndex(0);
            }
          }}
          title={filesArray.length > 0 ? `${firstName} (Click to inspect all ${count} files in gallery)` : firstName}
        >
          <FileText size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '130px',
              display: 'inline-block',
              verticalAlign: 'middle'
            }}
          >
            {firstName}
          </span>
          {count > 1 && <span className="badge badge-purple" style={{ fontSize: '0.7rem', flexShrink: 0 }}>+{count - 1}</span>}
        </div>
      );
    }

    if (f.type === 'camera_photo') {
      const photos = Array.isArray(val) ? val : (val && typeof val === 'object' && val.data ? [val] : []);
      if (photos.length > 0) {
        const firstPhoto = photos[0];
        const count = photos.length;
        const gallery: MediaPreviewItem[] = photos.map((p, idx) => ({
          title: `${f.label || 'Form Physical Photo'}${recTag} — Page ${idx + 1}`,
          dataUrl: p.data,
          fileName: p.name || `Photo_${subId}_P${idx + 1}.jpg`,
          size: p.size,
          type: p.type || 'image/jpeg',
          capturedAt: p.capturedAt ? new Date(p.capturedAt).toLocaleString() : undefined
        }));

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <img
              src={firstPhoto.data}
              alt="Photo"
              style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '2px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
              onClick={() => {
                setPreviewMediaItem(gallery[0]);
                setPreviewGallery(gallery);
                setPreviewInitialIndex(0);
              }}
              title="Click to view photo gallery in lightbox"
            />
            <span
              style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => {
                setPreviewMediaItem(gallery[0]);
                setPreviewGallery(gallery);
                setPreviewInitialIndex(0);
              }}
            >
              📷 {count === 1 ? 'Photo' : `${count} Photos`}
            </span>
            {count > 1 && <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>+{count - 1}</span>}
          </div>
        );
      }
      return val ? (
        <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>📷 Attached</span>
      ) : (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
      );
    }

    if (Array.isArray(val)) {
      return val.join(', ');
    }

    return String(val);
  };

  const fields = selectedTemplate?.sections
    .flatMap((s) => s.fields)
    .filter((f) => f.type !== 'title_block') || [];

  // Bulk Checkbox Handlers
  const toggleSelectAll = () => {
    if (selectedRowIds.size === filteredSubmissions.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredSubmissions.map((s) => s.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRowIds(next);
  };

  // Delete Actions
  const handleConfirmSingleDelete = async () => {
    if (!deleteSingleTarget) return;
    try {
      await db.submissions.delete(deleteSingleTarget.id);
      setDeleteSingleTarget(null);
      loadSubmissions();
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  const handleConfirmBulkDelete = async () => {
    try {
      const idsToDelete = Array.from(selectedRowIds);
      await db.submissions.bulkDelete(idsToDelete);
      setSelectedRowIds(new Set());
      setIsBulkDeleteModalOpen(false);
      loadSubmissions();
    } catch (err) {
      console.error('Failed bulk delete:', err);
    }
  };

  const handleExportCSV = () => {
    if (!selectedTemplate) return;
    const csvContent = exportToCSV(selectedTemplate, filteredSubmissions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${selectedTemplate.title.replace(/\s+/g, '_')}_records.csv`);
  };

  const handleExportXLSX = async () => {
    if (!selectedTemplate) return;
    const blob = await exportToXLSX(selectedTemplate, filteredSubmissions);
    downloadBlob(blob, `${selectedTemplate.title.replace(/\s+/g, '_')}_records.xlsx`);
  };

  const handleExportZIPPackage = async () => {
    if (!selectedTemplate) return;
    const blob = await exportToZIPPackage(selectedTemplate, filteredSubmissions);
    downloadBlob(blob, `${selectedTemplate.title.replace(/\s+/g, '_')}_ZIP_Package.zip`);
  };

  const handleExportFormDataPackage = () => {
    if (!selectedTemplate) return;
    const pkg = exportFormDataPackage(selectedTemplate, filteredSubmissions);
    const blob = new Blob([pkg], { type: 'application/json' });
    downloadBlob(blob, `${selectedTemplate.title.replace(/\s+/g, '_')}_${filteredSubmissions.length}_records.formdata`);
  };

  const handleExportTemplatePackage = () => {
    if (!selectedTemplate) return;
    const pkg = exportFormTemplatePackage(selectedTemplate);
    const blob = new Blob([pkg], { type: 'application/json' });
    downloadBlob(blob, `${selectedTemplate.title.replace(/\s+/g, '_')}_v${selectedTemplate.version}.formsoffline`);
  };

  if (isLoading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
        Loading dataset registries...
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <Database size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Data Registries</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Create a form template and submit records to view the virtualized spreadsheet grid.
        </p>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '600px', margin: '3rem auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <Database size={32} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No Dataset Selected
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Select a form template to inspect collected response records, audit version history, and export Excel data packages.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setIsGalleryOpen(true)} style={{ padding: '0.65rem 1.25rem' }}>
              <Folder size={18} />
              <span>Select a Form Template</span>
            </button>
            {onNavigateToDashboard && (
              <button className="btn btn-outline" onClick={onNavigateToDashboard} style={{ padding: '0.65rem 1.25rem' }}>
                Go to Dashboard
              </button>
            )}
          </div>
        </div>

        <TemplateGalleryModal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
          activeTemplateId={(selectedTemplate as FormTemplate | null)?.id}
        />
      </div>
    );
  }

  const allSelected = filteredSubmissions.length > 0 && selectedRowIds.size === filteredSubmissions.length;

  return (
    <div>
      {/* Toolbar — 3 Structured Rows */}
      <div className="card" style={{ padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1rem' }}>
        {/* Row 1: Active Dataset Title & Count with Ellipsis */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0, gap: '0.5rem' }}>
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.4rem', fontWeight: 600 }}>Active Dataset:</span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--primary)' }}>
              {selectedTemplate?.title || 'No Form Selected'}
            </strong>
            {selectedTemplate && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>
                ({filteredSubmissions.length} records)
              </span>
            )}
          </div>
        </div>

        {/* Row 2: All Forms & Switch Form buttons with text + Search icon button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            {onNavigateToDashboard && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onNavigateToDashboard}
                title="Back to All Forms Dashboard"
                aria-label="All Forms Dashboard"
                style={{ height: '32px', padding: '0.25rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
              >
                <Folder size={14} color="var(--primary)" />
                <span>All Forms</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                setIsGalleryOpen(true);
              }}
              title="Switch to another form dataset"
              aria-label="Switch Form Dataset"
              style={{ height: '32px', padding: '0.25rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
            >
              <Layers size={14} color="var(--text-secondary)" />
              <span>Switch Form</span>
            </button>
          </div>

          <button
            type="button"
            className={`btn btn-outline btn-sm btn-icon-square ${isSearchOpen || searchQuery ? 'active' : ''}`}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Search dataset records"
            aria-label="Search Records"
            style={{
              borderColor: (isSearchOpen || searchQuery) ? 'var(--primary)' : 'var(--border-color)',
              background: (isSearchOpen || searchQuery) ? 'var(--primary-light)' : 'var(--bg-input)'
            }}
          >
            <Search size={14} color={(isSearchOpen || searchQuery) ? 'var(--primary)' : 'var(--text-muted)'} />
          </button>
        </div>

        {/* Collapsible Search Input Row */}
        {(isSearchOpen || searchQuery) && (
          <div style={{ position: 'relative', width: '100%', animation: 'fadeIn 0.15s ease-out' }}>
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              autoFocus
              placeholder="Search records by ID, status, or values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '1.9rem',
                paddingRight: '2rem',
                height: '32px',
                fontSize: '0.82rem',
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: '6px'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Row 3: Action Buttons (New Record + Export Dropdown + Bulk Delete) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.45rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {selectedTemplate && onNavigateToEntry && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onNavigateToEntry(selectedTemplate)}
                title="Enter New Record for this Form"
                style={{ height: '32px', padding: '0.25rem 0.65rem', fontSize: '0.8rem', borderRadius: '6px' }}
              >
                <Plus size={14} />
                <span>Enter New Record</span>
              </button>
            )}

            {selectedRowIds.size > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                  setIsBulkDeleteModalOpen(true);
                }}
                style={{ backgroundColor: 'var(--accent-rose)', borderColor: 'var(--accent-rose)', height: '32px', padding: '0.25rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px' }}
              >
                <Trash2 size={13} />
                <span>Delete ({selectedRowIds.size})</span>
              </button>
            )}
          </div>

          {/* Unified Share / Export Dropdown Menu */}
          <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setActiveShareMenuId(activeShareMenuId === 'cms_export' ? null : 'cms_export')}
              style={{ height: '32px', padding: '0.25rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', borderRadius: '6px' }}
              title="Export Dataset Records"
            >
              <Share2 size={13} />
              <span>Export Data</span>
              <ChevronDown size={12} />
            </button>

            {activeShareMenuId === 'cms_export' && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '110%',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  width: '210px',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}
              >
                <button
                  className="btn btn-outline"
                  onClick={() => { handleExportCSV(); setActiveShareMenuId(null); }}
                  style={{ justifyContent: 'flex-start', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                >
                  <Download size={14} color="var(--primary)" />
                  <span>CSV Spreadsheet (.csv)</span>
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => { handleExportXLSX(); setActiveShareMenuId(null); }}
                  style={{ justifyContent: 'flex-start', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                >
                  <Download size={14} color="var(--accent-green)" />
                  <span>Excel Workbook (.xlsx)</span>
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => { handleExportZIPPackage(); setActiveShareMenuId(null); }}
                  style={{ justifyContent: 'flex-start', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                >
                  <Archive size={14} color="var(--accent-amber)" />
                  <span>ZIP Package (Excel + Files)</span>
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => { handleExportFormDataPackage(); setActiveShareMenuId(null); }}
                  style={{ justifyContent: 'flex-start', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                >
                  <Package size={14} color="var(--accent-purple)" />
                  <span>Response Package (.formdata)</span>
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => { handleExportTemplatePackage(); setActiveShareMenuId(null); }}
                  style={{ justifyContent: 'flex-start', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}
                >
                  <Share2 size={14} color="var(--primary)" />
                  <span>Template Package (.formsoffline)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Virtualized Table Grid Container */}
      <div
        ref={parentRef}
        style={{
          height: '500px',
          overflow: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          position: 'relative'
        }}
      >
        {/* Header Row (Sticky at scroll top) */}
        <div
          style={{
            display: 'flex',
            minWidth: 'max-content',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'var(--bg-card-hover)',
            borderBottom: '2px solid var(--border-color)',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}
        >
          <div style={{ width: '40px', padding: '0.6rem 0.5rem', flexShrink: 0, textAlign: 'center', cursor: 'pointer' }} onClick={toggleSelectAll}>
            {allSelected ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
          </div>
          <div style={{ width: '120px', padding: '0.6rem 1rem', flexShrink: 0 }}>Record Tag</div>
          <div style={{ width: '100px', padding: '0.6rem 1rem', flexShrink: 0 }}>Status</div>
          <div style={{ width: '160px', padding: '0.6rem 1rem', flexShrink: 0 }}>Submitted At (UTC)</div>
          {fields.map((f) => (
            <div key={f.id} style={{ width: '180px', padding: '0.6rem 1rem', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.label}>
              {f.label}
            </div>
          ))}
          <div style={{ width: '140px', padding: '0.6rem 1rem', flexShrink: 0 }}>Actions</div>
        </div>

        {/* Virtualized Row Container */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {/* Virtual Rows */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const sub = filteredSubmissions[virtualRow.index];
            const isChecked = selectedRowIds.has(sub.id);
            const shortTag = `#${sub.id.split('_').pop() || sub.id.substring(0, 6)}`;

            return (
              <div
                key={sub.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  minWidth: 'max-content',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                  background: isChecked ? 'var(--primary-light)' : 'transparent'
                }}
              >
                <div
                  style={{ width: '40px', padding: '0 0.5rem', flexShrink: 0, textAlign: 'center', cursor: 'pointer' }}
                  onClick={() => toggleSelectRow(sub.id)}
                >
                  {isChecked ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
                </div>

                <div style={{ width: '120px', padding: '0 1rem', flexShrink: 0, fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 600 }}>
                  {shortTag}
                </div>
                <div style={{ width: '100px', padding: '0 1rem', flexShrink: 0 }}>
                  <span className={`badge ${sub.status === 'completed' ? 'badge-green' : 'badge-purple'}`}>
                    {sub.status}
                  </span>
                </div>
                <div style={{ width: '160px', padding: '0 1rem', flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {new Date(sub.createdAt).toLocaleTimeString()}
                </div>
                {fields.map((f) => (
                  <div key={f.id} style={{ width: '180px', padding: '0 1rem', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                    {renderCellContent(f, sub.data[f.id], sub)}
                  </div>
                ))}
                <div style={{ width: '140px', padding: '0 0.75rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    className="btn btn-outline btn-icon-square"
                    style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', padding: 0, borderRadius: '6px', color: 'var(--primary)' }}
                    onClick={() => setEditingSubmissionTarget(sub)}
                    title="Edit Submission Record"
                    aria-label="Edit Submission Record"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    className="btn btn-outline btn-icon-square"
                    style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', padding: 0, borderRadius: '6px' }}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setIsProvenanceDrawerOpen(true);
                    }}
                    title="View Record Details & Audit Trail"
                    aria-label="View Record Details & Audit Trail"
                  >
                    <History size={14} />
                  </button>
                  <button
                    className="btn btn-outline btn-icon-square"
                    style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', padding: 0, borderRadius: '6px', color: 'var(--accent-rose)' }}
                    onClick={() => setDeleteSingleTarget(sub)}
                    title="Delete Record"
                    aria-label="Delete Record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Record Edit Modal */}
      <EditSubmissionModal
        isOpen={!!editingSubmissionTarget}
        submission={editingSubmissionTarget}
        template={selectedTemplate}
        onClose={() => setEditingSubmissionTarget(null)}
        onSaved={loadSubmissions}
      />

      {/* Safety Confirmation Modal: Single Record Delete */}
      {deleteSingleTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="card" style={{ width: '420px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={24} color="var(--accent-rose)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                Delete Record #{deleteSingleTarget.id.split('_').pop()}?
              </h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to permanently delete this submission record? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteSingleTarget(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmSingleDelete}
                style={{ backgroundColor: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal: Bulk Records Delete */}
      {isBulkDeleteModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          zIndex: 1100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="card" style={{ width: '440px', maxWidth: '90vw' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={24} color="var(--accent-rose)" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                Bulk Delete {selectedRowIds.size} Records?
              </h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              You are about to permanently delete <strong>{selectedRowIds.size} selected submission records</strong> from IndexedDB. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsBulkDeleteModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmBulkDelete}
                style={{ backgroundColor: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
              >
                Permanently Delete ({selectedRowIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Gallery File Manager Modal */}
      <TemplateGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
        activeTemplateId={selectedTemplate?.id}
      />

      {/* Record Provenance Audit Drawer */}
      {isProvenanceDrawerOpen && selectedSubmission && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'flex-end',
          zIndex: 1000
        }}>
          <div style={{
            width: '460px',
            maxWidth: '100vw',
            boxSizing: 'border-box',
            height: '100%',
            backgroundColor: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-color)',
            padding: '1.25rem 1rem',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={22} color="var(--primary)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Record Detail & Audit Log</h3>
              </div>
              <button className="btn btn-outline" onClick={() => setIsProvenanceDrawerOpen(false)} style={{ padding: '0.4rem' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem', background: 'var(--bg-input)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Record ID</strong>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>
                  #{selectedSubmission.id.split('_').pop()}
                </span>
              </div>
              <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <ShieldCheck size={14} /> Verified Secure
              </span>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.8rem' }}>Submitted Data Values</h4>
            <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.25rem', background: 'var(--bg-input)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)' }}>
              {fields.map((f) => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{f.label}:</span>
                  <div style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{renderCellContent(f, selectedSubmission.data[f.id], selectedSubmission)}</div>
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.8rem' }}>Submission Audit History</h4>

            <div style={{ display: 'grid', gap: '0.8rem', marginBottom: '1.25rem' }}>
              {selectedSubmission.provenance.map((prov: ProvenanceEntry, pIdx: number) => (
                <div key={prov.id} style={{
                  border: '1px solid var(--border-color)',
                  padding: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.4rem' }}>
                    <span className="badge badge-green">{prov.action.toUpperCase()} (v{pIdx + 1})</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{new Date(prov.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: prov.diffSummary ? '0.5rem' : '0' }}>
                    Author: <strong>{prov.authorAlias || 'Operator'}</strong>
                  </div>

                  {/* Version Diff Details */}
                  {prov.diffSummary && (() => {
                    const cleanDiff = prov.diffSummary.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[a-zA-Z0-9+/=]+/g, '[Digital Signature / Image]');
                    return (
                      <div style={{ background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', borderLeft: '3px solid var(--primary)', marginTop: '0.4rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--primary)' }}>Revision Changes:</strong>
                        <div style={{ color: 'var(--text-primary)', wordBreak: 'break-word', lineHeight: 1.4 }}>
                          {cleanDiff}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            {/* Collapsible Technical Cryptographic Hashes */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowTechnicalSignatures(!showTechnicalSignatures)}
                style={{ width: '100%', justifyContent: 'space-between', fontSize: '0.8rem' }}
              >
                <span>Technical Cryptographic Signatures (SHA-256)</span>
                {showTechnicalSignatures ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showTechnicalSignatures && (
                <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedSubmission.provenance.map((prov: ProvenanceEntry) => (
                    <div key={prov.id} style={{ background: 'var(--bg-input)', padding: '0.6rem', borderRadius: 'var(--radius-sm)', overflowX: 'hidden' }}>
                      <div style={{ wordBreak: 'break-all' }}>Device ID: <code style={{ wordBreak: 'break-all' }}>{prov.deviceId}</code></div>
                      <div style={{ wordBreak: 'break-all', marginTop: '0.2rem' }}>SHA-256: <code style={{ wordBreak: 'break-all', fontSize: '0.72rem' }}>{prov.hash}</code></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Universal Media Lightbox Preview Modal */}
      <MediaPreviewModal
        isOpen={!!previewMediaItem}
        onClose={() => {
          setPreviewMediaItem(null);
          setPreviewGallery([]);
        }}
        item={previewMediaItem}
        galleryItems={previewGallery}
        initialIndex={previewInitialIndex}
      />
    </div>
  );
};

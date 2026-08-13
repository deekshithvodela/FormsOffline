import React, { useState, useEffect } from 'react';
import { Folder, Search, FileText, Trash2, X, Check, Layers, Hash, LayoutGrid, List } from 'lucide-react';
import { FormTemplate } from '../../core/types';
import { db } from '../../db/database';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: FormTemplate) => void;
  activeTemplateId?: string;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  activeTemplateId
}) => {
  useBodyScrollLock(isOpen);

  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<FormTemplate | null>(null);

  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'name-asc' | 'name-desc'>('date-desc');

  const loadTemplates = async () => {
    const tpls = await db.templates.toArray();
    setTemplates(tpls);

    const counts: Record<string, number> = {};
    for (const t of tpls) {
      const count = await db.submissions.where('templateId').equals(t.id).count();
      counts[t.id] = count;
    }
    setSubmissionCounts(counts);
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTemplates = templates
    .filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    })
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

  const handleDeleteTemplate = async () => {
    if (!deleteConfirmTemplate) return;
    try {
      // Purge template and all associated submissions
      await db.templates.delete(deleteConfirmTemplate.id);
      await db.submissions.where('templateId').equals(deleteConfirmTemplate.id).delete();
      setDeleteConfirmTemplate(null);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      zIndex: 10500,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overscrollBehavior: 'contain',
      touchAction: 'none'
    }}>
      <div className="card" style={{ width: '800px', maxWidth: '94vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Folder size={24} color="var(--primary)" />
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Form Templates File Manager</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Browse, select, or manage all saved offline forms</span>
            </div>
          </div>
          <button className="btn btn-outline" onClick={onClose} style={{ padding: '0.3rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search & View Switcher Toolbar */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search forms by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem', boxSizing: 'border-box' }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: '0.55rem 0.75rem',
              fontSize: '0.85rem',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              flex: '0 1 auto'
            }}
            title="Sort forms list"
          >
            <option value="date-asc">Sort: Date Modified (Oldest First)</option>
            <option value="date-desc">Sort: Date Modified (Newest First)</option>
            <option value="name-asc">Sort: Title (A - Z)</option>
            <option value="name-desc">Sort: Title (Z - A)</option>
          </select>

          {/* View Mode Toggle Buttons */}
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-input)', padding: '0.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <button
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
              title="Cards Grid View"
              style={{ padding: '0.35rem 0.6rem' }}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
              title="File List Row View"
              style={{ padding: '0.35rem 0.6rem' }}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Templates Gallery Container */}
        {filteredTemplates.length === 0 ? (
          <div style={{ flex: 1, textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p>No matching form templates found.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Cards Grid View */
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', paddingRight: '0.2rem' }}>
            {filteredTemplates.map((t) => {
              const isSelected = t.id === activeTemplateId;
              const fieldCount = t.sections.flatMap((s) => s.fields).filter((f) => f.type !== 'title_block').length;
              const subCount = submissionCounts[t.id] || 0;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTemplate(t);
                    onClose();
                  }}
                  className="card"
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    position: 'relative',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSelected && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--primary)', color: '#fff', borderRadius: '50%', padding: '2px' }}>
                      <Check size={14} />
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                      <span className="badge badge-purple">v{t.version}</span>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                        {t.title}
                      </h3>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.8rem', height: '36px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.description || 'No description provided.'}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      <span><Layers size={12} style={{ display: 'inline', marginRight: '3px' }} /> {t.sections.length} Sections</span>
                      <span><Hash size={12} style={{ display: 'inline', marginRight: '3px' }} /> {fieldCount} Questions</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                        {subCount} record(s)
                      </span>

                      <button
                        className="btn btn-outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmTemplate(t);
                        }}
                        title="Delete Form Template"
                        style={{ padding: '0.2rem 0.4rem', color: 'var(--accent-rose)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* File List Row View */
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.2rem' }}>
            {filteredTemplates.map((t) => {
              const isSelected = t.id === activeTemplateId;
              const fieldCount = t.sections.flatMap((s) => s.fields).filter((f) => f.type !== 'title_block').length;
              const subCount = submissionCounts[t.id] || 0;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTemplate(t);
                    onClose();
                  }}
                  className="card"
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.6rem 1rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Left Block: Icon + Title + Version & Active Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: '1 1 200px', minWidth: 0 }}>
                    <FileText size={20} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <h3 style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {t.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>v{t.version}</span>
                          {isSelected && <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>Active</span>}
                        </div>
                      </div>
                      <p style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        margin: '0.1rem 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {t.description || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Right Block: Stats + Delete Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem 0.8rem', flexShrink: 0, marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span><Layers size={12} style={{ display: 'inline', marginRight: '2px' }} /> {t.sections.length} Sec</span>
                      <span><Hash size={12} style={{ display: 'inline', marginRight: '2px' }} /> {fieldCount} Qs</span>
                    </div>

                    <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem' }}>
                      {subCount} recs
                    </span>

                    <button
                      className="btn btn-outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmTemplate(t);
                      }}
                      title="Delete Form Template"
                      style={{ padding: '0.25rem 0.45rem', color: 'var(--accent-rose)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Template Safety Confirmation Modal */}
        {deleteConfirmTemplate && (
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
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.75rem' }}>
                Permanently Delete Form Template?
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Are you sure you want to delete <strong>"{deleteConfirmTemplate.title}"</strong>? This will also purge all associated submission records from IndexedDB. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => setDeleteConfirmTemplate(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleDeleteTemplate} style={{ backgroundColor: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}>
                  Permanently Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Folder, Search, FileText, Trash2, X, LayoutGrid, List } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<FormTemplate | null>(null);

  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'name-asc' | 'name-desc'>('date-desc');

  const loadTemplates = async () => {
    const tpls = await db.templates.toArray();
    setTemplates(tpls);
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTemplates = templates
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

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await db.templates.delete(templateId);
      await db.submissions.where('templateId').equals(templateId).delete();
      await loadTemplates();
      setDeleteConfirmTemplate(null);
    } catch (err) {
      console.error('Failed to delete template from gallery:', err);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10500,
      padding: '1rem',
      overscrollBehavior: 'contain',
      touchAction: 'none'
    }}>
      <div className="card" style={{ width: '740px', maxWidth: '94vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
        {/* Compact Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Folder size={18} color="var(--primary)" />
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Form Templates</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Select or manage offline forms</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ padding: '0.3rem', height: '28px' }} aria-label="Close Gallery" title="Close Gallery">
            <X size={16} />
          </button>
        </div>

        {/* Single-Row Search, Sort & View Switcher Toolbar */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'nowrap', width: '100%' }}>
          <div style={{ position: 'relative', flex: '1 1 0', minWidth: '90px' }}>
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '0.55rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '1.75rem', height: '30px', fontSize: '0.78rem', boxSizing: 'border-box' }}
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc')}
            style={{
              padding: '0.2rem 0.35rem',
              fontSize: '0.76rem',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm, 6px)',
              cursor: 'pointer',
              height: '30px',
              flex: '0 0 auto',
              maxWidth: '85px'
            }}
            title="Sort forms list"
          >
            <option value="date-desc">Newest</option>
            <option value="date-asc">Oldest</option>
            <option value="name-asc">A – Z</option>
            <option value="name-desc">Z – A</option>
          </select>

          {/* View Mode Toggle Buttons */}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary)', padding: '2px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
            <button
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
              title="Cards Grid View"
              style={{ padding: '0.18rem 0.4rem', height: '24px', minHeight: 'unset' }}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('list')}
              title="List View"
              style={{ padding: '0.18rem 0.4rem', height: '24px', minHeight: 'unset' }}
            >
              <List size={13} />
            </button>
          </div>
        </div>

        {/* Templates Gallery Container */}
        {filteredTemplates.length === 0 ? (
          <div style={{ flex: 1, textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <FileText size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem' }}>No matching form templates found.</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Clean Cards Grid View */
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', paddingRight: '0.2rem' }}>
            {filteredTemplates.map((t) => {
              const isSelected = t.id === activeTemplateId;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTemplate(t);
                    onClose();
                  }}
                  className="card"
                  style={{
                    padding: '0.75rem 0.85rem',
                    cursor: 'pointer',
                    position: 'relative',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.35rem',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.7rem', padding: '0.1rem 0.35rem' }}>v{t.version}</span>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                      {t.title}
                    </h3>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, height: '34px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {t.description || 'No description provided.'}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Clean File List Row View */
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.2rem' }}>
            {filteredTemplates.map((t) => {
              const isSelected = t.id === activeTemplateId;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTemplate(t);
                    onClose();
                  }}
                  className="card"
                  style={{
                    padding: '0.6rem 0.85rem',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.6rem',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <FileText size={16} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '0.1rem 0.3rem' }}>v{t.version}</span>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </strong>
                      </div>
                      {t.description && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmTemplate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10600,
          padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '1.5rem' }}>
            <Trash2 size={36} color="var(--accent-rose)" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Delete Template?</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to delete <strong>"{deleteConfirmTemplate.title}"</strong> and all its responses?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirmTemplate(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ backgroundColor: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
                onClick={() => handleDeleteTemplate(deleteConfirmTemplate.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

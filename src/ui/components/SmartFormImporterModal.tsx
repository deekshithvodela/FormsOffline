import React, { useState } from 'react';
import { Link, Sparkles, X, Code, AlertCircle } from 'lucide-react';
import { parseFormFromUrl } from '../../services/formLinkParser';
import { FormTemplate } from '../../core/types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface SmartFormImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (template: FormTemplate) => void;
}

export const SmartFormImporterModal: React.FC<SmartFormImporterModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  useBodyScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<'url' | 'html'>('url');
  const [url, setUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    setLoading(true);
    setError(null);

    const result = await parseFormFromUrl(
      url || 'https://docs.google.com/forms',
      activeTab === 'html' ? htmlContent : undefined
    );

    setLoading(false);

    if (result.success && result.template) {
      onImportSuccess(result.template);
      onClose();
    } else {
      setError(result.error || 'Failed to import form structure.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(4px)',
      zIndex: 10500,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overscrollBehavior: 'contain',
      touchAction: 'none'
    }}>
      <div className="card" style={{ width: '540px', maxWidth: '92vw', boxSizing: 'border-box', padding: '1.5rem 1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={24} color="var(--primary)" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, wordBreak: 'break-word' }}>Import Google / MS Form</h2>
          </div>
          <button className="btn btn-outline" onClick={onClose} style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', overflowX: 'auto' }}>
          <button
            onClick={() => { setActiveTab('url'); setError(null); }}
            style={{
              padding: '0.6rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'url' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'url' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Link size={16} />
            <span>Form Link / URL</span>
          </button>

          <button
            onClick={() => { setActiveTab('html'); setError(null); }}
            style={{
              padding: '0.6rem 1rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'html' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'html' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Code size={16} />
            <span>Page Source / HTML</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'url' ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
              Paste any public Google Form or Microsoft Form responder URL (e.g. <code style={{ wordBreak: 'break-all', fontSize: '0.78rem' }}>https://docs.google.com/forms/d/e/.../viewform</code>).
            </p>
            <input
              type="text"
              placeholder="https://docs.google.com/forms/d/e/1FAIpQLSc.../viewform"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-word', overflowWrap: 'anywhere', lineHeight: 1.5 }}>
              If direct CORS fetch is restricted, open the public form in your browser, press <code>Ctrl+U</code> (View Source), and paste the HTML below:
            </p>
            <textarea
              rows={6}
              placeholder="Paste HTML page source here..."
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </div>
        )}

        {error && (
          <div style={{ marginTop: '1rem', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
            {loading ? (
              <span>Converting...</span>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Convert & Create Offline Form</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

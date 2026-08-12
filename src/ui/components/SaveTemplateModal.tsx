import React from 'react';
import { Lock, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface SaveTemplateModalProps {
  isOpen: boolean;
  templateTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  templateTitle,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'rgba(234, 179, 8, 0.15)',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Lock size={22} color="var(--accent-amber)" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Lock & Save Form Template?</h3>
          </div>
          <button className="btn-icon" onClick={onCancel} style={{ background: 'transparent', border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
            Saving <strong>"{templateTitle || 'Untitled Form'}"</strong> will lock its structure.
          </p>

          <div style={{
            background: 'var(--bg-main)',
            borderLeft: '4px solid var(--accent-amber)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.5'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
              <AlertTriangle size={16} color="var(--accent-amber)" />
              <span>Why is it locked?</span>
            </div>
            Once saved, this template <strong>cannot be edited directly</strong>. This protects your data structure so combining responses collected across team devices works without errors.
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px border-subtle' }}>
            💡 <strong>Tip:</strong> If you ever need to make changes later, click <strong>"Duplicate & Remix"</strong> on the Forms Dashboard to create an editable copy!
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Keep Editing
          </button>
          <button className="btn btn-primary" onClick={onConfirm} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-green)' }}>
            <CheckCircle size={18} />
            <span>Yes, Lock & Save Template</span>
          </button>
        </div>
      </div>
    </div>
  );
};

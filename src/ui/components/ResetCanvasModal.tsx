import React from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface ResetCanvasModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetCanvasModal: React.FC<ResetCanvasModalProps> = ({
  isOpen,
  onConfirm,
  onCancel
}) => {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10500,
        padding: '1rem',
        overscrollBehavior: 'contain',
        touchAction: 'none'
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '1.75rem',
          position: 'relative',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
          title="Close Modal"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <RotateCcw size={22} color="var(--accent-amber)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Reset Builder Canvas?</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Start fresh with a clean slate</span>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          Are you sure you want to clear the canvas? All unsaved questions, sections, and draft changes currently in the builder will be wiped back to a fresh starting template.
        </p>

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            borderLeft: '4px solid var(--accent-amber)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}
        >
          <AlertTriangle size={16} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>This action cannot be undone. Saved templates in your database will not be affected.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={onCancel}>
            Keep Editing
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            style={{ backgroundColor: 'var(--accent-amber)', borderColor: 'var(--accent-amber)' }}
          >
            <RotateCcw size={16} />
            <span>Yes, Reset Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
};

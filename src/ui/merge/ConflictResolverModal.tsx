import React, { useState } from 'react';
import { GitMerge, Check, X, AlertOctagon } from 'lucide-react';
import { FieldConflict, FormSubmission } from '../../core/types';

interface ConflictResolverModalProps {
  isOpen: boolean;
  conflicts: FieldConflict[];
  localSubmission: FormSubmission;
  remoteSubmission: FormSubmission;
  onResolve: (resolvedData: Record<string, any>) => void;
  onCancel: () => void;
}

export const ConflictResolverModal: React.FC<ConflictResolverModalProps> = ({
  isOpen,
  conflicts,
  localSubmission,
  remoteSubmission,
  onResolve,
  onCancel
}) => {
  const [resolutions, setResolutions] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    conflicts.forEach((c) => {
      initial[c.fieldId] = c.localValue; // Default to local value
    });
    return initial;
  });

  if (!isOpen) return null;

  const handleSelectValue = (fieldId: string, value: any) => {
    setResolutions((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleFinalize = () => {
    const mergedData = { ...localSubmission.data, ...remoteSubmission.data, ...resolutions };
    onResolve(mergedData);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertOctagon size={28} color="var(--accent-amber)" />
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Record Collision — Field Conflict Resolver</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Multi-device data union detected {conflicts.length} conflicting field(s).
              </p>
            </div>
          </div>
          <button className="btn btn-outline" onClick={onCancel} style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {conflicts.map((c) => (
            <div key={c.fieldId} style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
                Field: {c.fieldLabel}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Local Choice */}
                <div
                  onClick={() => handleSelectValue(c.fieldId, c.localValue)}
                  style={{
                    border: resolutions[c.fieldId] === c.localValue ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: resolutions[c.fieldId] === c.localValue ? 'var(--primary-light)' : 'var(--bg-card)',
                    padding: '0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    <span>Local Device ({localSubmission.deviceId})</span>
                    {resolutions[c.fieldId] === c.localValue && <Check size={14} color="var(--primary)" />}
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>{String(c.localValue)}</strong>
                </div>

                {/* Remote Choice */}
                <div
                  onClick={() => handleSelectValue(c.fieldId, c.remoteValue)}
                  style={{
                    border: resolutions[c.fieldId] === c.remoteValue ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    background: resolutions[c.fieldId] === c.remoteValue ? 'var(--primary-light)' : 'var(--bg-card)',
                    padding: '0.8rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    <span>Remote Device ({remoteSubmission.deviceId})</span>
                    {resolutions[c.fieldId] === c.remoteValue && <Check size={14} color="var(--primary)" />}
                  </div>
                  <strong style={{ display: 'block', fontSize: '0.95rem' }}>{String(c.remoteValue)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleFinalize}>
            <GitMerge size={16} />
            <span>Apply Resolutions & Merge</span>
          </button>
        </div>
      </div>
    </div>
  );
};

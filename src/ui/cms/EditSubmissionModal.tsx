import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit3, MapPin, Star } from 'lucide-react';
import { FormSubmission, FormTemplate } from '../../core/types';
import { db } from '../../db/database';
import { createProvenanceEntry } from '../../core/merge/mergeEngine';

interface EditSubmissionModalProps {
  isOpen: boolean;
  submission: FormSubmission | null;
  template: FormTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

export const EditSubmissionModal: React.FC<EditSubmissionModalProps> = ({
  isOpen,
  submission,
  template,
  onClose,
  onSaved
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (isOpen && submission) {
      setFormData(JSON.parse(JSON.stringify(submission.data || {})));
      setErrorMsg(null);
    }
  }, [isOpen, submission]);

  if (!isOpen || !submission || !template) return null;

  const handleInputChange = (fieldId: string, val: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleCheckboxChange = (fieldId: string, optionVal: string, isChecked: boolean) => {
    const currentList: string[] = Array.isArray(formData[fieldId]) ? formData[fieldId] : [];
    let updated: string[];
    if (isChecked) {
      updated = [...currentList, optionVal];
    } else {
      updated = currentList.filter((v) => v !== optionVal);
    }
    handleInputChange(fieldId, updated);
  };

  // Canvas Digital Signature Draw Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = (fieldId: string) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      handleInputChange(fieldId, dataUrl);
    }
  };

  const clearSignature = (fieldId: string) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    handleInputChange(fieldId, null);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const profiles = await db.userProfile.toArray();
      const activeProf = profiles[0];
      const alias = activeProf?.alias || 'Operator 1';
      const device = activeProf?.deviceId || submission.deviceId || 'local_device';

      // Generate new SHA-256 cryptographic provenance entry for this edit
      const newEditProv = await createProvenanceEntry(device, 'updated', formData, alias);
      const updatedProvenance = [...(submission.provenance || []), newEditProv];

      const updatedRecord: FormSubmission = {
        ...submission,
        data: formData,
        updatedAt: new Date().toISOString(),
        provenance: updatedProvenance
      };

      await db.submissions.put(updatedRecord);
      setIsSaving(false);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save record edit:', err);
      setErrorMsg(err.message || 'Failed to save edits to IndexedDB.');
      setIsSaving(false);
    }
  };

  const allFields = template.sections
    .flatMap((s) => s.fields)
    .filter((f) => f.type !== 'title_block');

  const recordTag = `#${submission.id.split('_').pop()}`;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      zIndex: 1150,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1rem'
    }}>
      <div className="card" style={{
        width: '640px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Edit3 size={22} color="var(--primary)" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Edit Submission Record <span style={{ color: 'var(--primary)' }}>{recordTag}</span>
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Form: {template.title} (v{template.version})
              </span>
            </div>
          </div>
          <button className="btn btn-outline" onClick={onClose} style={{ padding: '0.35rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'grid', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          {allFields.map((f) => (
            <div key={f.id} style={{ background: 'var(--bg-input)', padding: '1.1rem', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                {f.label} {f.validation?.required && <span style={{ color: 'var(--accent-rose)' }}>*</span>}
              </label>
              {f.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{f.description}</p>}

              {f.type === 'text' && (
                <input
                  type="text"
                  value={formData[f.id] || ''}
                  onChange={(e) => handleInputChange(f.id, e.target.value)}
                  style={{ width: '100%' }}
                />
              )}

              {f.type === 'textarea' && (
                <textarea
                  value={formData[f.id] || ''}
                  onChange={(e) => handleInputChange(f.id, e.target.value)}
                  style={{ width: '100%', minHeight: '80px' }}
                />
              )}

              {f.type === 'number' && (
                <input
                  type="number"
                  value={formData[f.id] || ''}
                  onChange={(e) => handleInputChange(f.id, e.target.value)}
                  style={{ width: '100%' }}
                />
              )}

              {f.type === 'date' && (
                <input
                  type="date"
                  value={formData[f.id] || ''}
                  onChange={(e) => handleInputChange(f.id, e.target.value)}
                  style={{ width: '100%' }}
                />
              )}

              {f.type === 'time' && (
                <input
                  type="time"
                  value={formData[f.id] || ''}
                  onChange={(e) => handleInputChange(f.id, e.target.value)}
                  style={{ width: '100%' }}
                />
              )}

              {(f.type === 'location' || f.type === 'geo') && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <MapPin size={18} color="var(--primary)" />
                  <input
                    type="text"
                    value={formData[f.id] || ''}
                    onChange={(e) => handleInputChange(f.id, e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              {f.type === 'signature' && (
                <div>
                  <div style={{ position: 'relative', background: '#0f172a', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={120}
                      onMouseDown={(e) => startDrawing(e)}
                      onMouseMove={(e) => draw(e)}
                      onMouseUp={() => stopDrawing(f.id)}
                      onMouseLeave={() => stopDrawing(f.id)}
                      onTouchStart={(e) => startDrawing(e)}
                      onTouchMove={(e) => draw(e)}
                      onTouchEnd={() => stopDrawing(f.id)}
                      style={{ cursor: 'crosshair', width: '100%', height: '120px', touchAction: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Draw updated signature above</span>
                    <button
                      className="btn btn-outline"
                      onClick={() => clearSignature(f.id)}
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--accent-rose)' }}
                    >
                      Clear Signature
                    </button>
                  </div>
                </div>
              )}

              {f.type === 'radio' && (
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  {(f.options || []).map((opt, oIdx) => (
                    <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                      <input
                        type="radio"
                        name={`edit_${f.id}`}
                        value={opt.value}
                        checked={formData[f.id] === opt.value}
                        onChange={(e) => handleInputChange(f.id, e.target.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {f.type === 'checkbox' && (
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  {(f.options || []).map((opt, oIdx) => {
                    const selectedValues: string[] = Array.isArray(formData[f.id]) ? formData[f.id] : [];
                    const isChecked = selectedValues.includes(opt.value);

                    return (
                      <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={isChecked}
                          onChange={(e) => handleCheckboxChange(f.id, opt.value, e.target.checked)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {f.type === 'select' && (
                <select
                  value={formData[f.id] || ''}
                  onChange={(e) => handleInputChange(f.id, e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Select option...</option>
                  {(f.options || []).map((opt, oIdx) => (
                    <option key={oIdx} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {f.type === 'linear_scale' && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.validation?.minLabel || 'Low'}</span>
                  {Array.from({ length: (f.validation?.max || 5) - (f.validation?.min ?? 1) + 1 }, (_, i) => (f.validation?.min ?? 1) + i).map((num) => {
                    const currentVal = formData[f.id] !== undefined && formData[f.id] !== null ? Number(formData[f.id]) : undefined;
                    return (
                      <label key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                        <span style={{ fontSize: '0.8rem' }}>{num}</span>
                        <input
                          type="radio"
                          name={`edit_scale_${f.id}`}
                          value={num}
                          checked={currentVal === num}
                          onChange={() => handleInputChange(f.id, num)}
                        />
                      </label>
                    );
                  })}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{f.validation?.maxLabel || 'High'}</span>
                </div>
              )}

              {f.type === 'rating' && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const currentRating = Number(formData[f.id]) || 0;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleInputChange(f.id, star)}
                        style={{ background: 'transparent', padding: 0 }}
                      >
                        <Star
                          size={24}
                          color="var(--accent-amber)"
                          fill={star <= currentRating ? 'var(--accent-amber)' : 'transparent'}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Controls */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-card)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Edits will be signed and logged to cryptographic version history.
          </span>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveChanges} disabled={isSaving}>
              <Save size={16} />
              <span>{isSaving ? 'Saving Edits...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

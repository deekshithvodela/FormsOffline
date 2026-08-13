import React, { useState, useRef, useEffect } from 'react';
import { X, Save, Trash2, Upload, FileText, Camera, Edit3, MapPin, Star, Plus } from 'lucide-react';
import { FormSubmission, FormTemplate, FormField, AllowedFileType } from '../../core/types';
import { db } from '../../db/database';
import { createProvenanceEntry } from '../../core/merge/mergeEngine';
import { CameraCaptureModal } from '../components/CameraCaptureModal';
import { MediaPreviewModal, MediaPreviewItem } from '../components/MediaPreviewModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  useBodyScrollLock(isOpen);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCameraFieldId, setActiveCameraFieldId] = useState<string | null>(null);
  const [retakePhotoIndex, setRetakePhotoIndex] = useState<number | null>(null);
  const [previewMediaItem, setPreviewMediaItem] = useState<MediaPreviewItem | null>(null);
  const [previewGallery, setPreviewGallery] = useState<MediaPreviewItem[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState<number>(0);

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
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
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

  const getAcceptString = (allowedTypes?: AllowedFileType[]): string | undefined => {
    if (!allowedTypes || allowedTypes.length === 0) return undefined;
    const mimeMap: Record<AllowedFileType, string> = {
      document: '.doc,.docx,.txt,.rtf,.pdf',
      spreadsheet: '.xls,.xlsx,.csv',
      presentation: '.ppt,.pptx',
      drawing: 'image/*',
      image: 'image/*',
      pdf: '.pdf',
      audio: 'audio/*',
      video: 'video/*',
      archive: '.zip,.rar,.7z,.tar,.gz'
    };
    return allowedTypes.map((t) => mimeMap[t]).join(',');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: FormField) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSizeBytes = (field.validation?.maxFileSizeMB || 10) * 1024 * 1024;
    const maxCount = field.validation?.maxFileCount || 1;

    const currentUploaded = Array.isArray(formData[field.id])
      ? formData[field.id]
      : formData[field.id]
      ? [formData[field.id]]
      : [];

    const newFilePromises: Promise<any>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > maxSizeBytes) {
        setErrorMsg(`File "${file.name}" exceeds maximum allowed size of ${field.validation?.maxFileSizeMB || 10} MB.`);
        return;
      }

      newFilePromises.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              data: evt.target?.result as string
            });
          };
          reader.readAsDataURL(file);
        })
      );
    }

    Promise.all(newFilePromises).then((uploadedObjects) => {
      let combined = [...currentUploaded, ...uploadedObjects];
      if (combined.length > maxCount) {
        combined = combined.slice(0, maxCount);
      }
      handleInputChange(field.id, maxCount === 1 ? combined[0] : combined);
    });
  };

  const removeUploadedFile = (fieldId: string, indexToRemove: number) => {
    const current = formData[fieldId];
    if (Array.isArray(current)) {
      const updated = current.filter((_, idx) => idx !== indexToRemove);
      handleInputChange(fieldId, updated.length > 0 ? updated : null);
    } else {
      handleInputChange(fieldId, null);
    }
  };

  const isMobileDevice = () =>
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse) and (max-width: 768px)').matches);

  const handleTriggerCamera = (fieldId: string, targetIndex?: number | null) => {
    setRetakePhotoIndex(targetIndex !== undefined ? targetIndex : null);
    if (isMobileDevice()) {
      const fileInput = document.getElementById(`edit_camera_input_${fieldId}`) as HTMLInputElement | null;
      fileInput?.click();
    } else {
      setActiveCameraFieldId(fieldId);
    }
  };

  const handleCameraModalCapture = (photo: { name: string; type: string; size: number; data: string }) => {
    if (activeCameraFieldId) {
      const currentVal = formData[activeCameraFieldId];
      const currentPhotos: any[] = Array.isArray(currentVal) ? [...currentVal] : (currentVal ? [currentVal] : []);
      const newPhoto = {
        name: photo.name,
        type: photo.type,
        size: photo.size,
        data: photo.data,
        capturedAt: new Date().toISOString()
      };

      let updated: any[];
      if (retakePhotoIndex !== null && retakePhotoIndex >= 0 && retakePhotoIndex < currentPhotos.length) {
        updated = [...currentPhotos];
        updated[retakePhotoIndex] = newPhoto;
      } else {
        updated = [...currentPhotos, newPhoto];
      }

      handleInputChange(activeCameraFieldId, updated);
      setActiveCameraFieldId(null);
      setRetakePhotoIndex(null);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const now = new Date();
      const currentVal = formData[fieldId];
      const currentPhotos: any[] = Array.isArray(currentVal) ? [...currentVal] : (currentVal ? [currentVal] : []);
      const photoObj = {
        name: file.name || `Photo_${now.toISOString().slice(0, 10)}.jpg`,
        type: file.type || 'image/jpeg',
        size: file.size,
        data: evt.target?.result as string,
        capturedAt: now.toISOString()
      };

      let updated: any[];
      if (retakePhotoIndex !== null && retakePhotoIndex >= 0 && retakePhotoIndex < currentPhotos.length) {
        updated = [...currentPhotos];
        updated[retakePhotoIndex] = photoObj;
      } else {
        updated = [...currentPhotos, photoObj];
      }

      handleInputChange(fieldId, updated);
      setRetakePhotoIndex(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const profiles = await db.userProfile.toArray();
      const activeProf = profiles[0];
      const alias = activeProf?.alias || 'Operator 1';
      const device = activeProf?.deviceId || submission.deviceId || 'local_device';

      // Compute field-level before/after diffs
      const changedFields: string[] = [];
      const previousValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      const formatValueForDiff = (val: any, fieldType?: string): string => {
        if (val === undefined || val === null || val === '') return '[empty]';
        if (fieldType === 'signature' || (typeof val === 'string' && val.startsWith('data:image/'))) {
          return '[Digital Signature]';
        }
        if (fieldType === 'camera_photo' || (Array.isArray(val) && val[0]?.data?.startsWith('data:image/'))) {
          const count = Array.isArray(val) ? val.length : 1;
          return `[${count} Camera Photo${count > 1 ? 's' : ''}]`;
        }
        if (fieldType === 'file_upload' || (Array.isArray(val) && val[0]?.name)) {
          if (Array.isArray(val)) {
            return `[${val.length} File(s): ${val.map((f: any) => f.name || 'file').slice(0, 3).join(', ')}${val.length > 3 ? '...' : ''}]`;
          }
          return `[File: ${val.name || 'attachment'}]`;
        }
        if (Array.isArray(val)) {
          return val.join(', ');
        }
        if (typeof val === 'object') {
          if (val.name) return `[File: ${val.name}]`;
          return JSON.stringify(val);
        }
        const str = String(val);
        if (str.startsWith('data:')) {
          return '[Binary Attachment]';
        }
        return str.length > 80 ? `"${str.substring(0, 80)}..."` : `"${str}"`;
      };

      const diffSummaries: string[] = [];

      allFields.forEach((f) => {
        const oldVal = submission.data[f.id];
        const newVal = formData[f.id];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changedFields.push(f.label || f.id);
          previousValues[f.label || f.id] = oldVal;
          newValues[f.label || f.id] = newVal;
          const oldDisplay = formatValueForDiff(oldVal, f.type);
          const newDisplay = formatValueForDiff(newVal, f.type);
          diffSummaries.push(`${f.label || f.id}: ${oldDisplay} → ${newDisplay}`);
        }
      });

      // Generate new SHA-256 cryptographic provenance entry for this edit with full diffs
      const newEditProv = await createProvenanceEntry(
        device,
        'updated',
        formData,
        alias,
        {
          changedFields,
          previousValues,
          newValues,
          diffSummary: diffSummaries.join('; ')
        }
      );
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
      padding: '1rem',
      overscrollBehavior: 'contain',
      touchAction: 'none'
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

              {f.type === 'file_upload' && (
                <div>
                  {(() => {
                    const currentFiles = Array.isArray(formData[f.id])
                      ? formData[f.id]
                      : formData[f.id]
                      ? [formData[f.id]]
                      : [];

                    return (
                      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {currentFiles.map((fileObj: any, idx: number) => {
                          const fileName = typeof fileObj === 'object' && fileObj?.name ? fileObj.name : `Attached File ${idx + 1}`;
                          const fileSizeStr = typeof fileObj === 'object' && fileObj?.size ? `${(fileObj.size / 1024).toFixed(1)} KB` : '';
                          const fileData = typeof fileObj === 'object' && fileObj?.data ? fileObj.data : (typeof fileObj === 'string' ? fileObj : '#');

                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                padding: '0.4rem 0.75rem',
                                borderRadius: 'var(--radius-sm)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                                <FileText size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                                <a
                                  href={fileData}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={fileName}
                                  title={fileName}
                                  style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--primary)',
                                    fontWeight: 500,
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '220px',
                                    display: 'inline-block',
                                    verticalAlign: 'middle'
                                  }}
                                >
                                  {fileName}
                                </a>
                                {fileSizeStr && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>({fileSizeStr})</span>
                                )}
                              </div>

                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => removeUploadedFile(f.id, idx)}
                                style={{ padding: '0.2rem 0.4rem', color: 'var(--accent-rose)', border: 'none', flexShrink: 0 }}
                                title="Remove File"
                                aria-label={`Remove file ${fileName}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label
                      htmlFor={`edit_file_upload_${f.id}`}
                      className="btn btn-outline"
                      style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                      <Upload size={14} color="var(--primary)" />
                      <span>Upload Additional File</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Max {f.validation?.maxFileSizeMB || 10} MB (Limit: {f.validation?.maxFileCount || 1})
                    </span>
                    <input
                      id={`edit_file_upload_${f.id}`}
                      type="file"
                      accept={getAcceptString(f.validation?.allowedFileTypes)}
                      multiple={(f.validation?.maxFileCount || 1) > 1}
                      onChange={(e) => handleFileUpload(e, f)}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
              )}

              {/* Camera Photo Capture Field Editor */}
              {f.type === 'camera_photo' && (() => {
                const currentVal = formData[f.id];
                const currentPhotos: any[] = Array.isArray(currentVal) ? currentVal : (currentVal ? [currentVal] : []);
                const maxPhotos = f.validation?.maxFileCount || 5;

                return (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleCameraCapture(e, f.id)}
                      style={{ display: 'none' }}
                      id={`edit_camera_input_${f.id}`}
                    />
                    
                    {currentPhotos.length === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleTriggerCamera(f.id)}
                          className="btn btn-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                        >
                          <Camera size={16} />
                          <span>Capture Form Photo</span>
                        </button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Attach physical form copy image (Limit: {maxPhotos} {maxPhotos === 1 ? 'photo' : 'photos / pages'})
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {currentPhotos.map((photo, pIdx) => (
                          <div
                            key={pIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.85rem',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              padding: '0.5rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              minWidth: 0,
                              maxWidth: '100%'
                            }}
                          >
                            {photo.data && (
                              <img
                                src={photo.data}
                                alt={`Page ${pIdx + 1}`}
                                style={{ width: '60px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', flexShrink: 0 }}
                                onClick={() => {
                                  const gallery: MediaPreviewItem[] = currentPhotos.map((p, idx) => ({
                                    title: `${f.label || 'Physical Form Photo'} — Page ${idx + 1}`,
                                    fileName: p.name,
                                    type: p.type,
                                    size: p.size,
                                    dataUrl: p.data,
                                    capturedAt: p.capturedAt ? new Date(p.capturedAt).toLocaleString() : undefined
                                  }));
                                  setPreviewMediaItem(gallery[pIdx]);
                                  setPreviewGallery(gallery);
                                  setPreviewInitialIndex(pIdx);
                                }}
                                title="Click to view full photo in lightbox"
                              />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span className="badge badge-purple" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                                  {pIdx === 0 ? 'Page 1 (Front)' : pIdx === 1 ? 'Page 2 (Back)' : `Page ${pIdx + 1}`}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: '0.84rem',
                                    color: 'var(--text-primary)',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '220px',
                                    display: 'inline-block',
                                    verticalAlign: 'middle',
                                    cursor: 'pointer'
                                  }}
                                  title={photo.name || `Physical Form Photo Page ${pIdx + 1}`}
                                  onClick={() => {
                                    const gallery: MediaPreviewItem[] = currentPhotos.map((p, idx) => ({
                                      title: `${f.label || 'Physical Form Photo'} — Page ${idx + 1}`,
                                      fileName: p.name,
                                      type: p.type,
                                      size: p.size,
                                      dataUrl: p.data,
                                      capturedAt: p.capturedAt ? new Date(p.capturedAt).toLocaleString() : undefined
                                    }));
                                    setPreviewMediaItem(gallery[pIdx]);
                                    setPreviewGallery(gallery);
                                    setPreviewInitialIndex(pIdx);
                                  }}
                                >
                                  {photo.name || `Physical Form Photo Page ${pIdx + 1}`}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {photo.size ? `${(photo.size / 1024).toFixed(1)} KB` : 'Attached'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => handleTriggerCamera(f.id, pIdx)}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                title="Retake this page"
                              >
                                <Camera size={12} /> Retake
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                  const updated = currentPhotos.filter((_, idx) => idx !== pIdx);
                                  handleInputChange(f.id, updated.length > 0 ? updated : null);
                                }}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--accent-rose)' }}
                                title="Remove this page"
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* + Add Another Page Button */}
                        {currentPhotos.length < maxPhotos && (
                          <div style={{ marginTop: '0.2rem' }}>
                            <button
                              type="button"
                              onClick={() => handleTriggerCamera(f.id, null)}
                              className="btn btn-outline"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', padding: '0.35rem 0.7rem' }}
                            >
                              <Plus size={13} color="var(--primary)" />
                              <span>Capture Another Page ({currentPhotos.length + 1} of {maxPhotos})</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
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

      {/* Desktop Multi-Camera Live Viewfinder Modal */}
      <CameraCaptureModal
        isOpen={!!activeCameraFieldId}
        onClose={() => setActiveCameraFieldId(null)}
        onCapture={handleCameraModalCapture}
        title="Capture Physical Form Photo"
      />

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

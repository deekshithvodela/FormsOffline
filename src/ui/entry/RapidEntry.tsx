import React, { useState, useEffect, useRef } from 'react';
import { Save, ArrowRight, ArrowLeft, CheckCircle, Clock, AlertTriangle, Star, MapPin, Trash2, Folder, Database, FileText } from 'lucide-react';
import { FormSubmission, FormTemplate, UserProfile } from '../../core/types';
import { db } from '../../db/database';
import { getNextSectionId } from '../../core/branching/evaluator';
import { createProvenanceEntry } from '../../core/merge/mergeEngine';
import { TemplateGalleryModal } from '../components/TemplateGalleryModal';

interface RapidEntryProps {
  activeTemplate?: FormTemplate | null;
  onNavigateToCMS?: (template: FormTemplate) => void;
  onNavigateToDashboard?: () => void;
}

export const RapidEntry: React.FC<RapidEntryProps> = ({
  activeTemplate,
  onNavigateToCMS,
  onNavigateToDashboard
}) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(activeTemplate || null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [isCompleted, setIsCompleted] = useState(false);
  const [operatorProfile, setOperatorProfile] = useState<UserProfile | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    db.templates.toArray().then((tpls) => {
      setTemplates(tpls);
      setIsLoading(false);
    });

    db.userProfile.toArray().then((profiles) => {
      if (profiles.length > 0) {
        setOperatorProfile(profiles[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (activeTemplate) {
      setSelectedTemplate(activeTemplate);
      resetForm();
    }
  }, [activeTemplate]);

  // 300ms Debounced Autosave & beforeunload listener
  useEffect(() => {
    if (!selectedTemplate || isCompleted) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'dirty') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    if (saveStatus === 'dirty') {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 300);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [formData, saveStatus, selectedTemplate, isCompleted]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDraft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, selectedTemplate]);

  const handleInputChange = (fieldId: string, val: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: val }));
    setSaveStatus('dirty');
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
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

  const saveDraft = async () => {
    if (!selectedTemplate) return;
    setSaveStatus('saving');

    try {
      const submissionId = `sub_${selectedTemplate.id}_draft`;
      const profiles = await db.userProfile.toArray();
      const currentProf = profiles[0] || operatorProfile;
      const alias = currentProf?.alias || 'Operator 1';
      const device = currentProf?.deviceId || 'local_device';

      const provenance = [
        await createProvenanceEntry(device, 'updated', formData, alias)
      ];

      const draft: FormSubmission = {
        id: submissionId,
        templateId: selectedTemplate.id,
        templateFingerprint: selectedTemplate.canonicalFingerprint,
        templateVersion: selectedTemplate.version,
        status: 'draft',
        data: formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deviceId: device,
        provenance
      };

      await db.submissions.put(draft);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Autosave failed:', err);
    }
  };

  const handleDiscardDraftConfirmed = async () => {
    if (!selectedTemplate) return;
    try {
      const draftId = `sub_${selectedTemplate.id}_draft`;
      await db.submissions.delete(draftId);
      resetForm();
      setIsDiscardConfirmOpen(false);
    } catch (err) {
      console.error('Failed to discard draft:', err);
    }
  };

  const handleNextSection = () => {
    if (!selectedTemplate) return;
    const currentSec = selectedTemplate.sections[activeSectionIndex];

    // Validate required fields in the active section across all question categories
    const errors: Record<string, string> = {};
    for (const f of currentSec.fields) {
      if (f.type === 'title_block') continue;
      const isReq = f.required || f.validation?.required;
      if (isReq) {
        const val = formData[f.id];
        let isEmpty = false;

        if (val === undefined || val === null) {
          isEmpty = true;
        } else if (typeof val === 'string' && val.trim() === '') {
          isEmpty = true;
        } else if (Array.isArray(val) && val.length === 0) {
          isEmpty = true;
        } else if (f.type === 'rating' && Number(val) <= 0) {
          isEmpty = true;
        } else if (f.type === 'number' && (val === '' || isNaN(Number(val)))) {
          isEmpty = true;
        }

        if (isEmpty) {
          errors[f.id] = 'This is a required question';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstErrId = Object.keys(errors)[0];
      const el = document.getElementById(`field-card-${firstErrId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setValidationErrors({});
    const target = getNextSectionId(currentSec, selectedTemplate.sections, formData);

    if (target === 'SUBMIT') {
      handleSubmitFinal();
    } else {
      const nextIdx = selectedTemplate.sections.findIndex((s) => s.id === target);
      if (nextIdx !== -1) {
        setActiveSectionIndex(nextIdx);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        handleSubmitFinal();
      }
    }
  };

  const handleSubmitFinal = async () => {
    if (!selectedTemplate) return;
    setSaveStatus('saving');

    try {
      // Clean up / purge draft record so draft duplicate does not linger in IndexedDB
      const draftId = `sub_${selectedTemplate.id}_draft`;
      await db.submissions.delete(draftId);

      const finalId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const profiles = await db.userProfile.toArray();
      const currentProf = profiles[0] || operatorProfile;
      const alias = currentProf?.alias || 'Operator 1';
      const device = currentProf?.deviceId || 'local_device';

      const provenance = [
        await createProvenanceEntry(device, 'created', formData, alias)
      ];

      const submission: FormSubmission = {
        id: finalId,
        templateId: selectedTemplate.id,
        templateFingerprint: selectedTemplate.canonicalFingerprint,
        templateVersion: selectedTemplate.version,
        status: 'completed',
        data: formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deviceId: device,
        provenance
      };

      await db.submissions.put(submission);
      setIsCompleted(true);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Final submit failed:', err);
    }
  };

  const resetForm = () => {
    setFormData({});
    setActiveSectionIndex(0);
    setIsCompleted(false);
    setSaveStatus('saved');
  };

  if (isLoading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
        Loading form templates...
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <AlertTriangle size={48} color="var(--accent-amber)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Saved Templates Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please go to the <strong>Form Builder</strong> tab to create and save a form template first.
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
            <FileText size={32} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No Form Selected for Rapid Entry
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Select a form template from your local offline library to start capturing high-speed data responses.
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
          onSelectTemplate={(tpl) => {
            setSelectedTemplate(tpl);
            resetForm();
          }}
          activeTemplateId={(selectedTemplate as FormTemplate | null)?.id}
        />
      </div>
    );
  }

  const currentSection = selectedTemplate.sections[activeSectionIndex];

  return (
    <div>
      {/* Template Header Toolbar */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {onNavigateToDashboard && (
            <button className="btn btn-outline" onClick={onNavigateToDashboard} title="Back to All Forms Dashboard">
              <Folder size={18} color="var(--primary)" />
              <span>All Forms</span>
            </button>
          )}

          <button className="btn btn-outline" onClick={() => setIsGalleryOpen(true)}>
            <span>Switch Form</span>
          </button>

          {selectedTemplate && (
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Active Form</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{selectedTemplate.title} (v{selectedTemplate.version})</strong>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {selectedTemplate && onNavigateToCMS && (
            <button
              className="btn btn-secondary"
              onClick={() => onNavigateToCMS(selectedTemplate)}
              title="View Dataset Records in CMS"
            >
              <Database size={16} />
              <span>View Records in CMS</span>
            </button>
          )}

          {saveStatus === 'saved' && (
            <span className="badge badge-green">
              <CheckCircle size={14} style={{ marginRight: '0.3rem' }} /> Autosaved
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="badge badge-purple">
              <Clock size={14} style={{ marginRight: '0.3rem' }} /> Saving...
            </span>
          )}
          {saveStatus === 'dirty' && (
            <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
              Unsaved Changes
            </span>
          )}

          <button className="btn btn-outline" onClick={saveDraft} title="Ctrl + S">
            <Save size={16} />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Safety Confirmation Modal: Discard Draft */}
      {isDiscardConfirmOpen && (
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
                Discard Current Draft?
              </h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Are you sure you want to discard your unsaved responses? Any data entered so far will be permanently cleared.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsDiscardConfirmOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDiscardDraftConfirmed}
                style={{ backgroundColor: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
              >
                Discard Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Gallery File Manager Modal */}
      <TemplateGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onSelectTemplate={(tpl) => {
          setSelectedTemplate(tpl);
          resetForm();
        }}
        activeTemplateId={selectedTemplate?.id}
      />

      {isCompleted ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <CheckCircle size={54} color="var(--accent-green)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Submission Saved Successfully</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {selectedTemplate?.settings?.confirmationMessage || 'Record has been stored securely in your browser\'s IndexedDB.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={resetForm}>
              Enter Another Record
            </button>
            {selectedTemplate && onNavigateToCMS && (
              <button className="btn btn-secondary" onClick={() => onNavigateToCMS(selectedTemplate)}>
                <Database size={16} />
                <span>View All Records in CMS</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Progress Indicator */}
          {selectedTemplate && (selectedTemplate.settings?.showProgressBar ?? true) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                <span>Section {activeSectionIndex + 1} of {selectedTemplate.sections.length}</span>
                <span>{Math.round(((activeSectionIndex + 1) / selectedTemplate.sections.length) * 100)}% Completed</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-card-hover)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((activeSectionIndex + 1) / selectedTemplate.sections.length) * 100}%`, backgroundColor: 'var(--primary)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {/* Active Section Form */}
          {currentSection && (
            <div className="card">
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                {currentSection.title}
              </h2>
              {currentSection.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {currentSection.description}
                </p>
              )}

              <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
                {currentSection.fields.map((f) => {
                  const hasError = !!validationErrors[f.id];
                  const isReq = f.required || f.validation?.required;

                  return (
                    <div
                      key={f.id}
                      id={`field-card-${f.id}`}
                      className="rapid-entry-field-card"
                      style={{
                        background: 'var(--bg-input)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        boxSizing: 'border-box',
                        maxWidth: '100%',
                        border: hasError ? '1.5px solid var(--accent-rose)' : '1px solid var(--border-color)',
                        transition: 'border-color 0.2s ease'
                      }}
                    >
                      {f.type === 'title_block' ? (
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.label}</h3>
                          {f.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{f.description}</p>}
                        </div>
                      ) : (
                        <>
                          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.6rem' }}>
                            {f.label} {isReq && <span style={{ color: 'var(--accent-rose)' }}>*</span>}
                          </label>
                          {f.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>{f.description}</p>}

                        {f.imageUrl && (
                          <div style={{ marginBottom: '0.8rem' }}>
                            <img src={f.imageUrl} alt={f.label} style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 'var(--radius-sm)' }} />
                          </div>
                        )}

                        {f.type === 'text' && (
                          <input
                            type="text"
                            value={formData[f.id] || ''}
                            onChange={(e) => handleInputChange(f.id, e.target.value)}
                            placeholder="Type answer..."
                            style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                          />
                        )}

                        {f.type === 'textarea' && (
                          <textarea
                            value={formData[f.id] || ''}
                            onChange={(e) => handleInputChange(f.id, e.target.value)}
                            placeholder="Type answer..."
                            style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', minHeight: '90px' }}
                          />
                        )}

                        {f.type === 'number' && (
                          <input
                            type="number"
                            value={formData[f.id] || ''}
                            onChange={(e) => handleInputChange(f.id, e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                          />
                        )}

                        {f.type === 'date' && (
                          <input
                            type="date"
                            value={formData[f.id] || ''}
                            onChange={(e) => handleInputChange(f.id, e.target.value)}
                            style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                          />
                        )}

                        {f.type === 'time' && (
                          <input
                            type="time"
                            value={formData[f.id] || ''}
                            onChange={(e) => handleInputChange(f.id, e.target.value)}
                            style={{ width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}
                          />
                        )}

                        {/* Privacy-Preserving Location Field */}
                        {(f.type === 'location' || f.type === 'geo') && (
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <MapPin size={22} color="var(--primary)" />
                            <input
                              type="text"
                              value={formData[f.id] || ''}
                              onChange={(e) => handleInputChange(f.id, e.target.value)}
                              placeholder="Enter Region / City / District..."
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}

                        {/* Digital Signature Canvas Widget */}
                        {f.type === 'signature' && (
                          <div>
                            <div style={{ position: 'relative', background: '#0f172a', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                              <canvas
                                ref={canvasRef}
                                width={500}
                                height={150}
                                onMouseDown={(e) => startDrawing(e)}
                                onMouseMove={(e) => draw(e)}
                                onMouseUp={() => stopDrawing(f.id)}
                                onMouseLeave={() => stopDrawing(f.id)}
                                onTouchStart={(e) => startDrawing(e)}
                                onTouchMove={(e) => draw(e)}
                                onTouchEnd={() => stopDrawing(f.id)}
                                style={{ cursor: 'crosshair', width: '100%', height: '150px', touchAction: 'none' }}
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Draw signature above</span>
                              <button
                                className="btn btn-outline"
                                onClick={() => clearSignature(f.id)}
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', color: 'var(--accent-rose)' }}
                              >
                                <Trash2 size={14} /> Clear
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Radio Options Rendering */}
                        {f.type === 'radio' && (
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {(f.options || []).map((opt, oIdx) => (
                              <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`entry_${f.id}`}
                                  value={opt.value}
                                  checked={formData[f.id] === opt.value}
                                  onChange={(e) => handleInputChange(f.id, e.target.value)}
                                />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Checkbox & Multiselect Options Rendering */}
                        {(f.type === 'checkbox' || f.type === 'multiselect') && (
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {(f.options || []).map((opt, oIdx) => {
                              const selectedValues: string[] = Array.isArray(formData[f.id]) ? formData[f.id] : [];
                              const isChecked = selectedValues.includes(opt.value);

                              return (
                                <label key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
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

                        {/* Dropdown Options Rendering */}
                        {f.type === 'select' && (
                          <select
                            value={formData[f.id] || ''}
                            onChange={(e) => handleInputChange(f.id, e.target.value)}
                            style={{ width: '100%' }}
                          >
                            <option value="">Select an option...</option>
                            {(f.options || []).map((opt, oIdx) => (
                              <option key={oIdx} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Customizable Linear Scale (0 - 10) */}
                        {f.type === 'linear_scale' && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div className="linear-scale-container" style={{ marginTop: '0.4rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{f.validation?.minLabel || 'Low'}</span>
                              {Array.from({ length: (f.validation?.max || 5) - (f.validation?.min ?? 1) + 1 }, (_, i) => (f.validation?.min ?? 1) + i).map((num) => {
                                const currentVal = formData[f.id] !== undefined && formData[f.id] !== null ? Number(formData[f.id]) : undefined;
                                return (
                                  <label key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                    <span style={{ fontSize: '0.85rem' }}>{num}</span>
                                    <input
                                      type="radio"
                                      name={`entry_scale_${f.id}`}
                                      value={num}
                                      checked={currentVal === num}
                                      onChange={() => handleInputChange(f.id, num)}
                                    />
                                  </label>
                                );
                              })}
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{f.validation?.maxLabel || 'High'}</span>
                            </div>
                          </div>
                        )}

                        {/* Star Rating */}
                        {f.type === 'rating' && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
                                    size={28}
                                    color="var(--accent-amber)"
                                    fill={star <= currentRating ? 'var(--accent-amber)' : 'transparent'}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {hasError && (
                          <span style={{ color: 'var(--accent-rose)', fontSize: '0.82rem', marginTop: '0.5rem', display: 'block', fontWeight: 600 }}>
                            This is a required question
                          </span>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              </div>

              {/* Navigation Stepper Controls (Google Forms Style Bottom Bar) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {activeSectionIndex > 0 && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setActiveSectionIndex(activeSectionIndex - 1)}
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>
                  )}

                  <button className="btn btn-primary btn-sm" onClick={handleNextSection}>
                    <span>
                      {activeSectionIndex === (selectedTemplate?.sections.length || 1) - 1
                        ? 'Submit Record'
                        : 'Next Section'}
                    </span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {/* Google Forms Style Clear Form Button */}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsDiscardConfirmOpen(true)}
                  style={{ fontWeight: 600 }}
                >
                  Clear form
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

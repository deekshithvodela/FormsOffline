import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Save, Eye, Layers, Hash, Copy, GripVertical, Star, Circle, CheckSquare, List, X, MoreVertical, MapPin, Edit3, ArrowUpRight, Image, Type, ArrowUp, ArrowDown, Settings, Move, RotateCcw, Upload, Camera, Check } from 'lucide-react';
import { FormField, FormSection, FormTemplate, FieldType, FieldOption, FormTemplateSettings, UserProfile, AllowedFileType } from '../../core/types';
import { db } from '../../db/database';
import { generateTemplateFingerprint } from '../../core/fingerprint/templateHasher';
import { getNextSectionId } from '../../core/branching/evaluator';
import { SaveTemplateModal } from '../components/SaveTemplateModal';
import { ResetCanvasModal } from '../components/ResetCanvasModal';
import { LongPressTooltip } from '../components/LongPressTooltip';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface FormBuilderProps {
  initialTemplate?: FormTemplate | null;
}

const getInitialFormState = (template?: FormTemplate | null) => {
  const defaultSecId = `sec_${Date.now()}_1`;
  return {
    title: template ? `Copy of ${template.title}` : 'Untitled Offline Form',
    description: template?.description || 'Digitize physical paper forms with zero backend dependency.',
    settings: template?.settings || {
      e2eeEnabled: false,
      allowDraftRecovery: true,
      showProgressBar: true,
      shuffleQuestions: false,
      confirmationMessage: 'Thank you! Your offline record has been saved securely.'
    },
    sections: template?.sections || [
      {
        id: defaultSecId,
        title: 'Section 1',
        description: '',
        fields: [
          {
            id: `f_${Date.now()}_1`,
            type: 'text',
            label: 'Untitled Question',
            placeholder: 'Enter response...',
            required: false
          }
        ],
        branchingRules: []
      }
    ],
    activeSectionId: template?.sections[0]?.id || defaultSecId
  };
};

export const FormBuilder: React.FC<FormBuilderProps> = ({ initialTemplate }) => {
  const initialState = getInitialFormState(initialTemplate);

  const [title, setTitle] = useState(initialState.title);
  const [description, setDescription] = useState(initialState.description);
  const [settings, setSettings] = useState<FormTemplateSettings>(initialState.settings);
  const [sections, setSections] = useState<FormSection[]>(initialState.sections);
  const [activeSectionId, setActiveSectionId] = useState<string>(initialState.activeSectionId);

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [openMenuFieldId, setOpenMenuFieldId] = useState<string | null>(null);
  const builderCanvasRef = useRef<HTMLDivElement | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [previewSectionIndex, setPreviewSectionIndex] = useState(0);
  const [previewFormData, setPreviewFormData] = useState<Record<string, any>>({});
  const [isSectionReorderOpen, setIsSectionReorderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Lock body scroll when settings or section reorder modals are open
  useBodyScrollLock(isSettingsOpen || isSectionReorderOpen);

  // Synchronize state whenever initialTemplate changes or when switching forms
  useEffect(() => {
    const freshState = getInitialFormState(initialTemplate);
    setTitle(freshState.title);
    setDescription(freshState.description);
    setSettings(freshState.settings);
    setSections(freshState.sections);
    setActiveSectionId(freshState.activeSectionId);
    setActiveFieldId(null);
  }, [initialTemplate]);

  const handleResetCanvas = () => {
    const cleanState = getInitialFormState(null);
    setTitle(cleanState.title);
    setDescription(cleanState.description);
    setSettings(cleanState.settings);
    setSections(cleanState.sections);
    setActiveSectionId(cleanState.activeSectionId);
    setActiveFieldId(null);
    setIsResetModalOpen(false);
    setNotification('Builder canvas reset to clean template!');
    setTimeout(() => setNotification(null), 3000);
  };

  // Drag and Drop state (Questions Canvas)
  const [draggedItem, setDraggedItem] = useState<{ sectionId: string; fieldId: string; fieldIndex: number } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ sectionId: string; fieldId?: string; dropPosition?: 'before' | 'after' } | null>(null);

  // Section Reorder Modal Drag & Drop state (Isolated exclusively to Reorder Sections Modal)
  const [modalDraggedSectionIdx, setModalDraggedSectionIdx] = useState<number | null>(null);
  const [modalDragOverSectionIdx, setModalDragOverSectionIdx] = useState<number | null>(null);
  const [modalSectionDropPos, setModalSectionDropPos] = useState<'before' | 'after'>('before');
  const [modalTouchStartIdx, setModalTouchStartIdx] = useState<number | null>(null);
  const sectionModalListRef = useRef<HTMLDivElement>(null);

  const optionInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addSection = () => {
    const newSecId = `sec_${Date.now()}_${sections.length + 1}`;
    const newSec: FormSection = {
      id: newSecId,
      title: `Section ${sections.length + 1}`,
      description: '',
      fields: [],
      branchingRules: []
    };
    setSections([...sections, newSec]);
    setActiveSectionId(newSecId);
    setActiveFieldId(null);
  };

  const removeSection = (secId: string) => {
    if (sections.length <= 1) return;
    const filtered = sections.filter((s) => s.id !== secId);
    setSections(filtered);
    if (activeSectionId === secId && filtered.length > 0) {
      setActiveSectionId(filtered[0].id);
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSections(updated);
  };

  const reorderSectionModal = (srcIdx: number, targetIdx: number, dropPos: 'before' | 'after') => {
    if (srcIdx === targetIdx) return;
    setSections((prev) => {
      const updated = [...prev];
      const [movedSec] = updated.splice(srcIdx, 1);
      let insertIdx = targetIdx;
      if (srcIdx < targetIdx) {
        insertIdx = dropPos === 'after' ? targetIdx : targetIdx - 1;
      } else {
        insertIdx = dropPos === 'after' ? targetIdx + 1 : targetIdx;
      }
      insertIdx = Math.max(0, Math.min(updated.length, insertIdx));
      updated.splice(insertIdx, 0, movedSec);
      return updated;
    });
  };

  const handleModalSectionDragStart = (e: React.DragEvent, idx: number) => {
    e.stopPropagation();
    setModalDraggedSectionIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleModalSectionDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const pos: 'before' | 'after' = e.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
    setModalDragOverSectionIdx(idx);
    setModalSectionDropPos(pos);
  };

  const handleModalSectionDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (modalDraggedSectionIdx !== null) {
      reorderSectionModal(modalDraggedSectionIdx, targetIdx, modalSectionDropPos);
    }
    setModalDraggedSectionIdx(null);
    setModalDragOverSectionIdx(null);
  };

  const handleModalSectionDragEnd = () => {
    setModalDraggedSectionIdx(null);
    setModalDragOverSectionIdx(null);
  };

  const handleModalSectionTouchStart = (idx: number) => {
    setModalTouchStartIdx(idx);
    setModalDraggedSectionIdx(idx);
  };

  const handleModalSectionTouchMove = (e: React.TouchEvent) => {
    if (modalTouchStartIdx === null || !e.touches[0]) return;
    const touchY = e.touches[0].clientY;
    if (sectionModalListRef.current) {
      const items = Array.from(sectionModalListRef.current.querySelectorAll('.modal-list-item-row'));
      items.forEach((item, idx) => {
        const rect = item.getBoundingClientRect();
        if (touchY >= rect.top && touchY <= rect.bottom) {
          const pos = touchY >= rect.top + rect.height / 2 ? 'after' : 'before';
          setModalDragOverSectionIdx(idx);
          setModalSectionDropPos(pos);
        }
      });
    }
  };

  const handleModalSectionTouchEnd = () => {
    if (modalTouchStartIdx !== null && modalDragOverSectionIdx !== null) {
      reorderSectionModal(modalTouchStartIdx, modalDragOverSectionIdx, modalSectionDropPos);
    }
    setModalTouchStartIdx(null);
    setModalDraggedSectionIdx(null);
    setModalDragOverSectionIdx(null);
  };

  const addFieldToActiveSection = (initialType: FieldType = 'text') => {
    const targetSecId = activeSectionId || (sections.length > 0 ? sections[0].id : '');
    if (!targetSecId) return;

    const newId = `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const defaultOptions: FieldOption[] = ['radio', 'checkbox', 'select', 'multiselect'].includes(initialType)
      ? [
          { label: 'Option 1', value: 'Option 1', targetSectionId: 'NEXT' },
          { label: 'Option 2', value: 'Option 2', targetSectionId: 'NEXT' }
        ]
      : [];

    const newField: FormField = {
      id: newId,
      type: initialType,
      label: initialType === 'title_block' ? 'Title' : 'Untitled Question',
      description: initialType === 'title_block' ? 'Block description text' : '',
      required: false,
      options: defaultOptions,
      validation: initialType === 'linear_scale' ? { required: false, min: 1, max: 5, minLabel: 'Low', maxLabel: 'High' } : { required: false }
    };

    setSections(
      sections.map((s) => (s.id === targetSecId ? { ...s, fields: [...s.fields, newField] } : s))
    );
    setActiveFieldId(newId);
  };

  // Intra-section reorder via Arrow buttons
  const moveQuestion = (secId: string, fieldIndex: number, direction: 'up' | 'down') => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        const targetIdx = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
        if (targetIdx < 0 || targetIdx >= s.fields.length) return s;
        const updatedFields = [...s.fields];
        const temp = updatedFields[fieldIndex];
        updatedFields[fieldIndex] = updatedFields[targetIdx];
        updatedFields[targetIdx] = temp;
        return { ...s, fields: updatedFields };
      })
    );
  };

  const moveQuestionToSection = (srcSecId: string, targetSecId: string, fieldId: string) => {
    if (srcSecId === targetSecId) return;
    setSections((prevSections) => {
      const srcSec = prevSections.find((s) => s.id === srcSecId);
      if (!srcSec) return prevSections;
      const fieldToMove = srcSec.fields.find((f) => f.id === fieldId);
      if (!fieldToMove) return prevSections;

      return prevSections.map((sec) => {
        if (sec.id === srcSecId) {
          return { ...sec, fields: sec.fields.filter((f) => f.id !== fieldId) };
        }
        if (sec.id === targetSecId) {
          return { ...sec, fields: [...sec.fields, fieldToMove] };
        }
        return sec;
      });
    });
    setActiveSectionId(targetSecId);
  };

  // Cross-Section HTML5 Drag and Drop & Touch Reorder handlers
  const handleDragStart = (e: React.DragEvent, sectionId: string, fieldId: string, fieldIndex: number) => {
    e.stopPropagation();
    setDraggedItem({ sectionId, fieldId, fieldIndex });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fieldId);
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string, targetFieldId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    let dropPosition: 'before' | 'after' = 'before';
    if (targetFieldId && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientY >= rect.top + rect.height / 2) {
        dropPosition = 'after';
      }
    }
    setDragOverTarget({ sectionId, fieldId: targetFieldId, dropPosition });
  };

  const executeReorder = (
    srcSecId: string,
    srcFieldId: string,
    targetSecId: string,
    targetFieldId?: string,
    dropPosition: 'before' | 'after' = 'before'
  ) => {
    setSections((prevSections) => {
      const srcSec = prevSections.find((s) => s.id === srcSecId);
      if (!srcSec) return prevSections;
      const fieldToMove = srcSec.fields.find((f) => f.id === srcFieldId);
      if (!fieldToMove) return prevSections;

      const updated = prevSections.map((sec) => {
        if (sec.id === srcSecId) {
          return { ...sec, fields: sec.fields.filter((f) => f.id !== srcFieldId) };
        }
        return sec;
      });

      return updated.map((sec) => {
        if (sec.id === targetSecId) {
          const newFields = [...sec.fields];
          if (targetFieldId) {
            const actualIndex = newFields.findIndex((f) => f.id === targetFieldId);
            if (actualIndex !== -1) {
              const insertIdx = dropPosition === 'after' ? actualIndex + 1 : actualIndex;
              newFields.splice(insertIdx, 0, fieldToMove);
            } else {
              newFields.push(fieldToMove);
            }
          } else {
            newFields.push(fieldToMove);
          }
          return { ...sec, fields: newFields };
        }
        return sec;
      });
    });
  };

  const handleDrop = (e: React.DragEvent, targetSectionId: string, targetFieldId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;
    executeReorder(
      draggedItem.sectionId,
      draggedItem.fieldId,
      targetSectionId,
      targetFieldId,
      dragOverTarget?.dropPosition || 'before'
    );

    setDraggedItem(null);
    setDragOverTarget(null);
  };

  // Touch handlers for mobile touchscreen reordering
  const handleTouchStart = (e: React.TouchEvent, sectionId: string, fieldId: string, fieldIndex: number) => {
    e.stopPropagation();
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40); // 40ms haptic feedback pulse
      }
    } catch (_) {}
    setDraggedItem({ sectionId, fieldId, fieldIndex });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedItem) return;
    if (e.cancelable) {
      e.preventDefault(); // Prevent browser page scrolling during mobile touch-drag
    }
    const touch = e.touches[0];

    // Auto-scroll screen when touch dragging near top/bottom viewport edges
    const viewportHeight = window.innerHeight;
    if (touch.clientY > viewportHeight - 80) {
      window.scrollBy({ top: 12, behavior: 'instant' });
    } else if (touch.clientY < 80) {
      window.scrollBy({ top: -12, behavior: 'instant' });
    }

    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    let found = false;

    for (const element of elements) {
      const cardEl = element.closest('[data-field-id]');
      if (cardEl) {
        const secId = cardEl.getAttribute('data-section-id');
        const fId = cardEl.getAttribute('data-field-id');
        if (secId && fId && fId !== draggedItem.fieldId) {
          const rect = cardEl.getBoundingClientRect();
          const isBottomHalf = touch.clientY >= rect.top + rect.height / 2;
          setDragOverTarget({
            sectionId: secId,
            fieldId: fId,
            dropPosition: isBottomHalf ? 'after' : 'before'
          });
          found = true;
          break;
        }
      }
    }

    if (!found) {
      for (const element of elements) {
        const secEl = element.closest('[data-section-id]');
        if (secEl) {
          const secId = secEl.getAttribute('data-section-id');
          if (secId) {
            setDragOverTarget({ sectionId: secId, dropPosition: 'after' });
            break;
          }
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (draggedItem && dragOverTarget) {
      executeReorder(
        draggedItem.sectionId,
        draggedItem.fieldId,
        dragOverTarget.sectionId,
        dragOverTarget.fieldId,
        dragOverTarget.dropPosition || 'before'
      );
    }
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const duplicateField = (secId: string, field: FormField) => {
    const dupId = `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: FormField = {
      ...field,
      id: dupId,
      label: `${field.label} (Copy)`
    };

    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        const index = s.fields.findIndex((f) => f.id === field.id);
        const updated = [...s.fields];
        updated.splice(index + 1, 0, duplicated);
        return { ...s, fields: updated };
      })
    );
    setActiveFieldId(dupId);
  };

  const updateField = (secId: string, fieldId: string, updates: Partial<FormField>) => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          fields: s.fields.map((f) => {
            if (f.id !== fieldId) return f;
            const updatedField = { ...f, ...updates };

            if (
              ['radio', 'checkbox', 'select', 'multiselect'].includes(updatedField.type) &&
              (!updatedField.options || updatedField.options.length === 0)
            ) {
              updatedField.options = [
                { label: 'Option 1', value: 'Option 1', targetSectionId: 'NEXT' },
                { label: 'Option 2', value: 'Option 2', targetSectionId: 'NEXT' }
              ];
            }
            return updatedField;
          })
        };
      })
    );
  };

  const removeField = (secId: string, fieldId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) };
      })
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, secId: string, fieldId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Url = uploadEvent.target?.result as string;
        updateField(secId, fieldId, { imageUrl: base64Url });
      };
      reader.readAsDataURL(file);
    }
  };

  const addOption = (secId: string, fieldId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          fields: s.fields.map((f) => {
            if (f.id !== fieldId) return f;
            const opts = f.options || [];
            const nextNum = opts.length + 1;
            const newOpt: FieldOption = {
              label: `Option ${nextNum}`,
              value: `Option ${nextNum}`,
              targetSectionId: 'NEXT'
            };
            return { ...f, options: [...opts, newOpt] };
          })
        };
      })
    );
  };

  const updateOption = (secId: string, fieldId: string, optIdx: number, updates: Partial<FieldOption>) => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          fields: s.fields.map((f) => {
            if (f.id !== fieldId) return f;
            const opts = [...(f.options || [])];
            opts[optIdx] = { ...opts[optIdx], ...updates, value: updates.label !== undefined ? updates.label : opts[optIdx].value };
            return { ...f, options: opts };
          })
        };
      })
    );
  };

  const removeOption = (secId: string, fieldId: string, optIdx: number) => {
    setSections(
      sections.map((s) => {
        if (s.id !== secId) return s;
        return {
          ...s,
          fields: s.fields.map((f) => {
            if (f.id !== fieldId) return f;
            const opts = [...(f.options || [])];
            opts.splice(optIdx, 1);
            return { ...f, options: opts };
          })
        };
      })
    );
  };

  // Bulk Paste Handler for Options
  const handleOptionPaste = (e: React.ClipboardEvent<HTMLInputElement>, secId: string, fieldId: string, optIdx: number) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('\n')) {
      e.preventDefault();
      const lines = pastedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
      if (lines.length === 0) return;

      setSections(
        sections.map((s) => {
          if (s.id !== secId) return s;
          return {
            ...s,
            fields: s.fields.map((f) => {
              if (f.id !== fieldId) return f;
              const currentOpts = [...(f.options || [])];
              currentOpts[optIdx] = { label: lines[0], value: lines[0], targetSectionId: currentOpts[optIdx]?.targetSectionId || 'NEXT' };
              for (let i = 1; i < lines.length; i++) {
                currentOpts.splice(optIdx + i, 0, {
                  label: lines[i],
                  value: lines[i],
                  targetSectionId: 'NEXT'
                });
              }
              return { ...f, options: currentOpts };
            })
          };
        })
      );
    }
  };

  // Enter Key Handler for Option Input
  const handleOptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, secId: string, fieldId: string, optIdx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOption(secId, fieldId);
      setTimeout(() => {
        const nextKey = `${fieldId}_${optIdx + 1}`;
        if (optionInputRefs.current[nextKey]) {
          optionInputRefs.current[nextKey]?.focus();
        }
      }, 50);
    }
  };

  const [operatorProfile, setOperatorProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    db.userProfile.toArray().then((profiles) => {
      if (profiles.length > 0) {
        setOperatorProfile(profiles[0]);
      }
    });
  }, []);

  const handleSaveTemplate = async () => {
    try {
      const templateTitle = title.trim() || 'Untitled Form';
      const templateData: Omit<FormTemplate, 'canonicalFingerprint'> = {
        id: `tpl_${Date.now()}`,
        title: templateTitle,
        description,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorAlias: operatorProfile?.alias || 'Operator 1',
        sections,
        settings
      };

      const canonicalFingerprint = await generateTemplateFingerprint(templateData);
      const fullTemplate: FormTemplate = {
        ...templateData,
        canonicalFingerprint
      };

      await db.templates.put(fullTemplate);

      // Reset canvas state back to clean defaults for next form
      const cleanState = getInitialFormState(null);
      setTitle(cleanState.title);
      setDescription(cleanState.description);
      setSettings(cleanState.settings);
      setSections(cleanState.sections);
      setActiveSectionId(cleanState.activeSectionId);
      setActiveFieldId(null);

      setIsSaveModalOpen(false);
      setNotification(`Form template "${templateTitle}" locked & saved successfully! Canvas reset for next form.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'IndexedDB storage write failed';
      console.error('Failed to save template:', err);
      setNotification(`Error: ${message}`);
      setTimeout(() => setNotification(null), 5000);
      alert(`Error saving template: ${message}. Please verify mobile browser storage permissions.`);
    }
  };

  const currentPreviewSection = sections[previewSectionIndex];

  const handlePreviewNextSection = () => {
    if (!currentPreviewSection) return;
    const target = getNextSectionId(currentPreviewSection, sections, previewFormData);
    if (target === 'SUBMIT') {
      setNotification('Preview Completed! In real usage, your submission is stored in IndexedDB.');
      setTimeout(() => setNotification(null), 5000);
    } else {
      const nextIdx = sections.findIndex((s) => s.id === target);
      if (nextIdx !== -1) {
        setPreviewSectionIndex(nextIdx);
      }
    }
  };

  return (
    <div>
      {notification && (
        <div className="banner-notification">
          <Hash size={18} color="var(--primary)" />
          <span>{notification}</span>
        </div>
      )}

      {/* Authoring Header Toolbar */}
      <div className="builder-toolbar-container">
        <div>
          <h1 className="builder-toolbar-title">Form Builder Canvas</h1>
          <p className="builder-toolbar-subtitle">
            Author zero-backend forms aligned with 100% Google Forms features & section navigation.
          </p>
        </div>

        <div className="builder-toolbar-actions">
          <div className="btn-group-compact">
            <LongPressTooltip label="Reorder Sections">
              <button
                type="button"
                className="btn-compact"
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                  setIsSectionReorderOpen(true);
                }}
                title="Reorder Sections"
                aria-label="Reorder Sections"
              >
                <Move size={14} />
                <span className="btn-text-responsive">Reorder</span>
              </button>
            </LongPressTooltip>

            <LongPressTooltip label="Reset Canvas">
              <button
                type="button"
                className="btn-compact"
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                  setIsResetModalOpen(true);
                }}
                title="Clear canvas and start fresh"
                aria-label="Reset Canvas"
              >
                <RotateCcw size={14} color="var(--accent-amber)" />
                <span className="btn-text-responsive">Reset</span>
              </button>
            </LongPressTooltip>

            <LongPressTooltip label="Form Settings">
              <button
                type="button"
                className="btn-compact"
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                  setIsSettingsOpen(true);
                }}
                title="Form Settings"
                aria-label="Form Settings"
              >
                <Settings size={14} />
                <span className="btn-text-responsive">Settings</span>
              </button>
            </LongPressTooltip>

            <LongPressTooltip label={isPreview ? 'Back to Editor' : 'Preview Form'}>
              <button
                type="button"
                className="btn-compact"
                onClick={() => {
                  (document.activeElement as HTMLElement)?.blur();
                  setIsPreview(!isPreview);
                  setPreviewSectionIndex(0);
                }}
                title={isPreview ? 'Back to Editor' : 'Preview Form'}
                aria-label={isPreview ? 'Back to Editor' : 'Preview Form'}
              >
                <Eye size={14} />
                <span className="btn-text-responsive">{isPreview ? 'Edit' : 'Preview'}</span>
              </button>
            </LongPressTooltip>
          </div>

          <LongPressTooltip label="Save Template">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                setIsSaveModalOpen(true);
              }}
              style={{ height: '34px', padding: '0.35rem 0.75rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Save size={15} />
              <span>Save Template</span>
            </button>
          </LongPressTooltip>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="drawer-header">
              <h2 className="modal-title-heading">Form Settings</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setIsSettingsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-grid">
              <label className="modal-checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.showProgressBar || false}
                  onChange={(e) => setSettings({ ...settings, showProgressBar: e.target.checked })}
                />
                <span>Show progress bar during data entry</span>
              </label>

              <label className="modal-checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.shuffleQuestions || false}
                  onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                />
                <span>Shuffle question order within sections</span>
              </label>

              <label className="modal-checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.e2eeEnabled || false}
                  onChange={(e) => setSettings({ ...settings, e2eeEnabled: e.target.checked })}
                />
                <span>Enable WebCrypto AES-GCM 256-bit E2EE Encryption</span>
              </label>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Confirmation Message</label>
                <textarea
                  value={settings.confirmationMessage || ''}
                  onChange={(e) => setSettings({ ...settings, confirmationMessage: e.target.value })}
                  className="modal-textarea-full"
                />
              </div>
            </div>

            <div className="modal-footer-flex">
              <button className="btn btn-primary" onClick={() => setIsSettingsOpen(false)}>
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Behance-Style Section Reorder Drawer / Modal */}
      {isSectionReorderOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="drawer-header">
              <h2 className="modal-title-heading">Reorder Sections</h2>
              <button className="btn btn-outline btn-sm" onClick={() => setIsSectionReorderOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Re-sequence entire sections of your form. Section numbers will update automatically.
            </p>

            <div 
              ref={sectionModalListRef}
              className="modal-scroll-list"
              onTouchMove={handleModalSectionTouchMove}
              onTouchEnd={handleModalSectionTouchEnd}
            >
              {sections.map((sec, idx) => {
                const isDragging = modalDraggedSectionIdx === idx;
                const isDragOver = modalDragOverSectionIdx === idx;
                let dragClass = '';
                if (isDragging) dragClass = 'dragging';
                else if (isDragOver) {
                  dragClass = modalSectionDropPos === 'before' ? 'drag-over-top' : 'drag-over-bottom';
                }

                return (
                  <div
                    key={sec.id}
                    draggable
                    onDragStart={(e) => handleModalSectionDragStart(e, idx)}
                    onDragOver={(e) => handleModalSectionDragOver(e, idx)}
                    onDrop={(e) => handleModalSectionDrop(e, idx)}
                    onDragEnd={handleModalSectionDragEnd}
                    onTouchStart={() => handleModalSectionTouchStart(idx)}
                    className={`modal-list-item-row draggable-item-row ${dragClass}`}
                    style={{ userSelect: 'none', cursor: 'grab' }}
                  >
                    <div className="modal-item-info">
                      <GripVertical size={18} color="var(--text-muted)" style={{ cursor: 'grab', flexShrink: 0 }} />
                      <div>
                        <span className="builder-section-heading">Section {idx + 1}: {sec.title}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                          {sec.fields.length} question(s)
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-outline pad-sm"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, 'up')}
                        title="Move Section Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="btn btn-outline pad-sm"
                        disabled={idx === sections.length - 1}
                        onClick={() => moveSection(idx, 'down')}
                        title="Move Section Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => setIsSectionReorderOpen(false)}>
                Done Reordering
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section-by-Section Progression Preview Mode */}
      {isPreview ? (
        <div>
          {/* Top Dedicated Preview Control Bar (Separate Row) */}
          <div className="card" style={{ padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderLeft: '4px solid var(--accent-purple)' }}>
            <div className="flex-center-gap-md">
              <span className="badge badge-purple" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>Preview Mode</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Testing form respondent flow</span>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setIsPreview(false); setPreviewSectionIndex(0); }}
              title="Return to form editor canvas"
              style={{ height: '34px', padding: '0.35rem 0.8rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
            >
              <RotateCcw size={14} />
              <span>Go Back to Editor</span>
            </button>
          </div>

          <div className="card">
            {/* Full-Width Form Header Card */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>{title}</h2>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.92rem' }}>{description || 'No description provided.'}</p>
            </div>

          {/* Section Progress Bar */}
          {settings.showProgressBar && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                <span>Section {previewSectionIndex + 1} of {sections.length}</span>
                <span>{Math.round(((previewSectionIndex + 1) / sections.length) * 100)}% Completed</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'var(--bg-card-hover)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((previewSectionIndex + 1) / sections.length) * 100}%`, background: 'var(--primary)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}

          {/* Single Section Progression View */}
          {currentPreviewSection && (
            <div key={currentPreviewSection.id} style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.4rem' }}>
                {currentPreviewSection.title}
              </h3>
              {currentPreviewSection.description && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{currentPreviewSection.description}</p>}

              <div style={{ display: 'grid', gap: '1.25rem' }}>
                {currentPreviewSection.fields.map((f) => (
                  <div key={f.id} style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
                    {f.type === 'title_block' ? (
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.label}</h4>
                        {f.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{f.description}</p>}
                      </div>
                    ) : (
                      <>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
                          {f.label} {f.validation?.required && <span className="text-rose">*</span>}
                        </label>
                        {f.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>{f.description}</p>}

                        {f.imageUrl && (
                          <div style={{ marginBottom: '0.8rem' }}>
                            <img src={f.imageUrl} alt={f.label} style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: 'var(--radius-sm)' }} />
                          </div>
                        )}

                        {f.type === 'text' && <input type="text" placeholder={f.placeholder || 'Your answer'} className="w-full" />}
                        {f.type === 'textarea' && <textarea placeholder={f.placeholder || 'Your answer'} style={{ width: '100%', minHeight: '80px' }} />}
                        {f.type === 'number' && <input type="number" placeholder="0" className="w-full" />}
                        {f.type === 'date' && <input type="date" className="w-full" />}
                        {f.type === 'time' && <input type="time" className="w-full" />}
                        {f.type === 'signature' && (
                          <div style={{ border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Edit3 size={24} style={{ marginBottom: '0.4rem' }} />
                            <p style={{ fontSize: '0.85rem' }}>Digital Signature Pad (Interactive in Data Entry)</p>
                          </div>
                        )}
                        {f.type === 'location' && (
                          <div className="flex-gap-sm">
                            <MapPin size={20} color="var(--primary)" />
                            <input type="text" placeholder="Enter Administrative Region / City..." className="w-full" />
                          </div>
                        )}

                        {f.type === 'radio' && (
                          <div className="grid-gap-sm">
                            {(f.options || []).map((opt, oIdx) => (
                              <label key={oIdx} className="builder-clickable-row">
                                <input
                                  type="radio"
                                  name={`preview_${f.id}`}
                                  value={opt.value}
                                  onChange={(e) => setPreviewFormData({ ...previewFormData, [f.id]: e.target.value })}
                                />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {f.type === 'checkbox' && (
                          <div className="grid-gap-sm">
                            {(f.options || []).map((opt, oIdx) => (
                              <label key={oIdx} className="builder-clickable-row">
                                <input type="checkbox" value={opt.value} />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {f.type === 'select' && (
                          <select
                            onChange={(e) => setPreviewFormData({ ...previewFormData, [f.id]: e.target.value })}
                            className="w-full"
                          >
                            <option value="">Choose an option...</option>
                            {(f.options || []).map((opt, oIdx) => (
                              <option key={oIdx} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}

                        {/* Customizable Linear Scale (0 - 10 bounds) */}
                        {f.type === 'linear_scale' && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div className="linear-scale-container mt-sm">
                              <span className="builder-muted-xs">{f.validation?.minLabel || 'Low'}</span>
                              {Array.from({ length: (f.validation?.max || 5) - (f.validation?.min ?? 1) + 1 }, (_, i) => (f.validation?.min ?? 1) + i).map((num) => (
                                <label key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', cursor: 'pointer' }}>
                                  <span>{num}</span>
                                  <input type="radio" name={`scale_${f.id}`} value={num} />
                                </label>
                              ))}
                              <span className="builder-muted-xs">{f.validation?.maxLabel || 'High'}</span>
                            </div>
                          </div>
                        )}

                        {f.type === 'rating' && (
                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} style={{ background: 'transparent', padding: 0 }}>
                                <Star size={24} color="var(--accent-amber)" />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="flex-gap-sm">
              <button
                className="btn btn-secondary btn-sm"
                disabled={previewSectionIndex === 0}
                onClick={() => setPreviewSectionIndex(previewSectionIndex - 1)}
                style={{ height: '34px' }}
              >
                Previous
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => { setIsPreview(false); setPreviewSectionIndex(0); }}
                style={{ height: '34px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                title="Return to form editor canvas"
              >
                <RotateCcw size={13} />
                <span>Exit Preview</span>
              </button>
            </div>

            <button className="btn btn-primary btn-sm" onClick={handlePreviewNextSection} style={{ height: '34px' }}>
              {previewSectionIndex === sections.length - 1 ? 'Submit (Preview)' : 'Next Section'}
            </button>
          </div>
        </div>
      </div>
      ) : (
        <div className="builder-layout-grid" ref={builderCanvasRef}>
          <div>
            {/* Header Form Card */}
            <div
              className="card"
              data-header-card="true"
              onClick={() => setActiveFieldId(null)}
              style={{ borderTop: '4px solid var(--primary)', position: 'relative' }}
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Form Title"
                placeholder="Form Title"
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 700,
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-color)',
                  borderRadius: 0,
                  padding: '0.4rem 0',
                  marginBottom: '0.75rem'
                }}
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Form description"
                aria-label="Form Description"
                style={{
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  resize: 'none'
                }}
              />
            </div>

            {/* Sections list */}
            {sections.map((sec, sIdx) => {
              const isSecActive = activeSectionId === sec.id;
              const isSectionDropTarget = dragOverTarget?.sectionId === sec.id && !dragOverTarget?.fieldId;

              return (
                <div
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  onDragOver={(e) => handleDragOver(e, sec.id)}
                  onDrop={(e) => handleDrop(e, sec.id)}
                  className={`builder-section-container ${isSecActive ? 'active-section' : ''}`}
                  style={{
                    border: isSectionDropTarget ? '2px dashed var(--primary)' : undefined,
                    padding: isSectionDropTarget ? '1rem' : undefined
                  }}
                >
                  <div className="section-pill-badge">
                    <Layers size={14} />
                    <span>Section {sIdx + 1} of {sections.length}</span>
                  </div>

                  {/* Section Card Header */}
                  <div
                    className="card"
                    onClick={() => {
                      setActiveSectionId(sec.id);
                      setActiveFieldId(null);
                    }}
                    style={{
                      borderLeft: isSecActive ? '4px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      marginBottom: '1rem',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="badge badge-purple" style={{ whiteSpace: 'nowrap' }}>
                        Section {sIdx + 1} of {sections.length}
                      </span>

                      <div className="flex-center-gap-sm">
                        <button
                          className="btn btn-outline btn-icon-square"
                          disabled={sIdx === 0}
                          onClick={(e) => { e.stopPropagation(); moveSection(sIdx, 'up'); }}
                          title="Move Section Up"
                          aria-label="Move Section Up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="btn btn-outline btn-icon-square"
                          disabled={sIdx === sections.length - 1}
                          onClick={(e) => { e.stopPropagation(); moveSection(sIdx, 'down'); }}
                          title="Move Section Down"
                          aria-label="Move Section Down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        {sections.length > 1 && (
                          <button
                            className="btn btn-outline btn-icon-square text-rose"
                            onClick={(e) => { e.stopPropagation(); removeSection(sec.id); }}
                            title="Delete Section"
                            aria-label="Delete Section"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={sec.title}
                      onChange={(e) => {
                        const updatedTitle = e.target.value;
                        setSections(sections.map((s) => (s.id === sec.id ? { ...s, title: updatedTitle } : s)));
                      }}
                      placeholder="Section Title"
                      aria-label="Section Title"
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 700,
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--border-color)',
                        borderRadius: 0,
                        padding: '0.3rem 0',
                        marginBottom: '0.6rem',
                        color: 'var(--text-primary)'
                      }}
                    />

                    <textarea
                      value={sec.description || ''}
                      onChange={(e) => {
                        const updatedDesc = e.target.value;
                        setSections(sections.map((s) => (s.id === sec.id ? { ...s, description: updatedDesc } : s)));
                      }}
                      placeholder="Description (optional)"
                      aria-label="Section Description"
                      rows={2}
                      style={{
                        width: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        resize: 'none'
                      }}
                    />
                  </div>

                  {/* Fields List */}
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {sec.fields.map((f, fIdx) => {
                      const isActive = activeFieldId === f.id;
                      const isOptionBased = ['radio', 'checkbox', 'select', 'multiselect'].includes(f.type);
                      const supportsBranching = ['radio', 'select'].includes(f.type);
                      const isCardDropTarget = dragOverTarget?.fieldId === f.id;

                      // Unfocused Collapsed Question Card
                      if (!isActive) {
                        const isBeingDragged = draggedItem?.fieldId === f.id;
                        return (
                          <div
                            key={f.id}
                            data-section-id={sec.id}
                            data-field-id={f.id}
                            onDragOver={(e) => handleDragOver(e, sec.id, f.id)}
                            onDrop={(e) => handleDrop(e, sec.id, f.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSectionId(sec.id);
                              setActiveFieldId(f.id);
                            }}
                            className="card"
                            style={{
                              padding: '1rem 1.25rem',
                              cursor: 'pointer',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.5rem',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: isBeingDragged ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-card)',
                              border: isBeingDragged ? '2px dashed var(--primary)' : '1px solid var(--border-color)',
                              borderTop: isCardDropTarget ? '3px solid var(--primary)' : (isBeingDragged ? '2px dashed var(--primary)' : '1px solid var(--border-color)'),
                              boxShadow: isBeingDragged ? '0 8px 24px rgba(99, 102, 241, 0.45)' : 'none',
                              transform: isBeingDragged ? 'scale(1.02)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                              <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, sec.id, f.id, fIdx)}
                                onTouchStart={(e) => handleTouchStart(e, sec.id, f.id, fIdx)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onClick={(e) => e.stopPropagation()}
                                className="builder-drag-handle"
                                title="Drag or touch-drag to reorder"
                              >
                                <GripVertical size={18} color={isBeingDragged ? 'var(--primary)' : 'var(--text-muted)'} />
                              </div>
                              <div>
                                <span className="builder-section-heading">
                                  {f.label} {f.validation?.required && <span className="text-rose">*</span>}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
                                  ({f.type})
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                className="btn btn-outline btn-icon-square"
                                disabled={fIdx === 0}
                                onClick={(e) => { e.stopPropagation(); moveQuestion(sec.id, fIdx, 'up'); }}
                                title="Move Up within Section"
                                aria-label="Move Question Up"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                className="btn btn-outline btn-icon-square"
                                disabled={fIdx === sec.fields.length - 1}
                                onClick={(e) => { e.stopPropagation(); moveQuestion(sec.id, fIdx, 'down'); }}
                                title="Move Down within Section"
                                aria-label="Move Question Down"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <span className="hide-on-mobile" style={{ fontSize: '0.8rem', color: 'var(--primary)', marginLeft: '0.25rem' }}>Click to Edit</span>
                            </div>
                          </div>
                        );
                      }

                      // Active Expanded Question Card Authoring View
                      return (
                        <div
                          key={f.id}
                          onDragOver={(e) => handleDragOver(e, sec.id, f.id)}
                          onDrop={(e) => handleDrop(e, sec.id, f.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSectionId(sec.id);
                            setActiveFieldId(f.id);
                          }}
                          className="card"
                          data-section-id={sec.id}
                          data-field-id={f.id}
                          style={{
                            borderLeft: '4px solid var(--primary)',
                            borderTop: isCardDropTarget ? '3px solid var(--primary)' : '1px solid var(--border-color)',
                            padding: '1.25rem',
                            position: 'relative'
                          }}
                        >
                          {/* Drag Handle Dots & Reorder controls */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                            <div className="flex-center-gap-sm">
                              <button
                                className="btn btn-outline btn-icon-square"
                                disabled={fIdx === 0}
                                onClick={(e) => { e.stopPropagation(); moveQuestion(sec.id, fIdx, 'up'); }}
                                title="Move Question Up"
                                aria-label="Move Question Up"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                className="btn btn-outline btn-icon-square"
                                disabled={fIdx === sec.fields.length - 1}
                                onClick={(e) => { e.stopPropagation(); moveQuestion(sec.id, fIdx, 'down'); }}
                                title="Move Question Down"
                                aria-label="Move Question Down"
                              >
                                <ArrowDown size={14} />
                              </button>

                              {sections.length > 1 && (
                                <select
                                  value={sec.id}
                                  onChange={(e) => { e.stopPropagation(); moveQuestionToSection(sec.id, e.target.value, f.id); }}
                                  style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-sm)' }}
                                  title="Move question to another section"
                                >
                                  {sections.map((s, sIdx) => (
                                    <option key={s.id} value={s.id}>
                                      Sec {sIdx + 1}: {s.title || 'Untitled'}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, sec.id, f.id, fIdx)}
                              onTouchStart={(e) => handleTouchStart(e, sec.id, f.id, fIdx)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              className="builder-drag-handle"
                              title="Drag or touch-drag to reorder"
                            >
                              <GripVertical size={20} style={{ transform: 'rotate(90deg)', color: 'var(--primary)' }} />
                            </div>

                            <div />
                          </div>

                          {/* Question Title & Type Selector */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                            {/* Row 1: Dedicated Full-Width Question Title Input */}
                            <input
                              type="text"
                              value={f.label}
                              onChange={(e) => updateField(sec.id, f.id, { label: e.target.value })}
                              placeholder={f.type === 'title_block' ? 'Title Block Header' : 'Question Label'}
                              style={{
                                fontWeight: 600,
                                fontSize: '1.05rem',
                                width: '100%',
                                minWidth: 0,
                                boxSizing: 'border-box',
                                padding: '0.6rem 0.8rem'
                              }}
                            />

                            {/* Row 2: Image Attach Button + Question Type Selector */}
                            <div className="flex-gap-sm">
                              <input
                                type="file"
                                accept="image/*"
                                ref={(el) => { imageInputRefs.current[f.id] = el; }}
                                onChange={(e) => handleImageUpload(e, sec.id, f.id)}
                                style={{ display: 'none' }}
                              />
                              <button
                                className="btn btn-outline"
                                onClick={() => imageInputRefs.current[f.id]?.click()}
                                title="Attach Image to Question"
                                style={{ padding: '0.5rem 0.75rem' }}
                              >
                                <Image size={18} color="var(--primary)" />
                              </button>

                              <select
                                value={f.type}
                                onChange={(e) => updateField(sec.id, f.id, { type: e.target.value as FieldType })}
                                style={{ flex: 1, minWidth: 0 }}
                              >
                                <option value="text">Short answer</option>
                                <option value="textarea">Paragraph</option>
                                <option value="radio">Multiple choice</option>
                                <option value="checkbox">Checkboxes</option>
                                <option value="select">Dropdown</option>
                                <option value="linear_scale">Linear scale (Custom)</option>
                                <option value="rating">Rating (Star)</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="time">Time</option>
                                <option value="file_upload">File Upload</option>
                                <option value="camera_photo">Camera Photo Capture (Physical Copy)</option>
                                <option value="signature">Digital Signature</option>
                                <option value="location">Privacy Location (Region)</option>
                                <option value="title_block">Title & Description Block</option>
                              </select>
                            </div>
                          </div>

                          {/* Image Preview inside Question Card */}
                          {f.imageUrl && (
                            <div style={{ position: 'relative', marginBottom: '1rem', display: 'inline-block' }}>
                              <img src={f.imageUrl} alt="Attached" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 'var(--radius-sm)' }} />
                              <button
                                className="btn btn-outline"
                                onClick={() => updateField(sec.id, f.id, { imageUrl: undefined })}
                                style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '0.2rem 0.4rem' }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}

                          {/* Customizable Linear Scale Configuration Panel */}
                          {f.type === 'linear_scale' && (
                            <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-sm, 6px)', marginBottom: '1rem', border: '1px solid var(--border-color)', display: 'grid', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <label className="builder-muted-sm">Min Bound:</label>
                                  <select
                                    value={f.validation?.min ?? 1}
                                    onChange={(e) => updateField(sec.id, f.id, { validation: { ...f.validation, min: Number(e.target.value) } })}
                                    className="builder-tag-sm"
                                  >
                                    <option value={0}>0</option>
                                    <option value={1}>1</option>
                                  </select>
                                </div>

                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>to</span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <label className="builder-muted-sm">Max Bound:</label>
                                  <select
                                    value={f.validation?.max ?? 5}
                                    onChange={(e) => updateField(sec.id, f.id, { validation: { ...f.validation, max: Number(e.target.value) } })}
                                    className="builder-tag-sm"
                                  >
                                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                      <option key={n} value={n}>{n}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Low Bound & High Bound Labels in Clean Stacked Rows with Prefix Badges */}
                              <div className="grid-gap-sm">
                                <div className="flex-center-gap-lg">
                                  <span className="builder-field-number">
                                    {f.validation?.min ?? 1}.
                                  </span>
                                  <input
                                    type="text"
                                    value={f.validation?.minLabel || ''}
                                    onChange={(e) => updateField(sec.id, f.id, { validation: { ...f.validation, minLabel: e.target.value } })}
                                    placeholder="Low bound label (optional, e.g. Disagree)"
                                    style={{ flex: 1, minWidth: 0, width: '100%', fontSize: '0.85rem', padding: '0.4rem 0.6rem', boxSizing: 'border-box' }}
                                  />
                                </div>

                                <div className="flex-center-gap-lg">
                                  <span className="builder-field-number">
                                    {f.validation?.max ?? 5}.
                                  </span>
                                  <input
                                    type="text"
                                    value={f.validation?.maxLabel || ''}
                                    onChange={(e) => updateField(sec.id, f.id, { validation: { ...f.validation, maxLabel: e.target.value } })}
                                    placeholder="High bound label (optional, e.g. Agree)"
                                    style={{ flex: 1, minWidth: 0, width: '100%', fontSize: '0.85rem', padding: '0.4rem 0.6rem', boxSizing: 'border-box' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* File Upload Google Forms Style Configuration Panel */}
                          {f.type === 'file_upload' && (
                            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', display: 'grid', gap: '0.85rem', border: '1px solid var(--border-color)' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Upload size={16} color="var(--primary)" />
                                File Upload Settings
                              </div>

                              <div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                  Allowed file types (Leave all unchecked to allow any file type):
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                                  {[
                                    { id: 'document', label: 'Document' },
                                    { id: 'spreadsheet', label: 'Spreadsheet' },
                                    { id: 'presentation', label: 'Presentation' },
                                    { id: 'drawing', label: 'Drawing' },
                                    { id: 'image', label: 'Image' },
                                    { id: 'pdf', label: 'PDF' },
                                    { id: 'audio', label: 'Audio' },
                                    { id: 'video', label: 'Video' },
                                    { id: 'archive', label: 'Archive (Zip)' }
                                  ].map((ft) => {
                                    const currentAllowed = f.validation?.allowedFileTypes || [];
                                    const isChecked = currentAllowed.includes(ft.id as AllowedFileType);

                                    const toggleType = () => {
                                      let nextTypes: AllowedFileType[];
                                      if (isChecked) {
                                        nextTypes = currentAllowed.filter((t) => t !== ft.id);
                                      } else {
                                        nextTypes = [...currentAllowed, ft.id as AllowedFileType];
                                      }
                                      updateField(sec.id, f.id, {
                                        validation: { ...f.validation, allowedFileTypes: nextTypes }
                                      });
                                    };

                                    return (
                                      <label key={ft.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={toggleType}
                                        />
                                        {ft.label}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="builder-divider-row">
                                <div>
                                  <label className="builder-field-label">Maximum number of files:</label>
                                  <select
                                    value={f.validation?.maxFileCount ?? 1}
                                    onChange={(e) => updateField(sec.id, f.id, { validation: { ...f.validation, maxFileCount: Number(e.target.value) } })}
                                    className="builder-input-sm"
                                  >
                                    <option value={1}>1</option>
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="builder-field-label">Maximum file size:</label>
                                  <select
                                    value={f.validation?.maxFileSizeMB ?? 10}
                                    onChange={(e) => updateField(sec.id, f.id, { validation: { ...f.validation, maxFileSizeMB: Number(e.target.value) } })}
                                    className="builder-input-sm"
                                  >
                                    <option value={1}>1 MB</option>
                                    <option value={5}>5 MB</option>
                                    <option value={10}>10 MB</option>
                                    <option value={100}>100 MB</option>
                                    <option value={1000}>1 GB (1,000 MB)</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Camera Photo Capture Question Configuration */}
                          {f.type === 'camera_photo' && (
                            <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid var(--border-color)', display: 'grid', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Camera size={20} color="var(--primary)" />
                                <div>
                                  <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    Camera Photo Capture (Physical Copy / Multi-Page)
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    Prompts respondents to capture physical paper forms (front/back pages, receipts, documents) directly with their camera or webcam.
                                  </div>
                                </div>
                              </div>

                              <div className="builder-divider-row">
                                <div>
                                  <label className="builder-field-label">Maximum number of photos / pages:</label>
                                  <select
                                    value={f.validation?.maxFileCount ?? 5}
                                    onChange={(e) => updateField(sec.id, f.id, { validation: { ...f.validation, maxFileCount: Number(e.target.value) } })}
                                    className="builder-input-sm"
                                  >
                                    <option value={1}>1 photo (Single side)</option>
                                    <option value={2}>2 photos (Front & Back)</option>
                                    <option value={3}>3 photos</option>
                                    <option value={5}>5 photos (Multi-page)</option>
                                    <option value={10}>10 photos</option>
                                    <option value={20}>20 photos</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="builder-field-label">Maximum photo size:</label>
                                  <select
                                    value={f.validation?.maxFileSizeMB ?? 10}
                                    onChange={(e) => updateField(sec.id, f.id, { validation: { ...f.validation, maxFileSizeMB: Number(e.target.value) } })}
                                    className="builder-input-sm"
                                  >
                                    <option value={5}>5 MB</option>
                                    <option value={10}>10 MB</option>
                                    <option value={25}>25 MB</option>
                                    <option value={50}>50 MB</option>
                                    <option value={100}>100 MB</option>
                                    <option value={1000}>1 GB (1,000 MB)</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Description Input (if enabled) */}
                          {(f.showDescription || f.type === 'title_block') && (
                            <div style={{ marginBottom: '1rem' }}>
                              <input
                                type="text"
                                value={f.description || ''}
                                onChange={(e) => updateField(sec.id, f.id, { description: e.target.value })}
                                placeholder="Description"
                                style={{ width: '100%', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                              />
                            </div>
                          )}

                          {/* Smart Options Authoring (Bulk Paste & Enter Key Creation) */}
                          {isOptionBased && (
                            <div style={{ marginBottom: '1.25rem', display: 'grid', gap: '0.5rem' }}>
                              {(f.options || []).map((opt, oIdx) => (
                                <div
                                  key={oIdx}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem',
                                    padding: f.showSectionBranching && supportsBranching ? '0.4rem 0.5rem' : '0.1rem 0',
                                    background: f.showSectionBranching && supportsBranching ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                    borderRadius: 'var(--radius-sm, 6px)',
                                    border: f.showSectionBranching && supportsBranching ? '1px solid rgba(99, 102, 241, 0.15)' : '1px solid transparent'
                                  }}
                                >
                                  {/* Option Label Row */}
                                  <div className="flex-center-gap-lg">
                                    {f.type === 'radio' && <Circle size={16} color="var(--text-muted)" className="flex-shrink-0" />}
                                    {f.type === 'checkbox' && <CheckSquare size={16} color="var(--text-muted)" className="flex-shrink-0" />}
                                    {f.type === 'select' && <List size={16} color="var(--text-muted)" className="flex-shrink-0" />}

                                    <input
                                      ref={(el) => { optionInputRefs.current[`${f.id}_${oIdx}`] = el; }}
                                      type="text"
                                      value={opt.label}
                                      onChange={(e) => updateOption(sec.id, f.id, oIdx, { label: e.target.value })}
                                      onPaste={(e) => handleOptionPaste(e, sec.id, f.id, oIdx)}
                                      onKeyDown={(e) => handleOptionKeyDown(e, sec.id, f.id, oIdx)}
                                      placeholder={`Option ${oIdx + 1} (Paste multiline list or press Enter for next)`}
                                      style={{ flex: 1, minWidth: 0, fontSize: '0.88rem', padding: '0.4rem 0.6rem', boxSizing: 'border-box' }}
                                    />

                                    {(f.options || []).length > 1 && (
                                      <button
                                        className="btn btn-outline btn-icon-square"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeOption(sec.id, f.id, oIdx);
                                        }}
                                        title="Remove Option"
                                        aria-label="Remove Option"
                                        style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', padding: 0 }}
                                      >
                                        <X size={14} color="var(--text-muted)" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Option-Based Branching Dropdown ("Go to section based on answer") */}
                                  {f.showSectionBranching && supportsBranching && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '1.5rem', width: 'calc(100% - 1.5rem)', boxSizing: 'border-box' }}>
                                      <ArrowUpRight size={14} color="var(--primary)" className="flex-shrink-0" />
                                      <select
                                        value={opt.targetSectionId || 'NEXT'}
                                        onChange={(e) => updateOption(sec.id, f.id, oIdx, { targetSectionId: e.target.value })}
                                        style={{
                                          flex: 1,
                                          minWidth: 0,
                                          width: '100%',
                                          fontSize: '0.8rem',
                                          padding: '0.35rem 0.5rem',
                                          background: 'var(--bg-input)',
                                          color: 'var(--text-primary)',
                                          border: '1px solid var(--border-color)',
                                          borderRadius: 'var(--radius-sm, 6px)',
                                          cursor: 'pointer',
                                          boxSizing: 'border-box'
                                        }}
                                        title="Go to section based on this answer"
                                      >
                                        <option value="NEXT">Continue to next section</option>
                                        {sections.map((targetSec, tsIdx) => (
                                          <option key={targetSec.id} value={targetSec.id}>
                                            Go to section {tsIdx + 1} ({targetSec.title || 'Untitled'})
                                          </option>
                                        ))}
                                        <option value="SUBMIT">Submit form</option>
                                      </select>
                                    </div>
                                  )}
                                </div>
                              ))}

                              <div className="mt-sm">
                                <button
                                  className="btn btn-outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addOption(sec.id, f.id);
                                  }}
                                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                                >
                                  <Plus size={14} />
                                  <span>Add option</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Bottom Card Action Toolbar */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div className="flex-center-gap-sm">
                              <button
                                className="btn btn-outline btn-icon-square"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateField(sec.id, f);
                                }}
                                title="Duplicate Question"
                                aria-label="Duplicate Question"
                              >
                                <Copy size={15} />
                              </button>

                              <button
                                className="btn btn-outline btn-icon-square text-rose"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeField(sec.id, f.id);
                                }}
                                title="Delete Question"
                                aria-label="Delete Question"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            <div className="flex-center-gap-md">
                              {f.type !== 'title_block' && (
                                <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', userSelect: 'none' }}>
                                  <input
                                    type="checkbox"
                                    checked={f.required || f.validation?.required || false}
                                    onChange={(e) => updateField(sec.id, f.id, { required: e.target.checked, validation: { ...f.validation, required: e.target.checked } })}
                                  />
                                  <span>Required</span>
                                </label>
                              )}

                              {/* Explicit Done / Collapse Button */}
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFieldId(null);
                                }}
                                title="Done Editing - Collapse to compact view"
                                aria-label="Collapse question"
                                style={{
                                  height: '32px',
                                  padding: '0.2rem 0.65rem',
                                  fontSize: '0.78rem',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem'
                                }}
                              >
                                <Check size={13} />
                                <span>Done</span>
                              </button>

                              {/* 3-Dots Context Menu Dropdown */}
                              <div style={{ position: 'relative' }}>
                                <button
                                  className="btn btn-outline btn-icon-square"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuFieldId(openMenuFieldId === f.id ? null : f.id);
                                  }}
                                  aria-label="Question Options"
                                >
                                  <MoreVertical size={15} />
                                </button>

                                {openMenuFieldId === f.id && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      right: 0,
                                      bottom: '2.5rem',
                                      background: 'var(--bg-card)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: 'var(--radius-sm)',
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                      zIndex: 10,
                                      width: '220px',
                                      padding: '0.4rem'
                                    }}
                                  >
                                    <label className="builder-option-row">
                                      <input
                                        type="checkbox"
                                        checked={f.showDescription || false}
                                        onChange={(e) => {
                                          updateField(sec.id, f.id, { showDescription: e.target.checked });
                                          setOpenMenuFieldId(null);
                                        }}
                                      />
                                      <span>Show Description</span>
                                    </label>

                                    {supportsBranching && (
                                      <label className="builder-option-row">
                                        <input
                                          type="checkbox"
                                          checked={f.showSectionBranching || false}
                                          onChange={(e) => {
                                            updateField(sec.id, f.id, { showSectionBranching: e.target.checked });
                                            setOpenMenuFieldId(null);
                                          }}
                                        />
                                        <span>Go to section based on answer</span>
                                      </label>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Section Bottom Drop Zone (To drop items at the very end) */}
                  <div
                    data-section-id={sec.id}
                    onDragOver={(e) => handleDragOver(e, sec.id, undefined)}
                    onDrop={(e) => handleDrop(e, sec.id, undefined)}
                    style={{
                      marginTop: '0.75rem',
                      padding: dragOverTarget?.sectionId === sec.id && !dragOverTarget?.fieldId ? '0.75rem' : '0.25rem',
                      border: dragOverTarget?.sectionId === sec.id && !dragOverTarget?.fieldId ? '2px dashed var(--primary)' : '1px dashed transparent',
                      borderRadius: 'var(--radius-md)',
                      background: dragOverTarget?.sectionId === sec.id && !dragOverTarget?.fieldId ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {dragOverTarget?.sectionId === sec.id && !dragOverTarget?.fieldId ? 'Drop here to move to end of section' : ''}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Right Action Palette (Google Forms Style) */}
          <div className="builder-palette-container" style={{ position: 'relative', height: '100%' }}>
            <div className="builder-action-palette">
              <LongPressTooltip label="Add Question">
                <button
                  className="btn btn-outline pad-md"
                  onClick={() => addFieldToActiveSection('text')}
                  title="Add Question to Active Section"
                >
                  <Plus size={20} color="var(--primary)" />
                </button>
              </LongPressTooltip>

              <LongPressTooltip label="Add Title Block">
                <button
                  className="btn btn-outline pad-md"
                  onClick={() => addFieldToActiveSection('title_block')}
                  title="Add Title & Description Block"
                >
                  <Type size={20} color="var(--accent-amber)" />
                </button>
              </LongPressTooltip>

              <LongPressTooltip label="Add Section Break">
                <button
                  className="btn btn-outline pad-md"
                  onClick={addSection}
                  title="Add Section Break"
                >
                  <Layers size={20} color="var(--accent-blue)" />
                </button>
              </LongPressTooltip>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Lock Confirmation Modal */}
      <SaveTemplateModal
        isOpen={isSaveModalOpen}
        templateTitle={title}
        onConfirm={handleSaveTemplate}
        onCancel={() => setIsSaveModalOpen(false)}
      />

      {/* Canvas Reset Safety Confirmation Modal */}
      <ResetCanvasModal
        isOpen={isResetModalOpen}
        onConfirm={handleResetCanvas}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};

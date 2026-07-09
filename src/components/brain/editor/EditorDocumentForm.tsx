'use client';

import React, { useMemo, useState } from 'react';
import { Node } from '@/types';
import RichMarkdownEditor from './rich-text/RichMarkdownEditor';
import ConfirmModal from './modals/ConfirmModal';
import SaveReviewModal from './modals/SaveReviewModal';
import ProofreadDiffModal from './modals/ProofreadDiffModal';



interface EditorDocumentFormProps {
  nodeDetail: Node;
  editTitle: string;
  editDescription: string;
  editContent: string;
  editStatus: string;
  editCategory: string;
  editTags: string[];
  editChangeNote: string;
  saveError: string | null;
  isSaving: boolean;
  canEdit?: boolean;
  onEditTitleChange: (val: string) => void;
  onEditDescriptionChange: (val: string) => void;
  onEditContentChange: (val: string) => void;
  onEditStatusChange: (val: string) => void;
  onEditCategoryChange: (val: string) => void;
  onEditTagsChange: (tags: string[]) => void;
  onEditChangeNoteChange: (val: string) => void;
  onSave: () => Promise<boolean>;
  onCancel: () => void;
}

export default function EditorDocumentForm({
  nodeDetail,
  editTitle,
  editDescription,
  editContent,
  editStatus,
  editCategory,
  editTags,
  editChangeNote,
  saveError,
  isSaving,
  canEdit = true,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditContentChange,
  onEditStatusChange,
  onEditCategoryChange,
  onEditTagsChange,
  onEditChangeNoteChange,
  onSave,
  onCancel,
}: EditorDocumentFormProps) {
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState<boolean>(false);
  const [tagInput, setTagInput] = useState<string>('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const normalizedOriginalTags = useMemo(
    () => (nodeDetail.tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    [nodeDetail.tags]
  );

  const normalizedEditTags = useMemo(
    () => editTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    [editTags]
  );

  const isDirty = useMemo(() => {
    const titleChanged = editTitle.trim() !== (nodeDetail.title || '').trim();
    const descriptionChanged = editDescription.trim() !== (nodeDetail.description || '').trim();
    const contentChanged = editContent !== (nodeDetail.contentMarkdown || '');
    const statusChanged = editStatus !== (nodeDetail.status || '');
    const categoryChanged = editCategory.trim() !== (nodeDetail.category || '').trim();
    const changeNoteChanged = editChangeNote.trim() !== '';

    const tagsChanged =
      normalizedOriginalTags.length !== normalizedEditTags.length ||
      normalizedOriginalTags.some((tag, index) => tag !== normalizedEditTags[index]);

    return (
      titleChanged ||
      descriptionChanged ||
      contentChanged ||
      statusChanged ||
      categoryChanged ||
      tagsChanged ||
      changeNoteChanged
    );
  }, [
    editTitle,
    nodeDetail.title,
    editDescription,
    nodeDetail.description,
    editContent,
    nodeDetail.contentMarkdown,
    editStatus,
    nodeDetail.status,
    editCategory,
    nodeDetail.category,
    editChangeNote,
    normalizedOriginalTags,
    normalizedEditTags,
  ]);

  const addTag = (val: string) => {
    const normalized = val.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) return;

    if (normalized.length > 35) {
      alert('La etiqueta no puede superar los 35 caracteres.');
      return;
    }

    if (editTags.includes(normalized)) {
      setTagInput('');
      return;
    }

    if (editTags.length >= 15) {
      alert('Un nodo no puede tener más de 15 etiquetas.');
      return;
    }

    onEditTagsChange([...editTags, normalized]);
    setTagInput('');
  };

  const removeTag = (indexToRemove: number) => {
    onEditTagsChange(editTags.filter((_, idx) => idx !== indexToRemove));
  };

  const openConfigModal = () => {
    setReviewError(null);
    setIsConfigOpen(true);
  };

  const closeConfigModal = () => {
    if (isSaving) return;
    setReviewError(null);
    setIsConfigOpen(false);
  };

  const handleCancelClick = () => {
    if (isConfigOpen || isSaving) {
      return;
    }

    if (!isDirty) {
      onCancel();
      return;
    }

    setIsDiscardConfirmOpen(true);
  };

  const closeDiscardConfirm = () => {
    setIsDiscardConfirmOpen(false);
  };

  const confirmDiscardChanges = () => {
    setIsDiscardConfirmOpen(false);
    onCancel();
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && editTags.length > 0) {
      removeTag(editTags.length - 1);
    }
  };

  const handleChangeNoteChange = (val: string) => {
    if (reviewError) {
      setReviewError(null);
    }
    onEditChangeNoteChange(val);
  };

  const handleConfirmSave = async () => {
    if (!editChangeNote.trim()) {
      setReviewError('La nota de revisión es obligatoria para guardar cambios.');
      return;
    }

    const saved = await onSave();
    if (saved) {
      setReviewError(null);
      setIsConfigOpen(false);
    }
  };

  const [isCheckingSpelling, setIsCheckingSpelling] = useState<boolean>(false);
  const [spellingError, setSpellingError] = useState<string | null>(null);
  const [spellingProposal, setSpellingProposal] = useState<string | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState<boolean>(false);

  const handleCheckSpelling = async () => {
    if (!editContent.trim() || isCheckingSpelling) return;

    setIsCheckingSpelling(true);
    setSpellingError(null);
    setSpellingProposal(null);

    try {
      const response = await fetch('/api/ai/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brainId: nodeDetail.brainId,
          nodeId: nodeDetail.id,
          action: 'grammar',
          contentMarkdown: editContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let userMessage = data.error || 'Error al procesar la revisión.';
        if (response.status === 401) {
          userMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else if (response.status === 403) {
          userMessage = 'No tienes permisos suficientes para usar el asistente de IA.';
        } else if (response.status === 413) {
          userMessage = 'El documento es demasiado largo para ser revisado por la IA.';
        } else if (response.status === 429) {
          userMessage = 'Límite de solicitudes de IA mensual de la organización alcanzado.';
        } else if (response.status === 503) {
          userMessage = 'El servicio de IA no está disponible o falta configuración en el servidor.';
        }
        throw new Error(userMessage);
      }

      const proposal = data.proposal || '';
      setSpellingProposal(proposal);
      setIsDiffModalOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de red o del servidor al procesar la revisión.';
      setSpellingError(message);
    } finally {
      setIsCheckingSpelling(false);
    }
  };

  const [isAutoFillingMetadata, setIsAutoFillingMetadata] = useState<boolean>(false);
  const [autoFillMetadataError, setAutoFillMetadataError] = useState<string | null>(null);

  const handleAutoFillMetadata = async () => {
    if (!editContent.trim()) {
      setAutoFillMetadataError('Se requiere contenido en el documento para generar metadatos.');
      return;
    }
    if (!nodeDetail.id || !nodeDetail.brainId) {
      setAutoFillMetadataError('Falta información del nodo o del cerebro.');
      return;
    }

    const shouldFillDescription = editDescription.trim() === '';
    const shouldFillCategory = editCategory.trim() === '';
    const shouldFillTags = editTags.length === 0;
    const shouldFillChangeNote = editChangeNote.trim() === '';

    if (!shouldFillDescription && !shouldFillCategory && !shouldFillTags && !shouldFillChangeNote) {
      setAutoFillMetadataError(
        'Todos los campos ya tienen contenido. Borra algún campo si quieres que la IA lo sugiera nuevamente.'
      );
      return;
    }

    setIsAutoFillingMetadata(true);
    setAutoFillMetadataError(null);

    try {
      const response = await fetch('/api/ai/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brainId: nodeDetail.brainId,
          nodeId: nodeDetail.id,
          action: 'metadata',
          contentMarkdown: editContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let userMessage = data.error || 'Error al generar los metadatos.';
        if (response.status === 401) {
          userMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else if (response.status === 403) {
          userMessage = 'No tienes permisos suficientes para usar el asistente de IA.';
        } else if (response.status === 413) {
          userMessage = 'El documento es demasiado largo para generar metadatos.';
        } else if (response.status === 429) {
          userMessage = 'Límite de solicitudes de IA mensual de la organización alcanzado.';
        } else if (response.status === 502) {
          userMessage = 'La respuesta de la IA no tiene un formato válido.';
        }
        throw new Error(userMessage);
      }

      const parsed = JSON.parse(data.proposal);

      let didApplyAny = false;

      if (shouldFillDescription) {
        const description = typeof parsed.description === 'string'
          ? parsed.description.substring(0, 200).trim()
          : '';
        onEditDescriptionChange(description);
        didApplyAny = true;
      }

      if (shouldFillCategory) {
        const category = typeof parsed.category === 'string'
          ? parsed.category.substring(0, 50).trim()
          : '';
        onEditCategoryChange(category);
        didApplyAny = true;
      }

      if (shouldFillTags) {
        let tags: string[] = [];
        if (Array.isArray(parsed.tags)) {
          const rawTags = parsed.tags
            .map((t: unknown): string => typeof t === 'string'
              ? t.trim().toLowerCase().replace(/\s+/g, '-').replace(/#/g, '').substring(0, 35)
              : ''
            )
            .filter(Boolean);
          tags = (Array.from(new Set(rawTags)) as string[]).slice(0, 15);
        }
        onEditTagsChange(tags);
        didApplyAny = true;
      }

      if (shouldFillChangeNote) {
        const revisionNote = typeof parsed.revisionNote === 'string'
          ? parsed.revisionNote.substring(0, 180).trim()
          : 'Sugerencia de revisión generada automáticamente por la IA.';
        onEditChangeNoteChange(revisionNote);
        didApplyAny = true;
      }
      
      if (didApplyAny) {
        setAutoFillMetadataError(null);
      }
    } catch (error: unknown) {
      console.error('Error autofilling metadata:', error);
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      setAutoFillMetadataError(message);
    } finally {
      setIsAutoFillingMetadata(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera del Modo Edición Sticky */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm py-4 -mx-8 px-8 border-b border-slate-200/80 flex items-center justify-between shadow-sm -mt-8 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Modo Edición</h1>
          
          {/* Status Badge */}
          {editStatus === 'active' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Vigente
            </span>
          )}
          {editStatus === 'draft' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
              Borrador
            </span>
          )}
          {editStatus === 'needs_review' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              En revisión
            </span>
          )}
          {editStatus === 'archived' && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
              Archivado
            </span>
          )}

          {/* Dirty Indicator */}
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Cambios sin guardar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Guardado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Revisar ortografía Button (Secondary action) */}
          {canEdit !== false && (
            <button
              type="button"
              onClick={handleCheckSpelling}
              disabled={isCheckingSpelling || isSaving || !editContent.trim()}
              title="Revisar ortografía y gramática con IA"
              aria-label="Revisar ortografía y gramática con IA"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCheckingSpelling ? (
                <div className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-violet-600">✨</span>
              )}
              <span>Revisar ortografía</span>
            </button>
          )}

          {/* Cancelar (Secondary neutral action) */}
          <button
            onClick={handleCancelClick}
            disabled={isSaving}
            title="Cancelar edición"
            aria-label="Cancelar edición"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancelar</span>
          </button>

          {/* Guardar cambios (Primary action) */}
          <button
            onClick={openConfigModal}
            disabled={isSaving}
            title={isSaving ? 'Guardando...' : 'Revisar y guardar'}
            aria-label="Revisar y guardar"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>Revisar y guardar</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <span>⚠️ {saveError}</span>
        </div>
      )}

      {spellingError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>⚠️ {spellingError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpellingError(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
            title="Cerrar mensaje"
            aria-label="Cerrar mensaje"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Single Column Layout */}
      <div className="flex flex-col gap-6 w-full mt-2">
        {/* Título */}
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-600 px-0 py-2 text-slate-900 text-3xl font-extrabold focus:outline-none transition-all placeholder-slate-300"
            placeholder="Sin título"
          />
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-1">
          <textarea
            value={editDescription}
            onChange={(e) => onEditDescriptionChange(e.target.value)}
            rows={2}
            maxLength={200}
            className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-600 px-0 py-1 text-slate-600 text-sm focus:outline-none transition-all placeholder-slate-400 resize-none"
            placeholder="Descripción breve del documento (opcional)"
          />
          <div className="flex justify-end text-[10px] font-semibold text-slate-400">
            {editDescription.length}/200
          </div>
        </div>

        {/* Editor */}
        <div className="flex flex-col gap-2">
          <RichMarkdownEditor
            value={editContent}
            onChange={onEditContentChange}
            disabled={isSaving}
            nodeId={nodeDetail.id}
          />
        </div>
      </div>

      {/* Separador de fin de formulario */}
      <div className="border-t border-slate-200 pt-2 mt-2" />

      <SaveReviewModal
        isOpen={isConfigOpen}
        title={editTitle}
        description={editDescription}
        status={editStatus}
        category={editCategory}
        tags={editTags}
        changeNote={editChangeNote}
        tagInput={tagInput}
        validationError={reviewError}
        saveError={saveError}
        isSaving={isSaving}
        onDescriptionChange={onEditDescriptionChange}
        onStatusChange={onEditStatusChange}
        onCategoryChange={onEditCategoryChange}
        onChangeNoteChange={handleChangeNoteChange}
        onTagInputChange={setTagInput}
        onTagInputKeyDown={handleTagInputKeyDown}
        onTagInputBlur={() => addTag(tagInput)}
        onRemoveTag={removeTag}
        onClose={closeConfigModal}
        onConfirm={handleConfirmSave}
        onAutoFillMetadata={handleAutoFillMetadata}
        isAutoFillingMetadata={isAutoFillingMetadata}
        autoFillMetadataError={autoFillMetadataError}
        canAutoFillMetadata={editContent.trim().length > 0}
      />

      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        title="Descartar cambios"
        message="Tienes cambios sin guardar. Si sales ahora, se perderán."
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
        isDestructive
        onConfirm={confirmDiscardChanges}
        onClose={closeDiscardConfirm}
      />

      <ProofreadDiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        baseText={editContent}
        compareText={spellingProposal || ''}
        onApply={() => {
          onEditContentChange(spellingProposal || '');
          setIsDiffModalOpen(false);
        }}
      />
    </div>
  );
}

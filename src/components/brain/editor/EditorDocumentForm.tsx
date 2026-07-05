'use client';

import React, { useState } from 'react';
import { Node } from '@/types';
import RichMarkdownEditor from './rich-text/RichMarkdownEditor';
import SaveReviewModal from './modals/SaveReviewModal';



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
  isDirty?: boolean;
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
  isDirty = false,
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
  const [tagInput, setTagInput] = useState<string>('');
  const [reviewError, setReviewError] = useState<string | null>(null);

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

        <div className="flex items-center gap-2">
          {/* Configuración Button */}
          <button
            type="button"
            onClick={openConfigModal}
            title="Configuración del Documento"
            aria-label="Configuración del Documento"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-sm hover:shadow"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Configuración</span>
          </button>

          {/* Cancelar */}
          <button
            onClick={onCancel}
            disabled={isSaving}
            title="Cancelar edición"
            aria-label="Cancelar edición"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Cancelar</span>
          </button>

          {/* Guardar cambios */}
          <button
            onClick={openConfigModal}
            disabled={isSaving}
            title={isSaving ? 'Guardando...' : 'Revisar y guardar'}
            aria-label="Revisar y guardar"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
      />
    </div>
  );
}

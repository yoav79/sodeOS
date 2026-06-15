'use client';

import React, { useState } from 'react';
import { Node } from '@/types';
import RichMarkdownEditor from './rich-text/RichMarkdownEditor';



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
  onSave: () => void;
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
            onClick={() => setIsConfigOpen(true)}
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
            onClick={onSave}
            disabled={isSaving}
            title={isSaving ? 'Guardando...' : 'Guardar cambios'}
            aria-label="Guardar cambios"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span>Guardar cambios</span>
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

      {/* Modal de Configuración del Documento */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col text-slate-900 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Configuración del Documento</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Estado */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estado de publicación</label>
                <select
                  value={editStatus}
                  onChange={(e) => onEditStatusChange(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors w-full"
                >
                  <option value="active">Vigente (Activo)</option>
                  <option value="draft">Borrador</option>
                  <option value="needs_review">En Revisión</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>

              {/* Categoría */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Categoría</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => onEditCategoryChange(e.target.value)}
                  maxLength={50}
                  className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors w-full"
                  placeholder="Ej: Infraestructura, Recursos Humanos..."
                />
              </div>

              {/* Etiquetas (Tags) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Etiquetas (Tags)</label>
                <div className="border border-slate-200 rounded-xl p-2 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-colors w-full min-h-[42px] flex flex-wrap gap-1.5 items-center">
                  {editTags.map((tag, idx) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none ml-0.5 text-xs font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={() => addTag(tagInput)}
                    className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-700 font-medium focus:outline-none py-0.5"
                    placeholder={editTags.length === 0 ? "Ej: seguridad, wiki..." : ""}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-medium">
                  Enter o coma para agregar. Máximo 15 etiquetas de hasta 35 caracteres.
                </span>
              </div>

              {/* Nota de cambios */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nota de cambios</label>
                <textarea
                  value={editChangeNote}
                  onChange={(e) => onEditChangeNoteChange(e.target.value)}
                  rows={3}
                  className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors placeholder-slate-400 resize-none w-full"
                  placeholder="Ej: Actualización de fechas..."
                />
                <span className="text-[9px] text-slate-400 font-medium leading-normal flex items-start gap-1">
                  <svg className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Se agregará a la versión y será visible en el Historial al guardar.</span>
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

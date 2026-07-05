'use client';

import React from 'react';

interface SaveReviewModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  status: string;
  category: string;
  tags: string[];
  changeNote: string;
  tagInput: string;
  validationError: string | null;
  saveError: string | null;
  isSaving: boolean;
  onDescriptionChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onChangeNoteChange: (val: string) => void;
  onTagInputChange: (val: string) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTagInputBlur: () => void;
  onRemoveTag: (index: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SaveReviewModal({
  isOpen,
  title,
  description,
  status,
  category,
  tags,
  changeNote,
  tagInput,
  validationError,
  saveError,
  isSaving,
  onDescriptionChange,
  onStatusChange,
  onCategoryChange,
  onChangeNoteChange,
  onTagInputChange,
  onTagInputKeyDown,
  onTagInputBlur,
  onRemoveTag,
  onClose,
  onConfirm,
}: SaveReviewModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-review-modal-title"
      onClick={isSaving ? undefined : onClose}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] text-slate-900"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 id="save-review-modal-title" className="text-base font-bold text-slate-900">
              Revisar y guardar
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Completa la revisión antes de confirmar el guardado.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(validationError || saveError) && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              ⚠️ {validationError || saveError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Documento</label>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-800">
              {title || 'Sin título'}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              maxLength={200}
              disabled={isSaving}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors placeholder-slate-400 resize-none disabled:opacity-60"
              placeholder="Descripción breve del documento (opcional)"
            />
            <div className="flex justify-end text-[10px] font-semibold text-slate-400">
              {description.length}/200
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Estado de publicación</label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={isSaving}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors w-full disabled:opacity-60"
            >
              <option value="active">Vigente (Activo)</option>
              <option value="draft">Borrador</option>
              <option value="needs_review">En Revisión</option>
              <option value="archived">Archivado</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Categoría</label>
            <input
              type="text"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              maxLength={50}
              disabled={isSaving}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors w-full disabled:opacity-60"
              placeholder="Ej: Infraestructura, Recursos Humanos..."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Etiquetas (Tags)</label>
            <div className="border border-slate-200 rounded-xl p-2 bg-white focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-colors w-full min-h-[42px] flex flex-wrap gap-1.5 items-center">
              {tags.map((tag, idx) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 rounded-lg px-2 py-0.5 text-[11px] font-semibold"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => onRemoveTag(idx)}
                    disabled={isSaving}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none ml-0.5 text-xs font-bold disabled:opacity-50"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => onTagInputChange(e.target.value)}
                onKeyDown={onTagInputKeyDown}
                onBlur={onTagInputBlur}
                disabled={isSaving}
                className="flex-1 min-w-[120px] bg-transparent text-xs text-slate-700 font-medium focus:outline-none py-0.5 disabled:opacity-60"
                placeholder={tags.length === 0 ? 'Ej: seguridad, wiki...' : ''}
              />
            </div>
            <span className="text-[9px] text-slate-400 font-medium">
              Enter o coma para agregar. Máximo 15 etiquetas de hasta 35 caracteres.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Nota de revisión <span className="text-red-500">*</span>
            </label>
            <textarea
              value={changeNote}
              onChange={(e) => onChangeNoteChange(e.target.value)}
              rows={4}
              disabled={isSaving}
              className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors placeholder-slate-400 resize-none w-full disabled:opacity-60"
              placeholder="Ej: Actualización de fechas y aclaración del proceso."
            />
            <span className="text-[10px] text-slate-500 font-medium leading-normal">
              La nota de revisión es obligatoria para guardar cambios.
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/10"
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

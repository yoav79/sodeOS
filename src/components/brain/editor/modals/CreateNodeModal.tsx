'use client';

import React from 'react';

interface CreateNodeModalProps {
  isOpen: boolean;
  parentId: string | null;
  title: string;
  contentMarkdown: string;
  status: string;
  isCreating: boolean;
  error: string | null;
  onTitleChange: (val: string) => void;
  onContentMarkdownChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function CreateNodeModal({
  isOpen,
  parentId,
  title,
  contentMarkdown,
  status,
  isCreating,
  error,
  onTitleChange,
  onContentMarkdownChange,
  onStatusChange,
  onClose,
  onSubmit,
}: CreateNodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {parentId ? 'Crear Nueva Subpágina' : 'Crear Nuevo Nodo Raíz'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {parentId ? 'Se creará como hijo del nodo seleccionado' : 'Se creará en la raíz del cerebro'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Título (Obligatorio)</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Ej. Guía de Onboarding"
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>

          {/* Content Markdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Contenido Markdown Inicial (Opcional)</label>
            <textarea
              value={contentMarkdown}
              onChange={(e) => onContentMarkdownChange(e.target.value)}
              placeholder={"# Título Principal\n\nEscribe el contenido de tu página en formato Markdown."}
              className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 min-h-[160px] resize-y"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Estado Inicial</label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            >
              <option value="draft">Borrador</option>
              <option value="active">Vigente (Activo)</option>
              <option value="needs_review">En Revisión</option>
              <option value="archived">Archivado</option>
            </select>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center gap-3 justify-end border-t border-slate-100 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/10"
            >
              {isCreating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creando...
                </>
              ) : (
                'Crear Nodo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

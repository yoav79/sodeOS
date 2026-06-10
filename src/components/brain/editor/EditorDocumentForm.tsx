'use client';

import React, { useState } from 'react';
import { Node } from '@/types';
import RichMarkdownEditor from './rich-text/RichMarkdownEditor';

interface EditorDocumentFormProps {
  nodeDetail: Node;
  editTitle: string;
  editContent: string;
  editStatus: string;
  editChangeNote: string;
  saveError: string | null;
  isSaving: boolean;
  onEditTitleChange: (val: string) => void;
  onEditContentChange: (val: string) => void;
  onEditStatusChange: (val: string) => void;
  onEditChangeNoteChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function EditorDocumentForm({
  nodeDetail,
  editTitle,
  editContent,
  editStatus,
  editChangeNote,
  saveError,
  isSaving,
  onEditTitleChange,
  onEditContentChange,
  onEditStatusChange,
  onEditChangeNoteChange,
  onSave,
  onCancel,
}: EditorDocumentFormProps) {
  const [editorMode, setEditorMode] = useState<'visual' | 'markdown'>('visual');

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera del Modo Edición */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Modo Edición</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Actualiza los metadatos y contenido del nodo.</p>
        </div>
      </div>

      {/* Toolbar contextual compacta (modo edición) */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm w-fit">
        {/* Guardar */}
        <button
          onClick={onSave}
          disabled={isSaving}
          title={isSaving ? 'Guardando...' : 'Guardar cambios'}
          aria-label="Guardar cambios"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className="hidden sm:inline">Guardar</span>
        </button>

        {/* Separador */}
        <div className="h-5 w-px bg-slate-200 mx-0.5" />

        {/* Cancelar */}
        <button
          onClick={onCancel}
          disabled={isSaving}
          title="Cancelar edición"
          aria-label="Cancelar edición"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span className="hidden sm:inline">Cancelar</span>
        </button>
      </div>

      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
          <span>⚠️ {saveError}</span>
        </div>
      )}

      {/* Título del documento en edición (Notion-style input) */}
      <div className="flex flex-col gap-1.5">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-600 px-0 py-2 text-slate-900 text-3xl font-extrabold focus:outline-none transition-all placeholder-slate-300"
          placeholder="Sin título"
        />
      </div>

      {/* Selector de modo y advertencia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 w-fit">
          <button
            type="button"
            onClick={() => setEditorMode('visual')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              editorMode === 'visual'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('markdown')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              editorMode === 'markdown'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Markdown
          </button>
        </div>
        <span className="text-[10px] text-slate-400 font-medium sm:text-right">
          Usa Markdown si el documento contiene tablas, Mermaid, HTML o sintaxis avanzada.
        </span>
      </div>

      {/* Editor de Contenido */}
      <div className="flex flex-col gap-2">
        {editorMode === 'visual' ? (
          <RichMarkdownEditor
            value={editContent}
            onChange={onEditContentChange}
            disabled={isSaving}
          />
        ) : (
          <textarea
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-5 text-slate-800 font-sans text-sm leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 min-h-[420px] resize-y shadow-inner transition-colors"
            placeholder="Comienza a escribir en Markdown aquí..."
            disabled={isSaving}
          />
        )}
      </div>

      {/* Panel de Metadatos y Auditoría (compacto y al pie) */}
      <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuración del Documento</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Estado */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Estado de publicación</label>
            <select
              value={editStatus}
              onChange={(e) => onEditStatusChange(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            >
              <option value="active">Vigente (Activo)</option>
              <option value="draft">Borrador</option>
              <option value="needs_review">En Revisión</option>
              <option value="archived">Archivado</option>
            </select>
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Categoría</label>
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-semibold h-[34px] flex items-center">
              {nodeDetail.category || 'Sin categoría programada'}
            </div>
          </div>
        </div>

        {/* Nota de cambios */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Nota de cambios para el Historial</label>
          <input
            type="text"
            value={editChangeNote}
            onChange={(e) => onEditChangeNoteChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            placeholder="Ej: Corrección ortográfica y actualización de fechas de entrega."
          />
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Esta nota se agregará a la versión y será visible en la pestaña Historial.
          </span>
        </div>
      </div>

      {/* Separador de fin de formulario */}
      <div className="border-t border-slate-200 pt-2 mt-2" />
    </div>
  );
}

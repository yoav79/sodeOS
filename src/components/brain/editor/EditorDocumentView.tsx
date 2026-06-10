'use client';

import React from 'react';
import { Node } from '@/types';
import MarkdownDocumentView from './rich-text/MarkdownDocumentView';

interface EditorDocumentViewProps {
  nodeDetail: Node;
  archiveError: string | null;
  onClearArchiveError: () => void;
  moveError: string | null;
  onClearMoveError: () => void;
  isArchiving: boolean;
  isMoving: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onCreateSubpage: (id: string) => void;
  onStartEdit: () => void;
  onOpenMoveModal: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onArchiveNode: () => void;
}

export default function EditorDocumentView({
  nodeDetail,
  archiveError,
  onClearArchiveError,
  moveError,
  onClearMoveError,
  isArchiving,
  isMoving,
  canMoveUp,
  canMoveDown,
  onCreateSubpage,
  onStartEdit,
  onOpenMoveModal,
  onMoveUp,
  onMoveDown,
  onArchiveNode,
}: EditorDocumentViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {archiveError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between gap-2">
          <span>⚠️ {archiveError}</span>
          <button onClick={onClearArchiveError} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}
      {moveError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between gap-2">
          <span>⚠️ {moveError}</span>
          <button onClick={onClearMoveError} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      {/* ── Cabecera: título, badge y toolbar contextual ── */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        {/* Fila superior: título + badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1 truncate">{nodeDetail.title}</h1>
            <p className="text-slate-500 text-sm font-medium">
              {nodeDetail.description || 'Sin descripción adicional para este nodo.'}
            </p>
          </div>
          <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-bold mt-1 ${
            nodeDetail.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            nodeDetail.status === 'draft' ? 'bg-sky-50 text-sky-700 border-sky-200' :
            nodeDetail.status === 'needs_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {nodeDetail.status === 'active' ? 'Vigente' :
             nodeDetail.status === 'draft' ? 'Borrador' :
             nodeDetail.status === 'needs_review' ? 'En Revisión' :
             'Archivado'}
          </span>
        </div>
      </div>

      {/* ── Toolbar contextual compacta (modo lectura) ── */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm w-fit">
        {/* Nueva subpágina */}
        <button
          onClick={() => onCreateSubpage(nodeDetail.id)}
          title="Nueva subpágina"
          aria-label="Nueva subpágina"
          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Editar */}
        <button
          onClick={onStartEdit}
          title="Editar documento"
          aria-label="Editar documento"
          className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="hidden sm:inline text-xs font-semibold">Editar</span>
        </button>

        {/* Separador */}
        <div className="h-5 w-px bg-slate-200 mx-0.5" />

        {/* Mover */}
        <button
          onClick={onOpenMoveModal}
          title="Mover a otra ubicación"
          aria-label="Mover nodo"
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>

        {/* Separador */}
        <div className="h-5 w-px bg-slate-200 mx-0.5" />

        {/* Subir posición */}
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp || isMoving}
          title={canMoveUp ? 'Subir posición' : 'Ya está en la primera posición'}
          aria-label="Subir posición"
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {/* Bajar posición */}
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown || isMoving}
          title={canMoveDown ? 'Bajar posición' : 'Ya está en la última posición'}
          aria-label="Bajar posición"
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Separador danger */}
        <div className="h-5 w-px bg-slate-200 mx-0.5" />

        {/* Archivar */}
        <button
          onClick={onArchiveNode}
          disabled={isArchiving}
          title={isArchiving ? 'Archivando...' : 'Archivar documento (acción destructiva)'}
          aria-label="Archivar documento"
          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isArchiving ? (
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          )}
        </button>
      </div>

      {/* Vista de Documento / Hoja de papel (Light SaaS) */}
      <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-8 md:p-10 min-h-[400px] flex flex-col transition-all">
        {!nodeDetail.contentMarkdown || nodeDetail.contentMarkdown.trim() === '' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 gap-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-200/60 shadow-sm">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-700">Este documento aún no tiene contenido</h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                Comienza a redactar el contenido de esta página o aplica una plantilla de estructura.
              </p>
            </div>
            <button
              onClick={onStartEdit}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors shadow-md shadow-blue-500/10"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Redactar Contenido
            </button>
          </div>
        ) : (
          <MarkdownDocumentView
            content={nodeDetail.contentMarkdown}
            emptyMessage="Este documento todavía no tiene contenido."
            className="!border-none !shadow-none bg-transparent"
            minHeight="300px"
          />
        )}
      </div>
    </div>
  );
}

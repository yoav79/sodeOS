'use client';

import React from 'react';
import { Node } from '@/types';
import MarkdownDocumentView from './rich-text/MarkdownDocumentView';

interface EditorDocumentViewProps {
  nodeDetail: Node;
  onStartEdit: () => void;
  canEdit?: boolean;
}

export default function EditorDocumentView({
  nodeDetail,
  onStartEdit,
  canEdit = true,
}: EditorDocumentViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* ── Cabecera: título, badge y botón Editar ── */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm -mx-8 px-8 pt-8 -mt-8 pb-4 border-b border-slate-200 flex flex-col gap-3">
        {/* Fila superior: título + badge + botón Editar */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1 truncate">{nodeDetail.title}</h1>
            {nodeDetail.description?.trim() && (
              <p className="text-slate-500 text-sm font-medium line-clamp-2">
                {nodeDetail.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {!canEdit && (
              <span className="shrink-0 text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                Solo lectura
              </span>
            )}
            <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-bold ${
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

            {canEdit && (
              <button
                onClick={onStartEdit}
                title="Editar documento"
                aria-label="Editar documento"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors shadow-sm shadow-blue-500/10 print-hide cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Editar</span>
              </button>
            )}
          </div>
        </div>
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
            {!canEdit ? (
              <div>
                <h3 className="text-xs font-semibold text-slate-700">Este documento aún no tiene contenido</h3>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                  Este documento está vacío y no tienes permisos de edición.
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
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

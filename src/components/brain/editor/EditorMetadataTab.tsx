'use client';

import React from 'react';
import { Node } from '@/types';

interface EditorMetadataTabProps {
  nodeDetail: Node;
  copied: boolean;
  onCopyId: (id: string) => void;
  onExportMarkdown?: () => void;
  onExportJson?: () => void;
  isEditing?: boolean;
}

export default function EditorMetadataTab({
  nodeDetail,
  copied,
  onCopyId,
  onExportMarkdown,
  onExportJson,
  isEditing = false,
}: EditorMetadataTabProps) {
  return (
    <div className="space-y-4">
      {/* Sección 1: Identificación y Estado */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identificación</h4>
        
        {/* Estado */}
        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
          <span className="text-slate-500 font-medium">Estado</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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

        {/* ID Único */}
        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
          <span className="text-slate-500 font-medium">ID Único</span>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded px-1.5 py-0.5">
            <span>{nodeDetail.id.slice(0, 8)}...{nodeDetail.id.slice(-4)}</span>
            <button
              type="button"
              onClick={() => onCopyId(nodeDetail.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-200"
              title="Copiar ID completo"
            >
              {copied ? (
                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Slug */}
        <div className="flex items-center justify-between text-xs py-1">
          <span className="text-slate-500 font-medium">Ruta (Slug)</span>
          <span className="font-mono text-[11px] text-slate-700 bg-slate-50 border border-slate-200/60 rounded px-1.5 py-0.5 truncate max-w-[150px]" title={`/${nodeDetail.slug}`}>
            /{nodeDetail.slug}
          </span>
        </div>
      </div>

      {/* Sección 2: Clasificación y Responsables */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalles del Nodo</h4>
        
        {/* Categoría */}
        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
          <span className="text-slate-500 font-medium">Categoría</span>
          <span className="font-semibold text-slate-700">{nodeDetail.category || 'Ninguna'}</span>
        </div>

        {/* Responsable */}
        <div className="flex items-center justify-between text-xs py-1">
          <span className="text-slate-500 font-medium">Responsable</span>
          <span className="font-semibold text-slate-700">
            {nodeDetail.responsibleUserId === '00000000-0000-0000-0000-000000000001' ? 'Usuario Demo' : nodeDetail.responsibleUserId.slice(-8)}
          </span>
        </div>
      </div>

      {/* Sección 3: Ciclo de Vida y Fechas */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciclo de Vida</h4>
        
        {/* Creado */}
        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
          <span className="text-slate-500 font-medium">Creado</span>
          <span className="font-semibold text-slate-700">
            {new Date(nodeDetail.createdAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>

        {/* Actualizado */}
        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
          <span className="text-slate-500 font-medium">Actualizado</span>
          <span className="font-semibold text-slate-700">
            {new Date(nodeDetail.updatedAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>

        {/* Última revisión */}
        <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
          <span className="text-slate-500 font-medium">Última revisión</span>
          <span className="font-semibold text-slate-700">
            {nodeDetail.reviewedAt ? new Date(nodeDetail.reviewedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pendiente'}
          </span>
        </div>

        {/* Próxima revisión */}
        <div className="flex items-center justify-between text-xs py-1">
          <span className="text-slate-500 font-medium">Próxima revisión</span>
          <span className="font-semibold text-slate-700">
            {nodeDetail.nextReviewAt ? new Date(nodeDetail.nextReviewAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No programada'}
          </span>
        </div>
      </div>

      {/* Sección 4: Exportar Documento */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exportar Documento</h4>
        <p className="text-[11px] text-slate-500 leading-normal">
          Descarga el contenido actual del nodo en tu formato preferido.
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={onExportMarkdown}
            disabled={isEditing}
            className="w-full text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Descargar Markdown (.md)
          </button>
          <button
            onClick={onExportJson}
            disabled={isEditing}
            className="w-full text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Descargar JSON (.json)
          </button>
          <button
            onClick={() => typeof window !== 'undefined' && window.print()}
            disabled={isEditing}
            className="w-full text-xs font-semibold py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Documento
          </button>
          {isEditing && (
            <p className="text-[10px] text-amber-600 font-medium text-center mt-1">
              Guarda o cancela la edición antes de exportar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

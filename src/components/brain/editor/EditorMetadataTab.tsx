'use client';

import React from 'react';
import { Node } from '@/types';

interface EditorMetadataTabProps {
  nodeDetail: Node;
  copied: boolean;
  onCopyId: (id: string) => void;
}

const getStatusDetails = (status: string) => {
  switch (status) {
    case 'active':
      return {
        bg: 'bg-emerald-50/60 border-emerald-100/80',
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        title: 'Vigente',
        desc: 'Este documento está activo y publicado.',
        dot: 'bg-emerald-500'
      };
    case 'draft':
      return {
        bg: 'bg-sky-50/60 border-sky-100/80',
        iconBg: 'bg-sky-500/10 text-sky-600',
        title: 'Borrador',
        desc: 'En preparación. Edición restringida.',
        dot: 'bg-sky-500'
      };
    case 'needs_review':
      return {
        bg: 'bg-amber-50/60 border-amber-100/80',
        iconBg: 'bg-amber-500/10 text-amber-600',
        title: 'En Revisión',
        desc: 'Requiere validación de contenidos.',
        dot: 'bg-amber-500'
      };
    default:
      return {
        bg: 'bg-slate-50/60 border-slate-200/40',
        iconBg: 'bg-slate-500/10 text-slate-600',
        title: 'Archivado',
        desc: 'Guardado fuera de circulación.',
        dot: 'bg-slate-400'
      };
  }
};

export default function EditorMetadataTab({
  nodeDetail,
  copied,
  onCopyId,
}: EditorMetadataTabProps) {
  const statusDetails = getStatusDetails(nodeDetail.status);

  return (
    <div className="space-y-4">
      {/* Sección 1: Estado del Nodo */}
      <div className={`border rounded-2xl p-4 shadow-xs flex items-start gap-3.5 ${statusDetails.bg}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${statusDetails.iconBg}`}>
          <span className={`w-2 h-2 rounded-full ${statusDetails.dot} animate-pulse`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-800">{statusDetails.title}</h4>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
            {statusDetails.desc}
          </p>
        </div>
      </div>

      {/* Sección 2: Información General */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Información General</h4>
        
        <div className="space-y-3">
          {/* Categoría */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-5 h-5 rounded-md bg-blue-50/80 flex items-center justify-center border border-blue-100/60 text-blue-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-medium text-[11px]">Categoría</span>
            </div>
            <span className="font-semibold text-slate-700">{nodeDetail.category || 'Ninguna'}</span>
          </div>

          {/* Responsable */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-5 h-5 rounded-md bg-indigo-50/80 flex items-center justify-center border border-indigo-100/60 text-indigo-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="font-medium text-[11px]">Responsable</span>
            </div>
            <span className="font-semibold text-slate-700">
              {nodeDetail.responsibleUserId === '00000000-0000-0000-0000-000000000001' ? 'Usuario Demo' : nodeDetail.responsibleUserId.slice(-8)}
            </span>
          </div>

          {/* Ruta (Slug) */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-5 h-5 rounded-md bg-cyan-50/80 flex items-center justify-center border border-cyan-100/60 text-cyan-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="font-medium text-[11px]">Ruta (Slug)</span>
            </div>
            <span className="font-mono text-[10px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded px-1.5 py-0.5 truncate max-w-[140px]" title={`/${nodeDetail.slug}`}>
              /{nodeDetail.slug}
            </span>
          </div>

          {/* ID Único */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-5 h-5 rounded-md bg-slate-100/80 flex items-center justify-center border border-slate-200/40 text-slate-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <span className="font-medium text-[11px]">ID Único</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded pl-1.5 pr-0.5 py-0.5">
              <span>{nodeDetail.id.slice(0, 8)}...{nodeDetail.id.slice(-4)}</span>
              <button
                type="button"
                onClick={() => onCopyId(nodeDetail.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-200/60"
                title="Copiar ID completo"
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sección 3: Ciclo de Vida */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciclo de Vida</h4>
        
        <div className="space-y-3">
          {/* Creado */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-5 h-5 rounded-md bg-emerald-50/80 flex items-center justify-center border border-emerald-100/60 text-emerald-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                </svg>
              </div>
              <span className="font-medium text-[11px]">Creado</span>
            </div>
            <span className="font-semibold text-slate-700">
              {new Date(nodeDetail.createdAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          {/* Actualizado */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-5 h-5 rounded-md bg-blue-50/80 flex items-center justify-center border border-blue-100/60 text-blue-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19.5" />
                </svg>
              </div>
              <span className="font-medium text-[11px]">Actualizado</span>
            </div>
            <span className="font-semibold text-slate-700">
              {new Date(nodeDetail.updatedAt).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>

          {/* Última revisión */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-5 h-5 rounded-md bg-orange-50/80 flex items-center justify-center border border-orange-100/60 text-orange-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium text-[11px]">Última revisión</span>
            </div>
            <span className="font-semibold text-slate-700">
              {nodeDetail.reviewedAt ? new Date(nodeDetail.reviewedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pendiente'}
            </span>
          </div>

          {/* Próxima revisión */}
          <div className="flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2.5 text-slate-500">
              <div className="w-5 h-5 rounded-md bg-amber-50/80 flex items-center justify-center border border-amber-100/60 text-amber-600 shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="font-medium text-[11px]">Próxima revisión</span>
            </div>
            <span className="font-semibold text-slate-700">
              {nodeDetail.nextReviewAt ? new Date(nodeDetail.nextReviewAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No programada'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

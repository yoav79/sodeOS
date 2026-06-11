'use client';

import React from 'react';
import { Node } from '@/types';
import { NodeVersionWithSaver } from '../BrainEditorClient';

interface EditorRightPanelProps {
  selectedNodeId: string | null;
  nodeDetail: Node | null;
  detailLoading: boolean;
  versions: NodeVersionWithSaver[];
  versionsLoading: boolean;
  versionsError: string | null;
  rightPanelTab: 'meta' | 'history';
  onRightPanelTabChange: (tab: 'meta' | 'history') => void;
  copied: boolean;
  onCopyId: (id: string) => void;
  onRestoreVersion?: (versionId: string) => void | Promise<void>;
  isRestoringVersion?: boolean;
  restoreVersionError?: string | null;
  restoreVersionSuccess?: string | null;
  canRestoreVersion?: boolean;
  onExportMarkdown?: () => void;
  onExportJson?: () => void;
  isEditing?: boolean;
}

export default function EditorRightPanel({
  selectedNodeId,
  nodeDetail,
  detailLoading,
  versions,
  versionsLoading,
  versionsError,
  rightPanelTab,
  onRightPanelTabChange,
  copied,
  onCopyId,
  onRestoreVersion,
  isRestoringVersion = false,
  restoreVersionError = null,
  restoreVersionSuccess = null,
  canRestoreVersion = true,
  onExportMarkdown,
  onExportJson,
  isEditing = false,
}: EditorRightPanelProps) {
  return (
    <aside className="w-72 border-l border-slate-200 bg-white flex flex-col shrink-0 h-full">
      {/* Tabs bar (Segmented control style) */}
      <div className="p-2 border-b border-slate-200 text-xs shrink-0 bg-slate-50">
        <div className="flex bg-slate-200/60 p-0.5 rounded-lg">
          <button
            onClick={() => onRightPanelTabChange('meta')}
            className={`flex-1 py-1.5 px-3 text-center font-medium rounded-md transition-all duration-200 ${
              rightPanelTab === 'meta'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/30'
            }`}
          >
            Metadatos
          </button>
          <button
            onClick={() => onRightPanelTabChange('history')}
            className={`flex-1 py-1.5 px-3 text-center font-medium rounded-md transition-all duration-200 ${
              rightPanelTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/30'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/20">
        {!selectedNodeId ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-600">Ningún documento</h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[190px] mx-auto leading-relaxed">
                Selecciona un documento del sidebar para ver sus metadatos e historial de versiones.
              </p>
            </div>
          </div>
        ) : detailLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[11px] font-medium text-slate-500">Cargando panel...</span>
          </div>
        ) : nodeDetail ? (
          rightPanelTab === 'meta' ? (
            /* Metadatos Tab */
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
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
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
                  {isEditing && (
                    <p className="text-[10px] text-amber-600 font-medium text-center mt-1">
                      Guarda o cancela la edición antes de exportar.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Historial Tab */
            <div className="space-y-4">
              {restoreVersionError && (
                <div className="text-xs text-red-700 py-2.5 bg-red-50 border border-red-200 rounded-xl px-3 font-medium flex items-start gap-2 shadow-sm">
                  <span className="mt-0.5">⚠️</span>
                  <span className="flex-1">{restoreVersionError}</span>
                </div>
              )}
              {restoreVersionSuccess && (
                <div className="text-xs text-emerald-700 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 font-medium flex items-start gap-2 shadow-sm">
                  <span className="mt-0.5">✅</span>
                  <span className="flex-1">{restoreVersionSuccess}</span>
                </div>
              )}
              {versionsLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
                  <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Cargando versiones...</span>
                </div>
              ) : versionsError ? (
                <div className="text-xs text-red-700 py-3 bg-red-50 border border-red-200 rounded-lg px-3 font-semibold">
                  ⚠️ {versionsError}
                </div>
              ) : versions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-600">Sin historial registrado</h3>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                      Los cambios y notas de versión que realices aparecerán aquí para control de versiones.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative pl-3">
                  {/* Vertical line connecting versions */}
                  <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-slate-200" />
                  
                  <div className="space-y-4">
                    {versions.map((ver, idx) => (
                      <div key={ver.id} className="relative pl-6">
                        {/* Point Indicator */}
                        <div className="absolute left-[-2px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 border border-white ring-4 ring-blue-50" />
                        
                        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]" title={ver.title}>
                              {ver.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                ver.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                ver.status === 'draft' ? 'bg-sky-50 border-sky-100 text-sky-700' :
                                ver.status === 'needs_review' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                {ver.status === 'active' ? 'Vigente' :
                                 ver.status === 'draft' ? 'Borrador' :
                                 ver.status === 'needs_review' ? 'En Rev' : 'Arch'}
                              </span>
                              <span className="text-[10px] text-slate-500 bg-slate-50 rounded border border-slate-200 px-1.5 py-0.5 font-mono font-semibold">
                                V{versions.length - idx}
                              </span>
                            </div>
                          </div>
                          
                          {ver.changeNote ? (
                            <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5 italic">
                              &ldquo;{ver.changeNote}&rdquo;
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Sin nota de cambios
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-slate-100/80 mt-1">
                            <span className="flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {ver.saver?.name || 'Usuario'}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                              </svg>
                              {new Date(ver.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>

                          {onRestoreVersion && (
                            <div className="pt-2 border-t border-slate-100 flex justify-end">
                              <button
                                type="button"
                                disabled={isRestoringVersion || canRestoreVersion === false}
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `¿Estás seguro de que deseas restaurar la versión V${versions.length - idx}? esto creará una nueva entrada de auditoría en el historial.`
                                  );
                                  if (confirmed) {
                                    onRestoreVersion(ver.id);
                                  }
                                }}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 disabled:text-slate-400 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-blue-50/50 disabled:hover:bg-transparent"
                              >
                                {isRestoringVersion ? (
                                  <>
                                    <span className="w-2.5 h-2.5 border border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                                    Restaurando...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                    </svg>
                                    Restaurar versión
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs">
            No hay datos disponibles.
          </div>
        )}
      </div>
    </aside>
  );
}

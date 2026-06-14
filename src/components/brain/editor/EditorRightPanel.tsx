'use client';

import React from 'react';
import { Node } from '@/types';
import { NodeVersionWithSaver } from '../BrainEditorClient';
import NodeAttachments from './NodeAttachments';
import EditorMetadataTab from './EditorMetadataTab';

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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  canEdit?: boolean;
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
  isCollapsed = false,
  onToggleCollapse,
  canEdit = true,
}: EditorRightPanelProps) {
  if (isCollapsed) {
    return (
      <aside className="w-12 border-l border-slate-200 bg-slate-50/50 flex flex-col items-center py-3 gap-4 shrink-0 h-full print-hide transition-all duration-250 shadow-inner">
        {/* Toggle Expand Button */}
        <button
          onClick={onToggleCollapse}
          title="Expandir panel lateral"
          aria-label="Expandir panel lateral"
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shadow-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        <div className="h-px w-6 bg-slate-200" />

        {/* Tab Shortcut: Meta */}
        <button
          onClick={() => {
            onRightPanelTabChange('meta');
            onToggleCollapse?.();
          }}
          title="Ver Metadatos"
          aria-label="Ver Metadatos"
          className={`p-2 rounded-xl transition-all ${
            rightPanelTab === 'meta'
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Tab Shortcut: History */}
        <button
          onClick={() => {
            onRightPanelTabChange('history');
            onToggleCollapse?.();
          }}
          title="Ver Historial de Versiones"
          aria-label="Ver Historial de Versiones"
          className={`p-2 rounded-xl transition-all ${
            rightPanelTab === 'history'
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 h-full print-hide transition-all duration-250">
      {/* Tabs bar with Collapse Button */}
      <div className="p-2 border-b border-slate-200 text-xs shrink-0 bg-slate-50 flex items-center gap-2">
        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          title="Colapsar panel lateral"
          aria-label="Colapsar panel lateral"
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shadow-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex bg-slate-200/60 p-0.5 rounded-lg flex-1">
          <button
            onClick={() => onRightPanelTabChange('meta')}
            className={`flex-1 py-1 px-2.5 text-center font-medium rounded-md transition-all duration-200 ${
              rightPanelTab === 'meta'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/30'
            }`}
          >
            Metadatos
          </button>
          <button
            onClick={() => onRightPanelTabChange('history')}
            className={`flex-1 py-1 px-2.5 text-center font-medium rounded-md transition-all duration-200 ${
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
              <EditorMetadataTab
                nodeDetail={nodeDetail}
                copied={copied}
                onCopyId={onCopyId}
                onExportMarkdown={onExportMarkdown}
                onExportJson={onExportJson}
                isEditing={isEditing}
              />

              {/* Sección 5: Adjuntos */}
              <NodeAttachments nodeId={nodeDetail.id} canEdit={canEdit} />
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

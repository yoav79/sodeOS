'use client';

import React from 'react';
import { Node } from '@/types';
import { NodeVersionWithSaver } from '../BrainEditorClient';
import EditorMetadataTab from './EditorMetadataTab';
import EditorHistoryTab from './EditorHistoryTab';
import EditorFilesTab from './EditorFilesTab';
import EditorAITab from './EditorAITab';

interface EditorRightPanelProps {
  selectedNodeId: string | null;
  nodeDetail: Node | null;
  detailLoading: boolean;
  versions: NodeVersionWithSaver[];
  versionsLoading: boolean;
  versionsError: string | null;
  rightPanelTab: 'meta' | 'history' | 'files' | 'ai';
  onRightPanelTabChange: (tab: 'meta' | 'history' | 'files' | 'ai') => void;
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
  contentMarkdown?: string;
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
  isCollapsed = false,
  onToggleCollapse,
  canEdit = true,
  contentMarkdown = '',
}: EditorRightPanelProps) {
  if (isCollapsed) {
    return (
      <aside className="w-12 border-l border-slate-200 bg-slate-50/50 flex flex-col items-center py-4 gap-4 shrink-0 h-full print-hide transition-all duration-250 shadow-inner">
        {/* Toggle Expand Button */}
        <button
          onClick={onToggleCollapse}
          title="Expandir panel lateral"
          aria-label="Expandir panel lateral"
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-400 hover:text-slate-700 transition-all shadow-xs"
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
              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs'
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
              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Tab Shortcut: Files */}
        <button
          onClick={() => {
            onRightPanelTabChange('files');
            onToggleCollapse?.();
          }}
          title="Ver Archivos Adjuntos"
          aria-label="Ver Archivos Adjuntos"
          className={`p-2 rounded-xl transition-all ${
            rightPanelTab === 'files'
              ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-xs'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Tab Shortcut: AI */}
        <button
          onClick={() => {
            onRightPanelTabChange('ai');
            onToggleCollapse?.();
          }}
          title="Asistente IA"
          aria-label="Asistente IA"
          className={`p-2 rounded-xl transition-all ${
            rightPanelTab === 'ai'
              ? 'bg-violet-50 text-violet-600 border border-violet-200 shadow-xs'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.913-6.204C19.757 13.682 21 11.97 21 10.023 21 6.697 18.03 4 14.375 4c-2.42 0-4.526 1.183-5.743 2.973A4.5 4.5 0 003.5 11.5c0 1.956.84 3.714 2.188 4.904l-.875 5.096L9.813 15.904z" />
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0 h-full print-hide transition-all duration-250">
      {/* Tabs bar with Collapse Button */}
      <div className="p-2.5 border-b border-slate-200 text-xs shrink-0 bg-slate-50 flex items-center gap-2">
        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          title="Colapsar panel lateral"
          aria-label="Colapsar panel lateral"
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-400 hover:text-slate-700 transition-all shadow-xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex bg-slate-200/50 p-1 rounded-xl flex-1 border border-slate-200/30 gap-0.5">
          <button
            onClick={() => onRightPanelTabChange('meta')}
            className={`flex-1 py-1.5 px-1 text-center text-[10px] font-medium rounded-lg transition-all duration-200 ${
              rightPanelTab === 'meta'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/50 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            Metadatos
          </button>
          <button
            onClick={() => onRightPanelTabChange('history')}
            className={`flex-1 py-1.5 px-1 text-center text-[10px] font-medium rounded-lg transition-all duration-200 ${
              rightPanelTab === 'history'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/50 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            Historial
          </button>
          <button
            onClick={() => onRightPanelTabChange('files')}
            className={`flex-1 py-1.5 px-1 text-center text-[10px] font-medium rounded-lg transition-all duration-200 ${
              rightPanelTab === 'files'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/50 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            Archivos
          </button>
          <button
            onClick={() => onRightPanelTabChange('ai')}
            className={`flex-1 py-1.5 px-1 text-center text-[10px] font-medium rounded-lg transition-all duration-200 ${
              rightPanelTab === 'ai'
                ? 'bg-white text-violet-600 shadow-xs border border-slate-200/50 font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            IA
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
              />
            </div>
          ) : rightPanelTab === 'history' ? (
            /* Historial Tab */
            <EditorHistoryTab
              versions={versions}
              versionsLoading={versionsLoading}
              versionsError={versionsError}
              onRestoreVersion={onRestoreVersion}
              isRestoringVersion={isRestoringVersion}
              restoreVersionError={restoreVersionError}
              restoreVersionSuccess={restoreVersionSuccess}
              canRestoreVersion={canRestoreVersion}
            />
          ) : rightPanelTab === 'files' ? (
            /* Archivos Tab */
            <EditorFilesTab
              nodeId={nodeDetail.id}
              canEdit={canEdit}
            />
          ) : (
            /* IA Tab */
            <EditorAITab
              nodeId={nodeDetail.id}
              nodeTitle={nodeDetail.title}
              contentMarkdown={contentMarkdown}
              canApply={canEdit}
            />
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

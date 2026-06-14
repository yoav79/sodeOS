'use client';

import React from 'react';
import { NodeTreeItem } from '@/types';
import NodeTree from '@/components/tree/NodeTree';

interface EditorSidebarProps {
  tree: NodeTreeItem[];
  selectedNodeId: string | null;
  loading: boolean;
  error: string | null;
  onSelectNode: (id: string) => void;
  onCreateRootNode: () => void;
  onOpenTemplates: () => void;
  onOpenTrash: () => void;
  onExportBrainJson?: () => void;
  onExportBrainMarkdown?: () => void;
  canExportBrain?: boolean;
  onOpenMembers?: () => void;
  canEditBrain?: boolean;
  canManageMembers?: boolean;
}

export default function EditorSidebar({
  tree,
  selectedNodeId,
  loading,
  error,
  onSelectNode,
  onCreateRootNode,
  onOpenTemplates,
  onOpenTrash,
  onExportBrainJson,
  onExportBrainMarkdown,
  canExportBrain = true,
  onOpenMembers,
  canEditBrain = true,
  canManageMembers = false,
}: EditorSidebarProps) {
  return (
    <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0 print-hide">
      {/* Header del Sidebar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Árbol</h2>
          <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Todos los nodos son páginas.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Exportar Cerebro JSON */}
          <button
            onClick={onExportBrainJson}
            disabled={!canExportBrain || tree.length === 0}
            className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
            title="Exportar cerebro JSON"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          {/* Exportar Cerebro Markdown */}
          <button
            onClick={onExportBrainMarkdown}
            disabled={!canExportBrain || tree.length === 0}
            className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
            title="Exportar cerebro Markdown"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          {/* Plantillas */}
          <button
            onClick={onOpenTemplates}
            className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center"
            title="Ver Plantillas (Solo lectura)"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
          {/* Papelera */}
          {canEditBrain && (
            <button
              onClick={onOpenTrash}
              className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center"
              title="Papelera"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {/* Miembros */}
          {canManageMembers && onOpenMembers && (
            <button
              onClick={onOpenMembers}
              className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center shrink-0"
              title="Gestionar miembros"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          )}
          {/* Nuevo nodo raíz */}
          {canEditBrain && (
            <button
              onClick={onCreateRootNode}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center shrink-0"
              title="Nuevo nodo raíz"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Árbol de nodos */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium">Cargando árbol...</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
            <span className="font-semibold">⚠️ Error al cargar:</span>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && tree.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            Este cerebro no tiene nodos todavía.
          </div>
        )}

        {!loading && !error && tree.length > 0 && (
          <NodeTree
            items={tree}
            selectedNodeId={selectedNodeId}
            onSelectNode={(node) => onSelectNode(node.id)}
          />
        )}
      </div>
    </aside>
  );
}

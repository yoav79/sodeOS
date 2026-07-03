'use client';

import React from 'react';
import { NodeTreeItem } from '@/types';
import NodeTree from '@/components/tree/NodeTree';

interface EditorSidebarProps {
  brainName: string;
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
  onMoveNode?: (nodeId: string, newParentId: string | null, newPosition: number) => void;
  width?: number;
  onResizeStart?: (e: React.MouseEvent) => void;
}

export default function EditorSidebar({
  brainName,
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
  onMoveNode,
  width = 288,
  onResizeStart,
}: EditorSidebarProps) {
  const displayName = brainName?.trim() || 'Cerebro';

  return (
    <aside
      style={{ width: `${width}px` }}
      className="border-r border-slate-200 bg-white flex flex-col shrink-0 print-hide relative"
    >

      {/* ── Header del Sidebar ── */}
      <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-2">

        {/* Fila 1: Nombre del cerebro como título principal */}
        <h2
          className="text-base font-semibold text-slate-800 truncate leading-snug"
          title={displayName}
        >
          {displayName}
        </h2>

        {/* Fila 2: Acciones secundarias (izquierda) + Nuevo (derecha) */}
        <div className="flex items-center justify-between gap-1">

          {/* Grupo izquierdo: acciones secundarias */}
          <div className="flex items-center gap-0.5">
            {/* Exportar JSON */}
            <button
              onClick={onExportBrainJson}
              disabled={!canExportBrain || tree.length === 0}
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Exportar cerebro JSON"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Exportar Markdown */}
            <button
              onClick={onExportBrainMarkdown}
              disabled={!canExportBrain || tree.length === 0}
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Exportar cerebro Markdown"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* Separador visual */}
            <div className="w-px h-3.5 bg-slate-200 mx-1 shrink-0" />

            {/* Plantillas */}
            <button
              onClick={onOpenTemplates}
              className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex items-center justify-center"
              title="Ver Plantillas"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </button>

            {/* Papelera — solo editor/owner, tono destructivo en hover */}
            {canEditBrain && (
              <button
                onClick={onOpenTrash}
                className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center"
                title="Papelera"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            {/* Miembros — solo owner */}
            {canManageMembers && onOpenMembers && (
              <button
                onClick={onOpenMembers}
                className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex items-center justify-center"
                title="Gestionar miembros"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
            )}
          </div>

          {/* Botón Nuevo — primario, solo editor/owner, alinado a la derecha */}
          {canEditBrain && (
            <button
              onClick={onCreateRootNode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors shrink-0"
              title="Nuevo nodo raíz"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo
            </button>
          )}
        </div>
      </div>

      {/* ── Árbol de nodos ── */}
      <div className="flex-1 overflow-y-auto p-3">

        {/* Estado: cargando */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Cargando árbol...</span>
          </div>
        )}

        {/* Estado: error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
            <span className="font-semibold">⚠️ Error al cargar:</span>
            <span>{error}</span>
          </div>
        )}

        {/* Estado: vacío */}
        {!loading && !error && tree.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg
              className="w-10 h-10 text-slate-200"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500">Sin nodos todavía</p>
              {canEditBrain ? (
                <button
                  onClick={onCreateRootNode}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                >
                  Crear el primero →
                </button>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">Este cerebro aún no tiene contenido.</p>
              )}
            </div>
          </div>
        )}

        {/* Árbol */}
        {!loading && !error && tree.length > 0 && (
          <NodeTree
            items={tree}
            selectedNodeId={selectedNodeId}
            onSelectNode={(node) => onSelectNode(node.id)}
            onMoveNode={onMoveNode}
            canEdit={canEditBrain}
          />
        )}
      </div>

      {/* Control de redimensionamiento vertical (Handle) */}
      {onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-blue-400 active:bg-blue-600 transition-colors z-20 group"
          title="Arrastrar para redimensionar el panel"
          role="separator"
          aria-label="Separador de panel"
        >
          {/* Indicación visual al pasar el cursor */}
          <div className="absolute right-0 top-0 bottom-0 w-[4px] opacity-0 group-hover:opacity-100 bg-blue-500/30 transition-opacity" />
        </div>
      )}
    </aside>
  );
}

'use client';

import React from 'react';

export interface TrashedNode {
  id: string;
  title: string;
  slug: string;
  parentId: string | null;
  parentTitle: string | null;
  deletedAt: string;
  updatedBy: string;
  descendantCount: number;
}

interface TrashModalProps {
  isOpen: boolean;
  trashNodes: TrashedNode[];
  trashLoading: boolean;
  trashError: string | null;
  isRestoring: string | null;
  restoreSuccess: string | null;
  restoreError: string | null;
  onClose: () => void;
  onRestoreNode: (id: string, title: string) => void;
  onRetryFetch: () => void;
}

export default function TrashModal({
  isOpen,
  trashNodes,
  trashLoading,
  trashError,
  isRestoring,
  restoreSuccess,
  restoreError,
  onClose,
  onRestoreNode,
  onRetryFetch,
}: TrashModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Papelera de Nodos</span>
              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Solo lectura / Restaurar
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Nodos archivados del cerebro. Restaurar un nodo también recupera sus descendientes archivados juntos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {trashLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-slate-500">Cargando papelera...</span>
            </div>
          )}

          {restoreSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{restoreSuccess}</span>
            </div>
          )}

          {restoreError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-1">
              <span className="font-semibold">⚠️ Error al restaurar:</span>
              <span>{restoreError}</span>
            </div>
          )}

          {trashError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
              <span className="font-semibold flex items-center gap-1">⚠️ {trashError}</span>
              <button
                onClick={onRetryFetch}
                className="w-fit px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {!trashLoading && !trashError && trashNodes.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              La papelera está vacía.
            </div>
          )}

          {!trashLoading && !trashError && trashNodes.length > 0 && (
            <div className="flex flex-col gap-3">
              {trashNodes.map((node) => (
                <div
                  key={node.id}
                  className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-800 truncate max-w-[250px]">
                        {node.title}
                      </h4>
                      {node.descendantCount > 0 && (
                        <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                          +{node.descendantCount} subnodo{node.descendantCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px]">
                      <span>
                        Archivado: {new Date(node.deletedAt).toLocaleString()}
                      </span>
                      {node.parentTitle && (
                        <span className="flex items-center gap-0.5">
                          • Padre original: <strong className="text-slate-600">{node.parentTitle}</strong>
                        </span>
                      )}
                      {!node.parentTitle && node.parentId && (
                        <span className="flex items-center gap-0.5">
                          • Padre original archivado (se restaurará en la raíz)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onRestoreNode(node.id, node.title)}
                    disabled={isRestoring !== null}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                  >
                    {isRestoring === node.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Restaurando...
                      </>
                    ) : (
                      'Restaurar'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

export interface FlatNodeWithDepth {
  id: string;
  title: string;
  depth: number;
}

interface MoveNodeModalProps {
  isOpen: boolean;
  nodeTitle: string;
  nodeParentId: string | null;
  eligibleNodes: FlatNodeWithDepth[];
  isMoving: boolean;
  moveError: string | null;
  onClose: () => void;
  onMove: (parentId: string | null) => void;
}

export default function MoveNodeModal({
  isOpen,
  nodeTitle,
  nodeParentId,
  eligibleNodes,
  isMoving,
  moveError,
  onClose,
  onMove,
}: MoveNodeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Mover Página</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Selecciona el destino para: <span className="font-semibold text-slate-800">&ldquo;{nodeTitle}&rdquo;</span>
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
          {moveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              ⚠️ {moveError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Destino</span>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[40vh] overflow-y-auto bg-slate-50/50">
              <button
                onClick={() => onMove(null)}
                disabled={nodeParentId === null || isMoving}
                className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 hover:bg-slate-100/80 ${
                  nodeParentId === null
                    ? 'bg-blue-50/60 text-blue-700 border-l-2 border-blue-600'
                    : 'text-slate-700'
                }`}
              >
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Raíz (Sin página padre)
              </button>

              {eligibleNodes.map((n) => {
                const isCurrentParent = nodeParentId === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => onMove(n.id)}
                    disabled={isCurrentParent || isMoving}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2 hover:bg-slate-100/80 ${
                      isCurrentParent
                        ? 'bg-blue-50/60 text-blue-700 border-l-2 border-blue-600 font-semibold'
                        : 'text-slate-700 font-medium'
                    }`}
                    style={{ paddingLeft: `${(n.depth + 1) * 16}px` }}
                  >
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">{n.title}</span>
                  </button>
                );
              })}

              {eligibleNodes.length === 0 && nodeParentId === null && (
                <div className="p-8 text-center text-xs text-slate-400 font-medium">
                  No hay otras páginas disponibles en este cerebro.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isMoving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

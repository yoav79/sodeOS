'use client';

import React from 'react';
import { computeLineDiff } from '../../../lib/diff';

interface InlineMarkdownDiffProps {
  baseText: string;
  compareText: string;
  baseLabel?: string;
  compareLabel?: string;
  sourceType: 'history' | 'agentProposal';
  onRestore?: () => void;
  isRestoring?: boolean;
  onClose?: () => void;
  canEdit?: boolean;
}

export default function InlineMarkdownDiff({
  baseText,
  compareText,
  baseLabel,
  compareLabel,
  sourceType,
  onRestore,
  isRestoring = false,
  onClose,
  canEdit = true,
}: InlineMarkdownDiffProps) {
  const diff = computeLineDiff(baseText, compareText);
  const addedCount = diff.filter((line) => line.type === 'added').length;
  const removedCount = diff.filter((line) => line.type === 'removed').length;
  const hasChanges = addedCount > 0 || removedCount > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Banner strip ── */}
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">
                {sourceType === 'history' ? 'Revisión de versión histórica' : 'Propuesta del Agente'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Modo solo lectura &mdash; los cambios no se aplican automáticamente
              </p>
            </div>
          </div>

          {/* Summary badges */}
          {hasChanges && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                +{addedCount} línea{addedCount !== 1 ? 's' : ''}
              </span>
              <span className="text-[11px] font-bold font-mono text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                -{removedCount} línea{removedCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Version labels legend */}
        {(baseLabel || compareLabel) && (
          <div className="flex flex-col gap-1.5 bg-slate-50/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-[11px] font-medium">
            {baseLabel && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center gap-1.5 shrink-0 text-red-600">
                  <span className="w-2 h-2 rounded-sm bg-red-300 border border-red-400 inline-block"></span>
                  Versión histórica:
                </span>
                <span className="text-slate-600 truncate" title={baseLabel}>{baseLabel}</span>
              </div>
            )}
            {compareLabel && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center gap-1.5 shrink-0 text-emerald-700">
                  <span className="w-2 h-2 rounded-sm bg-emerald-300 border border-emerald-400 inline-block"></span>
                  {compareLabel}:
                </span>
                <span className="text-slate-600">estado actual del documento</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Diff body ── */}
      {!hasChanges ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500 bg-white border border-slate-200/80 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Sin diferencias detectadas</p>
            <p className="text-xs text-slate-400 mt-1">Esta versión es idéntica al documento actual.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          {/* Column header */}
          <div className="grid grid-cols-[2rem_1fr] bg-slate-50 border-b border-slate-200/70 px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest select-none">
            <span></span>
            <span>Contenido</span>
          </div>

          {/* Diff lines */}
          <div className="divide-y divide-slate-100/60 font-mono text-[13px] leading-relaxed max-h-[60vh] overflow-y-auto">
            {diff.map((line, idx) => {
              if (line.type === 'added') {
                return (
                  <div key={idx} className="grid grid-cols-[2rem_1fr] bg-emerald-50/60 hover:bg-emerald-50 transition-colors">
                    <span className="text-center text-[11px] font-bold text-emerald-600 py-1.5 select-none border-r border-emerald-100/60">+</span>
                    <span className="px-4 py-1.5 text-emerald-900 whitespace-pre-wrap break-words">{line.text || '\u00a0'}</span>
                  </div>
                );
              }
              if (line.type === 'removed') {
                return (
                  <div key={idx} className="grid grid-cols-[2rem_1fr] bg-red-50/50 hover:bg-red-50 transition-colors">
                    <span className="text-center text-[11px] font-bold text-red-500 py-1.5 select-none border-r border-red-100/60">-</span>
                    <span className="px-4 py-1.5 text-slate-400 line-through decoration-red-300/80 whitespace-pre-wrap break-words">{line.text || '\u00a0'}</span>
                  </div>
                );
              }
              // unchanged
              return (
                <div key={idx} className="grid grid-cols-[2rem_1fr] hover:bg-slate-50/40 transition-colors">
                  <span className="text-center text-[11px] text-slate-300 py-1.5 select-none border-r border-slate-100/40"></span>
                  <span className="px-4 py-1.5 text-slate-700 whitespace-pre-wrap break-words">{line.text || '\u00a0'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200">
        <p className="text-[11px] text-slate-400 font-medium">
          {hasChanges
            ? `${addedCount + removedCount} línea${addedCount + removedCount !== 1 ? 's' : ''} modificada${addedCount + removedCount !== 1 ? 's' : ''}`
            : 'Sin cambios respecto al documento actual'}
        </p>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3.5 py-2 rounded-xl transition-colors"
            >
              Cerrar comparación
            </button>
          )}
          {onRestore && canEdit && (
            <button
              type="button"
              disabled={isRestoring}
              onClick={onRestore}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-500/20"
            >
              {isRestoring ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Restaurando...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                  <span>Restaurar esta versión</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

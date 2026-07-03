'use client';

import React from 'react';
import { NodeVersionWithSaver } from '../BrainEditorClient';

interface EditorHistoryTabProps {
  versions: NodeVersionWithSaver[];
  versionsLoading: boolean;
  versionsError: string | null;
  onRestoreVersion?: (versionId: string) => void | Promise<void>;
  isRestoringVersion?: boolean;
  restoreVersionError?: string | null;
  restoreVersionSuccess?: string | null;
  canRestoreVersion?: boolean;
  onCompareVersion?: (version: NodeVersionWithSaver) => void;
  activeComparisonVersionId?: string | null;
}

export default function EditorHistoryTab({
  versions,
  versionsLoading,
  versionsError,
  onRestoreVersion,
  isRestoringVersion = false,
  restoreVersionError = null,
  restoreVersionSuccess = null,
  canRestoreVersion = true,
  onCompareVersion,
  activeComparisonVersionId = null,
}: EditorHistoryTabProps) {
  const [prevVersions, setPrevVersions] = React.useState(versions);
  const [expandedVersionId, setExpandedVersionId] = React.useState<string | null>(
    versions.length > 0 ? versions[0].id : null
  );
  const [visibleCount, setVisibleCount] = React.useState<number>(5);

  // Reset local pagination and default expansion when the versions list changes (e.g. node selection changed)
  if (versions !== prevVersions) {
    setPrevVersions(versions);
    setVisibleCount(5);
    setExpandedVersionId(versions.length > 0 ? versions[0].id : null);
  }

  return (
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

      {/* Header section with total count */}
      <div className="flex items-center justify-between pb-1 px-1">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historial de versiones</h3>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5 border border-slate-200/50 font-mono">
          {versions.length}
        </span>
      </div>

      {versionsLoading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
          <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Cargando versiones...</span>
        </div>
      ) : versionsError ? (
        <div className="text-xs text-red-700 py-3 bg-red-50 border border-red-200 rounded-xl px-3 font-semibold">
          ⚠️ {versionsError}
        </div>
      ) : versions.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3 bg-white border border-slate-200/60 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-xs">
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
        <div className="space-y-2.5">
          {versions.slice(0, visibleCount).map((ver, idx) => {
            const isExpanded = expandedVersionId === ver.id;
            const versionNumber = versions.length - idx;
            const isActiveComparison = activeComparisonVersionId === ver.id;

            return (
              <div
                key={ver.id}
                className={`border rounded-xl bg-white overflow-hidden transition-all duration-200 ${
                  isActiveComparison
                    ? 'border-violet-300 ring-1 ring-violet-200'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Accordion header toggle */}
                <button
                  type="button"
                  onClick={() => setExpandedVersionId(isExpanded ? null : ver.id)}
                  aria-expanded={isExpanded}
                  className="w-full text-left p-3.5 flex items-center justify-between gap-3 select-none hover:bg-slate-50/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-slate-500 bg-slate-100 rounded border border-slate-200 px-1.5 py-0.5 font-mono font-semibold shrink-0">
                      V{versionNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate min-w-0" title={ver.title}>
                      {ver.title}
                    </span>
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 tracking-wider ${
                        ver.status === 'active'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : ver.status === 'draft'
                          ? 'bg-sky-50 border-sky-100 text-sky-700'
                          : ver.status === 'needs_review'
                          ? 'bg-amber-50 border-amber-100 text-amber-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {ver.status === 'active'
                        ? 'Vigente'
                        : ver.status === 'draft'
                        ? 'Borrador'
                        : ver.status === 'needs_review'
                        ? 'En Rev'
                        : 'Arch'}
                    </span>
                    {isActiveComparison && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider bg-violet-50 border-violet-200 text-violet-700 shrink-0">
                        Comparando
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {new Date(ver.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1.5 border-t border-slate-100 bg-slate-50/20 space-y-3">
                    {ver.changeNote ? (
                      <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50/80 border border-slate-200/40 rounded-lg px-2.5 py-2 italic">
                        &ldquo;{ver.changeNote}&rdquo;
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic px-1">
                        Sin nota de cambios
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1.5 border-t border-slate-100/60">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{ver.saver?.name || 'Usuario'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                        </svg>
                        <span>
                          {new Date(ver.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      {/* Compare button — triggers full-width diff in main area */}
                      {onCompareVersion && (
                        <button
                          type="button"
                          onClick={() => onCompareVersion(ver)}
                          className={`text-[11px] font-bold flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg border ${
                            isActiveComparison
                              ? 'text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100/60'
                              : 'text-violet-600 bg-violet-50/50 border-violet-100 hover:bg-violet-100/50'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                          </svg>
                          <span>{isActiveComparison ? 'Comparando...' : 'Comparar en documento'}</span>
                        </button>
                      )}

                      {/* Restore button */}
                      {onRestoreVersion && (
                        <button
                          type="button"
                          disabled={isRestoringVersion || canRestoreVersion === false}
                          onClick={() => {
                            const confirmed = window.confirm(
                              `¿Estás seguro de que deseas restaurar la versión V${versionNumber}? Esto creará una nueva entrada de auditoría en el historial.`
                            );
                            if (confirmed) {
                              onRestoreVersion(ver.id);
                            }
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400 flex items-center gap-1.5 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-blue-50/50 disabled:hover:bg-transparent"
                        >
                          {isRestoringVersion ? (
                            <>
                              <span className="w-2.5 h-2.5 border border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                              <span>Restaurando...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                              </svg>
                              <span>Restaurar versión</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Local pagination button */}
          {versions.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 5)}
              className="w-full text-xs font-semibold py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all text-center shadow-xs mt-3"
            >
              Ver más versiones
            </button>
          )}
        </div>
      )}
    </div>
  );
}

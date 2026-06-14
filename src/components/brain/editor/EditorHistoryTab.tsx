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
}: EditorHistoryTabProps) {
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
  );
}

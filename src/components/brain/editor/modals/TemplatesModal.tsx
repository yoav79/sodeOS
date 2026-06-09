'use client';

import React from 'react';
import { Template } from '@/types';

interface TemplateField {
  name: string;
  label?: string;
  type?: string;
}

interface TemplateSection {
  name: string;
  label?: string;
}

const renderSchemaSummary = (template: Template) => {
  const schema = template.schemaJson as {
    fields?: TemplateField[];
    sections?: TemplateSection[];
  };
  if (!schema) return null;

  if (schema.fields && Array.isArray(schema.fields)) {
    const fields = schema.fields;
    return (
      <div className="flex flex-col gap-1.5 mt-2.5">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
          Campos ({fields.length}):
        </span>
        <ul className="flex flex-wrap gap-1.5">
          {fields.slice(0, 3).map((f: TemplateField, idx: number) => (
            <li
              key={idx}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono"
            >
              {f.label || f.name} <span className="text-[10px] text-slate-400 font-semibold">({f.type || 'text'})</span>
            </li>
          ))}
          {fields.length > 3 && (
            <li className="text-[10px] text-slate-400 font-semibold flex items-center">
              +{fields.length - 3} más
            </li>
          )}
        </ul>
      </div>
    );
  }

  if (schema.sections && Array.isArray(schema.sections)) {
    const sections = schema.sections;
    return (
      <div className="flex flex-col gap-1.5 mt-2.5">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
          Secciones ({sections.length}):
        </span>
        <ul className="flex flex-wrap gap-1.5">
          {sections.slice(0, 3).map((s: TemplateSection, idx: number) => (
            <li
              key={idx}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono"
            >
              {s.label || s.name}
            </li>
          ))}
          {sections.length > 3 && (
            <li className="text-[10px] text-slate-400 font-semibold flex items-center">
              +{sections.length - 3} más
            </li>
          )}
        </ul>
      </div>
    );
  }

  const keys = Object.keys(schema);
  return (
    <div className="flex flex-col gap-1 mt-2.5">
      <span className="text-xs text-slate-500 font-medium italic">Esquema personalizado</span>
      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
        Atributos raíz: {keys.length > 0 ? keys.join(', ') : 'Ninguno'}
      </span>
    </div>
  );
};

interface TemplatesModalProps {
  isOpen: boolean;
  templates: Template[];
  templatesLoading: boolean;
  templatesError: string | null;
  isApplyingTemplate: string | null;
  applyTemplateError: string | null;
  applySuccessFeedback: string | null;
  isApplyingStructure: string | null;
  applyStructureError: string | null;
  applyStructureSuccess: string | null;
  selectedNodeId: string | null;
  onClose: () => void;
  onApplyTemplate: (templateId: string, name: string) => void;
  onApplyStructureTemplate: (templateId: string, name: string, sectionsCount: number) => void;
  onRetryFetch: () => void;
}

export default function TemplatesModal({
  isOpen,
  templates,
  templatesLoading,
  templatesError,
  isApplyingTemplate,
  applyTemplateError,
  applySuccessFeedback,
  isApplyingStructure,
  applyStructureError,
  applyStructureSuccess,
  selectedNodeId,
  onClose,
  onApplyTemplate,
  onApplyStructureTemplate,
  onRetryFetch,
}: TemplatesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Plantillas del Cerebro</span>
              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Solo lectura
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Estructuras y campos predefinidos disponibles para organizar la información
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
          {templatesLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-slate-500">Cargando plantillas...</span>
            </div>
          )}

          {applySuccessFeedback && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{applySuccessFeedback}</span>
            </div>
          )}

          {applyTemplateError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-1">
              <span className="font-semibold">⚠️ Error al aplicar plantilla:</span>
              <span>{applyTemplateError}</span>
            </div>
          )}

          {applyStructureSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{applyStructureSuccess}</span>
            </div>
          )}

          {applyStructureError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-1">
              <span className="font-semibold">⚠️ Error al aplicar estructura:</span>
              <span>{applyStructureError}</span>
            </div>
          )}

          {templatesError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
              <span className="font-semibold flex items-center gap-1">⚠️ {templatesError}</span>
              <button
                onClick={onRetryFetch}
                className="w-fit px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {!templatesLoading && !templatesError && templates.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              No hay plantillas registradas en este cerebro.
            </div>
          )}

          {!templatesLoading && !templatesError && templates.length > 0 && (
            <div className="flex flex-col gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-sm font-bold text-slate-800 font-sans">
                      {tpl.name}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border tracking-wide uppercase shrink-0 ${
                        tpl.templateType === 'page'
                          ? 'bg-blue-50 border-blue-100 text-blue-700'
                          : 'bg-violet-50 border-violet-100 text-violet-700'
                      }`}
                    >
                      {tpl.templateType === 'page' ? 'Página' : 'Estructura'}
                    </span>
                  </div>
                  
                  {tpl.description && (
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {tpl.description}
                    </p>
                  )}

                  {/* Render schema summary */}
                  {renderSchemaSummary(tpl)}

                  {/* Apply button only for page type templates */}
                  {tpl.templateType === 'page' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                      {!selectedNodeId ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Selecciona un nodo para aplicar esta plantilla
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Reemplazará contenido del nodo
                        </span>
                      )}
                      <button
                        onClick={() => onApplyTemplate(tpl.id, tpl.name)}
                        disabled={!selectedNodeId || isApplyingTemplate !== null}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm shadow-blue-500/10"
                      >
                        {isApplyingTemplate === tpl.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Aplicando...
                          </>
                        ) : (
                          'Aplicar'
                        )}
                      </button>
                    </div>
                  )}

                  {/* Apply button only for structure type templates */}
                  {tpl.templateType === 'structure' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                      {!selectedNodeId ? (
                        <span className="text-[11px] text-slate-400 font-medium">
                          Selecciona un nodo para aplicar esta estructura
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Creará subnodos hijos
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const sectionsCount = (tpl.schemaJson as { sections?: unknown[] })?.sections?.length || 0;
                          onApplyStructureTemplate(tpl.id, tpl.name, sectionsCount);
                        }}
                        disabled={!selectedNodeId || isApplyingStructure !== null}
                        className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm shadow-violet-500/10"
                      >
                        {isApplyingStructure === tpl.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creando...
                          </>
                        ) : (
                          'Aplicar estructura'
                        )}
                      </button>
                    </div>
                  )}
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

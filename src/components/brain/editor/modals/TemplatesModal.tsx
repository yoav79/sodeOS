'use client';

import React from 'react';
import { Template } from '@/types';

export interface TemplateFieldRow {
  name: string;
  label: string;
  type: string;
}

export interface TemplateSectionRow {
  name: string;
  label: string;
}

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

  // New CRUD properties (TPL3B)
  canManageTemplates: boolean;
  canApplyTemplates: boolean;
  isTemplateFormOpen: boolean;
  templateFormName: string;
  templateFormDescription: string;
  templateFormType: 'page' | 'structure';
  templateFormFields: TemplateFieldRow[];
  templateFormSections: TemplateSectionRow[];
  isSubmittingTemplate: boolean;
  templateFormError: string | null;
  onOpenCreateForm: () => void;
  onCloseForm: () => void;
  onTemplateFormNameChange: (v: string) => void;
  onTemplateFormDescriptionChange: (v: string) => void;
  onTemplateFormTypeChange: (v: 'page' | 'structure') => void;
  onTemplateFormFieldsChange: (rows: TemplateFieldRow[]) => void;
  onTemplateFormSectionsChange: (rows: TemplateSectionRow[]) => void;
  onSubmitCreate: () => void;
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

  // New CRUD properties (TPL3B)
  canManageTemplates,
  canApplyTemplates,
  isTemplateFormOpen,
  templateFormName,
  templateFormDescription,
  templateFormType,
  templateFormFields,
  templateFormSections,
  isSubmittingTemplate,
  templateFormError,
  onOpenCreateForm,
  onCloseForm,
  onTemplateFormNameChange,
  onTemplateFormDescriptionChange,
  onTemplateFormTypeChange,
  onTemplateFormFieldsChange,
  onTemplateFormSectionsChange,
  onSubmitCreate,
}: TemplatesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{isTemplateFormOpen ? 'Nueva Plantilla' : 'Plantillas del Cerebro'}</span>
              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {canManageTemplates ? 'Administración' : 'Solo lectura'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isTemplateFormOpen 
                ? 'Diseña una nueva plantilla definiendo sus campos o estructura'
                : 'Estructuras y campos predefinidos disponibles para organizar la información'}
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
          {/* Nueva Plantilla Button (Visible only to owners when form is closed) */}
          {canManageTemplates && !isTemplateFormOpen && !templatesLoading && !templatesError && (
            <div className="flex justify-end mb-2">
              <button
                onClick={onOpenCreateForm}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Nueva plantilla
              </button>
            </div>
          )}

          {isTemplateFormOpen ? (
            /* Form Mode View */
            <div className="flex flex-col gap-4">
              {templateFormError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-1">
                  <span className="font-semibold">⚠️ Error:</span>
                  <span>{templateFormError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nombre de la plantilla *</label>
                <input
                  type="text"
                  value={templateFormName}
                  onChange={(e) => onTemplateFormNameChange(e.target.value)}
                  placeholder="Ej. Reporte Semanal"
                  maxLength={100}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <span className="text-[10px] text-slate-400 self-end font-semibold">{templateFormName.length}/100</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Descripción (opcional)</label>
                <textarea
                  value={templateFormDescription}
                  onChange={(e) => onTemplateFormDescriptionChange(e.target.value)}
                  placeholder="Explica para qué sirve esta plantilla..."
                  maxLength={300}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                />
                <span className="text-[10px] text-slate-400 self-end font-semibold">{templateFormDescription.length}/300</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tipo de plantilla *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="templateType"
                      checked={templateFormType === 'page'}
                      onChange={() => onTemplateFormTypeChange('page')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    Página (Reemplaza contenido)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="templateType"
                      checked={templateFormType === 'structure'}
                      onChange={() => onTemplateFormTypeChange('structure')}
                      className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    Estructura (Crea subnodos)
                  </label>
                </div>
              </div>

              {/* Dynamic schema editor */}
              {templateFormType === 'page' ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Campos de la plantilla *</label>
                    <button
                      type="button"
                      onClick={() => {
                        onTemplateFormFieldsChange([...templateFormFields, { name: '', label: '', type: 'text' }]);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors"
                    >
                      + Agregar campo
                    </button>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                          <th className="px-3 py-2 w-1/3">Nombre técnico *</th>
                          <th className="px-3 py-2 w-1/3">Etiqueta (Label)</th>
                          <th className="px-3 py-2 w-1/4">Tipo</th>
                          <th className="px-3 py-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {templateFormFields.map((field, idx) => (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="p-2">
                              <input
                                type="text"
                                value={field.name}
                                onChange={(e) => {
                                  const updated = [...templateFormFields];
                                  updated[idx].name = e.target.value;
                                  onTemplateFormFieldsChange(updated);
                                }}
                                placeholder="autor"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => {
                                  const updated = [...templateFormFields];
                                  updated[idx].label = e.target.value;
                                  onTemplateFormFieldsChange(updated);
                                }}
                                placeholder="Autor"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={field.type}
                                onChange={(e) => {
                                  const updated = [...templateFormFields];
                                  updated[idx].type = e.target.value;
                                  onTemplateFormFieldsChange(updated);
                                }}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                              >
                                <option value="text">Texto corto (text)</option>
                                <option value="markdown">Editor rico (markdown)</option>
                                <option value="date">Fecha (date)</option>
                                <option value="number">Número (number)</option>
                                <option value="email">Email</option>
                                <option value="url">URL</option>
                              </select>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                disabled={templateFormFields.length === 1}
                                onClick={() => {
                                  const updated = templateFormFields.filter((_, i) => i !== idx);
                                  onTemplateFormFieldsChange(updated);
                                }}
                                className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    * El nombre técnico no debe contener espacios ni caracteres especiales (solo letras minúsculas, números y guión bajo).
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Secciones de la estructura *</label>
                    <button
                      type="button"
                      onClick={() => {
                        onTemplateFormSectionsChange([...templateFormSections, { name: '', label: '' }]);
                      }}
                      className="text-xs text-violet-600 hover:text-violet-700 font-bold flex items-center gap-1 transition-colors"
                    >
                      + Agregar sección
                    </button>
                  </div>

                  <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                          <th className="px-3 py-2 w-1/2">Nombre técnico *</th>
                          <th className="px-3 py-2 w-1/2">Etiqueta (Label)</th>
                          <th className="px-3 py-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {templateFormSections.map((section, idx) => (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="p-2">
                              <input
                                type="text"
                                value={section.name}
                                onChange={(e) => {
                                  const updated = [...templateFormSections];
                                  updated[idx].name = e.target.value;
                                  onTemplateFormSectionsChange(updated);
                                }}
                                placeholder="introduccion"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={section.label}
                                onChange={(e) => {
                                  const updated = [...templateFormSections];
                                  updated[idx].label = e.target.value;
                                  onTemplateFormSectionsChange(updated);
                                }}
                                placeholder="Introducción"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-500"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                disabled={templateFormSections.length === 1}
                                onClick={() => {
                                  const updated = templateFormSections.filter((_, i) => i !== idx);
                                  onTemplateFormSectionsChange(updated);
                                }}
                                className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    * El nombre técnico no debe contener espacios ni caracteres especiales (solo letras minúsculas, números y guión bajo).
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* List Mode View */
            <>
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
                      {tpl.templateType === 'page' && canApplyTemplates && (
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
                      {tpl.templateType === 'structure' && canApplyTemplates && (
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          {isTemplateFormOpen ? (
            <>
              <button
                type="button"
                onClick={onCloseForm}
                disabled={isSubmittingTemplate}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-sm font-semibold text-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onSubmitCreate}
                disabled={isSubmittingTemplate}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/10"
              >
                {isSubmittingTemplate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

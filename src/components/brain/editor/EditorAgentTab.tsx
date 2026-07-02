'use client';

import React, { useState } from 'react';
import ConfirmModal from './modals/ConfirmModal';

// Local client-safe type definitions to avoid bundling issues with 'server-only' backend types
export type AgentOutputMode = 'answer' | 'proposal' | 'summary' | 'rewrite' | 'structure';

export interface AgentStep {
  stepNumber: number;
  description: string;
  estimatedTool: string;
  rationale: string;
}

export interface AgentPlan {
  intent: string;
  steps: AgentStep[];
  estimatedTools: string[];
  requiresWebSearch: boolean;
  requiresUserConfirmation: boolean;
  planSummary: string;
  warnings?: string[];
}

export interface AgentObservation {
  stepNumber: number;
  toolName: string;
  ok: boolean;
  data?: unknown;
  errorMessage?: string;
  errorCode?: string;
  warnings?: string[];
  meta?: {
    charCount?: number;
    itemCount?: number;
    truncated?: boolean;
  };
}

export interface AgentRunStepResult {
  stepNumber: number;
  description: string;
  estimatedTool: string;
  status: 'executed' | 'skipped' | 'failed';
  observation?: AgentObservation;
  skippedReason?: 'unsupported_tool' | 'max_steps_limit';
}

export interface AgentRunResult {
  runId: string;
  status: 'success' | 'partial_success' | 'failed';
  steps: AgentRunStepResult[];
  observations: AgentObservation[];
  summary: {
    totalSteps: number;
    executedSteps: number;
    skippedSteps: number;
    failedSteps: number;
    totalChars: number;
  };
  warnings?: string[];
}

export interface AgentFinalizeSource {
  toolName: string;
  type: string;
  label: string;
  truncated?: boolean;
  url?: string;
  snippet?: string;
}

export interface AgentFinalizeResult {
  success: boolean;
  finalMarkdown: string;
  outputMode: AgentOutputMode;
  sources: AgentFinalizeSource[];
  warnings: string[];
  metadata: {
    model: string;
    tokensUsed?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    runId: string;
    runStatus: string;
    observationsUsed: number;
    contextChars: number;
  };
  canApplyToDraft: boolean;
}

export type AgentLoadingStage = 'idle' | 'planning' | 'running' | 'finalizing' | 'done' | 'error';

interface EditorAgentTabProps {
  brainId: string | null;
  nodeId: string | null;
  selectedNodeTitle: string | null;
  contentMarkdown: string;
  canEdit: boolean;
  onInsertAIProposal?: (proposal: string) => void;
  onReplaceWithAIProposal?: (proposal: string) => void;
}

export default function EditorAgentTab({
  brainId,
  nodeId,
  selectedNodeTitle,
  contentMarkdown,
  canEdit,
  onInsertAIProposal,
  onReplaceWithAIProposal,
}: EditorAgentTabProps) {
  const [agentQuery, setAgentQuery] = useState<string>('');
  const [agentOutputMode, setAgentOutputMode] = useState<AgentOutputMode>('answer');
  const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = useState<boolean>(false);
  const [agentApplyMessage, setAgentApplyMessage] = useState<string | null>(null);
  const [agentEnableWebSearch, setAgentEnableWebSearch] = useState<boolean>(false);

  // Outputs
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null);
  const [agentRunResult, setAgentRunResult] = useState<AgentRunResult | null>(null);
  const [agentFinalResult, setAgentFinalResult] = useState<AgentFinalizeResult | null>(null);

  // States
  const [agentLoadingStage, setAgentLoadingStage] = useState<AgentLoadingStage>('idle');
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentWarnings, setAgentWarnings] = useState<string[]>([]);
  const [agentShowPlan, setAgentShowPlan] = useState<boolean>(false);
  const [agentCopied, setAgentCopied] = useState<boolean>(false);

  // Calculations
  const finalMarkdown = agentFinalResult?.finalMarkdown?.trim() ?? '';
  const canApplyAgentProposal = canEdit && agentFinalResult?.canApplyToDraft !== false && finalMarkdown.length > 0;

  // Error Message mapper
  const getErrorMessage = (status: number, defaultMsg: string): string => {
    if (status === 401) return 'Sin sesión activa.';
    if (status === 403) return 'Sin permisos en este espacio.';
    if (status === 503) return 'El servicio de IA no está configurado en el servidor.';
    return defaultMsg;
  };

  // Helper fetch calls
  const planAgentRequest = async () => {
    const res = await fetch('/api/ai/agent/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brainId, nodeId, userQuery: agentQuery, contentMarkdown }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(getErrorMessage(res.status, data.error || 'Error al planificar el agente.'));
    }
    return data as AgentPlan;
  };

  const runAgentRequest = async (plan: AgentPlan) => {
    const res = await fetch('/api/ai/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brainId,
        nodeId,
        userQuery: agentQuery,
        approvedPlan: plan,
        contentMarkdown,
        enableWebSearch: agentEnableWebSearch,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(getErrorMessage(res.status, data.error || 'Error al ejecutar el plan del agente.'));
    }
    return data as AgentRunResult;
  };

  const finalizeAgentRequest = async (run: AgentRunResult) => {
    const res = await fetch('/api/ai/agent/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brainId,
        nodeId,
        userQuery: agentQuery,
        runResult: run,
        outputMode: agentOutputMode,
        contentMarkdown,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(getErrorMessage(res.status, data.error || 'Error al finalizar la respuesta.'));
    }
    return data as AgentFinalizeResult;
  };

  // Actions
  const handlePlan = async () => {
    if (!brainId || !nodeId) return;
    if (!agentQuery.trim()) {
      setAgentError('Por favor, ingresa una petición.');
      return;
    }

    setAgentLoadingStage('planning');
    setAgentError(null);
    setAgentPlan(null);
    setAgentRunResult(null);
    setAgentFinalResult(null);
    setAgentWarnings([]);
    setAgentShowPlan(false);

    try {
      const plan = await planAgentRequest();
      setAgentPlan(plan);
      setAgentShowPlan(true);
      if (plan.warnings && plan.warnings.length > 0) {
        setAgentWarnings((prev) => [...prev, ...plan.warnings!]);
      }
      setAgentLoadingStage('idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al planificar.';
      setAgentError(msg);
      setAgentLoadingStage('error');
    }
  };

  const handleApproveAndRun = async () => {
    if (!agentPlan) return;

    setAgentLoadingStage('running');
    setAgentError(null);
    setAgentRunResult(null);
    setAgentFinalResult(null);

    try {
      const runRes = await runAgentRequest(agentPlan);
      setAgentRunResult(runRes);

      // Validate run observations
      const hasOkObservations = runRes.observations.some(obs => obs.ok);
      if (!hasOkObservations) {
        throw new Error('No se obtuvieron datos suficientes del plan ejecutado.');
      }

      if (runRes.warnings && runRes.warnings.length > 0) {
        setAgentWarnings((prev) => [...prev, ...runRes.warnings!]);
      }

      setAgentLoadingStage('finalizing');
      const finalizeRes = await finalizeAgentRequest(runRes);
      setAgentFinalResult(finalizeRes);

      if (finalizeRes.warnings && finalizeRes.warnings.length > 0) {
        setAgentWarnings((prev) => [...prev, ...finalizeRes.warnings]);
      }

      setAgentLoadingStage('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al ejecutar o finalizar.';
      setAgentError(msg);
      setAgentLoadingStage('error');
    }
  };

  const handleCopy = () => {
    if (!agentFinalResult?.finalMarkdown) return;
    navigator.clipboard.writeText(agentFinalResult.finalMarkdown);
    setAgentCopied(true);
    setTimeout(() => setAgentCopied(false), 2000);
  };

  const handleReset = () => {
    setAgentQuery('');
    setAgentPlan(null);
    setAgentRunResult(null);
    setAgentFinalResult(null);
    setAgentLoadingStage('idle');
    setAgentError(null);
    setAgentWarnings([]);
    setAgentShowPlan(false);
    setAgentApplyMessage(null);
    setAgentEnableWebSearch(false);
  };

  const handleInsertAgentProposal = () => {
    if (!finalMarkdown || !canApplyAgentProposal) return;
    if (onInsertAIProposal) {
      onInsertAIProposal(finalMarkdown);
      setAgentApplyMessage('Propuesta del agente insertada en el borrador.');
      setTimeout(() => setAgentApplyMessage(null), 6000);
    }
  };

  const handleReplaceAgentProposal = () => {
    if (!finalMarkdown || !canApplyAgentProposal) return;
    setIsReplaceConfirmOpen(true);
  };

  const handleConfirmReplace = () => {
    if (onReplaceWithAIProposal) {
      onReplaceWithAIProposal(finalMarkdown);
      setAgentApplyMessage('Borrador reemplazado con la propuesta del agente.');
      setTimeout(() => setAgentApplyMessage(null), 6000);
    }
    setIsReplaceConfirmOpen(false);
  };

  return (
    <div className="space-y-4 text-slate-700">
      <div>
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span className="text-violet-600">🤖</span> Asistente Agente
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
          Planifica y ejecuta búsquedas internas para armar una respuesta estructurada sobre &quot;{selectedNodeTitle}&quot;.
        </p>
      </div>

      <div className="h-px bg-slate-200/60" />

      {/* Input de consulta */}
      <div className="space-y-1.5">
        <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider block">
          Petición al Agente
        </label>
        <textarea
          value={agentQuery}
          onChange={(e) => setAgentQuery(e.target.value)}
          placeholder="Ej: Busca sobre políticas de vacaciones en el cerebro y genera un resumen..."
          rows={3}
          disabled={agentLoadingStage === 'planning' || agentLoadingStage === 'running' || agentLoadingStage === 'finalizing'}
          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white placeholder-slate-400 disabled:bg-slate-50"
        />
      </div>

      {/* Selector de modo de salida */}
      <div className="space-y-1.5">
        <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider block">
          Formato de Salida
        </label>
        <select
          value={agentOutputMode}
          onChange={(e) => setAgentOutputMode(e.target.value as AgentOutputMode)}
          disabled={agentLoadingStage === 'planning' || agentLoadingStage === 'running' || agentLoadingStage === 'finalizing'}
          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white"
        >
          <option value="answer">Respuesta directa (Pregunta)</option>
          <option value="proposal">Propuesta de nuevo contenido</option>
          <option value="summary">Resumen estructurado</option>
          <option value="rewrite">Reescritura del actual</option>
          <option value="structure">Estructura / Outline del documento</option>
        </select>
      </div>

      {/* Botón de planificación */}
      {agentLoadingStage !== 'planning' &&
       agentLoadingStage !== 'running' &&
       agentLoadingStage !== 'finalizing' &&
       agentLoadingStage !== 'done' && (
        <button
          type="button"
          onClick={handlePlan}
          className="w-full py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
        >
          <span>✨ Planificar pasos</span>
        </button>
      )}

      {/* Stage: Loading spinners */}
      {(agentLoadingStage === 'planning' || agentLoadingStage === 'running' || agentLoadingStage === 'finalizing') && (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2 text-center">
          <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[11px] font-medium text-slate-600">
            {agentLoadingStage === 'planning' && 'Analizando petición y estructurando plan...'}
            {agentLoadingStage === 'running' && 'Ejecutando pasos y herramientas...'}
            {agentLoadingStage === 'finalizing' && 'Generando propuesta final en Markdown...'}
          </span>
        </div>
      )}

      {/* Banners de error */}
      {agentError && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10.5px] leading-normal flex flex-col gap-1.5">
          <span>⚠️ {agentError}</span>
          {agentLoadingStage === 'error' && (
            <button
              onClick={agentPlan ? handleApproveAndRun : handlePlan}
              className="text-left text-[10px] font-bold underline hover:text-red-800 transition-colors"
            >
              Haga clic aquí para reintentar.
            </button>
          )}
        </div>
      )}

      {/* Plan Details Card */}
      {agentShowPlan && agentPlan && (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-md uppercase">
                Plan de Ejecución
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[9.5px] font-medium text-slate-400 hover:text-slate-600"
              >
                Cancelar
              </button>
            </div>
            <p className="text-[11px] font-medium text-slate-700 mt-1.5 leading-relaxed">
              {agentPlan.planSummary}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
              Pasos Propuestos
            </span>
            <ul className="text-[10.5px] text-slate-600 space-y-1">
              {agentPlan.steps.map((step) => (
                <li key={step.stepNumber} className="flex gap-1.5 leading-relaxed">
                  <span className="text-slate-400 font-semibold">{step.stepNumber}.</span>
                  <span>
                    <strong>{step.estimatedTool}:</strong> {step.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {agentPlan.requiresWebSearch && (
            <div className="space-y-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-[10.5px] leading-relaxed text-amber-800">
              <span className="font-semibold block">🌐 Búsqueda web externa requerida</span>
              <p className="text-[10px] text-amber-700 leading-normal">
                Este plan propone consultar internet. La consulta externa enviará únicamente tu pregunta al proveedor (Serper) para encontrar resultados públicos, sin revelar el contenido de tu documento ni datos de tu cuenta.
              </p>
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agentEnableWebSearch}
                  disabled={!canEdit}
                  onChange={(e) => setAgentEnableWebSearch(e.target.checked)}
                  className="rounded border-slate-350 text-violet-600 focus:ring-violet-500 w-3.5 h-3.5"
                />
                <span className="font-semibold text-slate-700">
                  Autorizo buscar en internet usando mi petición.
                </span>
              </label>
              {!canEdit && (
                <p className="text-[9px] text-red-600 font-medium">
                  🔒 Solo editores u owners pueden habilitar búsqueda web.
                </p>
              )}
              {canEdit && !agentEnableWebSearch && (
                <p className="text-[9px] text-amber-600 font-semibold bg-white/50 px-1 py-0.5 rounded border border-amber-100/50">
                  ⚠️ Advertencia: Se ejecutará el plan omitiendo la búsqueda web externa (solo información interna).
                </p>
              )}
            </div>
          )}

          {agentLoadingStage === 'idle' && (
            <button
              type="button"
              onClick={handleApproveAndRun}
              className="w-full py-1.5 px-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Aprobar y ejecutar plan
            </button>
          )}
        </div>
      )}

      {/* Execution Results */}
      {agentRunResult && (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
          <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
            Estado de Ejecución
          </span>
          <div className="space-y-1.5 text-[10.5px]">
            {agentRunResult.steps.map((step) => (
              <div key={step.stepNumber} className="flex items-start gap-2 leading-relaxed">
                {step.status === 'executed' && <span className="text-emerald-600">✓</span>}
                {step.status === 'skipped' && <span className="text-amber-500">⚠</span>}
                {step.status === 'failed' && <span className="text-red-500">✗</span>}
                <div>
                  <span className="font-semibold text-slate-700">Paso {step.stepNumber} ({step.estimatedTool})</span>
                  <span className="text-slate-500 block text-[10px]">
                    {step.status === 'executed' && 'Ejecutado con éxito.'}
                    {step.status === 'skipped' && `Omitido: ${step.skippedReason === 'unsupported_tool' ? 'Herramienta no soportada' : 'Límite de pasos alcanzado'}`}
                    {step.status === 'failed' && `Fallido: ${step.observation?.errorMessage || 'Error en herramienta'}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings Panel */}
      {agentWarnings.length > 0 && (
        <div className="p-2 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-[10px] space-y-1 leading-normal">
          <span className="font-semibold block uppercase text-[9px] tracking-wider">Advertencias del Agente</span>
          <ul className="list-disc pl-3.5 space-y-0.5">
            {Array.from(new Set(agentWarnings)).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Output */}
      {agentFinalResult && agentFinalResult.finalMarkdown && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
              Propuesta del Agente
            </span>
            <button
              type="button"
              onClick={handleReset}
              className="text-[10.5px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Nueva petición
            </button>
          </div>

          <div className="w-full h-44 overflow-y-auto p-2.5 border border-slate-200/80 rounded-lg bg-slate-50 font-mono text-[10.5px] whitespace-pre-wrap select-text leading-relaxed">
            {agentFinalResult.finalMarkdown}
          </div>

          {/* Listado de fuentes consultadas */}
          {agentFinalResult.sources && agentFinalResult.sources.length > 0 && (
            <div className="space-y-1.5 border border-slate-100 rounded-lg p-2.5 bg-slate-50/30">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Fuentes Citadas ({agentFinalResult.sources.length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {agentFinalResult.sources.map((src, idx) => {
                  const isWeb = src.type === 'web_search';
                  return (
                    <div key={idx} className="text-[10px] bg-white border border-slate-200 p-1.5 rounded-md leading-normal space-y-0.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                          {src.label}
                        </span>
                        <span className={`text-[8.5px] px-1 py-0.2 rounded border font-semibold ${
                          isWeb 
                            ? 'bg-sky-50 text-sky-700 border-sky-100' 
                            : 'bg-violet-50 text-violet-700 border-violet-100'
                        }`}>
                          {isWeb ? 'Web' : 'Interno'}
                        </span>
                      </div>
                      {isWeb && src.url && (
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9.5px] text-sky-600 hover:underline truncate block font-medium"
                        >
                          🔗 {src.url}
                        </a>
                      )}
                      {src.snippet && (
                        <p className="text-[9px] text-slate-400 italic line-clamp-2">
                          &quot;{src.snippet}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {agentApplyMessage && (
              <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-[10.5px] text-center font-medium">
                {agentApplyMessage}
              </div>
            )}

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[10.5px] rounded-lg shadow-xs transition-colors"
              >
                {agentCopied ? '¡Copiado!' : 'Copiar'}
              </button>

              <button
                type="button"
                onClick={handleInsertAgentProposal}
                disabled={!canApplyAgentProposal || !onInsertAIProposal}
                className="flex-1 py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold text-[10.5px] rounded-lg shadow-xs transition-colors"
              >
                Insertar al final
              </button>
            </div>

            <button
              type="button"
              onClick={handleReplaceAgentProposal}
              disabled={!canApplyAgentProposal || !onReplaceWithAIProposal}
              className="w-full py-1.5 px-2 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 disabled:hover:bg-violet-50 text-violet-700 border border-violet-100 font-semibold text-[10.5px] rounded-lg transition-colors"
            >
              Reemplazar documento
            </button>

            {agentFinalResult?.canApplyToDraft === false && (
              <p className="text-[9.5px] text-center text-amber-600 leading-normal bg-amber-50 p-1.5 border border-amber-100 rounded-md">
                ⚠️ La respuesta no está disponible para aplicar al borrador.
              </p>
            )}

            {canApplyAgentProposal && (!onInsertAIProposal || !onReplaceWithAIProposal) && (
              <p className="text-[9.5px] text-center text-slate-400 leading-normal">
                La acción de aplicación no está disponible en este contexto.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Reader Mode Message */}
      {!canEdit && (
        <div className="p-2 border border-slate-200 bg-slate-50/60 rounded-lg text-center">
          <span className="text-[9.5px] text-slate-500 leading-normal block">
            🔒 Modo solo lectura: Puedes generar y copiar respuestas, pero no aplicar cambios al documento.
          </span>
        </div>
      )}

      <ConfirmModal
        isOpen={isReplaceConfirmOpen}
        title="Reemplazar borrador"
        message="¿Estás seguro de que deseas reemplazar todo el borrador actual con la propuesta del agente? Este cambio no se guardará automáticamente en el servidor; debes presionar Guardar en el editor para persistir los cambios."
        confirmLabel="Reemplazar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmReplace}
        onClose={() => setIsReplaceConfirmOpen(false)}
      />
    </div>
  );
}

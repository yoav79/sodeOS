'use client';

import React, { useState } from 'react';
import ConfirmModal from './modals/ConfirmModal';
import EditorAgentTab from './EditorAgentTab';

interface EditorAITabProps {
  brainId: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
  contentMarkdown: string;
  canApply: boolean;
  onInsertAIProposal?: (proposal: string) => void;
  onReplaceWithAIProposal?: (proposal: string) => void;
}

export default function EditorAITab({
  brainId,
  nodeId,
  nodeTitle,
  contentMarkdown,
  canApply,
  onInsertAIProposal,
  onReplaceWithAIProposal,
}: EditorAITabProps) {
  const [aiAction, setAiAction] = useState<'create' | 'format' | 'grammar' | 'spelling'>('create');
  const [aiInstruction, setAiInstruction] = useState<string>('');
  const [aiProposal, setAiProposal] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCopied, setAiCopied] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'v1' | 'agent'>('v1');

  if (!brainId || !nodeId || !nodeTitle) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm">
          <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.913-6.204C19.757 13.682 21 11.97 21 10.023 21 6.697 18.03 4 14.375 4c-2.42 0-4.526 1.183-5.743 2.973A4.5 4.5 0 003.5 11.5c0 1.956.84 3.714 2.188 4.904l-.875 5.096L9.813 15.904z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-600">Ningún documento</h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[190px] mx-auto leading-relaxed">
            Selecciona un documento para usar la funcionalidad de IA.
          </p>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setAiProposal('');
    setFeedbackMessage(null);

    try {
      const response = await fetch('/api/ai/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brainId,
          nodeId,
          action: aiAction,
          instruction: aiInstruction.trim() || undefined,
          contentMarkdown,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let userMessage = data.error || 'Error al procesar la propuesta.';
        if (response.status === 401) {
          userMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else if (response.status === 403) {
          userMessage = 'No tienes permisos suficientes para usar el asistente de IA en este espacio.';
        } else if (response.status === 413) {
          userMessage = 'El documento es demasiado grande para ser procesado por el asistente de IA.';
        } else if (response.status === 503) {
          userMessage = 'El servicio de IA no está configurado (falta API Key en el servidor).';
        }
        throw new Error(userMessage);
      }

      setAiProposal(data.proposal || '');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error de red o servidor al generar propuesta.';
      setAiError(message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = () => {
    if (!aiProposal) return;
    navigator.clipboard.writeText(aiProposal);
    setAiCopied(true);
    setTimeout(() => setAiCopied(false), 2000);
  };

  const handleDiscard = () => {
    setAiProposal('');
    setAiInstruction('');
    setAiError(null);
    setAiCopied(false);
    setFeedbackMessage(null);
  };

  const handleInsertClick = () => {
    if (!aiProposal.trim() || aiLoading) return;
    if (onInsertAIProposal) {
      onInsertAIProposal(aiProposal);
      setFeedbackMessage('Aplicado al editor. Revisa y presiona Guardar para persistir.');
      setTimeout(() => setFeedbackMessage(null), 6000);
    } else {
      setFeedbackMessage('Acción no disponible en este momento.');
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleReplaceClick = () => {
    if (!aiProposal.trim() || aiLoading || !canApply) return;
    setIsReplaceConfirmOpen(true);
  };

  const isButtonsDisabled = !canApply || !aiProposal.trim() || aiLoading;

  return (
    <div className="space-y-4 text-slate-700">
      <div>
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span className="text-violet-600">✨</span> Asistente de IA
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
          Genera propuestas para redactar, formatear o corregir este documento.
        </p>
      </div>

      <div className="h-px bg-slate-200/60" />

      {/* Switcher de subtab */}
      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50 gap-0.5">
        <button
          type="button"
          disabled={aiLoading}
          onClick={() => setActiveSubTab('v1')}
          className={`flex-1 py-1 px-2 text-center text-[10px] font-medium rounded-md transition-all duration-150 ${
            activeSubTab === 'v1'
              ? 'bg-white text-violet-600 shadow-xs border border-slate-200/40 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Clásico
        </button>
        <button
          type="button"
          disabled={aiLoading}
          onClick={() => setActiveSubTab('agent')}
          className={`flex-1 py-1 px-2 text-center text-[10px] font-medium rounded-md transition-all duration-150 ${
            activeSubTab === 'agent'
              ? 'bg-white text-violet-600 shadow-xs border border-slate-200/40 font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Agente
        </button>
      </div>

      {activeSubTab === 'v1' ? (
        <>
          {/* Selector de acción */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider block">
              Acción de IA
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'create', label: 'Crear contenido' },
                { id: 'format', label: 'Formatear doc.' },
                { id: 'grammar', label: 'Corregir gramática' },
                { id: 'spelling', label: 'Corregir ortog.' },
              ].map((act) => (
                <button
                  key={act.id}
                  type="button"
                  disabled={aiLoading}
                  onClick={() => setAiAction(act.id as 'create' | 'format' | 'grammar' | 'spelling')}
                  className={`py-1.5 px-2 text-[10.5px] font-medium rounded-lg text-left transition-colors border ${
                    aiAction === act.id
                      ? 'bg-violet-50/70 border-violet-200 text-violet-700 font-semibold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                  } disabled:opacity-50`}
                >
                  {act.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input de instrucción */}
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider block">
              Instrucción opcional
            </label>
            <textarea
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="Ej: en tono formal, añadir ejemplos prácticos, simplificar la redacción..."
              rows={3}
              disabled={aiLoading}
              className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white placeholder-slate-400 disabled:bg-slate-50"
            />
          </div>

          {/* Botón generar */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={aiLoading}
            className="w-full py-2 px-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            {aiLoading ? (
              <>
                <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin shrink-0"></span>
                <span>Generando propuesta...</span>
              </>
            ) : (
              <>
                <span>✨ Generar propuesta</span>
              </>
            )}
          </button>

          {aiError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10.5px] leading-normal">
              {aiError}
            </div>
          )}

          {/* Feedback Message */}
          {feedbackMessage && (
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-[10.5px] leading-normal">
              {feedbackMessage}
            </div>
          )}

          {/* Área de propuesta */}
          {aiProposal && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                  Propuesta de IA
                </span>
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="text-[10.5px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Descartar
                </button>
              </div>

              <div className="w-full h-44 overflow-y-auto p-2.5 border border-slate-200/80 rounded-lg bg-slate-50 font-mono text-[10.5px] whitespace-pre-wrap select-text leading-relaxed">
                {aiProposal}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[10.5px] rounded-lg shadow-xs transition-colors"
                  >
                    {aiCopied ? '¡Copiado!' : 'Copiar'}
                  </button>

                  <button
                    type="button"
                    onClick={handleInsertClick}
                    disabled={isButtonsDisabled}
                    className="flex-1 py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold text-[10.5px] rounded-lg shadow-xs transition-colors"
                  >
                    Insertar al final
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleReplaceClick}
                  disabled={isButtonsDisabled}
                  className="w-full py-1.5 px-2 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 disabled:hover:bg-violet-50 text-violet-700 border border-violet-100 font-semibold text-[10.5px] rounded-lg transition-colors"
                >
                  Reemplazar documento
                </button>

                {!canApply && (
                  <p className="text-[9.5px] text-center text-slate-400 leading-normal">
                    🔒 Como lector, no tienes permisos para aplicar cambios al documento.
                  </p>
                )}
              </div>
            </div>
          )}

          <ConfirmModal
            isOpen={isReplaceConfirmOpen}
            title="Reemplazar documento"
            message="¿Estás seguro de que deseas reemplazar todo el contenido de este documento con la propuesta de la IA? Esta acción no se guardará hasta que presiones Guardar, pero reemplazará el contenido actual en edición."
            confirmLabel="Reemplazar borrador"
            cancelLabel="Cancelar"
            onConfirm={() => {
              setIsReplaceConfirmOpen(false);
              if (onReplaceWithAIProposal) {
                onReplaceWithAIProposal(aiProposal);
                setFeedbackMessage('Aplicado al editor. Revisa y presiona Guardar para persistir.');
                setTimeout(() => setFeedbackMessage(null), 6000);
              }
            }}
            onClose={() => setIsReplaceConfirmOpen(false)}
          />
        </>
      ) : (
        <EditorAgentTab
          brainId={brainId}
          nodeId={nodeId}
          selectedNodeTitle={nodeTitle}
          contentMarkdown={contentMarkdown}
          canEdit={canApply}
          onInsertAIProposal={onInsertAIProposal}
          onReplaceWithAIProposal={onReplaceWithAIProposal}
        />
      )}
    </div>
  );
}

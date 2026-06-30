'use client';

import React, { useState } from 'react';

interface EditorAITabProps {
  nodeId: string | null;
  nodeTitle: string | null;
  contentMarkdown: string;
  canApply: boolean;
}

export default function EditorAITab({
  nodeId,
  nodeTitle,
  contentMarkdown,
  canApply,
}: EditorAITabProps) {
  const [aiAction, setAiAction] = useState<'create' | 'format' | 'grammar' | 'spelling'>('create');
  const [aiInstruction, setAiInstruction] = useState<string>('');
  const [aiProposal, setAiProposal] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCopied, setAiCopied] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  if (!nodeId || !nodeTitle) {
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
    setAiLoading(true);
    setAiError(null);
    setAiProposal('');
    setFeedbackMessage(null);

    try {
      // Simular latencia de 1.5s
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockResponses: Record<typeof aiAction, string> = {
        create: `## Propuesta de Contenido (MOCK IA)

Esta es una propuesta de contenido generada automáticamente para el documento **"${nodeTitle}"**.

### Sección 1: Introducción
Aquí se detalla la propuesta de contenido sugerida con base en tus notas e instrucción:
> *"${aiInstruction.trim() || 'Sin instrucción adicional'}"*

### Sección 2: Desarrollo sugerido
- Punto clave A
- Punto clave B
- Punto clave C

---
*⚠️ Nota: Esta propuesta es de demostración (MOCK) y no utiliza una API real de IA (Fase AI-2).*`,
        format: `## Documento Formateado (MOCK IA)

### ${nodeTitle}

${aiInstruction.trim() ? `> *Formato optimizado según:* **"${aiInstruction.trim()}"**\n` : ''}

El contenido actual (${contentMarkdown.length} caracteres) ha sido estructurado con encabezados correctos, celdas de tabla limpias y espaciados optimizados para lectura ejecutiva.

---
*⚠️ Nota: Esta propuesta es de demostración (MOCK) y no utiliza una API real de IA (Fase AI-2).*`,
        grammar: `## Corrección Gramatical (MOCK IA)

A continuación se presenta el texto corregido para **"${nodeTitle}"**:

El documento (${contentMarkdown.length} caracteres) ha sido revisado gramaticalmente. Se optimizaron las conjugaciones verbales y la coherencia de la redacción.
${aiInstruction.trim() ? `\n*Nota de estilo:* ${aiInstruction.trim()}\n` : ''}

---
*⚠️ Nota: Esta propuesta es de demostración (MOCK) y no utiliza una API real de IA (Fase AI-2).*`,
        spelling: `## Corrección Ortográfica (MOCK IA)

Revisión ortográfica de **"${nodeTitle}"**:

Se han corregido tildes omitidas y errores tipográficos menores detectados en el contenido original (${contentMarkdown.length} caracteres).
${aiInstruction.trim() ? `\n*Nota de estilo:* ${aiInstruction.trim()}\n` : ''}

---
*⚠️ Nota: Esta propuesta es de demostración (MOCK) y no utiliza una API real de IA (Fase AI-2).*`,
      };

      setAiProposal(mockResponses[aiAction]);
    } catch (err) {
      console.error(err);
      setAiError('Error al generar la propuesta mock.');
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

  const showFasePosteriorAlert = (actionName: string) => {
    setFeedbackMessage(`Acción "${actionName}" estará disponible en una fase posterior de integración (AI-5).`);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  return (
    <div className="space-y-4 text-slate-700">
      <div>
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <span className="text-violet-600">✨</span> Asistente IA (Mockup)
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
          Genera propuestas para este documento. Nada se aplica automáticamente.
        </p>
      </div>

      <div className="h-px bg-slate-200/60" />

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
              onClick={() => setAiAction(act.id as 'create' | 'format' | 'grammar' | 'spelling')}
              className={`py-1.5 px-2 text-[10.5px] font-medium rounded-lg text-left transition-colors border ${
                aiAction === act.id
                  ? 'bg-violet-50/70 border-violet-200 text-violet-700 font-semibold'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
              }`}
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
          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 bg-white placeholder-slate-400"
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
            <span>Generando...</span>
          </>
        ) : (
          <>
            <span>✨ Generar propuesta</span>
          </>
        )}
      </button>

      {aiError && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10.5px]">
          {aiError}
        </div>
      )}

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 text-[10.5px]">
          {feedbackMessage}
        </div>
      )}

      {/* Área de propuesta */}
      {aiProposal && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
              Propuesta Generada
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
                onClick={() => showFasePosteriorAlert('Insertar al final')}
                disabled={!canApply}
                className="flex-1 py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-700 font-semibold text-[10.5px] rounded-lg shadow-xs transition-colors"
              >
                Insertar al final
              </button>
            </div>

            <button
              type="button"
              onClick={() => showFasePosteriorAlert('Reemplazar documento')}
              disabled={!canApply}
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
    </div>
  );
}

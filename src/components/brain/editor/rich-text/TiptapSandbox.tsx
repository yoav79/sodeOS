'use client';

import React, { useState } from 'react';
import RichMarkdownEditor from './RichMarkdownEditor';
import MarkdownDocumentView from './MarkdownDocumentView';

const DEFAULT_MARKDOWN = `# Título 1 (Heading 1)

## Título 2 (Heading 2)

Este es un párrafo de prueba con formato **negrita** (bold), *itálica* (italic) y ~~tachado~~ (strike).

También podemos escribir \`código en línea\` (inline code) y utilizar reglas horizontales.

---

> Este es un bloque de cita (blockquote) para resaltar información importante.

### Lista desordenada:
- Elemento de lista 1
- Elemento de lista 2 con [un enlace de prueba](https://example.com)

### Lista ordenada:
1. Primer paso
2. Segundo paso

Bloque de código de ejemplo:
\`\`\`javascript
const saludo = "Hola Mundo";
console.log(saludo);
\`\`\``;

export default function TiptapSandbox() {
  const [initialMarkdown, setInitialMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  const [tiptapContent, setTiptapContent] = useState<string>(DEFAULT_MARKDOWN);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const handleLoadIntoTiptap = () => {
    setTiptapContent(initialMarkdown);
  };

  const handleReset = () => {
    setInitialMarkdown(DEFAULT_MARKDOWN);
    setTiptapContent(DEFAULT_MARKDOWN);
  };

  // Diagnóstico
  const initialLength = initialMarkdown.length;
  const resultLength = tiptapContent.length;
  const isEmpty = tiptapContent.trim().length === 0;

  // Detección simple de pérdida de contenido
  const potentialLoss = 
    initialLength > 20 && 
    (resultLength < initialLength * 0.4 || 
     (initialMarkdown.includes('###') && !tiptapContent.includes('#')) || 
     (initialMarkdown.includes('**') && !tiptapContent.includes('**') && !tiptapContent.includes('__')));

  return (
    <div className="flex flex-col gap-6 bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-slate-800">Prueba de Componente RichMarkdownEditor</h2>
          <p className="text-xs text-slate-500">
            Esta página de prueba usa el componente productivo real <code>RichMarkdownEditor.tsx</code> en lugar del código local del sandbox.
          </p>
        </div>
        
        {/* Toggle para pruebas de estado disabled */}
        <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm text-xs font-semibold text-slate-700 hover:bg-slate-50 select-none">
          <input
            type="checkbox"
            checked={isDisabled}
            onChange={(e) => setIsDisabled(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          Modo Deshabilitado (disabled)
        </label>
      </div>

      {/* Tres Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Markdown Inicial */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">1. Markdown Inicial</span>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 bg-slate-200/50 hover:bg-slate-200 rounded-md transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleLoadIntoTiptap}
                className="px-2 py-1 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Cargar en Tiptap →
              </button>
            </div>
          </div>
          <textarea
            value={initialMarkdown}
            onChange={(e) => setInitialMarkdown(e.target.value)}
            className="w-full h-[350px] p-4 bg-slate-800 text-slate-100 font-mono text-xs leading-relaxed border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Escribe tu Markdown aquí..."
          />
        </div>

        {/* Columna 2: Editor Tiptap Productivo */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. RichMarkdownEditor (Visual)</span>
          <RichMarkdownEditor
            value={tiptapContent}
            onChange={setTiptapContent}
            disabled={isDisabled}
            className="h-[350px] max-h-[350px]"
          />
        </div>

        {/* Columna 3: Markdown Resultante */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">3. Markdown Resultante</span>
          <pre className="w-full h-[350px] p-4 bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed border border-slate-800 rounded-xl overflow-y-auto whitespace-pre-wrap">
            {tiptapContent || '(Edita el contenido arriba para generar Markdown)'}
          </pre>
        </div>
      </div>

      {/* Diagnósticos */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Diagnóstico de Conversión</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex flex-col gap-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Longitud Inicial</span>
            <span className="text-slate-800 font-semibold">{initialLength} caracteres</span>
          </div>
          <div className="flex flex-col gap-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Longitud Resultante</span>
            <span className="text-slate-800 font-semibold">{resultLength} caracteres</span>
          </div>
          <div className="flex flex-col gap-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Estado de Salida</span>
            {isEmpty ? (
              <span className="text-red-600 font-bold">VACÍO ⚠️</span>
            ) : (
              <span className="text-emerald-600 font-bold">Válido ✓</span>
            )}
          </div>
          <div className="flex flex-col gap-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Pérdida de Contenido</span>
            {potentialLoss ? (
              <span className="text-amber-600 font-bold">Sospecha de Pérdida ⚠️</span>
            ) : (
              <span className="text-emerald-600 font-bold">Sin anomalías ✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Previsualización Read-only */}
      <div className="flex flex-col gap-2 border-t border-slate-200 pt-6">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">4. MarkdownDocumentView (Lector Renderizado Read-only)</span>
        <MarkdownDocumentView
          content={tiptapContent}
          className="min-h-[200px]"
          emptyMessage="No hay contenido para renderizar en el visor de lectura."
        />
      </div>
    </div>
  );
}

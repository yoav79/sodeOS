'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';

const DEFAULT_MARKDOWN = `# Título 1 (Heading 1)

## Título 2 (Heading 2)

Este es un párrafo de prueba con formato **negrita** (bold) e *itálica* (italic).

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

const getEditorMarkdown = (editor: any): string => {
  return editor?.storage?.markdown?.getMarkdown() || '';
};

export default function TiptapSandbox() {
  const [initialMarkdown, setInitialMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  // Inicializamos el Markdown de resultado con el valor por defecto
  const [resultMarkdown, setResultMarkdown] = useState<string>(DEFAULT_MARKDOWN);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Markdown.configure({
        html: false, // Restringir HTML raw
        linkify: true,
      }),
    ],
    content: DEFAULT_MARKDOWN,
    onUpdate: ({ editor }) => {
      setResultMarkdown(getEditorMarkdown(editor));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate focus:outline-none min-h-[250px] max-w-none p-5 text-slate-800 font-sans text-sm leading-relaxed',
      },
    },
  });

  const handleLoadIntoTiptap = () => {
    if (editor) {
      editor.commands.setContent(initialMarkdown);
      setResultMarkdown(getEditorMarkdown(editor));
    }
  };

  const handleReset = () => {
    setInitialMarkdown(DEFAULT_MARKDOWN);
    if (editor) {
      editor.commands.setContent(DEFAULT_MARKDOWN);
      setResultMarkdown(getEditorMarkdown(editor));
    }
  };

  // Diagnóstico
  const initialLength = initialMarkdown.length;
  const resultLength = resultMarkdown.length;
  const isEmpty = resultMarkdown.trim().length === 0;

  // Detección simple de pérdida de contenido
  const potentialLoss = 
    initialLength > 20 && 
    (resultLength < initialLength * 0.4 || 
     (initialMarkdown.includes('###') && !resultMarkdown.includes('#')) || 
     (initialMarkdown.includes('**') && !resultMarkdown.includes('**') && !resultMarkdown.includes('__')));

  return (
    <div className="flex flex-col gap-6 bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Estilos locales para asegurar renderizado correcto en la prueba */}
      <style>{`
        .tiptap-editor-area .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-bottom: 0.75rem !important;
        }
        .tiptap-editor-area .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-bottom: 0.75rem !important;
        }
        .tiptap-editor-area .ProseMirror h1 {
          font-size: 1.75rem !important;
          font-weight: 800 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.75rem !important;
          color: #0f172a !important;
        }
        .tiptap-editor-area .ProseMirror h2 {
          font-size: 1.35rem !important;
          font-weight: 700 !important;
          margin-top: 1rem !important;
          margin-bottom: 0.5rem !important;
          color: #1e293b !important;
        }
        .tiptap-editor-area .ProseMirror h3 {
          font-size: 1.15rem !important;
          font-weight: 700 !important;
          margin-top: 0.85rem !important;
          margin-bottom: 0.4rem !important;
          color: #334155 !important;
        }
        .tiptap-editor-area .ProseMirror p {
          margin-bottom: 0.75rem !important;
        }
        .tiptap-editor-area .ProseMirror blockquote {
          border-left: 4px solid #cbd5e1 !important;
          padding-left: 1rem !important;
          font-style: italic !important;
          color: #475569 !important;
          margin: 1rem 0 !important;
        }
        .tiptap-editor-area .ProseMirror pre {
          background-color: #1e293b !important;
          color: #f8fafc !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
          font-family: monospace !important;
          font-size: 0.875rem !important;
          overflow-x: auto !important;
          margin: 1rem 0 !important;
        }
        .tiptap-editor-area .ProseMirror code {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
          font-family: monospace !important;
          font-size: 0.875rem !important;
        }
        .tiptap-editor-area .ProseMirror pre code {
          background-color: transparent !important;
          color: inherit !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .tiptap-editor-area .ProseMirror a {
          color: #2563eb !important;
          text-decoration: underline !important;
        }
        .tiptap-editor-area .ProseMirror hr {
          border: 0 !important;
          border-top: 2px solid #e2e8f0 !important;
          margin: 1.5rem 0 !important;
        }
        .tiptap-editor-area .ProseMirror {
          outline: none !important;
        }
      `}</style>

      <div className="flex flex-col gap-1">
        <h2 className="text-base font-bold text-slate-800">Prueba de Conversión Markdown ↔ Tiptap</h2>
        <p className="text-xs text-slate-500">
          Esta prueba aislada valida el ciclo de vida del contenido: el Markdown se parsea a Tiptap, se edita visualmente y se exporta de vuelta a Markdown plano.
        </p>
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
            className="w-full h-[320px] p-4 bg-slate-800 text-slate-100 font-mono text-xs leading-relaxed border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Escribe tu Markdown aquí..."
          />
        </div>

        {/* Columna 2: Editor Tiptap */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">2. Editor Tiptap (Visual)</span>
          <div className="flex flex-col border border-slate-200 bg-white rounded-xl overflow-hidden min-h-[320px] shadow-inner">
            {/* Toolbar simple */}
            {editor && (
              <div className="flex flex-wrap items-center gap-1 bg-slate-50 border-b border-slate-200 p-1.5">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    editor.isActive('bold') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold italic ${
                    editor.isActive('italic') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  I
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  H1
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  H2
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  • Lista
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  1. Lista
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    editor.isActive('blockquote') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cita
                </button>
              </div>
            )}
            <div className="tiptap-editor-area flex-1 overflow-y-auto max-h-[280px]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Columna 3: Markdown Resultante */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">3. Markdown Resultante</span>
          <pre className="w-full h-[320px] p-4 bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed border border-slate-800 rounded-xl overflow-y-auto whitespace-pre-wrap">
            {resultMarkdown || '(Edita el contenido arriba para generar Markdown)'}
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
    </div>
  );
}

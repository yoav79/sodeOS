'use client';

import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

interface TiptapSandboxProps {
  initialContent?: string;
}

export default function TiptapSandbox({ initialContent = '<p>¡Hola! Este es un <strong>editor Tiptap</strong> de prueba.</p><p>Puedes probar: <em>cursiva</em>, u otras opciones. Intenta agregar un <a href="https://example.com">enlace aquí</a> o crear una lista:</p><ul><li>Elemento A</li><li>Elemento B</li></ul><h1>Prueba de Título 1</h1><h2>Prueba de Título 2</h2>' }: TiptapSandboxProps) {
  const [htmlOutput, setHtmlOutput] = useState<string>(initialContent);

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
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      setHtmlOutput(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate focus:outline-none min-h-[220px] max-w-none p-5 text-slate-800 font-sans text-sm leading-relaxed',
      },
    },
  });

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl">
        <span className="text-xs text-slate-500 font-medium animate-pulse">Cargando Tiptap Sandbox...</span>
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del Enlace:', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-col gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
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
        .tiptap-editor-area .ProseMirror p {
          margin-bottom: 0.75rem !important;
        }
        .tiptap-editor-area .ProseMirror a {
          color: #2563eb !important;
          text-decoration: underline !important;
        }
        .tiptap-editor-area .ProseMirror {
          outline: none !important;
        }
      `}</style>

      <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800">Tiptap Sandbox (Prueba Aislada)</h3>
        <p className="text-[11px] text-slate-400 font-medium">
          Valida el editor interactivo y las acciones de formato. Los cambios no se guardan en la base de datos.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5 w-fit">
        {/* Bold */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('bold') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Negrita"
        >
          B
        </button>

        {/* Italic */}
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded-lg text-xs font-semibold italic transition-colors ${
            editor.isActive('italic') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Cursiva"
        >
          I
        </button>

        {/* Heading 1 */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Título 1"
        >
          H1
        </button>

        {/* Heading 2 */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Título 2"
        >
          H2
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Bullet List */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Lista con Viñetas"
        >
          • Lista
        </button>

        {/* Ordered List */}
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Lista Numerada"
        >
          1. Lista
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Link */}
        <button
          onClick={setLink}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('link') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Enlace"
        >
          Enlace
        </button>

        {/* Unset Link */}
        {editor.isActive('link') && (
          <button
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            title="Quitar Enlace"
          >
            Quitar
          </button>
        )}
      </div>

      {/* Editor Container */}
      <div className="tiptap-editor-area border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-colors">
        <EditorContent editor={editor} />
      </div>

      {/* Output Debugger */}
      <div className="flex flex-col gap-2 mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Salida HTML Debug:</span>
        <pre className="text-xs font-mono text-slate-700 bg-white border border-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-[150px]">
          {htmlOutput}
        </pre>
      </div>
    </div>
  );
}

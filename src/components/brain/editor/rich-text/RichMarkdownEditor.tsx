'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

interface RichMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Helper to safely extract markdown string from the editor's markdown storage extension.
 * Since Tiptap extensions add dynamic fields to the editor's storage, we cast to Record<string, unknown>
 * and safely check properties to avoid typescript compilation and no-explicit-any warnings.
 */
const getEditorMarkdown = (editorInstance: Editor): string => {
  const storage = (editorInstance.storage as unknown) as Record<string, unknown>;
  const markdownStorage = storage?.markdown as { getMarkdown?: () => string } | undefined;
  return markdownStorage?.getMarkdown?.() || '';
};

export default function RichMarkdownEditor({
  value,
  onChange,
  disabled = false,
  minHeight = '300px',
  className = '',
  ariaLabel = 'Editor de texto enriquecido',
}: RichMarkdownEditorProps) {

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false, // Prevents redirects during editing
        linkOnPaste: true,  // Automatically wrap links when pasting URLs
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 transition-colors',
          rel: 'noopener noreferrer', // Security mitigation
          target: '_blank',
        },
        validate: (href) => {
          // Allow secure web and mailto protocols. Explicitly block javascript:
          try {
            const parsed = new URL(href);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
          } catch {
            return href.startsWith('mailto:') || href.startsWith('/');
          }
        },
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: false, // Restrict raw HTML
        linkify: true,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: editorInstance }) => {
      const md = getEditorMarkdown(editorInstance);
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate focus:outline-none max-w-none p-5 text-slate-800 font-sans text-sm leading-relaxed',
        style: `min-h: ${minHeight};`,
        'aria-label': ariaLabel,
      },
    },
  });

  // Handle external value changes (only if the editor is not currently focused by the user)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const currentMarkdown = getEditorMarkdown(editor);
    if (value !== currentMarkdown && !editor.isFocused) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Sync disabled / editable state
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl">
        <span className="text-xs text-slate-500 font-medium animate-pulse">Cargando editor...</span>
      </div>
    );
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL del Enlace (ej. https://example.com):', previousUrl);

    if (url === null) return; // Cancelled

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`rich-markdown-editor rich-markdown-content flex flex-col border border-slate-200 bg-white rounded-xl overflow-hidden shadow-inner focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all ${className}`}>
      {/* Encapsulated styles for Tiptap content */}
      <style>{`
        .rich-markdown-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-50 border-b border-slate-200 p-1.5 select-none">
        {/* Bold */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
            editor.isActive('bold') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Negrita"
        >
          B
        </button>

        {/* Italic */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded text-xs font-semibold italic transition-colors ${
            editor.isActive('italic') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Cursiva"
        >
          I
        </button>

        {/* Strike */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={disabled || !editor.can().chain().focus().toggleStrike().run()}
          className={`px-2 py-1 rounded text-xs line-through transition-colors ${
            editor.isActive('strike') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Tachado"
        >
          S
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        {/* Heading 1 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Título 1"
        >
          H1
        </button>

        {/* Heading 2 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Título 2"
        >
          H2
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        {/* Bullet List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
            editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Lista con Viñetas"
        >
          • Lista
        </button>

        {/* Ordered List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
            editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Lista Numerada"
        >
          1. Lista
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        {/* Blockquote */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
            editor.isActive('blockquote') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Cita"
        >
          Cita
        </button>

        {/* Code Inline */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={disabled || !editor.can().chain().focus().toggleCode().run()}
          className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
            editor.isActive('code') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Código en línea"
        >
          `code`
        </button>

        {/* Code Block */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
            editor.isActive('codeBlock') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Bloque de código"
        >
          {"{ }"}
        </button>

        <div className="w-px h-4 bg-slate-300 mx-1" />

        {/* Horizontal Rule */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
          className="px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40"
          title="Regla horizontal"
        >
          —
        </button>

        {/* Link */}
        <button
          type="button"
          onClick={setLink}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
            editor.isActive('link') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Enlace"
        >
          Enlace
        </button>

        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={disabled}
            className="px-2 py-1 rounded text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            title="Quitar Enlace"
          >
            Quitar
          </button>
        )}
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

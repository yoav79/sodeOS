'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';

interface MarkdownDocumentViewProps {
  content: string;
  className?: string;
  minHeight?: string;
  emptyMessage?: string;
  ariaLabel?: string;
}

export default function MarkdownDocumentView({
  content,
  className = '',
  minHeight = '150px',
  emptyMessage = 'Este documento todavía no tiene contenido.',
  ariaLabel = 'Visor de documento renderizado',
}: MarkdownDocumentViewProps) {
  const isContentEmpty = !content || content.trim() === '';

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true, // Allow opening links in read-only mode
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 transition-colors',
          rel: 'noopener noreferrer', // Security attributes to prevent reverse tabnabbing
          target: '_blank',           // Open links in a new window
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
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-xl border border-slate-200/60 shadow-xs my-6 mx-auto block',
        },
      }),
      Markdown.configure({
        html: false, // Restrict raw HTML
        linkify: true,
      }),
    ],
    content: content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-slate focus:outline-none max-w-none p-5 text-slate-800 font-sans text-sm leading-relaxed',
        style: `min-h: ${minHeight};`,
        'aria-label': ariaLabel,
      },
    },
  });

  // Handle external content changes
  useEffect(() => {
    if (!editor || editor.isDestroyed || isContentEmpty) return;

    const storage = (editor.storage as unknown) as Record<string, unknown>;
    const markdownStorage = storage?.markdown as { getMarkdown?: () => string } | undefined;
    const currentMarkdown = markdownStorage?.getMarkdown?.() || '';

    if (content !== currentMarkdown) {
      editor.commands.setContent(content);
    }
  }, [content, editor, isContentEmpty]);

  if (isContentEmpty) {
    return (
      <div 
        className={`rich-markdown-view-empty flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl ${className}`}
        style={{ minHeight }}
      >
        <p className="text-xs text-slate-400 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  if (!editor) {
    return (
      <div 
        className="flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl"
        style={{ minHeight }}
      >
        <span className="text-xs text-slate-500 font-medium animate-pulse">Cargando lector...</span>
      </div>
    );
  }

  return (
    <div className={`rich-markdown-view rich-markdown-content flex flex-col border border-slate-200 bg-white rounded-xl overflow-hidden shadow-inner ${className}`}>
      {/* Reader Content Area */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

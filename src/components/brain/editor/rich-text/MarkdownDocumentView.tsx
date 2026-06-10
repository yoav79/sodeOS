'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';

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
    <div className={`rich-markdown-view flex flex-col border border-slate-200 bg-white rounded-xl overflow-hidden shadow-inner ${className}`}>
      {/* Encapsulated styles for Tiptap content in read-only mode */}
      <style>{`
        .rich-markdown-view .ProseMirror ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin-bottom: 0.75rem !important;
        }
        .rich-markdown-view .ProseMirror ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin-bottom: 0.75rem !important;
        }
        .rich-markdown-view .ProseMirror h1 {
          font-size: 1.75rem !important;
          font-weight: 800 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.75rem !important;
          color: #0f172a !important;
        }
        .rich-markdown-view .ProseMirror h2 {
          font-size: 1.35rem !important;
          font-weight: 700 !important;
          margin-top: 1rem !important;
          margin-bottom: 0.5rem !important;
          color: #1e293b !important;
        }
        .rich-markdown-view .ProseMirror h3 {
          font-size: 1.15rem !important;
          font-weight: 700 !important;
          margin-top: 0.85rem !important;
          margin-bottom: 0.4rem !important;
          color: #334155 !important;
        }
        .rich-markdown-view .ProseMirror p {
          margin-bottom: 0.75rem !important;
        }
        .rich-markdown-view .ProseMirror blockquote {
          border-left: 4px solid #cbd5e1 !important;
          padding-left: 1rem !important;
          font-style: italic !important;
          color: #475569 !important;
          margin: 1rem 0 !important;
        }
        .rich-markdown-view .ProseMirror pre {
          background-color: #1e293b !important;
          color: #f8fafc !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
          font-family: monospace !important;
          font-size: 0.875rem !important;
          overflow-x: auto !important;
          margin: 1rem 0 !important;
        }
        .rich-markdown-view .ProseMirror code {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
          font-family: monospace !important;
          font-size: 0.875rem !important;
        }
        .rich-markdown-view .ProseMirror pre code {
          background-color: transparent !important;
          color: inherit !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .rich-markdown-view .ProseMirror a {
          color: #2563eb !important;
          text-decoration: underline !important;
        }
        .rich-markdown-view .ProseMirror hr {
          border: 0 !important;
          border-top: 2px solid #e2e8f0 !important;
          margin: 1.5rem 0 !important;
        }
      `}</style>

      {/* Reader Content Area */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import { sanitizeHtml } from '@/lib/content/sanitizeHtml';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
// @ts-expect-error - markdown-it-task-lists does not have typescript declarations
import taskListPlugin from 'markdown-it-task-lists';

import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import plaintext from 'highlight.js/lib/languages/plaintext';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import properties from 'highlight.js/lib/languages/properties';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('python', python);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('env', properties);

hljs.registerAliases(['js'], { languageName: 'javascript' });
hljs.registerAliases(['ts'], { languageName: 'typescript' });
hljs.registerAliases(['jsx'], { languageName: 'javascript' });
hljs.registerAliases(['tsx'], { languageName: 'typescript' });
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['sh'], { languageName: 'bash' });
hljs.registerAliases(['shell'], { languageName: 'bash' });
hljs.registerAliases(['console'], { languageName: 'bash' });
hljs.registerAliases(['txt'], { languageName: 'plaintext' });
hljs.registerAliases(['md'], { languageName: 'markdown' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['dotenv'], { languageName: 'env' });

const HLJS_TOKEN_STYLES = `
.code-block-wrapper pre code.hljs { padding: 0; background: transparent; }
.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section, .hljs-link { color: #1e40af; }
.hljs-string, .hljs-title, .hljs-name, .hljs-type, .hljs-attribute, .hljs-symbol, .hljs-bullet, .hljs-addition, .hljs-variable, .hljs-template-tag, .hljs-template-variable { color: #16a34a; }
.hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: #6b7280; }
.hljs-number, .hljs-regexp, .hljs-params { color: #d97706; }
.hljs-built_in { color: #0891b2; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
`;

const CustomTaskList = TaskList.extend({
  priority: 150,
  addStorage() {
    return {
      markdown: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serialize(state: any, node: any) {
          state.renderList(node, '  ', () => '- ');
        },
        parse: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            const plugin = typeof taskListPlugin === 'function'
              ? taskListPlugin
              : (taskListPlugin as Record<string, unknown>).default || taskListPlugin;
            markdownit.use(plugin);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updateDOM(element: any) {
            element.querySelectorAll('.contains-task-list').forEach((list: Element) => {
              list.setAttribute('data-type', 'taskList');
            });
          },
        },
      },
    };
  },
});

const CustomTaskItem = TaskItem.extend({
  priority: 150,
  addStorage() {
    return {
      markdown: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serialize(state: any, node: any) {
          const check = node.attrs.checked ? '[x]' : '[ ]';
          state.write(`${check} `);
          state.renderContent(node);
        },
        parse: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updateDOM(element: any) {
            element.querySelectorAll('.task-list-item').forEach((item: Element) => {
              const input = item.querySelector('input') as HTMLInputElement | null;
              item.setAttribute('data-type', 'taskItem');
              if (input) {
                item.setAttribute('data-checked', input.checked ? 'true' : 'false');
                input.remove();
              }
              // Wrap inner contents in a paragraph if no block child exists
              const hasBlock = Array.from(item.children).some((child: Element) =>
                ['P', 'DIV', 'UL', 'OL', 'BLOCKQUOTE'].includes(child.tagName)
              );
              if (!hasBlock) {
                const p = document.createElement('p');
                while (item.firstChild) {
                  p.appendChild(item.firstChild);
                }
                item.appendChild(p);
              }
            });
          },
        },
      },
    };
  },
});



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
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      CustomTaskList,
      CustomTaskItem.configure({
        nested: true,
      }),
      Markdown.configure({
        html: true, // Enable controlled HTML support
        linkify: true,
      }),
    ],
    content: sanitizeHtml(content),
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

    const sanitizedContent = sanitizeHtml(content);
    if (sanitizedContent !== currentMarkdown) {
      editor.commands.setContent(sanitizedContent);
    }
  }, [content, editor, isContentEmpty]);

  // Add copy buttons to code blocks
  const copiedRef = useRef<Set<HTMLButtonElement>>(new Set());

  const CLIPBOARD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  const handleCopy = useCallback(async (button: HTMLButtonElement, pre: HTMLPreElement) => {
    const codeElement = pre.querySelector('code');
    const code = codeElement?.textContent || pre.textContent || '';

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      button.innerHTML = CHECK_SVG;
      button.setAttribute('aria-label', 'Código copiado');
      button.setAttribute('title', 'Código copiado');
      button.style.color = '#16a34a';

      setTimeout(() => {
        button.innerHTML = CLIPBOARD_SVG;
        button.setAttribute('aria-label', 'Copiar código');
        button.setAttribute('title', 'Copiar código');
        button.style.color = '#64748b';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  useEffect(() => {
    if (!editor || editor.isDestroyed || isContentEmpty) return;

    const addCopyButtons = () => {
      const container = editor.view.dom;
      const preElements = container.querySelectorAll('pre');

      preElements.forEach((pre) => {
        if (pre.querySelector('[data-copy-button]')) return;

        pre.style.position = 'relative';

        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-copy-button', 'true');
        button.setAttribute('aria-label', 'Copiar código');
        button.setAttribute('title', 'Copiar código');
        button.innerHTML = CLIPBOARD_SVG;

        Object.assign(button.style, {
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          padding: '0',
          color: '#64748b',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          zIndex: '10',
        });

        button.addEventListener('mouseenter', () => {
          button.style.backgroundColor = '#f8fafc';
          button.style.color = '#334155';
        });

        button.addEventListener('mouseleave', () => {
          if (!copiedRef.current.has(button)) {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            button.style.color = '#64748b';
          }
        });

        button.addEventListener('click', () => {
          copiedRef.current.add(button);
          handleCopy(button, pre as HTMLPreElement);
          setTimeout(() => {
            copiedRef.current.delete(button);
          }, 2000);
        });

        pre.appendChild(button);
      });
    };

    const timer = setTimeout(addCopyButtons, 100);

    return () => clearTimeout(timer);
  }, [editor, isContentEmpty, handleCopy]);

  // Apply syntax highlighting to code blocks
  useEffect(() => {
    if (!editor || editor.isDestroyed || isContentEmpty) return;

    const highlightCodeBlocks = () => {
      const container = editor.view.dom;
      const codeElements = container.querySelectorAll('pre code');

      codeElements.forEach((codeEl) => {
        const pre = codeEl.parentElement as HTMLPreElement | null;
        if (!pre || pre.hasAttribute('data-highlighted')) return;

        const codeText = codeEl.textContent || '';
        if (!codeText.trim()) return;

        const classAttr = codeEl.getAttribute('class') || '';
        const langMatch = classAttr.match(/language-(\w+)/);
        const lang = langMatch?.[1] || 'plaintext';

        try {
          const result = hljs.highlight(codeText, { language: lang, ignoreIllegals: true });
          codeEl.innerHTML = result.value;
          codeEl.classList.add('hljs');
          pre.setAttribute('data-highlighted', 'true');
        } catch {
          try {
            const result = hljs.highlightAuto(codeText);
            codeEl.innerHTML = result.value;
            codeEl.classList.add('hljs');
            pre.setAttribute('data-highlighted', 'true');
          } catch {
            // Leave as plaintext
          }
        }
      });
    };

    const timer = setTimeout(highlightCodeBlocks, 150);

    return () => clearTimeout(timer);
  }, [editor, isContentEmpty]);

  // Inject syntax highlighting styles
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const existing = document.getElementById('hljs-token-styles');
    if (existing) return;

    const style = document.createElement('style');
    style.id = 'hljs-token-styles';
    style.textContent = HLJS_TOKEN_STYLES;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

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

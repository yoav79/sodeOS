'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
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


const colors = [
  { name: 'Negro', value: '#0f172a', bg: 'bg-[#0f172a]' },
  { name: 'Gris', value: '#475569', bg: 'bg-[#475569]' },
  { name: 'Rojo', value: '#ef4444', bg: 'bg-[#ef4444]' },
  { name: 'Naranja', value: '#f97316', bg: 'bg-[#f97316]' },
  { name: 'Amarillo', value: '#ca8a04', bg: 'bg-[#ca8a04]' },
  { name: 'Verde', value: '#16a34a', bg: 'bg-[#16a34a]' },
  { name: 'Azul', value: '#2563eb', bg: 'bg-[#2563eb]' },
  { name: 'Violeta', value: '#7c3aed', bg: 'bg-[#7c3aed]' },
];

const highlights = [
  { name: 'Amarillo', value: '#fef3c7', bg: 'bg-[#fef3c7] border-amber-200 text-amber-800' },
  { name: 'Verde', value: '#dcfce7', bg: 'bg-[#dcfce7] border-emerald-200 text-emerald-800' },
  { name: 'Azul', value: '#dbeafe', bg: 'bg-[#dbeafe] border-blue-200 text-blue-800' },
  { name: 'Violeta', value: '#ede9fe', bg: 'bg-[#ede9fe] border-violet-200 text-violet-800' },
  { name: 'Rojo', value: '#fee2e2', bg: 'bg-[#fee2e2] border-red-200 text-red-800' },
];

interface RichMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
  ariaLabel?: string;
  nodeId?: string;
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
  nodeId,
}: RichMarkdownEditorProps) {

  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadAndInsertImageRef = useRef<((file: File, pos?: number) => Promise<void>) | undefined>(undefined);
  const lastSentMarkdownRef = useRef<string>(sanitizeHtml(value));

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const highlightPickerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Close pickers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(event.target as Node)) {
        setShowHighlightPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        html: true,          // Enable controlled HTML support
        linkify: true,
        transformPastedText: true, // Parse pasted Markdown (tables, headings, etc.) into Tiptap nodes
      }),
    ],
    content: sanitizeHtml(value),
    editable: !disabled,
    onUpdate: ({ editor: editorInstance }) => {
      const md = getEditorMarkdown(editorInstance);
      lastSentMarkdownRef.current = md;
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate focus:outline-none max-w-none p-5 text-slate-800 font-sans text-sm leading-relaxed',
        style: `min-h: ${minHeight};`,
        'aria-label': ariaLabel,
      },
      handleDrop(view, event, _slice, moved) {
        void _slice;
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const imageFiles = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
          if (imageFiles.length > 0) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const pos = coordinates ? coordinates.pos : undefined;
            uploadAndInsertImageRef.current?.(imageFiles[0], pos);
            return true;
          }
        }
        return false;
      },
      handlePaste(view, event) {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const imageFiles = Array.from(event.clipboardData.files).filter(f => f.type.startsWith('image/'));
          if (imageFiles.length > 0) {
            event.preventDefault();
            uploadAndInsertImageRef.current?.(imageFiles[0]);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Handle external value changes (only if the editor is not currently focused by the user)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const sanitizedValue = sanitizeHtml(value);
    if (sanitizedValue !== lastSentMarkdownRef.current) {
      if (!editor.isFocused) {
        editor.commands.setContent(sanitizedValue);
      }
      lastSentMarkdownRef.current = sanitizedValue;
    }
  }, [value, editor]);

  // Sync disabled / editable state
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(!disabled);
    (window as Window & { editor?: unknown }).editor = editor;
  }, [disabled, editor]);

  // Assign/update the ref to ensure it has latest state/props/editor references in a render-safe way
  useEffect(() => {
    uploadAndInsertImageRef.current = async (file: File, pos?: number) => {
      if (!nodeId) return;

      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de tipo imagen.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert('La imagen excede el límite de tamaño permitido de 20 MB.');
        return;
      }
      if (uploadingImage) {
        alert('Ya hay una subida de imagen en curso.');
        return;
      }

      try {
        setUploadingImage(true);

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`/api/nodes/${nodeId}/attachments`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al subir la imagen.');
        }

        const attachmentId = data.attachment?.id;
        if (!attachmentId) {
          throw new Error('La respuesta del servidor no contiene el identificador de la imagen.');
        }

        const src = `/api/attachments/${attachmentId}/download`;
        
        if (editor && !editor.isDestroyed) {
          if (typeof pos === 'number') {
            editor.chain().focus().setTextSelection(pos).setImage({ src, alt: file.name }).run();
          } else {
            editor.chain().focus().setImage({ src, alt: file.name }).run();
          }
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido al subir la imagen.';
        alert(msg);
      } finally {
        setUploadingImage(false);
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      }
    };
  }, [nodeId, uploadingImage, editor]);

  const triggerImageUpload = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadAndInsertImageRef.current?.(files[0]);
  };

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

  const bubbleMenuButtonClass = (isActive: boolean) =>
    `px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  const floatingMenuButtonClass =
    'px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap';

  return (
    <div className={`rich-markdown-editor rich-markdown-content flex flex-col border border-slate-200 bg-white rounded-xl overflow-hidden shadow-inner focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : ''}`}>
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

      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: currentEditor, state }) => {
          if (!currentEditor.isEditable || disabled) {
            return false;
          }

          const { from, to, empty } = state.selection;
          if (empty || from === to) {
            return false;
          }

          return !currentEditor.isActive('image');
        }}
        options={{
          placement: 'top',
          offset: 10,
        }}
        className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg shadow-slate-900/10 backdrop-blur-sm ${isFullscreen ? 'z-[70]' : 'z-40'}`}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
          className={bubbleMenuButtonClass(editor.isActive('bold'))}
          title="Negrita"
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
          className={bubbleMenuButtonClass(editor.isActive('italic'))}
          title="Cursiva"
        >
          <span className="italic">I</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleUnderline().run();
          }}
          className={bubbleMenuButtonClass(editor.isActive('underline'))}
          title="Subrayado"
        >
          <span className="underline">U</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleStrike().run();
          }}
          className={bubbleMenuButtonClass(editor.isActive('strike'))}
          title="Tachado"
        >
          <span className="line-through">S</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleCode().run();
          }}
          className={bubbleMenuButtonClass(editor.isActive('code'))}
          title="Código en línea"
        >
          <span className="font-mono">`code`</span>
        </button>
      </BubbleMenu>

      <FloatingMenu
        editor={editor}
        shouldShow={({ editor: currentEditor, state }) => {
          if (!currentEditor.isEditable || disabled) {
            return false;
          }

          const { $from, empty } = state.selection;
          if (!empty) {
            return false;
          }

          if (currentEditor.isActive('table')) {
            return false;
          }

          const parentNode = $from.parent;
          const isEmptyTextBlock = parentNode.isTextblock && parentNode.textContent.trim().length === 0;

          if (!isEmptyTextBlock) {
            return false;
          }

          return !currentEditor.isActive('image');
        }}
        options={{
          placement: 'top-start',
          offset: 10,
        }}
        className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg shadow-slate-900/10 backdrop-blur-sm ${isFullscreen ? 'z-[70]' : 'z-30'}`}
      >
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 1 }).run();
          }}
          className={floatingMenuButtonClass}
          title="Título 1"
        >
          H1
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleHeading({ level: 2 }).run();
          }}
          className={floatingMenuButtonClass}
          title="Título 2"
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
          className={floatingMenuButtonClass}
          title="Lista con viñetas"
        >
          Lista
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={floatingMenuButtonClass}
          title="Lista numerada"
        >
          Num.
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleTaskList().run();
          }}
          className={floatingMenuButtonClass}
          title="Lista de tareas"
        >
          Tarea
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().toggleBlockquote().run();
          }}
          className={floatingMenuButtonClass}
          title="Cita"
        >
          Cita
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().setHorizontalRule().run();
          }}
          className={floatingMenuButtonClass}
          title="Insertar separador"
        >
          Línea
        </button>
      </FloatingMenu>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-50 border-b border-slate-200 p-1.5 select-none">
        {/* Color de texto */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            disabled={disabled}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40`}
            title="Color de texto"
          >
            <span
              className="w-3 h-3 rounded-full border border-slate-300"
              style={{
                backgroundColor: (editor.getAttributes('textStyle').color as string) || '#0f172a',
              }}
            />
            <span>A</span>
          </button>
          {showColorPicker && (
            <div className="absolute left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 flex flex-col gap-2 min-w-[120px]">
              <div className="grid grid-cols-4 gap-1.5">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setColor(c.value).run();
                      setShowColorPicker(false);
                    }}
                    className={`w-5 h-5 rounded-full ${c.bg} border border-slate-200 cursor-pointer hover:scale-110 transition-transform`}
                    title={c.name}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-800 text-left border-t border-slate-100 pt-1.5"
              >
                Quitar color
              </button>
            </div>
          )}
        </div>

        {/* Fondo / Resaltado */}
        <div className="relative" ref={highlightPickerRef}>
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            disabled={disabled}
            className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40`}
            title="Resaltado de texto"
          >
            <span
              className="w-3 h-3 rounded-sm border border-slate-300"
              style={{
                backgroundColor: (editor.getAttributes('highlight').color as string) || 'transparent',
              }}
            />
            <span>Resaltar</span>
          </button>
          {showHighlightPicker && (
            <div className="absolute left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 flex flex-col gap-2 min-w-[120px]">
              <div className="grid grid-cols-5 gap-1.5">
                {highlights.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: h.value }).run();
                      setShowHighlightPicker(false);
                    }}
                    className={`w-5 h-5 rounded-sm ${h.bg} border cursor-pointer hover:scale-110 transition-transform`}
                    title={h.name}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightPicker(false);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-800 text-left border-t border-slate-100 pt-1.5"
              >
                Quitar resaltado
              </button>
            </div>
          )}
        </div>

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

        {/* Heading 3 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Título 3"
        >
          H3
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

        {/* Task List */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          disabled={disabled}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
            editor.isActive('taskList') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Lista de Tareas (Checklist)"
        >
          ☑ Tareas
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

        {/* Limpiar formato */}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          disabled={disabled}
          className="px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-40 font-semibold"
          title="Limpiar formato"
        >
          Limpiar formato
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
          disabled={disabled || uploadingImage}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
            editor.isActive('link') ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
          title="Enlace"
        >
          Enlace
        </button>

        {/* Imagen */}
        {nodeId && (
          <>
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={triggerImageUpload}
              disabled={disabled || uploadingImage}
              className="px-2 py-1 rounded text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors flex items-center gap-1"
              title="Insertar Imagen"
            >
              {uploadingImage ? (
                <>
                  <span className="w-3 h-3 border border-slate-600 border-t-transparent rounded-full animate-spin shrink-0"></span>
                  <span>Subiendo...</span>
                </>
              ) : (
                <span>Imagen</span>
              )}
            </button>
          </>
        )}

        {/* Tabla */}
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          disabled={disabled}
          className="px-2 py-1 rounded text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors"
          title="Insertar tabla 3x3"
        >
          Tabla
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

        {/* Pantalla Completa */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ml-auto ${
            isFullscreen ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
          }`}
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? "Salir Completa" : "Pantalla Completa"}
        </button>
      </div>

      {/* Advanced Table Controls Sub-Toolbar */}
      {editor.isActive('table') && (
        <div className="flex flex-wrap items-center gap-1.5 bg-blue-50/60 border-b border-slate-200 p-1.5 select-none text-[11px]">
          <span className="text-blue-700 font-semibold px-1.5 mr-1 border-r border-blue-200">Tabla:</span>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            disabled={disabled}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            title="Añadir fila arriba"
          >
            Fila Arriba
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            disabled={disabled}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            title="Añadir fila abajo"
          >
            Fila Abajo
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            disabled={disabled}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            title="Añadir columna izquierda"
          >
            Col. Izquierda
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            disabled={disabled}
            className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40"
            title="Añadir columna derecha"
          >
            Col. Derecha
          </button>
          
          <div className="w-px h-3 bg-slate-300 mx-1" />
          
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={disabled}
            className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
            title="Eliminar fila"
          >
            Eliminar Fila
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={disabled}
            className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
            title="Eliminar columna"
          >
            Eliminar Columna
          </button>
          
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            disabled={disabled}
            className="px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40"
            title="Eliminar tabla completa"
          >
            Eliminar Tabla
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className={`flex-1 overflow-y-auto ${isFullscreen ? 'h-[calc(100vh-120px)]' : ''}`} style={{ minHeight: isFullscreen ? 'auto' : minHeight }}>
        <EditorContent editor={editor} />
      </div>

      {/* Ayuda visual discreta para Markdown rápido */}
      <div className="bg-slate-50/60 border-t border-slate-200/60 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-slate-400/80 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong className="text-slate-500 font-semibold">Markdown rápido:</strong> <code>###</code> título, <code>-</code> lista, <code>&gt;</code> cita, <code>**</code><strong>negrita</strong><code>**</code>, <code>`</code><code>código</code><code>`</code>
          </span>
        </div>
      </div>
    </div>
  );
}

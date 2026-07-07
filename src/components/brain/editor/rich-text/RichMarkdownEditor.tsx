'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import { NodeSelection } from '@tiptap/pm/state';
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

type ImageAlignment = 'left' | 'center' | 'right';

const normalizeImageAlignment = (value: unknown): ImageAlignment => {
  if (value === 'left' || value === 'center' || value === 'right') {
    return value;
  }

  return 'center';
};

const ImageWithAlignment = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: (element) => normalizeImageAlignment(element.getAttribute('data-align')),
        renderHTML: (attributes) => ({
          ...(normalizeImageAlignment(attributes.align) === 'center'
            ? {}
            : { 'data-align': normalizeImageAlignment(attributes.align) }),
        }),
      },
    };
  },

  addStorage() {
    return {
      markdown: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serialize(state: any, node: any) {
          const align = normalizeImageAlignment(node.attrs.align);
          const src = String(node.attrs.src || '');
          const alt = String(node.attrs.alt || '');
          const title = String(node.attrs.title || '');

          const escapeHtmlAttribute = (value: string) => value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          const escapeMarkdownUrl = (value: string) => value.replace(/[()]/g, '\\$&');

          const linkMark = node.marks?.find((m: { type: { name: string } }) => m.type.name === 'link');
          const href = linkMark ? String(linkMark.attrs?.href || '') : '';

          const imageMarkdown = align === 'center'
            ? `![${state.esc(alt)}](${escapeMarkdownUrl(src)}${title ? ` \"${title.replace(/\"/g, '\\\"')}\"` : ''})`
            : `<img src="${escapeHtmlAttribute(src)}" alt="${escapeHtmlAttribute(alt)}"${title ? ` title="${escapeHtmlAttribute(title)}"` : ''} data-align="${align}">`;

          if (href) {
            if (align === 'center') {
              state.write(`[${imageMarkdown}](${escapeMarkdownUrl(href)})`);
            } else {
              state.write(`<a href="${escapeHtmlAttribute(href)}">${imageMarkdown}</a>`);
            }
            return;
          }

          if (align === 'center') {
            state.write(imageMarkdown);
            return;
          }

          const attrs = [
            `src="${escapeHtmlAttribute(src)}"`,
            `alt="${escapeHtmlAttribute(alt)}"`,
            `data-align="${align}"`,
          ];

          if (title) {
            attrs.push(`title="${escapeHtmlAttribute(title)}"`);
          }

          state.write(`<img ${attrs.join(' ')}>`);
        },
        parse: {
          // handled by markdown-it / DOM parsing
        },
      },
    };
  },
});

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

  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');
  const linkPopoverRef = useRef<HTMLDivElement>(null);

  const [showImageLinkPopover, setShowImageLinkPopover] = useState(false);
  const [imageLinkUrl, setImageLinkUrl] = useState('');
  const [imageLinkError, setImageLinkError] = useState('');
  const [imageLinkHasLink, setImageLinkHasLink] = useState(false);
  const imageLinkPopoverRef = useRef<HTMLDivElement>(null);
  const imageLinkSelectionPosRef = useRef<number | null>(null);

  // Close pickers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
      if (highlightPickerRef.current && !highlightPickerRef.current.contains(event.target as Node)) {
        setShowHighlightPicker(false);
      }
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(event.target as Node)) {
        setShowLinkPopover(false);
        setLinkError('');
      }
      if (imageLinkPopoverRef.current && !imageLinkPopoverRef.current.contains(event.target as Node)) {
        setShowImageLinkPopover(false);
        setImageLinkError('');
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
      ImageWithAlignment.configure({
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

  useEffect(() => {
    if (!editor || editor.isDestroyed) return undefined;

    const updateImageLinkState = () => {
      const selection = editor.state.selection;
      if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
        const linkMark = selection.node.marks?.find((m: { type: { name: string } }) => m.type.name === 'link');
        setImageLinkHasLink(!!linkMark?.attrs?.href);
        imageLinkSelectionPosRef.current = selection.from;
        return;
      }

      setImageLinkHasLink(false);
    };

    updateImageLinkState();
    editor.on('selectionUpdate', updateImageLinkState);

    return () => {
      editor.off('selectionUpdate', updateImageLinkState);
    };
  }, [editor]);

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

  const isValidLink = (href: string): boolean => {
    if (!href.trim()) return false;
    try {
      const parsed = new URL(href);
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
    } catch {
      return href.startsWith('mailto:') || href.startsWith('/');
    }
  };

  const openLinkPopover = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setLinkError('');
    setShowLinkPopover(!showLinkPopover);
    setShowColorPicker(false);
    setShowHighlightPicker(false);
  };

  const applyLink = () => {
    if (!linkUrl.trim()) {
      setLinkError('Ingresa una URL válida.');
      return;
    }
    if (!isValidLink(linkUrl)) {
      setLinkError('URL no válida. Usa http, https, mailto o /ruta.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setShowLinkPopover(false);
    setLinkError('');
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setShowLinkPopover(false);
    setLinkError('');
  };

  const closeLinkPopover = () => {
    setShowLinkPopover(false);
    setLinkError('');
  };

  const getSelectedImageLink = (): { pos: number; href: string } | null => {
    const { state } = editor;
    const { selection } = state;

    if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
      const linkMark = selection.node.marks?.find((m: { type: { name: string } }) => m.type.name === 'link');
      return {
        pos: selection.from,
        href: linkMark ? String(linkMark.attrs?.href || '') : '',
      };
    }

    const storedPos = imageLinkSelectionPosRef.current;
    if (typeof storedPos === 'number') {
      const node = state.doc.nodeAt(storedPos);
      if (node?.type.name === 'image') {
        const linkMark = node.marks?.find((m: { type: { name: string } }) => m.type.name === 'link');
        return {
          pos: storedPos,
          href: linkMark ? String(linkMark.attrs?.href || '') : '',
        };
      }
    }

    return null;
  };

  const openImageLinkPopover = () => {
    const selectedImage = getSelectedImageLink();
    if (!selectedImage) return;

    imageLinkSelectionPosRef.current = selectedImage.pos;
    setImageLinkUrl(selectedImage.href);
    setImageLinkHasLink(!!selectedImage.href);
    setImageLinkError('');
    setShowImageLinkPopover(!showImageLinkPopover);
  };

  const applyImageLink = () => {
    if (!imageLinkUrl.trim()) {
      setImageLinkError('Ingresa una URL válida.');
      return;
    }
    if (!isValidLink(imageLinkUrl)) {
      setImageLinkError('URL no válida. Usa http, https, mailto o /ruta.');
      return;
    }
    const pos = imageLinkSelectionPosRef.current;
    if (typeof pos !== 'number') {
      setImageLinkError('No se pudo localizar la imagen seleccionada.');
      return;
    }

    editor.chain().focus().setNodeSelection(pos).setLink({ href: imageLinkUrl }).run();
    setImageLinkHasLink(true);
    setShowImageLinkPopover(false);
    setImageLinkError('');
  };

  const removeImageLink = () => {
    const pos = imageLinkSelectionPosRef.current;
    if (typeof pos !== 'number') {
      setImageLinkError('No se pudo localizar la imagen seleccionada.');
      return;
    }

    editor.chain().focus().setNodeSelection(pos).unsetLink().run();
    setImageLinkHasLink(false);
    setShowImageLinkPopover(false);
    setImageLinkError('');
  };

  const closeImageLinkPopover = () => {
    setShowImageLinkPopover(false);
    setImageLinkError('');
  };

  const bubbleMenuButtonClass = (isActive: boolean) =>
    `px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  const floatingMenuButtonClass =
    'px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap';

  const imageAlignmentButtonClass = (isActive: boolean) =>
    `px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  const setImageAlignment = (align: ImageAlignment) => {
    if (!editor || editor.isDestroyed || disabled) return;
    editor.chain().focus().updateAttributes('image', { align }).run();
  };

  const isImageLeftAligned = editor.isActive('image', { align: 'left' });
  const isImageCenterAligned = editor.isActive('image', { align: 'center' }) || (!isImageLeftAligned && !editor.isActive('image', { align: 'right' }));
  const isImageRightAligned = editor.isActive('image', { align: 'right' });

  return (
    <>
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

        .rich-markdown-editor .ProseMirror pre:has(> code[class*="language-"]) {
          position: relative;
          padding-top: 2rem;
        }

        .rich-markdown-editor .ProseMirror pre:has(> code[class*="language-"])::after {
          position: absolute;
          top: 0.5rem;
          right: 0.75rem;
          z-index: 5;
          padding: 0.125rem 0.4rem;
          border-radius: 0.25rem;
          background: rgba(255, 255, 255, 0.9);
          color: #64748b;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
          font-size: 0.625rem;
          font-weight: 600;
          line-height: 1.4;
          letter-spacing: 0.01em;
          pointer-events: none;
        }

        .rich-markdown-editor .ProseMirror pre:has(> code.language-js)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-javascript)::after { content: "javascript"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-ts)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-typescript)::after { content: "typescript"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-jsx)::after { content: "jsx"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-tsx)::after { content: "tsx"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-py)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-python)::after { content: "python"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-sh)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-shell)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-bash)::after { content: "bash"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-html)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-xml)::after { content: "html"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-css)::after { content: "css"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-json)::after { content: "json"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-md)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-markdown)::after { content: "markdown"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-sql)::after { content: "sql"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-yml)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-yaml)::after { content: "yaml"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-txt)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-plaintext)::after { content: "plaintext"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-console)::after { content: "console"; }
        .rich-markdown-editor .ProseMirror pre:has(> code.language-dotenv)::after,
        .rich-markdown-editor .ProseMirror pre:has(> code.language-env)::after { content: "env"; }

        .rich-markdown-editor .ProseMirror img[data-align="left"] {
          display: block;
          margin-left: 0;
          margin-right: auto;
        }

        .rich-markdown-editor .ProseMirror img[data-align="center"] {
          display: block;
          margin-left: auto;
          margin-right: auto;
        }

        .rich-markdown-editor .ProseMirror img[data-align="right"] {
          display: block;
          margin-left: auto;
          margin-right: 0;
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
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        {/* Link popover inline */}
        <div className="relative" ref={linkPopoverRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              openLinkPopover();
            }}
            className={bubbleMenuButtonClass(editor.isActive('link'))}
            title="Enlace"
          >
            Link
          </button>
          {showLinkPopover && (
            <div className="absolute left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 flex flex-col gap-1.5 min-w-[240px]">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeLinkPopover();
                  }
                }}
                placeholder="https://example.com"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
                autoFocus
              />
              {linkError && (
                <span className="text-[10px] text-red-500 font-medium">{linkError}</span>
              )}
              <div className="flex items-center gap-1 pt-0.5 border-t border-slate-100">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyLink();
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Aplicar
                </button>
                {editor.isActive('link') && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      removeLink();
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Quitar
                  </button>
                )}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    closeLinkPopover();
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors ml-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().unsetAllMarks().clearNodes().run();
          }}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          title="Limpiar formato"
        >
          Limpiar
        </button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        {/* Color picker inline */}
        <div className="relative" ref={colorPickerRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            title="Color de texto"
          >
            <span
              className="w-3 h-3 rounded-full border border-slate-300 inline-block"
              style={{
                backgroundColor: (editor.getAttributes('textStyle').color as string) || '#0f172a',
              }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute left-0 mt-1 p-1.5 bg-white border border-slate-200 rounded-lg shadow-lg z-50 flex flex-col gap-1 min-w-[100px]">
              <div className="grid grid-cols-4 gap-1">
                {colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-800 text-left border-t border-slate-100 pt-1"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
        {/* Highlight picker inline */}
        <div className="relative" ref={highlightPickerRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            title="Resaltado de texto"
          >
            <span
              className="w-3 h-3 rounded-sm border border-slate-300 inline-block"
              style={{
                backgroundColor: (editor.getAttributes('highlight').color as string) || 'transparent',
              }}
            />
          </button>
          {showHighlightPicker && (
            <div className="absolute left-0 mt-1 p-1.5 bg-white border border-slate-200 rounded-lg shadow-lg z-50 flex flex-col gap-1 min-w-[100px]">
              <div className="grid grid-cols-5 gap-1">
                {highlights.map((h) => (
                  <button
                    key={h.value}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().unsetHighlight().run();
                  setShowHighlightPicker(false);
                }}
                className="text-[10px] text-slate-500 hover:text-slate-800 text-left border-t border-slate-100 pt-1"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
      </BubbleMenu>

      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: currentEditor, state }) => {
          if (!currentEditor.isEditable || disabled) {
            return false;
          }

          const selection = state.selection;
          if (!(selection instanceof NodeSelection)) {
            return false;
          }

          return selection.node.type.name === 'image';
        }}
        options={{
          placement: 'top',
          offset: 10,
        }}
        className={`flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg shadow-slate-900/10 backdrop-blur-sm ${isFullscreen ? 'z-[70]' : 'z-40'}`}
      >
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 select-none whitespace-nowrap">
          Imagen
        </span>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setImageAlignment('left');
          }}
          className={imageAlignmentButtonClass(isImageLeftAligned)}
          title="Alinear a la izquierda"
          aria-label="Alinear imagen a la izquierda"
        >
          Izq
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setImageAlignment('center');
          }}
          className={imageAlignmentButtonClass(isImageCenterAligned)}
          title="Alinear al centro"
          aria-label="Alinear imagen al centro"
        >
          Cen
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setImageAlignment('right');
          }}
          className={imageAlignmentButtonClass(isImageRightAligned)}
          title="Alinear a la derecha"
          aria-label="Alinear imagen a la derecha"
        >
          Der
        </button>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
        {/* Image link popover */}
        <div className="relative" ref={imageLinkPopoverRef}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              openImageLinkPopover();
            }}
            className={imageAlignmentButtonClass(imageLinkHasLink)}
            title="Enlace de imagen"
            aria-label="Agregar enlace a imagen"
          >
            Link
          </button>
          {showImageLinkPopover && (
            <div className="absolute left-0 mt-1 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 flex flex-col gap-1.5 min-w-[240px]">
              <input
                type="text"
                value={imageLinkUrl}
                onChange={(e) => {
                  setImageLinkUrl(e.target.value);
                  setImageLinkError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyImageLink();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeImageLinkPopover();
                  }
                }}
                placeholder="https://example.com"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
                autoFocus
              />
              {imageLinkError && (
                <span className="text-[10px] text-red-500 font-medium">{imageLinkError}</span>
              )}
              <div className="flex items-center gap-1 pt-0.5 border-t border-slate-100">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyImageLink();
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Aplicar
                </button>
                {imageLinkHasLink && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      removeImageLink();
                    }}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Quitar
                  </button>
                )}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    closeImageLinkPopover();
                  }}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors ml-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </BubbleMenu>

      {nodeId && (
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageUpload}
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
        />
      )}

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
        <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 select-none whitespace-nowrap">
          Insertar
        </span>
        <div className="w-px h-4 bg-slate-200 mx-0.5" />
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
            editor.chain().focus().toggleHeading({ level: 3 }).run();
          }}
          className={floatingMenuButtonClass}
          title="Título 3"
        >
          H3
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
            editor.chain().focus().toggleCodeBlock().run();
          }}
          className={floatingMenuButtonClass}
          title="Bloque de código"
        >
          Código
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
        {nodeId && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                triggerImageUpload();
              }}
              disabled={disabled || uploadingImage}
              className={floatingMenuButtonClass}
              title="Insertar Imagen"
            >
              {uploadingImage ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border border-slate-600 border-t-transparent rounded-full animate-spin shrink-0"></span>
                  Subiendo...
                </span>
              ) : (
                'Imagen'
              )}
            </button>
          </>
        )}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          }}
          className={floatingMenuButtonClass}
          title="Insertar tabla 3x3"
        >
          Tabla
        </button>
      </FloatingMenu>

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

      {/* Fullscreen floating button */}
      <button
        type="button"
        onClick={() => setIsFullscreen(!isFullscreen)}
        className={`fixed bottom-4 right-4 z-[60] px-3 py-2 rounded-lg text-xs font-semibold shadow-lg transition-colors ${
          isFullscreen ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
        }`}
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        {isFullscreen ? "Salir Completa" : "Pantalla Completa"}
      </button>
    </>
  );
}

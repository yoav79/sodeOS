'use client';

import React, { useState, useEffect } from 'react';
import { NodeTreeItem, Node } from '@/types';
import NodeTree from '@/components/tree/NodeTree';

interface TreeDemoClientProps {
  brainId: string;
  brainName: string;
}

interface NodeVersionWithSaver {
  id: string;
  nodeId: string;
  title: string;
  contentMarkdown: string;
  status: string;
  savedBy: string;
  changeNote: string | null;
  createdAt: string;
  saver?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function TreeDemoClient({ brainId, brainName }: TreeDemoClientProps) {
  const [tree, setTree] = useState<NodeTreeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetail, setNodeDetail] = useState<Node | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Versions History States
  const [versions, setVersions] = useState<NodeVersionWithSaver[]>([]);
  const [versionsLoading, setVersionsLoading] = useState<boolean>(false);
  const [versionsError, setVersionsError] = useState<string | null>(null);


  // Edit Mode States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editChangeNote, setEditChangeNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch the nested tree structures
  useEffect(() => {
    let active = true;
    async function fetchTree() {
      try {
        const res = await fetch(`/api/brains/${brainId}/tree`);
        if (!res.ok) {
          throw new Error(`Error en el servidor: ${res.statusText}`);
        }
        const data = await res.json();
        if (active) {
          setTree(data.tree || []);
          if (data.tree && data.tree.length > 0 && !selectedNodeId) {
            setSelectedNodeId(data.tree[0].id);
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido al cargar el árbol.';
        if (active) setError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchTree();
    return () => {
      active = false;
    };
  }, [brainId, refreshTrigger, selectedNodeId]);

  // Fetch the full details of the selected node
  useEffect(() => {
    let active = true;

    if (!selectedNodeId) {
      Promise.resolve().then(() => {
        if (active) setNodeDetail(null);
      });
      return;
    }

    async function fetchNodeDetail() {
      await Promise.resolve();
      if (!active) return;
      setDetailLoading(true);
      setDetailError(null);

      try {
        const res = await fetch(`/api/nodes/${selectedNodeId}`);
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('El nodo seleccionado no existe o fue eliminado.');
          }
          throw new Error(`Error al obtener los detalles del nodo: ${res.statusText}`);
        }
        const data = await res.json();
        if (active) setNodeDetail(data.node || null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido.';
        if (active) setDetailError(message);
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    fetchNodeDetail();
    return () => {
      active = false;
    };
  }, [selectedNodeId, refreshTrigger]);

  // Fetch versions history
  useEffect(() => {
    let active = true;

    if (!selectedNodeId) {
      Promise.resolve().then(() => {
        if (active) setVersions([]);
      });
      return;
    }

    async function fetchVersions() {
      await Promise.resolve();
      if (!active) return;
      setVersionsLoading(true);
      setVersionsError(null);

      try {
        const res = await fetch(`/api/nodes/${selectedNodeId}/versions`);
        if (!res.ok) {
          throw new Error(`Error al obtener historial de versiones: ${res.statusText}`);
        }
        const data = await res.json();
        if (active) {
          setVersions(data.versions || []);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido.';
        if (active) setVersionsError(message);
      } finally {
        if (active) setVersionsLoading(false);
      }
    }

    fetchVersions();
    return () => {
      active = false;
    };
  }, [selectedNodeId, refreshTrigger]);

  const handleStartEdit = () => {
    if (nodeDetail) {
      setEditTitle(nodeDetail.title);
      setEditContent(nodeDetail.contentMarkdown);
      setEditStatus(nodeDetail.status);
      setEditChangeNote('');
      setSaveError(null);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!selectedNodeId) return;

    if (!editTitle.trim()) {
      setSaveError('El título no puede estar vacío.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);

      const res = await fetch(`/api/nodes/${selectedNodeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
          contentMarkdown: editContent,
          status: editStatus,
          changeNote: editChangeNote,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar los cambios.');
      }

      setIsEditing(false);
      // Trigger refresh of tree hierarchy, node detail and versions list
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar los cambios.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectNodeHandler = (id: string) => {
    if (isEditing) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de nodo?')) {
        return;
      }
      setIsEditing(false);
    }
    setSelectedNodeId(id);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur font-sans">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Cerebro Empresarial</h1>
            <p className="text-xs text-zinc-500">Visualización y Edición de Estructuras</p>
          </div>
        </div>
        <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
          Cerebro: <span className="text-blue-400">{brainName}</span>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tree View */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-900/20 flex flex-col">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/10">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Árbol de Conocimiento</h2>
            <p className="text-xs text-zinc-500 mt-1">Todos los nodos son páginas de contenido.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loading && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-zinc-500">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Cargando árbol...</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400 text-xs flex flex-col gap-2">
                <span className="font-semibold">⚠️ Error al cargar:</span>
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && tree.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-xs">
                Este cerebro no tiene nodos todavía.
              </div>
            )}

            {!loading && !error && tree.length > 0 && (
              <NodeTree
                items={tree}
                selectedNodeId={selectedNodeId}
                onSelectNode={(node) => selectNodeHandler(node.id)}
              />
            )}
          </div>
        </aside>

        {/* Detail / Edit View Panel */}
        <main className="flex-1 bg-zinc-900/10 overflow-y-auto flex flex-col">
          {!selectedNodeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
              <svg className="w-12 h-12 text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <h2 className="text-sm font-semibold text-zinc-400">Ningún nodo seleccionado</h2>
              <p className="text-xs text-zinc-600 mt-1">Haz clic en el título de un nodo en el sidebar para visualizar su detalle.</p>
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-zinc-400">Cargando detalles del nodo...</span>
            </div>
          ) : detailError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="max-w-md w-full bg-red-950/20 border border-red-900/50 p-6 rounded-xl text-center flex flex-col gap-3">
                <span className="text-red-400 text-2xl">⚠️</span>
                <h3 className="text-sm font-semibold text-red-400">Error al Cargar Detalle</h3>
                <p className="text-xs text-zinc-400">{detailError}</p>
              </div>
            </div>
          ) : nodeDetail ? (
            <div className="max-w-4xl w-full mx-auto p-8 flex flex-col gap-6">
              
              {/* EDIT MODE */}
              {isEditing ? (
                <div className="flex flex-col gap-6">
                  {/* Edit Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
                    <div>
                      <h1 className="text-2xl font-bold text-white">Modo Edición</h1>
                      <p className="text-xs text-zinc-500 mt-1">Actualiza los metadatos y contenido del nodo.</p>
                    </div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest bg-zinc-850 px-3 py-1 rounded border border-zinc-850">
                      Borrador en edición
                    </div>
                  </div>

                  {/* Title Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Título del Nodo</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Ej. Título del Nodo"
                    />
                  </div>

                  {/* Status & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Estado (Status)</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      >
                        <option value="active">Vigente (Activo)</option>
                        <option value="draft">Borrador</option>
                        <option value="needs_review">En Revisión</option>
                        <option value="archived">Archivado</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Categoría</label>
                      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-4 py-3 text-sm text-zinc-500">
                        {nodeDetail.category || 'Ninguna (Solo Lectura)'}
                      </div>
                    </div>
                  </div>

                  {/* Markdown Content */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Contenido Markdown</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-300 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-500 min-h-[300px] resize-y"
                      placeholder="# Encabezado\n\nEscribe contenido aquí..."
                    />
                  </div>

                  {/* Change Note */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Nota de Cambios (Version History)</label>
                    <input
                      type="text"
                      value={editChangeNote}
                      onChange={(e) => setEditChangeNote(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      placeholder="Ej. Se actualizó la descripción del proceso de cobros."
                    />
                    <span className="text-[10px] text-zinc-500">
                      * Nota de cambios guardada de forma permanente en node_versions.
                    </span>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex items-center gap-3 justify-end border-t border-zinc-800 pt-5 mt-2">
                    {saveError && (
                      <span className="text-xs text-red-400 font-medium mr-auto">⚠️ {saveError}</span>
                    )}
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-sm font-semibold text-zinc-300 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Guardando...
                        </>
                      ) : (
                        'Guardar Cambios'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* READ-ONLY VIEW */
                <div className="flex flex-col gap-6">
                  {/* Node Breadcrumbs / Meta */}
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>Cerebros</span>
                    <span>/</span>
                    <span>{brainName}</span>
                    <span>/</span>
                    <span className="text-zinc-300 font-medium">{nodeDetail.title}</span>
                  </div>

                  {/* Title Header */}
                  <div className="flex items-start justify-between border-b border-zinc-800 pb-5">
                    <div>
                      <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{nodeDetail.title}</h1>
                      <p className="text-zinc-400 text-sm">
                        {nodeDetail.description || 'Sin descripción adicional para este nodo.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <button
                        onClick={handleStartEdit}
                        className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-200 border border-zinc-700/50 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-zinc-500 font-mono uppercase">Status</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
                          nodeDetail.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          nodeDetail.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          nodeDetail.status === 'needs_review' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}>
                          {nodeDetail.status === 'active' ? 'Vigente' :
                           nodeDetail.status === 'draft' ? 'Borrador' :
                           nodeDetail.status === 'needs_review' ? 'En Revisión' :
                           'Archivado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Categoría</span>
                      <span className="text-sm font-medium text-zinc-300 truncate">{nodeDetail.category || 'Ninguna'}</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Responsable</span>
                      <span className="text-sm font-medium text-zinc-300">
                        {nodeDetail.responsibleUserId === '00000000-0000-0000-0000-000000000001' ? 'Usuario Demo' : nodeDetail.responsibleUserId.slice(-8)}
                      </span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Identificador único</span>
                      <span className="text-xs text-zinc-400 font-mono truncate">{nodeDetail.id}</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Última actualización</span>
                      <span className="text-xs text-zinc-400 truncate">
                        {new Date(nodeDetail.updatedAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Revision Dates Panel */}
                  <div className="bg-zinc-900/25 border border-zinc-800/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/40 rounded border border-zinc-800/30">
                      <span className="text-zinc-500">Última revisión:</span>
                      <span className="font-semibold text-zinc-300">
                        {nodeDetail.reviewedAt ? new Date(nodeDetail.reviewedAt).toLocaleDateString('es-ES') : 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/40 rounded border border-zinc-800/30">
                      <span className="text-zinc-500">Próxima revisión:</span>
                      <span className="font-semibold text-zinc-300">
                        {nodeDetail.nextReviewAt ? new Date(nodeDetail.nextReviewAt).toLocaleDateString('es-ES') : 'No programada'}
                      </span>
                    </div>
                  </div>

                  {/* Markdown Preview Box */}
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 min-h-[300px] flex flex-col">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-4">
                      <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        Vista Previa Markdown
                      </span>
                      <span className="text-[10px] text-zinc-600 bg-zinc-800/30 px-2 py-0.5 rounded border border-zinc-800">
                        Solo lectura
                      </span>
                    </div>
                    {!nodeDetail.contentMarkdown || nodeDetail.contentMarkdown.trim() === '' ? (
                      <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs py-12">
                        Este nodo no contiene información o contenido Markdown.
                      </div>
                    ) : (
                      <div className="prose prose-invert max-w-none text-zinc-300 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {nodeDetail.contentMarkdown}
                      </div>
                    )}
                  </div>

                  {/* Historial de Versiones */}
                  <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                      <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Historial de Versiones
                      </span>
                      <span className="text-[10px] text-zinc-600 bg-zinc-800/30 px-2 py-0.5 rounded border border-zinc-800 font-mono">
                        {versions.length} {versions.length === 1 ? 'versión' : 'versiones'}
                      </span>
                    </div>

                    {versionsLoading ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-xs text-zinc-500">
                        <div className="w-4 h-4 border border-zinc-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Cargando historial de versiones...</span>
                      </div>
                    ) : versionsError ? (
                      <div className="text-xs text-red-400 py-3 bg-red-950/10 border border-red-900/40 rounded-lg px-4">
                        ⚠️ {versionsError}
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="text-xs text-zinc-600 py-6 text-center">
                        No hay versiones de historial guardadas para este nodo.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                        {versions.map((ver, idx) => (
                          <div key={ver.id} className="bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-800 rounded-xl p-4 flex flex-col gap-2.5 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-zinc-200 truncate max-w-[200px]">
                                    {ver.title}
                                  </span>
                                  <span className="text-[9px] text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700/30 font-mono font-semibold uppercase">
                                    V{versions.length - idx}
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    ver.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    ver.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    ver.status === 'needs_review' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                  }`}>
                                    {ver.status === 'active' ? 'Vigente' :
                                     ver.status === 'draft' ? 'Borrador' :
                                     ver.status === 'needs_review' ? 'En Revisión' :
                                     'Archivado'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500">
                                  Guardado el {new Date(ver.createdAt).toLocaleString('es-ES', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </span>
                              </div>
                              <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                                <span className="text-[9px] text-zinc-500 uppercase font-semibold">Guardado por</span>
                                <span className="text-[10px] text-zinc-300 font-medium">{ver.saver?.name || 'Usuario Demo'}</span>
                              </div>
                            </div>

                            {ver.changeNote && (
                              <div className="text-xs bg-zinc-950/40 border border-zinc-850/60 rounded-lg px-3 py-2 text-zinc-400 leading-relaxed font-sans">
                                <span className="font-semibold text-zinc-500 text-[10px] uppercase block mb-0.5">Nota de cambio:</span>
                                {ver.changeNote}
                              </div>
                            )}

                            <div className="text-xs bg-zinc-950/20 rounded p-2.5 font-mono text-zinc-500 truncate whitespace-nowrap">
                              {ver.contentMarkdown ? ver.contentMarkdown.substring(0, 120) : 'Sin contenido'}
                              {ver.contentMarkdown && ver.contentMarkdown.length > 120 ? '...' : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8">
              <svg className="w-12 h-12 text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <h2 className="text-sm font-semibold text-zinc-400">Error</h2>
              <p className="text-xs text-zinc-600 mt-1">No se pudieron recuperar los detalles del nodo.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

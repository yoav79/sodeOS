'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function BrainEditorClient({ brainId, brainName }: TreeDemoClientProps) {
  const router = useRouter();

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

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (res.ok) {
        router.push('/login');
      } else {
        alert('Error al cerrar sesión.');
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('Error de red al cerrar sesión.');
    }
  };

  // Fetch the nested tree structures
  useEffect(() => {
    let active = true;
    async function fetchTree() {
      try {
        const res = await fetch(`/api/brains/${brainId}/tree`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
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
  }, [brainId, refreshTrigger, selectedNodeId, router]);

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
        if (res.status === 401) {
          router.push('/login');
          return;
        }
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
  }, [selectedNodeId, refreshTrigger, router]);

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
        if (res.status === 401) {
          router.push('/login');
          return;
        }
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
  }, [selectedNodeId, refreshTrigger, router]);

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

      if (res.status === 401) {
        router.push('/login');
        return;
      }

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
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shadow-sm shadow-slate-100/50 backdrop-blur font-sans z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Cerebro Empresarial</h1>
            <p className="text-xs text-slate-500 font-medium">Visualización y Edición de Estructuras</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Cerebro: <span className="text-blue-600">{brainName}</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            ← Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tree View */}
        <aside className="w-80 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Árbol de Conocimiento</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Todos los nodos son páginas de contenido.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {loading && (
              <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium">Cargando árbol...</span>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
                <span className="font-semibold">⚠️ Error al cargar:</span>
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && tree.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
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
        <main className="flex-1 bg-slate-50 overflow-y-auto flex flex-col">
          {!selectedNodeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-600 font-sans">Ningún nodo seleccionado</h2>
              <p className="text-xs text-slate-400 mt-1">Haz clic en el título de un nodo en el sidebar para visualizar su detalle.</p>
            </div>
          ) : detailLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs text-slate-500 font-medium">Cargando detalles del nodo...</span>
            </div>
          ) : detailError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="max-w-md w-full bg-red-50 border border-red-200 p-6 rounded-2xl text-center flex flex-col gap-3">
                <span className="text-red-500 text-2xl">⚠️</span>
                <h3 className="text-sm font-semibold text-red-700">Error al Cargar Detalle</h3>
                <p className="text-xs text-red-600 font-medium">{detailError}</p>
              </div>
            </div>
          ) : nodeDetail ? (
            <div className="max-w-4xl w-full mx-auto p-8 flex flex-col gap-6">
              
              {/* EDIT MODE */}
              {isEditing ? (
                <div className="flex flex-col gap-6">
                  {/* Edit Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">Modo Edición</h1>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Actualiza los metadatos y contenido del nodo.</p>
                    </div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded border border-slate-200">
                      Borrador en edición
                    </div>
                  </div>

                  {/* Title Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Título del Nodo</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-950 text-lg font-bold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                      placeholder="Ej. Título del Nodo"
                    />
                  </div>

                  {/* Status & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Estado (Status)</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-950 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                      >
                        <option value="active">Vigente (Activo)</option>
                        <option value="draft">Borrador</option>
                        <option value="needs_review">En Revisión</option>
                        <option value="archived">Archivado</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Categoría</label>
                      <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
                        {nodeDetail.category || 'Ninguna (Solo Lectura)'}
                      </div>
                    </div>
                  </div>

                  {/* Markdown Content */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Contenido Markdown</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 min-h-[300px] resize-y"
                      placeholder="# Encabezado\n\nEscribe contenido aquí..."
                    />
                  </div>

                  {/* Change Note */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Nota de Cambios (Version History)</label>
                    <input
                      type="text"
                      value={editChangeNote}
                      onChange={(e) => setEditChangeNote(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                      placeholder="Ej. Se actualizó la descripción del proceso de cobros."
                    />
                    <span className="text-[10px] text-slate-400 font-medium">
                      * Nota de cambios guardada de forma permanente en node_versions.
                    </span>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex items-center gap-3 justify-end border-t border-slate-200 pt-5 mt-2">
                    {saveError && (
                      <span className="text-xs text-red-600 font-semibold mr-auto">⚠️ {saveError}</span>
                    )}
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-sm font-semibold text-slate-600 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/10"
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
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span>Cerebros</span>
                    <span>/</span>
                    <span>{brainName}</span>
                    <span>/</span>
                    <span className="text-slate-600 font-semibold">{nodeDetail.title}</span>
                  </div>

                  {/* Title Header */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                    <div>
                      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">{nodeDetail.title}</h1>
                      <p className="text-slate-500 text-sm font-medium">
                        {nodeDetail.description || 'Sin descripción adicional para este nodo.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <button
                        onClick={handleStartEdit}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 border border-slate-200 shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Status</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${
                          nodeDetail.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          nodeDetail.status === 'draft' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                          nodeDetail.status === 'needs_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
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
                    <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Categoría</span>
                      <span className="text-sm font-semibold text-slate-700 truncate">{nodeDetail.category || 'Ninguna'}</span>
                    </div>
                    <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Responsable</span>
                      <span className="text-sm font-semibold text-slate-700">
                        {nodeDetail.responsibleUserId === '00000000-0000-0000-0000-000000000001' ? 'Usuario Demo' : nodeDetail.responsibleUserId.slice(-8)}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">ID Único</span>
                      <span className="text-xs text-slate-500 font-mono truncate">{nodeDetail.id}</span>
                    </div>
                    <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Actualización</span>
                      <span className="text-xs text-slate-500 truncate font-semibold">
                        {new Date(nodeDetail.updatedAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Revision Dates Panel */}
                  <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded border border-slate-200">
                      <span className="text-slate-500 font-medium">Última revisión:</span>
                      <span className="font-semibold text-slate-700">
                        {nodeDetail.reviewedAt ? new Date(nodeDetail.reviewedAt).toLocaleDateString('es-ES') : 'Pendiente'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 bg-white rounded border border-slate-200">
                      <span className="text-slate-500 font-medium">Próxima revisión:</span>
                      <span className="font-semibold text-slate-700">
                        {nodeDetail.nextReviewAt ? new Date(nodeDetail.nextReviewAt).toLocaleDateString('es-ES') : 'No programada'}
                      </span>
                    </div>
                  </div>

                  {/* Markdown Preview Box */}
                  <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-xl p-6 min-h-[300px] flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        Vista Previa Markdown
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-medium">
                        Solo lectura
                      </span>
                    </div>
                    {!nodeDetail.contentMarkdown || nodeDetail.contentMarkdown.trim() === '' ? (
                      <div className="flex-1 flex items-center justify-center text-slate-400 text-xs py-12">
                        Este nodo no contiene información o contenido Markdown.
                      </div>
                    ) : (
                      <div className="prose max-w-none text-slate-800 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {nodeDetail.contentMarkdown}
                      </div>
                    )}
                  </div>

                  {/* Historial de Versiones */}
                  <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-xl p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Historial de Versiones
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-mono font-medium">
                        {versions.length} {versions.length === 1 ? 'versión' : 'versiones'}
                      </span>
                    </div>

                    {versionsLoading ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
                        <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Cargando historial de versiones...</span>
                      </div>
                    ) : versionsError ? (
                      <div className="text-xs text-red-700 py-3 bg-red-50 border border-red-200 rounded-lg px-4 font-semibold">
                        ⚠️ {versionsError}
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="text-xs text-slate-400 py-6 text-center">
                        No hay versiones de historial guardadas para este nodo.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                        {versions.map((ver, idx) => (
                          <div key={ver.id} className="bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col gap-2.5 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                                    {ver.title}
                                  </span>
                                  <span className="text-[9px] text-slate-500 px-1.5 py-0.5 bg-white rounded border border-slate-200 font-mono font-semibold uppercase">
                                    V{versions.length - idx}
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    ver.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    ver.status === 'draft' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                    ver.status === 'needs_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {ver.status === 'active' ? 'Vigente' :
                                     ver.status === 'draft' ? 'Borrador' :
                                     ver.status === 'needs_review' ? 'En Revisión' :
                                     'Archivado'}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
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
                                <span className="text-[9px] text-slate-400 uppercase font-semibold">Guardado por</span>
                                <span className="text-[10px] text-slate-600 font-semibold">{ver.saver?.name || 'Usuario Demo'}</span>
                              </div>
                            </div>

                            {ver.changeNote && (
                              <div className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-600 leading-relaxed font-sans">
                                <span className="font-semibold text-slate-400 text-[10px] uppercase block mb-0.5">Nota de cambio:</span>
                                {ver.changeNote}
                              </div>
                            )}

                            <div className="text-xs bg-slate-100/60 rounded p-2.5 font-mono text-slate-500 truncate whitespace-nowrap">
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <h2 className="text-sm font-semibold text-slate-600">Error</h2>
              <p className="text-xs text-slate-400 mt-1">No se pudieron recuperar los detalles del nodo.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

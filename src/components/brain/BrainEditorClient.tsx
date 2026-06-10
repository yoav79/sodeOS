'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NodeTreeItem, Node, Template } from '@/types';
import EditorTopbar from './editor/EditorTopbar';
import EditorSidebar from './editor/EditorSidebar';
import EditorRightPanel from './editor/EditorRightPanel';
import EditorDocumentView from './editor/EditorDocumentView';
import EditorDocumentForm from './editor/EditorDocumentForm';
import CreateNodeModal from './editor/modals/CreateNodeModal';
import TrashModal, { TrashedNode } from './editor/modals/TrashModal';
import TemplatesModal from './editor/modals/TemplatesModal';
import MoveNodeModal, { FlatNodeWithDepth } from './editor/modals/MoveNodeModal';

interface TreeDemoClientProps {
  brainId: string;
  brainName: string;
}

export interface NodeVersionWithSaver {
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

export interface BrainSearchResult {
  id: string;
  title: string;
  status: string;
  parentId: string | null;
  matchedField: 'title' | 'content';
  snippet: string;
  updatedAt: string;
}
const getFlatNodesWithDepth = (nodes: NodeTreeItem[], depth = 0): FlatNodeWithDepth[] => {
  const list: FlatNodeWithDepth[] = [];
  for (const n of nodes) {
    list.push({ id: n.id, title: n.title, depth });
    if (n.children && n.children.length > 0) {
      list.push(...getFlatNodesWithDepth(n.children, depth + 1));
    }
  }
  return list;
};


function getNodePath(nodes: NodeTreeItem[], targetId: string): NodeTreeItem[] | null {
  if (!nodes || nodes.length === 0) return null;

  for (const node of nodes) {
    if (node.id === targetId) {
      return [node];
    }
    if (node.children && node.children.length > 0) {
      const path = getNodePath(node.children, targetId);
      if (path) {
        return [node, ...path];
      }
    }
  }

  return null;
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

  // Restore Version States
  const [isRestoringVersion, setIsRestoringVersion] = useState<boolean>(false);
  const [restoreVersionError, setRestoreVersionError] = useState<string | null>(null);
  const [restoreVersionSuccess, setRestoreVersionSuccess] = useState<string | null>(null);

  const [rightPanelTab, setRightPanelTab] = useState<'meta' | 'history'>('meta');

  // Search local states and filtering
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Remote Search States
  const [remoteSearchQuery, setRemoteSearchQuery] = useState<string>('');
  const [remoteSearchResults, setRemoteSearchResults] = useState<BrainSearchResult[]>([]);
  const [isRemoteSearching, setIsRemoteSearching] = useState<boolean>(false);
  const [remoteSearchError, setRemoteSearchError] = useState<string | null>(null);
  const [isRemoteSearchOpen, setIsRemoteSearchOpen] = useState<boolean>(false);

  const { filteredTree, totalSearchResults } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return { filteredTree: tree, totalSearchResults: 0 };
    }

    let matchCount = 0;

    const filterNode = (node: NodeTreeItem): NodeTreeItem | null => {
      const filteredChildren: NodeTreeItem[] = [];
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          const res = filterNode(child);
          if (res) {
            filteredChildren.push(res);
          }
        });
      }

      const matchesSelf = node.title.toLowerCase().includes(query);
      if (matchesSelf) {
        matchCount++;
      }

      if (matchesSelf || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }

      return null;
    };

    const result: NodeTreeItem[] = [];
    tree.forEach(node => {
      const res = filterNode(node);
      if (res) {
        result.push(res);
      }
    });

    return { filteredTree: result, totalSearchResults: matchCount };
  }, [tree, searchQuery]);

  const breadcrumbPath = useMemo(() => {
    if (!selectedNodeId || tree.length === 0) return null;
    return getNodePath(tree, selectedNodeId);
  }, [tree, selectedNodeId]);


  // Edit Mode States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editChangeNote, setEditChangeNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Creation States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createContentMarkdown, setCreateContentMarkdown] = useState<string>('');
  const [createStatus, setCreateStatus] = useState<string>('draft');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Template States
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState<boolean>(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    if (templates.length > 0) return;
    try {
      setTemplatesLoading(true);
      setTemplatesError(null);
      const res = await fetch(`/api/brains/${brainId}/templates`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudieron recuperar las plantillas.');
      }
      const data = await res.json();
      setTemplates(data.templates);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setTemplatesError(msg);
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Trash States
  const [isTrashModalOpen, setIsTrashModalOpen] = useState<boolean>(false);
  const [trashNodes, setTrashNodes] = useState<TrashedNode[]>([]);
  const [trashLoading, setTrashLoading] = useState<boolean>(false);
  const [trashError, setTrashError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fetchTrashNodes = async () => {
    try {
      setTrashLoading(true);
      setTrashError(null);
      const res = await fetch(`/api/brains/${brainId}/trash`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 403) {
        setTrashError('Permisos insuficientes para ver la papelera.');
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudieron recuperar los nodos de la papelera.');
      }
      const data = await res.json();
      setTrashNodes(data.trashedNodes || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setTrashError(msg);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleRestoreNode = async (nodeId: string, nodeTitle: string) => {
    const confirmRestore = window.confirm(`¿Estás seguro de que deseas restaurar "${nodeTitle}" y sus descendientes?`);
    if (!confirmRestore) return;

    try {
      setIsRestoring(nodeId);
      setRestoreError(null);
      setRestoreSuccess(null);

      const res = await fetch(`/api/nodes/${nodeId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 403) {
        setRestoreError('Permisos insuficientes para restaurar nodos.');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al restaurar el nodo.');
      }

      setRestoreSuccess(`Nodo "${nodeTitle}" restaurado exitosamente (Total: ${data.restoredCount} nodos).`);
      
      fetchTrashNodes();
      setRefreshTrigger((prev) => prev + 1);

      setTimeout(() => {
        setRestoreSuccess(null);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al restaurar el nodo.';
      setRestoreError(msg);
    } finally {
      setIsRestoring(null);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedNodeId) return;

    try {
      setIsRestoringVersion(true);
      setRestoreVersionError(null);
      setRestoreVersionSuccess(null);

      // Desactivar modo edición para evitar inconsistencias de estado
      setIsEditing(false);

      const res = await fetch(`/api/nodes/${selectedNodeId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 403) {
        setRestoreVersionError('Permisos insuficientes para restaurar versiones.');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al restaurar la versión.');
      }

      setRestoreVersionSuccess('Versión restaurada exitosamente.');
      setRefreshTrigger((prev) => prev + 1);

      setTimeout(() => {
        setRestoreVersionSuccess(null);
      }, 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al restaurar la versión.';
      setRestoreVersionError(message);
    } finally {
      setIsRestoringVersion(false);
    }
  };

  const handleRemoteSearch = async (query: string) => {
    const normalized = query.trim();
    setRemoteSearchQuery(query);

    if (normalized.length < 2) {
      setRemoteSearchResults([]);
      setRemoteSearchError(null);
      return;
    }

    if (normalized.length > 100) {
      setRemoteSearchError('La búsqueda no puede exceder los 100 caracteres.');
      setRemoteSearchResults([]);
      return;
    }

    try {
      setIsRemoteSearching(true);
      setRemoteSearchError(null);

      const res = await fetch(`/api/brains/${brainId}/search?q=${encodeURIComponent(normalized)}`);

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.status === 403) {
        setRemoteSearchError('No tienes acceso para buscar en este cerebro.');
        setRemoteSearchResults([]);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al realizar la búsqueda.');
      }

      setRemoteSearchResults(data.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión con el servidor.';
      setRemoteSearchError(msg);
      setRemoteSearchResults([]);
    } finally {
      setIsRemoteSearching(false);
    }
  };

  const handleSelectSearchResult = (nodeId: string) => {
    selectNodeHandler(nodeId);
    setIsRemoteSearchOpen(false);
    setRemoteSearchResults([]);
    setRemoteSearchQuery('');
  };

  const [isApplyingTemplate, setIsApplyingTemplate] = useState<string | null>(null);
  const [applyTemplateError, setApplyTemplateError] = useState<string | null>(null);
  const [applySuccessFeedback, setApplySuccessFeedback] = useState<string | null>(null);

  const handleApplyTemplate = async (templateId: string, templateName: string) => {
    if (!selectedNodeId || !nodeDetail) return;

    const hasContent = nodeDetail.contentMarkdown && nodeDetail.contentMarkdown.trim() !== '';
    if (hasContent) {
      const confirmApply = (window as unknown as { __skipConfirm?: boolean }).__skipConfirm || window.confirm(
        'Este nodo ya tiene contenido. Aplicar esta plantilla reemplazará TODO el contenido actual por secciones vacías.\n\nEl contenido previo quedará guardado en el historial de versiones.\n\n¿Deseas continuar?'
      );
      if (!confirmApply) return;
    }

    try {
      setIsApplyingTemplate(templateId);
      setApplyTemplateError(null);
      setApplySuccessFeedback(null);

      const res = await fetch(`/api/nodes/${selectedNodeId}/apply-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          mode: 'replace',
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al aplicar la plantilla.');
      }

      setApplySuccessFeedback(`Plantilla "${templateName}" aplicada exitosamente.`);
      setRefreshTrigger((prev) => prev + 1);

      setTimeout(() => {
        setApplySuccessFeedback(null);
      }, 4000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al aplicar la plantilla.';
      setApplyTemplateError(msg);
    } finally {
      setIsApplyingTemplate(null);
    }
  };

  const [isApplyingStructure, setIsApplyingStructure] = useState<string | null>(null);
  const [applyStructureError, setApplyStructureError] = useState<string | null>(null);
  const [applyStructureSuccess, setApplyStructureSuccess] = useState<string | null>(null);

  const handleApplyStructureTemplate = async (templateId: string, templateName: string, sectionsCount: number) => {
    if (!selectedNodeId || !nodeDetail) return;

    const confirmApply = (window as unknown as { __skipConfirm?: boolean }).__skipConfirm || window.confirm(
      `Se crearán ${sectionsCount} subnodos (como páginas borrador) bajo el nodo "${nodeDetail.title}".\n\nSi ya existen subnodos con nombres similares, se crearán nuevos nodos con identificadores únicos.\n\n¿Deseas continuar?`
    );
    if (!confirmApply) return;

    try {
      setIsApplyingStructure(templateId);
      setApplyStructureError(null);
      setApplyStructureSuccess(null);

      const res = await fetch(`/api/nodes/${selectedNodeId}/apply-structure-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al aplicar la plantilla de estructura.');
      }

      setApplyStructureSuccess(`Estructura "${templateName}" creada exitosamente con ${sectionsCount} subnodos.`);
      setRefreshTrigger((prev) => prev + 1);

      setTimeout(() => {
        setApplyStructureSuccess(null);
      }, 4000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al aplicar la estructura.';
      setApplyStructureError(msg);
    } finally {
      setIsApplyingStructure(null);
    }
  };

  const openCreateModal = (parentId: string | null = null) => {
    setCreateParentId(parentId);
    setCreateTitle('');
    setCreateContentMarkdown('');
    setCreateStatus('draft');
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setCreateError('El título es obligatorio.');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      const res = await fetch(`/api/brains/${brainId}/nodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: createTitle.trim(),
          parentId: createParentId,
          contentMarkdown: createContentMarkdown,
          status: createStatus,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear el nodo.');
      }

      setIsCreateModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);

      if (data.node && data.node.id) {
        setSelectedNodeId(data.node.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear el nodo.';
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  };

  // Archiving States
  const [isArchiving, setIsArchiving] = useState<boolean>(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const handleArchiveNode = async () => {
    if (!nodeDetail) return;

    const treeItem = findNodeInTree(tree, nodeDetail.id);
    const hasChildren = treeItem ? treeItem.children.length > 0 : false;

    const confirmMsg = hasChildren
      ? 'Este nodo tiene subpáginas. Si lo archivas, todas sus subpáginas serán archivadas también de forma recursiva. ¿Estás seguro de que deseas continuar?'
      : '¿Estás seguro de que deseas archivar este nodo?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setIsArchiving(true);
      setArchiveError(null);

      const res = await fetch(`/api/nodes/${nodeDetail.id}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setArchiveError('Permisos insuficientes para archivar este nodo.');
          return;
        }
        if (res.status === 404) {
          setSelectedNodeId(null);
          setNodeDetail(null);
          setRefreshTrigger((prev) => prev + 1);
          return;
        }
        throw new Error(data.error || 'Error al archivar el nodo.');
      }

      setSelectedNodeId(null);
      setNodeDetail(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al archivar el nodo.';
      setArchiveError(message);
    } finally {
      setIsArchiving(false);
    }
  };

  // Moving / Reordering States
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const findParentAndSiblings = (
    nodes: NodeTreeItem[],
    targetId: string,
    parent: NodeTreeItem | null = null
  ): { parent: NodeTreeItem | null; siblings: NodeTreeItem[] } | null => {
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.id === targetId) {
        return { parent, siblings: nodes };
      }
      if (n.children && n.children.length > 0) {
        const result = findParentAndSiblings(n.children, targetId, n);
        if (result) return result;
      }
    }
    return null;
  };

  const getDescendantIds = (item: NodeTreeItem): string[] => {
    const ids: string[] = [];
    const collect = (n: NodeTreeItem) => {
      ids.push(n.id);
      if (n.children) {
        n.children.forEach(collect);
      }
    };
    if (item.children) {
      item.children.forEach(collect);
    }
    return ids;
  };

  const findNodeInTree = (nodes: NodeTreeItem[], targetId: string): NodeTreeItem | null => {
    for (const n of nodes) {
      if (n.id === targetId) return n;
      if (n.children && n.children.length > 0) {
        const found = findNodeInTree(n.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const executeMove = async (newParentId: string | null, newPosition?: number) => {
    if (!nodeDetail) return;
    try {
      setIsMoving(true);
      setMoveError(null);
      const res = await fetch(`/api/nodes/${nodeDetail.id}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newParentId,
          newPosition,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setMoveError('Permisos insuficientes para mover este nodo.');
          return;
        }
        if (res.status === 404) {
          setSelectedNodeId(null);
          setNodeDetail(null);
          setRefreshTrigger((prev) => prev + 1);
          return;
        }
        throw new Error(data.error || 'Error al mover el nodo.');
      }

      setRefreshTrigger((prev) => prev + 1);
      const detailRes = await fetch(`/api/nodes/${nodeDetail.id}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setNodeDetail(detailData.node);
      }
      setIsMoveModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al mover el nodo.';
      setMoveError(message);
    } finally {
      setIsMoving(false);
    }
  };

  const placementInfo = nodeDetail ? findParentAndSiblings(tree, nodeDetail.id) : null;
  const currentSiblings = placementInfo ? placementInfo.siblings : [];
  const currentIndex = currentSiblings.findIndex((n) => n.id === nodeDetail?.id);

  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex >= 0 && currentIndex < currentSiblings.length - 1;

  const handleMoveUp = async () => {
    if (!nodeDetail || !canMoveUp || !placementInfo) return;
    await executeMove(placementInfo.parent?.id || null, currentIndex - 1);
  };

  const handleMoveDown = async () => {
    if (!nodeDetail || !canMoveDown || !placementInfo) return;
    await executeMove(placementInfo.parent?.id || null, currentIndex + 1);
  };

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

  // Prep search props to avoid unused-vars warnings/errors until S4 visual UI integration
  const searchProps = {
    remoteSearchQuery,
    remoteSearchResults,
    isRemoteSearching,
    remoteSearchError,
    isRemoteSearchOpen,
    handleRemoteSearch,
    handleSelectSearchResult,
  };

  return (
    <div
      className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden"
      data-search-ready={JSON.stringify({
        hasQuery: !!searchProps.remoteSearchQuery,
        resultsCount: searchProps.remoteSearchResults.length,
        loading: searchProps.isRemoteSearching,
        error: !!searchProps.remoteSearchError,
        isOpen: searchProps.isRemoteSearchOpen,
        hasHandler: typeof searchProps.handleRemoteSearch === 'function',
        hasSelectHandler: typeof searchProps.handleSelectSearchResult === 'function',
      })}
    >
      {/* Topbar compacta */}
      <EditorTopbar
        brainName={brainName}
        breadcrumbPath={breadcrumbPath}
        nodeDetail={nodeDetail}
        onSelectNode={selectNodeHandler}
        onNavigateToBrains={() => router.push('/brains')}
        onNavigateToBrain={() => {
          setSelectedNodeId(null);
          setNodeDetail(null);
        }}
        onNavigateToDashboard={() => router.push('/dashboard')}
        onLogout={handleLogout}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tree View */}
        <EditorSidebar
          tree={tree}
          filteredTree={filteredTree}
          selectedNodeId={selectedNodeId}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          totalSearchResults={totalSearchResults}
          onSearchQueryChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          onSelectNode={selectNodeHandler}
          onCreateRootNode={() => openCreateModal(null)}
          onOpenTemplates={() => {
            setTemplatesError(null);
            setIsTemplatesModalOpen(true);
            fetchTemplates();
          }}
          onOpenTrash={() => {
            setTrashError(null);
            setIsTrashModalOpen(true);
            fetchTrashNodes();
          }}
        />

        {/* Detail / Edit View Panel */}
        <main className="flex-1 bg-slate-50 overflow-y-auto flex flex-col min-w-0">
          {!selectedNodeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 gap-4">
              <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <div className="text-center">
                <h2 className="text-sm font-semibold text-slate-600 font-sans">Ningún nodo seleccionado</h2>
                <p className="text-xs text-slate-400 mt-1">Haz clic en el título de un nodo en el sidebar para visualizar su detalle o crea uno nuevo.</p>
              </div>
              <button
                onClick={() => openCreateModal(null)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Crear Nodo Raíz
              </button>
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
                <EditorDocumentForm
                  nodeDetail={nodeDetail}
                  editTitle={editTitle}
                  editContent={editContent}
                  editStatus={editStatus}
                  editChangeNote={editChangeNote}
                  saveError={saveError}
                  isSaving={isSaving}
                  onEditTitleChange={setEditTitle}
                  onEditContentChange={setEditContent}
                  onEditStatusChange={setEditStatus}
                  onEditChangeNoteChange={setEditChangeNote}
                  onSave={handleSave}
                  onCancel={handleCancelEdit}
                />
              ) : (
                /* READ-ONLY VIEW */
                <EditorDocumentView
                  nodeDetail={nodeDetail}
                  archiveError={archiveError}
                  onClearArchiveError={() => setArchiveError(null)}
                  moveError={moveError}
                  onClearMoveError={() => setMoveError(null)}
                  isArchiving={isArchiving}
                  isMoving={isMoving}
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  onCreateSubpage={openCreateModal}
                  onStartEdit={handleStartEdit}
                  onOpenMoveModal={() => {
                    setMoveError(null);
                    setIsMoveModalOpen(true);
                  }}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onArchiveNode={handleArchiveNode}
                />
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

        {/* Panel Derecho (Metadatos & Historial) */}
        <EditorRightPanel
          selectedNodeId={selectedNodeId}
          nodeDetail={nodeDetail}
          detailLoading={detailLoading}
          versions={versions}
          versionsLoading={versionsLoading}
          versionsError={versionsError}
          rightPanelTab={rightPanelTab}
          onRightPanelTabChange={setRightPanelTab}
          copied={copied}
          onCopyId={handleCopyId}
          onRestoreVersion={handleRestoreVersion}
          isRestoringVersion={isRestoringVersion}
          restoreVersionError={restoreVersionError}
          restoreVersionSuccess={restoreVersionSuccess}
        />
      </div>

      {/* Create Node Modal */}
      <CreateNodeModal
        isOpen={isCreateModalOpen}
        parentId={createParentId}
        title={createTitle}
        contentMarkdown={createContentMarkdown}
        status={createStatus}
        isCreating={isCreating}
        error={createError}
        onTitleChange={setCreateTitle}
        onContentMarkdownChange={setCreateContentMarkdown}
        onStatusChange={setCreateStatus}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateNode}
      />

      {/* Move Node Modal */}
      {(() => {
        if (!isMoveModalOpen || !nodeDetail) return null;
        const treeItem = findNodeInTree(tree, nodeDetail.id);
        const forbiddenIds = new Set<string>();
        forbiddenIds.add(nodeDetail.id);
        if (treeItem) {
          getDescendantIds(treeItem).forEach((id) => forbiddenIds.add(id));
        }

        const flatNodes = getFlatNodesWithDepth(tree);
        const eligibleNodes = flatNodes.filter((n) => !forbiddenIds.has(n.id));

        return (
          <MoveNodeModal
            isOpen={isMoveModalOpen}
            nodeTitle={nodeDetail.title}
            nodeParentId={nodeDetail.parentId}
            eligibleNodes={eligibleNodes}
            isMoving={isMoving}
            moveError={moveError}
            onClose={() => setIsMoveModalOpen(false)}
            onMove={executeMove}
          />
        );
      })()}

      {/* Templates Modal (Solo lectura) */}
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        templates={templates}
        templatesLoading={templatesLoading}
        templatesError={templatesError}
        isApplyingTemplate={isApplyingTemplate}
        applyTemplateError={applyTemplateError}
        applySuccessFeedback={applySuccessFeedback}
        isApplyingStructure={isApplyingStructure}
        applyStructureError={applyStructureError}
        applyStructureSuccess={applyStructureSuccess}
        selectedNodeId={selectedNodeId}
        onClose={() => setIsTemplatesModalOpen(false)}
        onApplyTemplate={handleApplyTemplate}
        onApplyStructureTemplate={handleApplyStructureTemplate}
        onRetryFetch={fetchTemplates}
      />

      {/* Trash Modal (Papelera) */}
      <TrashModal
        isOpen={isTrashModalOpen}
        trashNodes={trashNodes}
        trashLoading={trashLoading}
        trashError={trashError}
        isRestoring={isRestoring}
        restoreSuccess={restoreSuccess}
        restoreError={restoreError}
        onClose={() => setIsTrashModalOpen(false)}
        onRestoreNode={handleRestoreNode}
        onRetryFetch={fetchTrashNodes}
      />
    </div>
  );
}

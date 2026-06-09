'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { NodeTreeItem, Node, Template } from '@/types';
import NodeTree from '@/components/tree/NodeTree';
import EditorTopbar from './editor/EditorTopbar';

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

interface FlatNodeWithDepth {
  id: string;
  title: string;
  depth: number;
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

interface TemplateField {
  name: string;
  label?: string;
  type?: string;
}

interface TemplateSection {
  name: string;
  label?: string;
}

const renderSchemaSummary = (template: Template) => {
  const schema = template.schemaJson as {
    fields?: TemplateField[];
    sections?: TemplateSection[];
  };
  if (!schema) return null;

  if (schema.fields && Array.isArray(schema.fields)) {
    const fields = schema.fields;
    return (
      <div className="flex flex-col gap-1.5 mt-2.5">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
          Campos ({fields.length}):
        </span>
        <ul className="flex flex-wrap gap-1.5">
          {fields.slice(0, 3).map((f: TemplateField, idx: number) => (
            <li
              key={idx}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono"
            >
              {f.label || f.name} <span className="text-[10px] text-slate-400 font-semibold">({f.type || 'text'})</span>
            </li>
          ))}
          {fields.length > 3 && (
            <li className="text-[10px] text-slate-400 font-semibold flex items-center">
              +{fields.length - 3} más
            </li>
          )}
        </ul>
      </div>
    );
  }

  if (schema.sections && Array.isArray(schema.sections)) {
    const sections = schema.sections;
    return (
      <div className="flex flex-col gap-1.5 mt-2.5">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
          Secciones ({sections.length}):
        </span>
        <ul className="flex flex-wrap gap-1.5">
          {sections.slice(0, 3).map((s: TemplateSection, idx: number) => (
            <li
              key={idx}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono"
            >
              {s.label || s.name}
            </li>
          ))}
          {sections.length > 3 && (
            <li className="text-[10px] text-slate-400 font-semibold flex items-center">
              +{sections.length - 3} más
            </li>
          )}
        </ul>
      </div>
    );
  }

  const keys = Object.keys(schema);
  return (
    <div className="flex flex-col gap-1 mt-2.5">
      <span className="text-xs text-slate-500 font-medium italic">Esquema personalizado</span>
      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
        Atributos raíz: {keys.length > 0 ? keys.join(', ') : 'Ninguno'}
      </span>
    </div>
  );
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

  const [rightPanelTab, setRightPanelTab] = useState<'meta' | 'history'>('meta');

  // Search local states and filtering
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  interface TrashedNode {
    id: string;
    title: string;
    slug: string;
    parentId: string | null;
    parentTitle: string | null;
    deletedAt: string;
    updatedBy: string;
    descendantCount: number;
  }

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

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
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
        <aside className="w-72 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Árbol</h2>
              <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Todos los nodos son páginas.</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  setTemplatesError(null);
                  setIsTemplatesModalOpen(true);
                  fetchTemplates();
                }}
                className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center"
                title="Ver Plantillas (Solo lectura)"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setTrashError(null);
                  setIsTrashModalOpen(true);
                  fetchTrashNodes();
                }}
                className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-center"
                title="Papelera"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => openCreateModal(null)}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center shrink-0"
                title="Nuevo nodo raíz"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Buscador Local */}
          <div className="px-4 pb-3 pt-3 border-b border-slate-100 bg-white">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Contador de resultados */}
            {searchQuery.trim() !== '' && (
              <div className="mt-2 text-[10px] font-semibold text-slate-500 flex items-center justify-between px-1">
                <span>Resultados de búsqueda:</span>
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-mono border border-slate-200">
                  {totalSearchResults} {totalSearchResults === 1 ? 'coincidencia' : 'coincidencias'}
                </span>
              </div>
            )}
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
              <>
                {searchQuery.trim() !== '' && filteredTree.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center gap-2">
                    <span className="text-lg">🔍</span>
                    <p className="font-semibold text-slate-600">No se encontraron documentos</p>
                    <p className="text-[10px] text-slate-400">Intenta con otros términos.</p>
                  </div>
                ) : (
                  <NodeTree
                    items={filteredTree}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={(node) => selectNodeHandler(node.id)}
                    forceExpanded={searchQuery.trim() !== ''}
                  />
                )}
              </>
            )}
          </div>
        </aside>

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
                <div className="flex flex-col gap-6">
                  {/* Cabecera del Modo Edición */}
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">Modo Edición</h1>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Actualiza los metadatos y contenido del nodo.</p>
                    </div>
                  </div>

                  {/* Toolbar contextual compacta (modo edición) */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm w-fit">
                    {/* Guardar */}
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      title={isSaving ? 'Guardando...' : 'Guardar cambios'}
                      aria-label="Guardar cambios"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">Guardar</span>
                    </button>

                    {/* Separador */}
                    <div className="h-5 w-px bg-slate-200 mx-0.5" />

                    {/* Cancelar */}
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      title="Cancelar edición"
                      aria-label="Cancelar edición"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="hidden sm:inline">Cancelar</span>
                    </button>
                  </div>

                  {saveError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                      <span>⚠️ {saveError}</span>
                    </div>
                  )}

                  {/* Título del documento en edición (Notion-style input) */}
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-600 px-0 py-2 text-slate-900 text-3xl font-extrabold focus:outline-none transition-all placeholder-slate-300"
                      placeholder="Sin título"
                    />
                  </div>

                  {/* Editor de Contenido Markdown */}
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-5 text-slate-800 font-sans text-sm leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 min-h-[420px] resize-y shadow-inner transition-colors"
                      placeholder="Comienza a escribir en Markdown aquí..."
                    />
                  </div>

                  {/* Panel de Metadatos y Auditoría (compacto y al pie) */}
                  <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200/60">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuración del Documento</h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Estado */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Estado de publicación</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                        >
                          <option value="active">Vigente (Activo)</option>
                          <option value="draft">Borrador</option>
                          <option value="needs_review">En Revisión</option>
                          <option value="archived">Archivado</option>
                        </select>
                      </div>

                      {/* Categoría */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Categoría</label>
                        <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-semibold h-[34px] flex items-center">
                          {nodeDetail.category || 'Sin categoría programada'}
                        </div>
                      </div>
                    </div>

                    {/* Nota de cambios */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Nota de cambios para el Historial</label>
                      <input
                        type="text"
                        value={editChangeNote}
                        onChange={(e) => setEditChangeNote(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                        placeholder="Ej: Corrección ortográfica y actualización de fechas de entrega."
                      />
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Esta nota se agregará a la versión y será visible en la pestaña Historial.
                      </span>
                    </div>
                  </div>

                  {/* Separador de fin de formulario */}
                  <div className="border-t border-slate-200 pt-2 mt-2" />
                </div>
              ) : (
                /* READ-ONLY VIEW */
                <div className="flex flex-col gap-6">
                  {archiveError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between gap-2">
                      <span>⚠️ {archiveError}</span>
                      <button onClick={() => setArchiveError(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                    </div>
                  )}
                  {moveError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between gap-2">
                      <span>⚠️ {moveError}</span>
                      <button onClick={() => setMoveError(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                    </div>
                  )}

                  {/* ── Cabecera: título, badge y toolbar contextual ── */}
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
                    {/* Fila superior: título + badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1 truncate">{nodeDetail.title}</h1>
                        <p className="text-slate-500 text-sm font-medium">
                          {nodeDetail.description || 'Sin descripción adicional para este nodo.'}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-bold mt-1 ${
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

                  {/* ── Toolbar contextual compacta (modo lectura) ── */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm w-fit">

                    {/* Nueva subpágina */}
                    <button
                      onClick={() => openCreateModal(nodeDetail.id)}
                      title="Nueva subpágina"
                      aria-label="Nueva subpágina"
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>

                    {/* Editar */}
                    <button
                      onClick={handleStartEdit}
                      title="Editar documento"
                      aria-label="Editar documento"
                      className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="hidden sm:inline text-xs font-semibold">Editar</span>
                    </button>

                    {/* Separador */}
                    <div className="h-5 w-px bg-slate-200 mx-0.5" />

                    {/* Mover */}
                    <button
                      onClick={() => {
                        setMoveError(null);
                        setIsMoveModalOpen(true);
                      }}
                      title="Mover a otra ubicación"
                      aria-label="Mover nodo"
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>

                    {/* Separador */}
                    <div className="h-5 w-px bg-slate-200 mx-0.5" />

                    {/* Subir posición */}
                    <button
                      onClick={handleMoveUp}
                      disabled={!canMoveUp || isMoving}
                      title={canMoveUp ? 'Subir posición' : 'Ya está en la primera posición'}
                      aria-label="Subir posición"
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>

                    {/* Bajar posición */}
                    <button
                      onClick={handleMoveDown}
                      disabled={!canMoveDown || isMoving}
                      title={canMoveDown ? 'Bajar posición' : 'Ya está en la última posición'}
                      aria-label="Bajar posición"
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Separador danger */}
                    <div className="h-5 w-px bg-slate-200 mx-0.5" />

                    {/* Archivar */}
                    <button
                      onClick={handleArchiveNode}
                      disabled={isArchiving}
                      title={isArchiving ? 'Archivando...' : 'Archivar documento (acción destructiva)'}
                      aria-label="Archivar documento"
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isArchiving ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Vista de Documento / Hoja de papel (Light SaaS) */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-8 md:p-10 min-h-[400px] flex flex-col transition-all">
                    {!nodeDetail.contentMarkdown || nodeDetail.contentMarkdown.trim() === '' ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 gap-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-slate-200/60 shadow-sm">
                          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-slate-700">Este documento aún no tiene contenido</h3>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                            Comienza a redactar el contenido de esta página o aplica una plantilla de estructura.
                          </p>
                        </div>
                        <button
                          onClick={handleStartEdit}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition-colors shadow-md shadow-blue-500/10"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Redactar Contenido
                        </button>
                      </div>
                    ) : (
                      <div className="text-slate-800 whitespace-pre-wrap font-sans text-sm leading-relaxed break-words">
                        {nodeDetail.contentMarkdown}
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

        {/* Panel Derecho (Metadatos & Historial) */}
        <aside className="w-72 border-l border-slate-200 bg-white flex flex-col shrink-0 h-full">
          {/* Tabs bar (Segmented control style) */}
          <div className="p-2 border-b border-slate-200 text-xs shrink-0 bg-slate-50">
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg">
              <button
                onClick={() => setRightPanelTab('meta')}
                className={`flex-1 py-1.5 px-3 text-center font-medium rounded-md transition-all duration-200 ${
                  rightPanelTab === 'meta'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/30'
                }`}
              >
                Metadatos
              </button>
              <button
                onClick={() => setRightPanelTab('history')}
                className={`flex-1 py-1.5 px-3 text-center font-medium rounded-md transition-all duration-200 ${
                  rightPanelTab === 'history'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/30'
                }`}
              >
                Historial
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/20">
            {!selectedNodeId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-600">Ningún documento</h3>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[190px] mx-auto leading-relaxed">
                    Selecciona un documento del sidebar para ver sus metadatos e historial de versiones.
                  </p>
                </div>
              </div>
            ) : detailLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[11px] font-medium text-slate-500">Cargando panel...</span>
              </div>
            ) : nodeDetail ? (
              rightPanelTab === 'meta' ? (
                /* Metadatos Tab */
                <div className="space-y-4">
                  {/* Sección 1: Identificación y Estado */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identificación</h4>
                    
                    {/* Estado */}
                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-medium">Estado</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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

                    {/* ID Único */}
                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-medium">ID Único</span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded px-1.5 py-0.5">
                        <span>{nodeDetail.id.slice(0, 8)}...{nodeDetail.id.slice(-4)}</span>
                        <button
                          onClick={() => handleCopyId(nodeDetail.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded hover:bg-slate-200"
                          title="Copiar ID completo"
                        >
                          {copied ? (
                            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Slug */}
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-500 font-medium">Ruta (Slug)</span>
                      <span className="font-mono text-[11px] text-slate-700 bg-slate-50 border border-slate-200/60 rounded px-1.5 py-0.5 truncate max-w-[150px]" title={`/${nodeDetail.slug}`}>
                        /{nodeDetail.slug}
                      </span>
                    </div>
                  </div>

                  {/* Sección 2: Clasificación y Responsables */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Detalles del Nodo</h4>
                    
                    {/* Categoría */}
                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-medium">Categoría</span>
                      <span className="font-semibold text-slate-700">{nodeDetail.category || 'Ninguna'}</span>
                    </div>

                    {/* Responsable */}
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-500 font-medium">Responsable</span>
                      <span className="font-semibold text-slate-700">
                        {nodeDetail.responsibleUserId === '00000000-0000-0000-0000-000000000001' ? 'Usuario Demo' : nodeDetail.responsibleUserId.slice(-8)}
                      </span>
                    </div>
                  </div>

                  {/* Sección 3: Ciclo de Vida y Fechas */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciclo de Vida</h4>
                    
                    {/* Creado */}
                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-medium">Creado</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(nodeDetail.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Actualizado */}
                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-medium">Actualizado</span>
                      <span className="font-semibold text-slate-700">
                        {new Date(nodeDetail.updatedAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Última revisión */}
                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className="text-slate-500 font-medium">Última revisión</span>
                      <span className="font-semibold text-slate-700">
                        {nodeDetail.reviewedAt ? new Date(nodeDetail.reviewedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pendiente'}
                      </span>
                    </div>

                    {/* Próxima revisión */}
                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-500 font-medium">Próxima revisión</span>
                      <span className="font-semibold text-slate-700">
                        {nodeDetail.nextReviewAt ? new Date(nodeDetail.nextReviewAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No programada'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Historial Tab */
                <div className="space-y-4">
                  {versionsLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
                      <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Cargando versiones...</span>
                    </div>
                  ) : versionsError ? (
                    <div className="text-xs text-red-700 py-3 bg-red-50 border border-red-200 rounded-lg px-3 font-semibold">
                      ⚠️ {versionsError}
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-sm">
                        <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-slate-600">Sin historial registrado</h3>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                          Los cambios y notas de versión que realices aparecerán aquí para control de versiones.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative pl-3">
                      {/* Vertical line connecting versions */}
                      <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-slate-200" />
                      
                      <div className="space-y-4">
                        {versions.map((ver, idx) => (
                          <div key={ver.id} className="relative pl-6">
                            {/* Point Indicator */}
                            <div className="absolute left-[-2px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 border border-white ring-4 ring-blue-50" />
                            
                            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]" title={ver.title}>
                                  {ver.title}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                    ver.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                                    ver.status === 'draft' ? 'bg-sky-50 border-sky-100 text-sky-700' :
                                    ver.status === 'needs_review' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                    'bg-slate-100 border-slate-200 text-slate-600'
                                  }`}>
                                    {ver.status === 'active' ? 'Vigente' :
                                     ver.status === 'draft' ? 'Borrador' :
                                     ver.status === 'needs_review' ? 'En Rev' : 'Arch'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 bg-slate-50 rounded border border-slate-200 px-1.5 py-0.5 font-mono font-semibold">
                                    V{versions.length - idx}
                                  </span>
                                </div>
                              </div>
                              
                              {ver.changeNote ? (
                                <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5 italic">
                                  &ldquo;{ver.changeNote}&rdquo;
                                </p>
                              ) : (
                                <p className="text-[11px] text-slate-400 italic">
                                  Sin nota de cambios
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-slate-100/80 mt-1">
                                <span className="flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {ver.saver?.name || 'Usuario'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                                  </svg>
                                  {new Date(ver.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No hay datos disponibles.
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Create Node Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {createParentId ? 'Crear Nueva Subpágina' : 'Crear Nuevo Nodo Raíz'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {createParentId ? 'Se creará como hijo del nodo seleccionado' : 'Se creará en la raíz del cerebro'}
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNode} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  ⚠️ {createError}
                </div>
              )}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Título (Obligatorio)</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Ej. Guía de Onboarding"
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                />
              </div>

              {/* Content Markdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Contenido Markdown Inicial (Opcional)</label>
                <textarea
                  value={createContentMarkdown}
                  onChange={(e) => setCreateContentMarkdown(e.target.value)}
                  placeholder="# Título Principal\n\nEscribe el contenido de tu página en formato Markdown."
                  className="bg-white border border-slate-200 rounded-xl p-4 text-slate-800 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 min-h-[160px] resize-y"
                />
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Estado Inicial</label>
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                >
                  <option value="draft">Borrador</option>
                  <option value="active">Vigente (Activo)</option>
                  <option value="needs_review">En Revisión</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center gap-3 justify-end border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreating}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md shadow-blue-500/10"
                >
                  {isCreating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creando...
                    </>
                  ) : (
                    'Crear Nodo'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Node Modal */}
      {isMoveModalOpen && nodeDetail && (() => {
        const treeItem = findNodeInTree(tree, nodeDetail.id);
        const forbiddenIds = new Set<string>();
        forbiddenIds.add(nodeDetail.id);
        if (treeItem) {
          getDescendantIds(treeItem).forEach((id) => forbiddenIds.add(id));
        }

        const flatNodes = getFlatNodesWithDepth(tree);
        const eligibleNodes = flatNodes.filter((n) => !forbiddenIds.has(n.id));

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Mover Página</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Selecciona el destino para: <span className="font-semibold text-slate-800">&ldquo;{nodeDetail.title}&rdquo;</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsMoveModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {moveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                    ⚠️ {moveError}
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Destino</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[40vh] overflow-y-auto bg-slate-50/50">
                    <button
                      onClick={() => executeMove(null)}
                      disabled={nodeDetail.parentId === null || isMoving}
                      className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center gap-2 hover:bg-slate-100/80 ${
                        nodeDetail.parentId === null
                          ? 'bg-blue-50/60 text-blue-700 border-l-2 border-blue-600'
                          : 'text-slate-700'
                      }`}
                    >
                      <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Raíz (Sin página padre)
                    </button>

                    {eligibleNodes.map((n) => {
                      const isCurrentParent = nodeDetail.parentId === n.id;
                      return (
                        <button
                          key={n.id}
                          onClick={() => executeMove(n.id)}
                          disabled={isCurrentParent || isMoving}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-2 hover:bg-slate-100/80 ${
                            isCurrentParent
                              ? 'bg-blue-50/60 text-blue-700 border-l-2 border-blue-600 font-semibold'
                              : 'text-slate-700 font-medium'
                          }`}
                          style={{ paddingLeft: `${(n.depth + 1) * 16}px` }}
                        >
                          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{n.title}</span>
                        </button>
                      );
                    })}

                    {eligibleNodes.length === 0 && nodeDetail.parentId === null && (
                      <div className="p-8 text-center text-xs text-slate-400 font-medium">
                        No hay otras páginas disponibles en este cerebro.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-3">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  disabled={isMoving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Templates Modal (Solo lectura) */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Plantillas del Cerebro</span>
                  <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Solo lectura
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Estructuras y campos predefinidos disponibles para organizar la información
                </p>
              </div>
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {templatesLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-slate-500">Cargando plantillas...</span>
                </div>
              )}

              {applySuccessFeedback && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{applySuccessFeedback}</span>
                </div>
              )}

              {applyTemplateError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-1">
                  <span className="font-semibold">⚠️ Error al aplicar plantilla:</span>
                  <span>{applyTemplateError}</span>
                </div>
              )}

              {applyStructureSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{applyStructureSuccess}</span>
                </div>
              )}

              {applyStructureError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-1">
                  <span className="font-semibold">⚠️ Error al aplicar estructura:</span>
                  <span>{applyStructureError}</span>
                </div>
              )}

              {templatesError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
                  <span className="font-semibold flex items-center gap-1">⚠️ {templatesError}</span>
                  <button
                    onClick={() => fetchTemplates()}
                    className="w-fit px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {!templatesLoading && !templatesError && templates.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No hay plantillas registradas en este cerebro.
                </div>
              )}

              {!templatesLoading && !templatesError && templates.length > 0 && (
                <div className="flex flex-col gap-4">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="text-sm font-bold text-slate-800 font-sans">
                          {tpl.name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border tracking-wide uppercase shrink-0 ${
                            tpl.templateType === 'page'
                              ? 'bg-blue-50 border-blue-100 text-blue-700'
                              : 'bg-violet-50 border-violet-100 text-violet-700'
                          }`}
                        >
                          {tpl.templateType === 'page' ? 'Página' : 'Estructura'}
                        </span>
                      </div>
                      
                      {tpl.description && (
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {tpl.description}
                        </p>
                      )}

                      {/* Render schema summary */}
                      {renderSchemaSummary(tpl)}

                      {/* Apply button only for page type templates */}
                      {tpl.templateType === 'page' && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                          {!selectedNodeId ? (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Selecciona un nodo para aplicar esta plantilla
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Reemplazará contenido del nodo
                            </span>
                          )}
                          <button
                            onClick={() => handleApplyTemplate(tpl.id, tpl.name)}
                            disabled={!selectedNodeId || isApplyingTemplate !== null}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm shadow-blue-500/10"
                          >
                            {isApplyingTemplate === tpl.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Aplicando...
                              </>
                            ) : (
                              'Aplicar'
                            )}
                          </button>
                        </div>
                      )}

                      {/* Apply button only for structure type templates */}
                      {tpl.templateType === 'structure' && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                          {!selectedNodeId ? (
                            <span className="text-[11px] text-slate-400 font-medium">
                              Selecciona un nodo para aplicar esta estructura
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Creará subnodos hijos
                            </span>
                          )}
                          <button
                            onClick={() => {
                              const sectionsCount = (tpl.schemaJson as { sections?: unknown[] })?.sections?.length || 0;
                              handleApplyStructureTemplate(tpl.id, tpl.name, sectionsCount);
                            }}
                            disabled={!selectedNodeId || isApplyingStructure !== null}
                            className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 shadow-sm shadow-violet-500/10"
                          >
                            {isApplyingStructure === tpl.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Creando...
                              </>
                            ) : (
                              'Aplicar estructura'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsTemplatesModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Modal (Papelera) */}
      {isTrashModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] text-slate-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Papelera de Nodos</span>
                  <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Solo lectura / Restaurar
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Nodos archivados del cerebro. Restaurar un nodo también recupera sus descendientes archivados juntos.
                </p>
              </div>
              <button
                onClick={() => setIsTrashModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {trashLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-slate-500">Cargando papelera...</span>
                </div>
              )}

              {restoreSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{restoreSuccess}</span>
                </div>
              )}

              {restoreError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-1">
                  <span className="font-semibold">⚠️ Error al restaurar:</span>
                  <span>{restoreError}</span>
                </div>
              )}

              {trashError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
                  <span className="font-semibold flex items-center gap-1">⚠️ {trashError}</span>
                  <button
                    onClick={() => fetchTrashNodes()}
                    className="w-fit px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {!trashLoading && !trashError && trashNodes.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs">
                  La papelera está vacía.
                </div>
              )}

              {!trashLoading && !trashError && trashNodes.length > 0 && (
                <div className="flex flex-col gap-3">
                  {trashNodes.map((node) => (
                    <div
                      key={node.id}
                      className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-800 truncate max-w-[250px]">
                            {node.title}
                          </h4>
                          {node.descendantCount > 0 && (
                            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                              +{node.descendantCount} subnodo{node.descendantCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400 text-[11px]">
                          <span>
                            Archivado: {new Date(node.deletedAt).toLocaleString()}
                          </span>
                          {node.parentTitle && (
                            <span className="flex items-center gap-0.5">
                              • Padre original: <strong className="text-slate-600">{node.parentTitle}</strong>
                            </span>
                          )}
                          {!node.parentTitle && node.parentId && (
                            <span className="flex items-center gap-0.5">
                              • Padre original archivado (se restaurará en la raíz)
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRestoreNode(node.id, node.title)}
                        disabled={isRestoring !== null}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/10"
                      >
                        {isRestoring === node.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Restaurando...
                          </>
                        ) : (
                          'Restaurar'
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsTrashModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

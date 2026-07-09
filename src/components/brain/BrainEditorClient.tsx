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
import TemplatesModal, { TemplateFieldRow, TemplateSectionRow } from './editor/modals/TemplatesModal';
import MoveNodeModal, { FlatNodeWithDepth } from './editor/modals/MoveNodeModal';
import ManageMembersModal, { MemberWithUser } from './editor/modals/ManageMembersModal';
import InlineMarkdownDiff from './editor/InlineMarkdownDiff';

interface TreeDemoClientProps {
  brainId: string;
  brainName: string;
  currentUserRole: 'reader' | 'editor' | 'owner';
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

export default function BrainEditorClient({
  brainId,
  brainName,
  currentUserRole,
}: TreeDemoClientProps) {
  const router = useRouter();

  // Permisos derivados (para uso futuro en control de UI de barra lateral, editor y topbar)
  const canEditBrain = currentUserRole === 'editor' || currentUserRole === 'owner';
  const canManageMembers = currentUserRole === 'owner';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isReader = currentUserRole === 'reader';

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

  // Comparison mode: when set, main area shows inline diff
  const [comparisonVersion, setComparisonVersion] = useState<NodeVersionWithSaver | null>(null);
  const [agentProposalComparison, setAgentProposalComparison] = useState<{ finalMarkdown: string; mode: 'replace' | 'append' } | null>(null);

  const handleCompareAIProposal = (finalMarkdown: string, mode: 'replace' | 'append' = 'replace') => {
    setComparisonVersion(null);
    setAgentProposalComparison({ finalMarkdown, mode });
  };

  const [rightPanelTab, setRightPanelTab] = useState<'meta' | 'history' | 'files' | 'ai'>('meta');
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);

  // Remote Search States
  const [remoteSearchQuery, setRemoteSearchQuery] = useState<string>('');
  const [remoteSearchResults, setRemoteSearchResults] = useState<BrainSearchResult[]>([]);
  const [isRemoteSearching, setIsRemoteSearching] = useState<boolean>(false);
  const [remoteSearchError, setRemoteSearchError] = useState<string | null>(null);
  const [isRemoteSearchOpen, setIsRemoteSearchOpen] = useState<boolean>(false);

  const breadcrumbPath = useMemo(() => {
    if (!selectedNodeId || tree.length === 0) return null;
    return getNodePath(tree, selectedNodeId);
  }, [tree, selectedNodeId]);


  // Edit Mode States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editChangeNote, setEditChangeNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Derived state to check if editing document is dirty
  const isDirty = useMemo(() => {
    if (!isEditing || !nodeDetail) return false;
    const titleChanged = editTitle.trim() !== (nodeDetail.title || '').trim();
    const descChanged = editDescription.trim() !== (nodeDetail.description || '').trim();
    const contentChanged = editContent !== (nodeDetail.contentMarkdown || '');
    const statusChanged = editStatus !== (nodeDetail.status || '');
    const categoryChanged = (editCategory || '').trim() !== (nodeDetail.category || '').trim();
    const changeNoteChanged = editChangeNote.trim() !== '';
    
    const currentSet = new Set((nodeDetail.tags || []).map(t => t.trim().toLowerCase()).filter(Boolean));
    const editSet = new Set(editTags.map(t => t.trim().toLowerCase()).filter(Boolean));
    let tagsChanged = currentSet.size !== editSet.size;
    if (!tagsChanged) {
      for (const t of editSet) {
        if (!currentSet.has(t)) {
          tagsChanged = true;
          break;
        }
      }
    }
    
    return titleChanged || descChanged || contentChanged || statusChanged || categoryChanged || tagsChanged || changeNoteChanged;
  }, [isEditing, nodeDetail, editTitle, editDescription, editContent, editStatus, editCategory, editTags, editChangeNote]);

  // Alert on tab close or reload when changes are unsaved
  useEffect(() => {
    if (isEditing && isDirty) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
        return '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isEditing, isDirty]);

  // Helper to confirm discard unsaved changes before navigation
  const confirmDiscardUnsavedChanges = (): boolean => {
    if (isEditing && isDirty) {
      return window.confirm(
        'Tienes cambios sin guardar. Si continúas, se perderán. ¿Quieres salir de todos modos?'
      );
    }
    return true;
  };

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

  // Template Form States (TPL3B)
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateFormName, setTemplateFormName] = useState<string>('');
  const [templateFormDescription, setTemplateFormDescription] = useState<string>('');
  const [templateFormType, setTemplateFormType] = useState<'page' | 'structure'>('page');
  const [templateFormFields, setTemplateFormFields] = useState<TemplateFieldRow[]>([
    { name: '', label: '', type: 'text' }
  ]);
  const [templateFormSections, setTemplateFormSections] = useState<TemplateSectionRow[]>([
    { name: '', label: '' }
  ]);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState<boolean>(false);
  const [templateFormError, setTemplateFormError] = useState<string | null>(null);

  // Template Deletion States (TPL3D)
  const [isDeletingTemplate, setIsDeletingTemplate] = useState<string | null>(null);
  const [deleteTemplateError, setDeleteTemplateError] = useState<string | null>(null);

  const resetTemplateForm = () => {
    setEditingTemplate(null);
    setTemplateFormName('');
    setTemplateFormDescription('');
    setTemplateFormType('page');
    setTemplateFormFields([{ name: '', label: '', type: 'text' }]);
    setTemplateFormSections([{ name: '', label: '' }]);
    setTemplateFormError(null);
  };

  const handleOpenCreateTemplateForm = () => {
    resetTemplateForm();
    setIsTemplateFormOpen(true);
  };

  const handleOpenEditTemplateForm = (template: Template) => {
    const canManageTemplates = currentUserRole === 'owner';
    if (!canManageTemplates) return;

    setEditingTemplate(template);
    setTemplateFormName(template.name);
    setTemplateFormDescription(template.description ?? '');
    setTemplateFormType(template.templateType as 'page' | 'structure');
    setTemplateFormError(null);

    const schema = template.schemaJson as {
      fields?: { name: string; label?: string; type?: string }[];
      sections?: { name: string; label?: string }[];
    };

    if (template.templateType === 'page' && schema.fields && Array.isArray(schema.fields)) {
      setTemplateFormFields(
        schema.fields.map((f) => ({
          name: f.name ?? '',
          label: f.label ?? '',
          type: f.type ?? 'text',
        }))
      );
      setTemplateFormSections([{ name: '', label: '' }]);
    } else if (template.templateType === 'structure' && schema.sections && Array.isArray(schema.sections)) {
      setTemplateFormSections(
        schema.sections.map((s) => ({
          name: s.name ?? '',
          label: s.label ?? '',
        }))
      );
      setTemplateFormFields([{ name: '', label: '', type: 'text' }]);
    } else {
      setTemplateFormFields([{ name: '', label: '', type: 'text' }]);
      setTemplateFormSections([{ name: '', label: '' }]);
    }

    setIsTemplateFormOpen(true);
  };

  const handleCloseTemplateForm = () => {
    resetTemplateForm();
    setIsTemplateFormOpen(false);
  };

  // Shared validation + schemaJson builder used by both create and update
  const buildSchemaJsonFromForm = (): { schemaJson: Record<string, unknown> } | { error: string } => {
    const fieldNameRegex = /^[a-z_][a-z0-9_]*$/i;

    if (templateFormType === 'page') {
      const activeFields = templateFormFields.filter(f => f.name.trim() || f.label.trim());
      if (activeFields.length === 0) {
        return { error: 'Debe definir al menos un campo para la plantilla de página.' };
      }
      const fields = [];
      for (const f of activeFields) {
        const name = f.name.trim();
        if (!name) return { error: 'Todos los campos definidos deben tener un nombre.' };
        if (!fieldNameRegex.test(name)) {
          return { error: `El nombre de campo "${name}" es inválido. Debe comenzar con letra o guión bajo y no contener espacios.` };
        }
        fields.push({ name, label: f.label.trim() || undefined, type: f.type || 'text' });
      }
      return { schemaJson: { fields } };
    } else {
      const activeSections = templateFormSections.filter(s => s.name.trim() || s.label.trim());
      if (activeSections.length === 0) {
        return { error: 'Debe definir al menos una sección para la plantilla de estructura.' };
      }
      const sections = [];
      for (const s of activeSections) {
        const name = s.name.trim();
        if (!name) return { error: 'Todas las secciones definidas deben tener un nombre.' };
        if (!fieldNameRegex.test(name)) {
          return { error: `El nombre de sección "${name}" es inválido. Debe comenzar con letra o guión bajo y no contener espacios.` };
        }
        sections.push({ name, label: s.label.trim() || undefined });
      }
      return { schemaJson: { sections } };
    }
  };

  const validateCommonFormFields = (): string | null => {
    if (!templateFormName.trim()) return 'El nombre de la plantilla es obligatorio.';
    if (templateFormName.trim().length > 100) return 'El nombre de la plantilla no puede exceder los 100 caracteres.';
    if (templateFormDescription.trim().length > 300) return 'La descripción no puede exceder los 300 caracteres.';
    return null;
  };

  const handleCreateTemplate = async () => {
    const canManageTemplates = currentUserRole === 'owner';
    if (!canManageTemplates) return;

    const commonError = validateCommonFormFields();
    if (commonError) { setTemplateFormError(commonError); return; }

    const result = buildSchemaJsonFromForm();
    if ('error' in result) { setTemplateFormError(result.error); return; }

    try {
      setIsSubmittingTemplate(true);
      setTemplateFormError(null);

      const res = await fetch(`/api/brains/${brainId}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateFormName.trim(),
          description: templateFormDescription.trim() || null,
          templateType: templateFormType,
          schemaJson: result.schemaJson,
        }),
      });

      if (res.status === 401) { router.push('/login'); return; }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la plantilla.');

      const newTemplate: Template = data.template;
      setTemplates(prev => {
        const updated = [...prev, newTemplate];
        return updated.sort((a, b) => {
          if (a.templateType !== b.templateType) return a.templateType.localeCompare(b.templateType);
          return a.name.localeCompare(b.name);
        });
      });

      handleCloseTemplateForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setTemplateFormError(msg);
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  const handleUpdateTemplate = async () => {
    const canManageTemplates = currentUserRole === 'owner';
    if (!canManageTemplates || !editingTemplate) return;

    const commonError = validateCommonFormFields();
    if (commonError) { setTemplateFormError(commonError); return; }

    const result = buildSchemaJsonFromForm();
    if ('error' in result) { setTemplateFormError(result.error); return; }

    try {
      setIsSubmittingTemplate(true);
      setTemplateFormError(null);

      const res = await fetch(`/api/brains/${brainId}/templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateFormName.trim(),
          description: templateFormDescription.trim() || null,
          schemaJson: result.schemaJson,
          // templateType is NOT sent — backend blocks type changes
        }),
      });

      if (res.status === 401) { router.push('/login'); return; }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar la plantilla.');

      const updatedTemplate: Template = data.template;
      setTemplates(prev => {
        const updated = prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t);
        return updated.sort((a, b) => {
          if (a.templateType !== b.templateType) return a.templateType.localeCompare(b.templateType);
          return a.name.localeCompare(b.name);
        });
      });

      handleCloseTemplateForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setTemplateFormError(msg);
    } finally {
      setIsSubmittingTemplate(false);
    }
  };

  const handleSubmitTemplateForm = () => {
    if (editingTemplate) {
      handleUpdateTemplate();
    } else {
      handleCreateTemplate();
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    const canManageTemplates = currentUserRole === 'owner';
    if (!canManageTemplates) return;

    const confirmDelete = window.confirm(
      `Se eliminará la plantilla "${templateName}".\n\nLos nodos que la usaban quedarán sin plantilla asignada, pero el contenido de los nodos no se modificará.\n\n¿Deseas continuar?`
    );
    if (!confirmDelete) return;

    try {
      setIsDeletingTemplate(templateId);
      setDeleteTemplateError(null);

      const res = await fetch(`/api/brains/${brainId}/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar la plantilla.');
      }

      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setDeleteTemplateError(msg);
    } finally {
      setIsDeletingTemplate(null);
    }
  };

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

  // Members States
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isCheckingOwner, setIsCheckingOwner] = useState<boolean>(true);
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState<boolean>(false);

  const fetchMembers = async (showLoadingState = true) => {
    try {
      if (showLoadingState) {
        setIsCheckingOwner(true);
      }
      setMembersError(null);
      const res = await fetch(`/api/brains/${brainId}/members`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.status === 403) {
        setIsOwner(false);
        setMembers([]);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudieron recuperar los miembros.');
      }
      const data = await res.json();
      setMembers(data.members || []);
      setIsOwner(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setMembersError(msg);
      setIsOwner(false);
    } finally {
      if (showLoadingState) {
        setIsCheckingOwner(false);
      }
    }
  };

  const openMembersModal = () => {
    setMembersError(null);
    setIsMembersModalOpen(true);
    fetchMembers(false);
  };

  const closeMembersModal = () => {
    setIsMembersModalOpen(false);
  };

  const refreshMembers = () => {
    fetchMembers(true);
  };

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
    if (!canEditBrain) return;
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
    if (!canEditBrain) return;
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

      // Close comparison mode after successful restore
      setComparisonVersion(null);
      setAgentProposalComparison(null);
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
    if (!canEditBrain) return;
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
    if (!canEditBrain) return;
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
    if (!canEditBrain) return;
    setCreateParentId(parentId);
    setCreateTitle('');
    setCreateContentMarkdown('');
    setCreateStatus('draft');
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditBrain) return;
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



  // Moving / Reordering States
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Sidebar Resize State & Logic
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('sidebarWidth');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 240 && parsed <= 520) {
          return parsed;
        }
      }
    }
    return 288;
  });

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(520, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (moveEvent: MouseEvent) => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const finalWidth = Math.max(240, Math.min(520, moveEvent.clientX));
      localStorage.setItem('sidebarWidth', finalWidth.toString());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Context Menu State & Logic
  const [contextMenu, setContextMenu] = useState<{
    node: NodeTreeItem;
    x: number;
    y: number;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute adjustedCoords during render to avoid cascading renders
  const adjustedCoords = (() => {
    if (!contextMenu) return null;

    const menuWidth = 220;
    const menuHeight = canEditBrain ? 330 : 180;

    let targetX = contextMenu.x;
    let targetY = contextMenu.y;

    if (typeof window !== 'undefined') {
      if (targetX + menuWidth > window.innerWidth) {
        targetX = window.innerWidth - menuWidth - 8;
      }
      if (targetY + menuHeight > window.innerHeight) {
        targetY = window.innerHeight - menuHeight - 8;
      }

      targetX = Math.max(8, targetX);
      targetY = Math.max(8, targetY);
    }

    return { x: targetX, y: targetY };
  })();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClose = () => {
      setContextMenu(null);
    };

    window.addEventListener('mousedown', handleClose);
    window.addEventListener('contextmenu', handleClose);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClose);
      window.removeEventListener('contextmenu', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const copyToClipboard = async (text: string, successMessage: string) => {
    if (!text) {
      setToastMessage('Error: No hay contenido para copiar');
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setToastMessage(successMessage);
        return;
      }
    } catch (err) {
      console.warn('Navigator clipboard failed, using fallback:', err);
    }

    // Fallback implementation using standard textarea
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setToastMessage(successMessage);
      } else {
        throw new Error('Fallback execCommand copy returned false');
      }
    } catch (err) {
      console.error('Copy fallback failed:', err);
      setToastMessage('Error al copiar al portapapeles');
    }
  };

  const handleCopyTitle = (node: NodeTreeItem) => {
    copyToClipboard(node.title, 'Título copiado al portapapeles');
  };

  const handleCopyMarkdown = (node: NodeTreeItem) => {
    let md = node.contentMarkdown;
    if (!md && selectedNodeId === node.id && nodeDetail) {
      md = nodeDetail.contentMarkdown;
    }
    if (!md) {
      setToastMessage('Error: Este documento no tiene contenido Markdown para copiar');
      return;
    }
    copyToClipboard(md, 'Markdown copiado al portapapeles');
  };

  const handleCopyLink = (node: NodeTreeItem) => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const path = `/brains/${brainId}?nodeId=${node.id}`;
    const url = origin ? `${origin}${path}` : path;
    copyToClipboard(url, 'Enlace copiado al portapapeles');
  };

  const handlePrintNode = (node: NodeTreeItem) => {
    if (selectedNodeId !== node.id) {
      selectNodeHandler(node.id);
      setToastMessage('Documento abierto. Vuelve a imprimir cuando termine de cargar.');
    } else {
      window.print();
    }
  };

  const handleExportTreeItemMarkdown = (node: NodeTreeItem) => {
    let md = node.contentMarkdown;
    if (!md && selectedNodeId === node.id && nodeDetail) {
      md = nodeDetail.contentMarkdown;
    }
    if (!md) {
      setToastMessage('Error: Este documento no tiene contenido para exportar');
      return;
    }

    const dateStr = node.updatedAt instanceof Date
      ? node.updatedAt.toISOString()
      : new Date(node.updatedAt).toISOString();

    let yamlContent = `---\n`;
    yamlContent += `title: "${node.title.replace(/"/g, '\\"')}"\n`;
    yamlContent += `status: "${node.status}"\n`;
    yamlContent += `updatedAt: "${dateStr}"\n`;
    if (node.description) {
      yamlContent += `description: "${node.description.replace(/"/g, '\\"')}"\n`;
    }
    yamlContent += `---\n\n`;
    yamlContent += md;

    let sanitizedTitle = node.title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!sanitizedTitle) {
      sanitizedTitle = 'documento';
    }
    const filename = `${sanitizedTitle}.md`;

    downloadTextFile(filename, yamlContent, 'text/markdown');
    setToastMessage(`Exportado "${node.title}" como Markdown`);
  };

  const handleMoveToRoot = (node: NodeTreeItem) => {
    if (!canEditBrain) return;
    if (node.parentId === null) {
      setToastMessage('El documento ya se encuentra en la raíz');
      return;
    }
    const roots = tree.filter((n) => n.id !== node.id);
    const newPosition = roots.length;
    handleMoveNode(node.id, null, newPosition);
  };

  const handleRenameNode = async (node: NodeTreeItem) => {
    if (!canEditBrain) return;
    const newTitle = window.prompt('Renombrar documento:', node.title);
    if (newTitle === null) return; // User cancelled
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setToastMessage('Error: El título no puede estar vacío');
      return;
    }
    if (trimmed === node.title) {
      setToastMessage('El título es idéntico');
      return;
    }

    try {
      const res = await fetch(`/api/nodes/${node.id}/rename`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: trimmed,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al renombrar el documento.');
      }

      // Refresh tree
      const treeRes = await fetch(`/api/brains/${brainId}/tree`);
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        setTree(treeData.tree || []);
      }

      // If the renamed node is selected, update details too
      if (node.id === selectedNodeId) {
        const detailRes = await fetch(`/api/nodes/${node.id}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setNodeDetail(detailData.node);
        }
      }
      setToastMessage('Documento renombrado exitosamente');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al renombrar.';
      setToastMessage(`Error: ${msg}`);
    }
  };

  const handleArchiveNodeById = async (node: NodeTreeItem) => {
    if (!canEditBrain) return;
    const hasChildren = node.children && node.children.length > 0;
    const confirmMsg = hasChildren
      ? `El documento "${node.title}" tiene subpáginas. Si lo archivas, todas sus subpáginas serán archivadas también de forma recursiva. ¿Estás seguro de que deseas continuar?`
      : `¿Estás seguro de que deseas archivar el documento "${node.title}"?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await fetch(`/api/nodes/${node.id}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al archivar el documento.');
      }

      // Refresh tree
      const treeRes = await fetch(`/api/brains/${brainId}/tree`);
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        setTree(treeData.tree || []);
      }

      // If the archived node was selected, clear selected node id
      if (node.id === selectedNodeId) {
        setSelectedNodeId(null);
        setNodeDetail(null);
      }
      setToastMessage('Documento archivado exitosamente');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al archivar.';
      setToastMessage(`Error: ${msg}`);
    }
  };

  const handleMoveNode = async (nodeId: string, newParentId: string | null, newPosition: number) => {
    try {
      setMoveError(null);
      setIsMoving(true);
      const res = await fetch(`/api/nodes/${nodeId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newParentId,
          newPosition,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al mover el documento.');
      }

      // Refresh tree
      const treeRes = await fetch(`/api/brains/${brainId}/tree`);
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        setTree(treeData.tree || []);
      }

      // Refresh current active node details if the moved node is the current node
      if (nodeId === selectedNodeId) {
        const detailRes = await fetch(`/api/nodes/${nodeId}`);
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setNodeDetail(detailData.node);
        }
      }
      setToastMessage('Documento movido exitosamente');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al mover el documento.';
      setMoveError(msg);
      setToastMessage(`Error: ${msg}`);
    } finally {
      setIsMoving(false);
    }
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
    if (!canEditBrain) return;
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


  const handleLogout = async () => {
    if (!confirmDiscardUnsavedChanges()) return;
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

  // Fetch brain membership to check owner role and load members list
  useEffect(() => {
    let active = true;
    
    async function initMembers() {
      setIsCheckingOwner(true);
      setMembersError(null);
      try {
        const res = await fetch(`/api/brains/${brainId}/members`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          if (active) {
            setIsOwner(false);
            setMembers([]);
          }
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'No se pudieron recuperar los miembros.');
        }
        const data = await res.json();
        if (active) {
          setMembers(data.members || []);
          setIsOwner(true);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error de conexión.';
        if (active) {
          setMembersError(msg);
          setIsOwner(false);
        }
      } finally {
        if (active) {
          setIsCheckingOwner(false);
        }
      }
    }

    initMembers();

    return () => {
      active = false;
    };
  }, [brainId, router]);

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
    if (!canEditBrain) return;
    if (nodeDetail) {
      setEditTitle(nodeDetail.title);
      setEditDescription(nodeDetail.description || '');
      setEditContent(nodeDetail.contentMarkdown);
      setEditStatus(nodeDetail.status);
      setEditCategory(nodeDetail.category || '');
      setEditTags(nodeDetail.tags || []);
      setEditChangeNote('');
      setSaveError(null);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError(null);
  };

  const handleInsertAIProposal = (proposal: string) => {
    if (!canEditBrain) return;
    if (!proposal.trim()) return;
    if (!selectedNodeId || !nodeDetail) return;

    if (!isEditing) {
      setEditTitle(nodeDetail.title);
      setEditDescription(nodeDetail.description || '');
      setEditStatus(nodeDetail.status);
      setEditCategory(nodeDetail.category || '');
      setEditTags(nodeDetail.tags || []);
      setEditChangeNote('');
      setSaveError(null);
      
      const newContent = nodeDetail.contentMarkdown + (nodeDetail.contentMarkdown ? '\n\n' : '') + proposal;
      setEditContent(newContent);
      setIsEditing(true);
    } else {
      const newContent = editContent + (editContent ? '\n\n' : '') + proposal;
      setEditContent(newContent);
    }
  };

  const handleReplaceWithAIProposal = (proposal: string) => {
    if (!canEditBrain) return;
    if (!proposal.trim()) return;
    if (!selectedNodeId || !nodeDetail) return;

    if (!isEditing) {
      setEditTitle(nodeDetail.title);
      setEditDescription(nodeDetail.description || '');
      setEditStatus(nodeDetail.status);
      setEditCategory(nodeDetail.category || '');
      setEditTags(nodeDetail.tags || []);
      setEditChangeNote('');
      setSaveError(null);
      
      setEditContent(proposal);
      setIsEditing(true);
    } else {
      setEditContent(proposal);
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!canEditBrain) return false;
    if (!selectedNodeId) return false;

    if (!editTitle.trim()) {
      setSaveError('El título no puede estar vacío.');
      return false;
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
          description: editDescription.trim() || null,
          category: editCategory.trim() || null,
          tags: editTags,
        }),
      });

      if (res.status === 401) {
        router.push('/login');
        return false;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar los cambios.');
      }

      setIsEditing(false);
      // Trigger refresh of tree hierarchy, node detail and versions list
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar los cambios.';
      setSaveError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const sanitizeFileName = (name: string): string => {
    const clean = name
      .trim()
      .replace(/[\/\\:*?"<>|]/g, '')
      .replace(/\s+/g, '-');
    const truncated = clean.slice(0, 100);
    return truncated || 'documento';
  };

  const downloadTextFile = (filename: string, content: string, mimeType: string): void => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportNodeMarkdown = () => {
    if (!nodeDetail || isEditing) return;

    const pathString = breadcrumbPath && breadcrumbPath.length > 0
      ? breadcrumbPath.map((n) => n.title).join(' > ')
      : nodeDetail.title;

    const escapeYamlValue = (val: string) => {
      return val.replace(/"/g, '\\"').replace(/\n/g, ' ');
    };

    const dateStr = nodeDetail.updatedAt instanceof Date
      ? nodeDetail.updatedAt.toISOString()
      : new Date(nodeDetail.updatedAt).toISOString();

    const yamlContent = `---
id: "${escapeYamlValue(nodeDetail.id)}"
status: "${escapeYamlValue(nodeDetail.status)}"
updatedAt: "${escapeYamlValue(dateStr)}"
path: "${escapeYamlValue(pathString)}"
---
# ${nodeDetail.title}

${nodeDetail.contentMarkdown}`;

    const filename = `${sanitizeFileName(nodeDetail.title)}.md`;
    downloadTextFile(filename, yamlContent, 'text/markdown');
  };

  const handleExportNodeJson = () => {
    if (!nodeDetail || isEditing) return;

    const pathString = breadcrumbPath && breadcrumbPath.length > 0
      ? breadcrumbPath.map((n) => n.title).join(' / ')
      : nodeDetail.title;

    const dateStr = nodeDetail.updatedAt instanceof Date
      ? nodeDetail.updatedAt.toISOString()
      : new Date(nodeDetail.updatedAt).toISOString();

    const exportObj = {
      id: nodeDetail.id,
      title: nodeDetail.title,
      status: nodeDetail.status,
      parentId: nodeDetail.parentId,
      updatedAt: dateStr,
      breadcrumb: pathString,
      contentMarkdown: nodeDetail.contentMarkdown,
    };

    const jsonContent = JSON.stringify(exportObj, null, 2);
    const filename = `${sanitizeFileName(nodeDetail.title)}.json`;
    downloadTextFile(filename, jsonContent, 'application/json');
  };

  interface ExportNode {
    id: string;
    title: string;
    slug: string;
    status: string;
    position: number;
    parentId: string | null;
    updatedAt: string;
    contentMarkdown: string;
    children: ExportNode[];
  }

  const mapNodeTreeForExport = (items: NodeTreeItem[]): ExportNode[] => {
    // Exclude archived nodes
    const activeItems = items.filter((item) => item.status !== 'archived');

    // Sort by position ascending if position is available
    const sortedItems = [...activeItems].sort((a, b) => {
      const posA = typeof a.position === 'number' ? a.position : 0;
      const posB = typeof b.position === 'number' ? b.position : 0;
      return posA - posB;
    });

    return sortedItems.map((item) => {
      const dateStr = item.updatedAt instanceof Date
        ? item.updatedAt.toISOString()
        : new Date(item.updatedAt).toISOString();

      return {
        id: item.id,
        title: item.title,
        slug: item.slug,
        status: item.status,
        position: item.position,
        parentId: item.parentId,
        updatedAt: dateStr,
        contentMarkdown: item.contentMarkdown,
        children: mapNodeTreeForExport(item.children || []),
      };
    });
  };

  const handleExportBrainJson = () => {
    if (!brainId || !tree) return;

    const exportedNodes = mapNodeTreeForExport(tree);

    const exportObj = {
      brainId: brainId,
      brainName: brainName || 'Cerebro',
      exportedAt: new Date().toISOString(),
      format: 'sodeos.brain.export.v1',
      nodes: exportedNodes,
    };

    const jsonContent = JSON.stringify(exportObj, null, 2);
    const filename = `${sanitizeFileName(brainName || 'Cerebro')}-completo.json`;
    downloadTextFile(filename, jsonContent, 'application/json');
  };

  interface FlattenedExportNode {
    node: ExportNode;
    depth: number;
    breadcrumb: string[];
  }

  const flattenExportTree = (
    nodes: ExportNode[],
    depth = 0,
    parentPath: string[] = []
  ): FlattenedExportNode[] => {
    const list: FlattenedExportNode[] = [];
    for (const node of nodes) {
      const currentPath = [...parentPath, node.title];
      list.push({
        node,
        depth,
        breadcrumb: currentPath,
      });
      if (node.children && node.children.length > 0) {
        list.push(...flattenExportTree(node.children, depth + 1, currentPath));
      }
    }
    return list;
  };

  const createMarkdownAnchor = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-áéíóúñü]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const generateBrainMarkdownExport = (exportedNodes: ExportNode[]): string => {
    const flattened = flattenExportTree(exportedNodes);

    let markdown = `# Cerebro: ${brainName || 'Cerebro'}\n`;
    markdown += `> **Fecha de Exportación:** ${new Date().toISOString()}\n`;
    markdown += `> **Formato:** sodeos.brain.export.markdown.v1\n\n`;
    markdown += `---\n\n`;
    markdown += `## Índice de Contenido\n\n`;

    // 1. Generate Table of Contents
    for (const item of flattened) {
      const indent = '  '.repeat(item.depth);
      const anchor = createMarkdownAnchor(item.node.title);
      markdown += `${indent}- [${item.node.title}](#${anchor})\n`;
    }

    markdown += `\n---\n\n`;

    // 2. Generate content for each node
    for (const item of flattened) {
      const pathString = item.breadcrumb.join(' > ');
      
      markdown += `## ${item.node.title}\n`;
      markdown += `> **Ruta:** ${pathString}\n`;
      markdown += `> **Estado:** ${item.node.status} | **Actualizado:** ${item.node.updatedAt}\n\n`;

      if (item.node.contentMarkdown && item.node.contentMarkdown.trim() !== '') {
        markdown += `${item.node.contentMarkdown.trim()}\n\n`;
      } else {
        markdown += `*Este documento no tiene contenido.*\n\n`;
      }

      markdown += `---\n\n`;
    }

    let finalContent = markdown.trim();
    if (finalContent.endsWith('---')) {
      finalContent = finalContent.substring(0, finalContent.length - 3).trim();
    }
    return finalContent;
  };

  const handleExportBrainMarkdown = () => {
    if (!brainId || !tree || tree.length === 0) return;

    const exportedNodes = mapNodeTreeForExport(tree);
    if (exportedNodes.length === 0) return;

    const markdownContent = generateBrainMarkdownExport(exportedNodes);
    const filename = `${sanitizeFileName(brainName || 'Cerebro')}-completo.md`;
    downloadTextFile(filename, markdownContent, 'text/markdown');
  };

  const selectNodeHandler = (id: string) => {
    if (isEditing && isDirty) {
      if (!window.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos y cambiar de nodo?')) {
        return;
      }
      setIsEditing(false);
    } else if (isEditing) {
      setIsEditing(false);
    }
    // Clear comparison mode when switching nodes
    setComparisonVersion(null);
    setAgentProposalComparison(null);
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
        onNavigateToBrains={() => {
          if (confirmDiscardUnsavedChanges()) {
            router.push('/brains');
          }
        }}
        onNavigateToBrain={() => {
          if (confirmDiscardUnsavedChanges()) {
            setSelectedNodeId(null);
            setNodeDetail(null);
            setIsEditing(false);
          }
        }}
        onNavigateToDashboard={() => {
          if (confirmDiscardUnsavedChanges()) {
            router.push('/dashboard');
          }
        }}
        onLogout={handleLogout}
        remoteSearchQuery={remoteSearchQuery}
        remoteSearchResults={remoteSearchResults}
        isRemoteSearching={isRemoteSearching}
        remoteSearchError={remoteSearchError}
        isRemoteSearchOpen={isRemoteSearchOpen}
        setIsRemoteSearchOpen={setIsRemoteSearchOpen}
        onRemoteSearch={handleRemoteSearch}
        onSelectSearchResult={handleSelectSearchResult}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tree View */}
        <EditorSidebar
          brainName={brainName}
          tree={tree}
          selectedNodeId={selectedNodeId}
          loading={loading}
          error={error}
          onSelectNode={selectNodeHandler}
          onCreateRootNode={() => openCreateModal(null)}
          onOpenTemplates={() => {
            setTemplatesError(null);
            setDeleteTemplateError(null);
            setIsTemplatesModalOpen(true);
            fetchTemplates();
          }}
          onOpenTrash={() => {
            setTrashError(null);
            setIsTrashModalOpen(true);
            fetchTrashNodes();
          }}
          onExportBrainJson={handleExportBrainJson}
          onExportBrainMarkdown={handleExportBrainMarkdown}
          onOpenMembers={openMembersModal}
          canEditBrain={canEditBrain}
          canManageMembers={canManageMembers}
          onMoveNode={handleMoveNode}
          width={sidebarWidth}
          onResizeStart={handleResizeStart}
          onContextMenuNode={(node, x, y) => {
            setContextMenu({ node, x, y });
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
            <div className="max-w-4xl w-full mx-auto p-8 flex flex-col gap-6 print-document-root">

              {/* COMPARISON MODE — replaces editor/view temporarily */}
              {comparisonVersion ? (
                <InlineMarkdownDiff
                  baseText={comparisonVersion.contentMarkdown}
                  compareText={nodeDetail.contentMarkdown}
                  baseLabel={`Versión guardada (${new Date(comparisonVersion.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · ${comparisonVersion.saver?.name ?? 'Usuario'})`}
                  compareLabel="Documento actual"
                  sourceType="history"
                  onClose={() => setComparisonVersion(null)}
                  onRestore={() => {
                    if (window.confirm('¿Estás seguro de que deseas restaurar esta versión? Se creará una nueva entrada de auditoría en el historial.')) {
                      handleRestoreVersion(comparisonVersion.id);
                    }
                  }}
                  isRestoring={isRestoringVersion}
                  canEdit={canEditBrain}
                />
              ) : agentProposalComparison ? (
                (() => {
                  const baseText = isEditing ? editContent : (nodeDetail.contentMarkdown ?? '');
                  const compareText = agentProposalComparison.mode === 'replace'
                    ? agentProposalComparison.finalMarkdown
                    : (baseText.trim() ? `${baseText}\n\n${agentProposalComparison.finalMarkdown}` : agentProposalComparison.finalMarkdown);
                  return (
                    <InlineMarkdownDiff
                      baseText={baseText}
                      compareText={compareText}
                      baseLabel={isEditing ? "Borrador actual" : "Documento actual"}
                      compareLabel={agentProposalComparison.mode === 'replace' ? "Propuesta del Agente" : "Documento con propuesta insertada al final"}
                      sourceType="agentProposal"
                      onClose={() => setAgentProposalComparison(null)}
                      onInsert={() => {
                        handleInsertAIProposal(agentProposalComparison.finalMarkdown);
                        setAgentProposalComparison(null);
                      }}
                      onReplace={() => {
                        handleReplaceWithAIProposal(agentProposalComparison.finalMarkdown);
                        setAgentProposalComparison(null);
                      }}
                      canEdit={canEditBrain}
                    />
                  );
                })()
              ) : isEditing ? (
                /* EDIT MODE */
                <EditorDocumentForm
                  nodeDetail={nodeDetail}
                  editTitle={editTitle}
                  editDescription={editDescription}
                  editContent={editContent}
                  editStatus={editStatus}
                  editCategory={editCategory}
                  editTags={editTags}
                  editChangeNote={editChangeNote}
                  saveError={saveError}
                  isSaving={isSaving}
                  canEdit={canEditBrain}
                  onEditTitleChange={setEditTitle}
                  onEditDescriptionChange={setEditDescription}
                  onEditContentChange={setEditContent}
                  onEditStatusChange={setEditStatus}
                  onEditCategoryChange={setEditCategory}
                  onEditTagsChange={setEditTags}
                  onEditChangeNoteChange={setEditChangeNote}
                  onSave={handleSave}
                  onCancel={handleCancelEdit}
                />
              ) : (
                /* READ-ONLY VIEW */
                <EditorDocumentView
                  nodeDetail={nodeDetail}
                  onStartEdit={handleStartEdit}
                  canEdit={canEditBrain}
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
          brainId={brainId}
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
          onExportMarkdown={handleExportNodeMarkdown}
          onExportJson={handleExportNodeJson}
          isEditing={isEditing}
          canRestoreVersion={canEditBrain}
          isCollapsed={isRightPanelCollapsed}
          onToggleCollapse={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
          canEdit={canEditBrain}
          contentMarkdown={isEditing ? editContent : (nodeDetail?.contentMarkdown || '')}
          onCompareVersion={setComparisonVersion}
          activeComparisonVersionId={comparisonVersion?.id ?? null}
          onInsertAIProposal={handleInsertAIProposal}
          onReplaceWithAIProposal={handleReplaceWithAIProposal}
          onCompareAIProposal={handleCompareAIProposal}
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
        onClose={() => {
          setIsTemplatesModalOpen(false);
          handleCloseTemplateForm();
        }}
        onApplyTemplate={handleApplyTemplate}
        onApplyStructureTemplate={handleApplyStructureTemplate}
        onRetryFetch={fetchTemplates}
        // CRUD Props (TPL3B)
        canManageTemplates={currentUserRole === 'owner'}
        canApplyTemplates={canEditBrain}
        isTemplateFormOpen={isTemplateFormOpen}
        templateFormName={templateFormName}
        templateFormDescription={templateFormDescription}
        templateFormType={templateFormType}
        templateFormFields={templateFormFields}
        templateFormSections={templateFormSections}
        isSubmittingTemplate={isSubmittingTemplate}
        templateFormError={templateFormError}
        editingTemplate={editingTemplate}
        onOpenCreateForm={handleOpenCreateTemplateForm}
        onOpenEditForm={handleOpenEditTemplateForm}
        onCloseForm={handleCloseTemplateForm}
        onTemplateFormNameChange={setTemplateFormName}
        onTemplateFormDescriptionChange={setTemplateFormDescription}
        onTemplateFormTypeChange={setTemplateFormType}
        onTemplateFormFieldsChange={setTemplateFormFields}
        onTemplateFormSectionsChange={setTemplateFormSections}
        onSubmitForm={handleSubmitTemplateForm}
        // Deletion Props (TPL3D)
        isDeletingTemplate={isDeletingTemplate}
        deleteTemplateError={deleteTemplateError}
        onDeleteTemplate={handleDeleteTemplate}
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

      {/* Manage Members Modal */}
      <ManageMembersModal
        isOpen={isMembersModalOpen}
        onClose={closeMembersModal}
        brainId={brainId}
        members={members}
        isLoading={isCheckingOwner}
        error={membersError}
        onRefresh={refreshMembers}
        isOwner={isOwner}
      />

      {/* Menú Contextual de Documentos */}
      {contextMenu && adjustedCoords && (
        <div
          style={{
            position: 'fixed',
            left: `${adjustedCoords.x}px`,
            top: `${adjustedCoords.y}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
          className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 py-1.5 min-w-[220px] max-w-[240px] z-50 overflow-hidden flex flex-col font-sans select-none"
        >
          {/* Header del nodo */}
          <div className="px-3 py-1.5 bg-slate-50/80 border-b border-slate-100 flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Documento</span>
            <span className="text-xs font-bold text-slate-700 truncate" title={contextMenu.node.title}>
              {contextMenu.node.title}
            </span>
          </div>

          <div className="py-1">
            {/* Copiar Título */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyTitle(contextMenu.node);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              📋 Copiar título
            </button>

            {/* Copiar Markdown */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyMarkdown(contextMenu.node);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              📝 Copiar Markdown
            </button>

            {/* Copiar Enlace */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink(contextMenu.node);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              🔗 Copiar enlace de página
            </button>

            {/* Imprimir */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrintNode(contextMenu.node);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              🖨️ Imprimir documento
            </button>

            {/* Exportar Markdown */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleExportTreeItemMarkdown(contextMenu.node);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
            >
              📥 Exportar a Markdown
            </button>
          </div>

          {canEditBrain && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <div className="py-1">
                {/* Renombrar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameNode(contextMenu.node);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  ✏️ Renombrar
                </button>

                {/* Crear subpágina */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateModal(contextMenu.node.id);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  ➕ Crear página hija
                </button>

                {/* Mover a raíz */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToRoot(contextMenu.node);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  📁 Mover a la raíz
                </button>

                {/* Archivar / Eliminar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveNodeById(contextMenu.node);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  🗑️ Archivar (Eliminar)
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl shadow-slate-950/20 z-50 flex items-center gap-2 border border-slate-800 animate-pulse">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

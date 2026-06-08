import db from '@/lib/db';
import { NodeTreeItem, Node } from '@/types';
import { NodeStatus, Prisma } from '@prisma/client';

/**
 * Fetches all active nodes for a brain and structures them into a hierarchical tree.
 * Nodes are ordered by parentId and position. Deleted nodes are excluded.
 */
export async function getBrainNodeTree(brainId: string): Promise<NodeTreeItem[]> {
  const flatNodes = await db.node.findMany({
    where: {
      brainId,
      deletedAt: null,
    },
    orderBy: [
      { parentId: 'asc' },
      { position: 'asc' },
    ],
  });

  // Map database nodes to domain nodes (mapping dates, etc.)
  const nodeItems: NodeTreeItem[] = flatNodes.map((node) => ({
    id: node.id,
    brainId: node.brainId,
    parentId: node.parentId,
    templateId: node.templateId,
    title: node.title,
    slug: node.slug,
    contentMarkdown: node.contentMarkdown,
    status: node.status,
    description: node.description,
    category: node.category,
    ownerUserId: node.ownerUserId,
    responsibleUserId: node.responsibleUserId,
    position: node.position,
    lockedBy: node.lockedBy,
    lockedAt: node.lockedAt,
    createdBy: node.createdBy,
    updatedBy: node.updatedBy,
    reviewedAt: node.reviewedAt,
    nextReviewAt: node.nextReviewAt,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    children: [],
  }));

  // Build the tree hierarchy using a map
  const rootNodes: NodeTreeItem[] = [];
  const nodeMap = new Map<string, NodeTreeItem>();

  for (const item of nodeItems) {
    nodeMap.set(item.id, item);
  }

  for (const item of nodeItems) {
    if (item.parentId === null) {
      rootNodes.push(item);
    } else {
      const parent = nodeMap.get(item.parentId);
      if (parent) {
        parent.children.push(item);
      } else {
        // Fallback for nodes referencing a non-existent or deleted parent: treat as root
        rootNodes.push(item);
      }
    }
  }

  // Recursive function to sort children by position
  const sortTree = (nodes: NodeTreeItem[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortTree(node.children);
      }
    }
  };

  sortTree(rootNodes);
  return rootNodes;
}

/**
 * Fetches the complete details of a single Node by its ID.
 * Excludes nodes that have been deleted (deletedAt !== null).
 */
export async function getNodeDetail(nodeId: string): Promise<Node | null> {
  const node = await db.node.findFirst({
    where: {
      id: nodeId,
      deletedAt: null,
    },
  });

  if (!node) return null;

  return {
    id: node.id,
    brainId: node.brainId,
    parentId: node.parentId,
    templateId: node.templateId,
    title: node.title,
    slug: node.slug,
    contentMarkdown: node.contentMarkdown,
    status: node.status,
    description: node.description,
    category: node.category,
    ownerUserId: node.ownerUserId,
    responsibleUserId: node.responsibleUserId,
    position: node.position,
    lockedBy: node.lockedBy,
    lockedAt: node.lockedAt,
    createdBy: node.createdBy,
    updatedBy: node.updatedBy,
    reviewedAt: node.reviewedAt,
    nextReviewAt: node.nextReviewAt,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    deletedAt: node.deletedAt,
  };
}

export interface UpdateNodeInput {
  title: string;
  contentMarkdown: string;
  status?: NodeStatus;
  changeNote?: string;
  userId: string;
}

/**
 * Updates a node's content (title, contentMarkdown, status) and creates a new NodeVersion.
 * Runs inside a Prisma transaction.
 * Returns unchanged: true if no changes were detected.
 */
export async function updateNodeContent(
  nodeId: string,
  input: UpdateNodeInput
): Promise<{ node: Node | null; unchanged: boolean }> {
  return await db.$transaction(async (tx) => {
    // 1. Verify existence
    const currentNode = await tx.node.findFirst({
      where: {
        id: nodeId,
        deletedAt: null,
      },
    });

    if (!currentNode) {
      return { node: null, unchanged: false };
    }

    // 2. Check for real changes
    const hasTitleChange = currentNode.title !== input.title;
    const hasContentChange = currentNode.contentMarkdown !== input.contentMarkdown;
    const hasStatusChange = input.status !== undefined && currentNode.status !== input.status;

    if (!hasTitleChange && !hasContentChange && !hasStatusChange) {
      return {
        node: {
          id: currentNode.id,
          brainId: currentNode.brainId,
          parentId: currentNode.parentId,
          templateId: currentNode.templateId,
          title: currentNode.title,
          slug: currentNode.slug,
          contentMarkdown: currentNode.contentMarkdown,
          status: currentNode.status,
          description: currentNode.description,
          category: currentNode.category,
          ownerUserId: currentNode.ownerUserId,
          responsibleUserId: currentNode.responsibleUserId,
          position: currentNode.position,
          lockedBy: currentNode.lockedBy,
          lockedAt: currentNode.lockedAt,
          createdBy: currentNode.createdBy,
          updatedBy: currentNode.updatedBy,
          reviewedAt: currentNode.reviewedAt,
          nextReviewAt: currentNode.nextReviewAt,
          createdAt: currentNode.createdAt,
          updatedAt: currentNode.updatedAt,
          deletedAt: currentNode.deletedAt,
        },
        unchanged: true,
      };
    }

    const updatedStatus = input.status !== undefined ? input.status : currentNode.status;

    // 3. Update the node
    const updatedNode = await tx.node.update({
      where: { id: nodeId },
      data: {
        title: input.title,
        contentMarkdown: input.contentMarkdown,
        status: updatedStatus,
        updatedBy: input.userId,
        updatedAt: new Date(),
      },
    });

    // 4. Create the NodeVersion
    await tx.nodeVersion.create({
      data: {
        nodeId: nodeId,
        title: input.title,
        contentMarkdown: input.contentMarkdown,
        status: updatedStatus,
        savedBy: input.userId,
        changeNote: input.changeNote || 'Sin nota de cambios especificada.',
      },
    });

    return {
      node: {
        id: updatedNode.id,
        brainId: updatedNode.brainId,
        parentId: updatedNode.parentId,
        templateId: updatedNode.templateId,
        title: updatedNode.title,
        slug: updatedNode.slug,
        contentMarkdown: updatedNode.contentMarkdown,
        status: updatedNode.status,
        description: updatedNode.description,
        category: updatedNode.category,
        ownerUserId: updatedNode.ownerUserId,
        responsibleUserId: updatedNode.responsibleUserId,
        position: updatedNode.position,
        lockedBy: updatedNode.lockedBy,
        lockedAt: updatedNode.lockedAt,
        createdBy: updatedNode.createdBy,
        updatedBy: updatedNode.updatedBy,
        reviewedAt: updatedNode.reviewedAt,
        nextReviewAt: updatedNode.nextReviewAt,
        createdAt: updatedNode.createdAt,
        updatedAt: updatedNode.updatedAt,
        deletedAt: updatedNode.deletedAt,
      },
      unchanged: false,
    };
  });
}

/**
 * Fetches the version history of a single Node by its ID.
 * Returns null if the node does not exist or is deleted.
 * Versions are ordered by createdAt descending, and include the saver User details.
 */
export async function getNodeVersions(nodeId: string) {
  // Check if node exists and is active
  const nodeExists = await db.node.findFirst({
    where: {
      id: nodeId,
      deletedAt: null,
    },
  });

  if (!nodeExists) {
    return null;
  }

  // Fetch all versions
  const versions = await db.nodeVersion.findMany({
    where: {
      nodeId: nodeId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      saver: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return versions;
}

export interface CreateNodeInput {
  title: string;
  parentId?: string | null;
  contentMarkdown?: string;
  status?: NodeStatus;
  userId: string;
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function generateUniqueSlug(tx: Prisma.TransactionClient, brainId: string, parentId: string | null, title: string): Promise<string> {
  const baseSlug = slugify(title) || 'node';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await tx.node.findFirst({
      where: {
        brainId,
        parentId,
        slug,
        deletedAt: null,
      },
    });

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

export async function createNode(
  brainId: string,
  input: CreateNodeInput
): Promise<Node> {
  return await db.$transaction(async (tx) => {
    if (input.parentId) {
      const parentNode = await tx.node.findFirst({
        where: {
          id: input.parentId,
          brainId: brainId,
          deletedAt: null,
        },
      });
      if (!parentNode) {
        throw new Error('El nodo padre especificado no existe o no pertenece a este cerebro.');
      }
    }

    const parentId = input.parentId || null;
    const slug = await generateUniqueSlug(tx, brainId, parentId, input.title);
    const contentMarkdown = input.contentMarkdown || '';
    const status = input.status || 'draft';

    const lastNode = await tx.node.findFirst({
      where: {
        brainId,
        parentId,
        deletedAt: null,
      },
      orderBy: {
        position: 'desc',
      },
    });
    const position = lastNode ? lastNode.position + 1 : 0;

    const node = await tx.node.create({
      data: {
        brainId,
        parentId,
        title: input.title,
        slug,
        contentMarkdown,
        status,
        ownerUserId: input.userId,
        responsibleUserId: input.userId,
        position,
        createdBy: input.userId,
        updatedBy: input.userId,
      },
    });

    await tx.nodeVersion.create({
      data: {
        nodeId: node.id,
        title: node.title,
        contentMarkdown: node.contentMarkdown,
        status: node.status,
        savedBy: input.userId,
        changeNote: 'Creación inicial del nodo.',
      },
    });

    return {
      id: node.id,
      brainId: node.brainId,
      parentId: node.parentId,
      templateId: node.templateId,
      title: node.title,
      slug: node.slug,
      contentMarkdown: node.contentMarkdown,
      status: node.status,
      description: node.description,
      category: node.category,
      ownerUserId: node.ownerUserId,
      responsibleUserId: node.responsibleUserId,
      position: node.position,
      lockedBy: node.lockedBy,
      lockedAt: node.lockedAt,
      createdBy: node.createdBy,
      updatedBy: node.updatedBy,
      reviewedAt: node.reviewedAt,
      nextReviewAt: node.nextReviewAt,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      deletedAt: node.deletedAt,
    };
  });
}

export async function archiveNodeTree(
  nodeId: string,
  userId: string
): Promise<{ success: boolean; count: number } | null> {
  const rootNode = await db.node.findFirst({
    where: {
      id: nodeId,
      deletedAt: null,
    },
  });

  if (!rootNode) {
    return null;
  }

  const siblingAndDescendantNodes = await db.node.findMany({
    where: {
      brainId: rootNode.brainId,
      deletedAt: null,
      id: { not: nodeId },
    },
    select: {
      id: true,
      parentId: true,
    },
  });

  const parentToChildren = new Map<string, string[]>();
  for (const n of siblingAndDescendantNodes) {
    if (n.parentId) {
      const list = parentToChildren.get(n.parentId) || [];
      list.push(n.id);
      parentToChildren.set(n.parentId, list);
    }
  }

  const descendantIds: string[] = [];
  const queue = [nodeId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = parentToChildren.get(currentId);
    if (children) {
      for (const childId of children) {
        descendantIds.push(childId);
        queue.push(childId);
      }
    }
  }

  return await db.$transaction(async (tx) => {
    const targetIds = [nodeId, ...descendantIds];
    const now = new Date();

    const updateResult = await tx.node.updateMany({
      where: {
        id: { in: targetIds },
        deletedAt: null,
      },
      data: {
        deletedAt: now,
        updatedBy: userId,
        updatedAt: now,
      },
    });

    return {
      success: true,
      count: updateResult.count,
    };
  });
}

export async function moveNode(
  nodeId: string,
  input: { newParentId: string | null; newPosition?: number },
  userId: string
): Promise<Node | null> {
  const node = await db.node.findFirst({
    where: { id: nodeId, deletedAt: null }
  });
  if (!node) {
    return null;
  }

  const brainId = node.brainId;
  const oldParentId = node.parentId;
  const newParentId = input.newParentId;

  // 1. Validation: newParentId === nodeId
  if (newParentId === nodeId) {
    throw new Error('Un nodo no puede ser su propio padre.');
  }

  // 2. Validation: check if newParentId belongs to the same brain and is active
  if (newParentId !== null) {
    const targetParent = await db.node.findFirst({
      where: { id: newParentId, deletedAt: null }
    });
    if (!targetParent) {
      throw new Error('El nodo padre destino no existe o está archivado.');
    }
    if (targetParent.brainId !== brainId) {
      throw new Error('El nodo padre destino no pertenece al mismo cerebro.');
    }
  }

  // 3. Validation: Detección de ciclos
  if (newParentId !== null) {
    const allNodes = await db.node.findMany({
      where: { brainId, deletedAt: null },
      select: { id: true, parentId: true }
    });

    const parentToChildren = new Map<string, string[]>();
    for (const n of allNodes) {
      if (n.parentId) {
        const list = parentToChildren.get(n.parentId) || [];
        list.push(n.id);
        parentToChildren.set(n.parentId, list);
      }
    }

    const descendantIds = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = parentToChildren.get(currentId);
      if (children) {
        for (const childId of children) {
          descendantIds.add(childId);
          queue.push(childId);
        }
      }
    }

    if (descendantIds.has(newParentId)) {
      throw new Error('Movimiento inválido: crearía un ciclo en el árbol.');
    }
  }

  return await db.$transaction(async (tx) => {
    // Generate unique slug in destination if parent has changed
    let slug = node.slug;
    if (oldParentId !== newParentId) {
      slug = await generateUniqueSlug(tx, brainId, newParentId, node.title);
    }

    // A) Get active sibling nodes at origin (excluding the current node)
    const siblingsOrigin = await tx.node.findMany({
      where: {
        brainId,
        parentId: oldParentId,
        deletedAt: null,
        id: { not: nodeId }
      },
      orderBy: { position: 'asc' }
    });

    // B) Get active sibling nodes at destination
    const siblingsDest = await tx.node.findMany({
      where: {
        brainId,
        parentId: newParentId,
        deletedAt: null
      },
      orderBy: { position: 'asc' }
    });

    const destListWithoutSelf = siblingsDest.filter(n => n.id !== nodeId);

    let targetPos = input.newPosition !== undefined ? input.newPosition : destListWithoutSelf.length;
    if (targetPos < 0) targetPos = 0;
    if (targetPos > destListWithoutSelf.length) targetPos = destListWithoutSelf.length;

    const finalDestList: { id: string; position?: number }[] = [];
    for (let i = 0; i < destListWithoutSelf.length; i++) {
      if (i === targetPos) {
        finalDestList.push({ id: nodeId });
      }
      finalDestList.push(destListWithoutSelf[i]);
    }
    if (targetPos === destListWithoutSelf.length) {
      finalDestList.push({ id: nodeId });
    }

    // Update positions in destination list
    for (let i = 0; i < finalDestList.length; i++) {
      const item = finalDestList[i];
      if (item.id === nodeId) {
        continue;
      }
      if (item.position !== i) {
        await tx.node.update({
          where: { id: item.id },
          data: { position: i }
        });
      }
    }

    // Update positions in origin list if parent has changed
    if (oldParentId !== newParentId) {
      for (let i = 0; i < siblingsOrigin.length; i++) {
        const item = siblingsOrigin[i];
        if (item.position !== i) {
          await tx.node.update({
            where: { id: item.id },
            data: { position: i }
          });
        }
      }
    }

    // Finally, update the node itself
    const updatedNode = await tx.node.update({
      where: { id: nodeId },
      data: {
        parentId: newParentId,
        position: targetPos,
        slug,
        updatedBy: userId,
        updatedAt: new Date()
      }
    });

    return {
      id: updatedNode.id,
      brainId: updatedNode.brainId,
      parentId: updatedNode.parentId,
      templateId: updatedNode.templateId,
      title: updatedNode.title,
      slug: updatedNode.slug,
      contentMarkdown: updatedNode.contentMarkdown,
      status: updatedNode.status,
      description: updatedNode.description,
      category: updatedNode.category,
      ownerUserId: updatedNode.ownerUserId,
      responsibleUserId: updatedNode.responsibleUserId,
      position: updatedNode.position,
      lockedBy: updatedNode.lockedBy,
      lockedAt: updatedNode.lockedAt,
      createdBy: updatedNode.createdBy,
      updatedBy: updatedNode.updatedBy,
      reviewedAt: updatedNode.reviewedAt,
      nextReviewAt: updatedNode.nextReviewAt,
      createdAt: updatedNode.createdAt,
      updatedAt: updatedNode.updatedAt,
      deletedAt: updatedNode.deletedAt,
    };
  });
}

export async function applyTemplateToNode(
  nodeId: string,
  templateId: string,
  userId: string
): Promise<Node> {
  return await db.$transaction(async (tx) => {
    // 1. Fetch node and check if exists and is active
    const node = await tx.node.findUnique({
      where: { id: nodeId },
    });

    if (!node || node.deletedAt !== null) {
      throw new Error('Nodo no encontrado o eliminado.');
    }

    // 2. Fetch template and check if exists
    const template = await tx.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Plantilla no encontrada.');
    }

    // 3. Verify brainId match
    if (template.brainId !== node.brainId) {
      throw new Error('La plantilla no pertenece al mismo cerebro que el nodo.');
    }

    // 4. Verify templateType is page
    if (template.templateType !== 'page') {
      throw new Error('Solo se pueden aplicar plantillas de tipo "page".');
    }

    // 5. Verify schemaJson has fields
    interface SchemaField {
      name?: string;
      label?: string;
      type?: string;
    }
    const schema = template.schemaJson as { fields?: SchemaField[] } | null;
    if (!schema || !schema.fields || !Array.isArray(schema.fields) || schema.fields.length === 0) {
      throw new Error('La plantilla no tiene campos definidos en su esquema.');
    }

    // 6. Convert fields to markdown
    const markdownLines: string[] = [];
    for (const field of schema.fields) {
      const name = field.name || 'campo';
      const label = field.label || name;
      const type = field.type || 'text';

      let placeholder = '_Por completar_';
      if (type === 'date') {
        placeholder = '_Fecha por definir_';
      } else if (type === 'text') {
        placeholder = '_Texto por completar_';
      } else if (type === 'markdown') {
        placeholder = '_Contenido en Markdown por completar_';
      } else if (type === 'number') {
        placeholder = '_Valor numérico por definir_';
      }

      markdownLines.push(`## ${label}\n\n${placeholder}\n`);
    }

    const generatedMarkdown = markdownLines.join('\n');

    // 7. Update node
    const updatedNode = await tx.node.update({
      where: { id: nodeId },
      data: {
        contentMarkdown: generatedMarkdown,
        templateId: templateId,
        updatedBy: userId,
        updatedAt: new Date(),
      },
    });

    // 8. Create node version
    await tx.nodeVersion.create({
      data: {
        nodeId: nodeId,
        title: updatedNode.title,
        contentMarkdown: generatedMarkdown,
        status: updatedNode.status,
        savedBy: userId,
        changeNote: `Plantilla aplicada: ${template.name}`,
      },
    });

    return {
      id: updatedNode.id,
      brainId: updatedNode.brainId,
      parentId: updatedNode.parentId,
      templateId: updatedNode.templateId,
      title: updatedNode.title,
      slug: updatedNode.slug,
      contentMarkdown: updatedNode.contentMarkdown,
      status: updatedNode.status,
      description: updatedNode.description,
      category: updatedNode.category,
      ownerUserId: updatedNode.ownerUserId,
      responsibleUserId: updatedNode.responsibleUserId,
      position: updatedNode.position,
      lockedBy: updatedNode.lockedBy,
      lockedAt: updatedNode.lockedAt,
      createdBy: updatedNode.createdBy,
      updatedBy: updatedNode.updatedBy,
      reviewedAt: updatedNode.reviewedAt,
      nextReviewAt: updatedNode.nextReviewAt,
      createdAt: updatedNode.createdAt,
      updatedAt: updatedNode.updatedAt,
      deletedAt: updatedNode.deletedAt,
    };
  });
}

export async function applyStructureTemplateToNode(
  nodeId: string,
  templateId: string,
  userId: string
): Promise<Node[]> {
  return await db.$transaction(async (tx) => {
    // 1. Fetch parent node and check if exists and is active
    const parentNode = await tx.node.findUnique({
      where: { id: nodeId },
    });

    if (!parentNode || parentNode.deletedAt !== null) {
      throw new Error('El nodo padre no existe o fue eliminado.');
    }

    // 2. Fetch template and check if exists
    const template = await tx.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Plantilla no encontrada.');
    }

    // 3. Verify brainId match
    if (template.brainId !== parentNode.brainId) {
      throw new Error('La plantilla no pertenece al mismo cerebro que el nodo padre.');
    }

    // 4. Verify templateType is structure
    if (template.templateType !== 'structure') {
      throw new Error('Solo se pueden aplicar plantillas de tipo "structure".');
    }

    // 5. Verify schemaJson has sections
    interface SchemaSection {
      name?: string;
      label?: string;
    }
    const schema = template.schemaJson as { sections?: SchemaSection[] } | null;
    if (!schema || !schema.sections || !Array.isArray(schema.sections) || schema.sections.length === 0) {
      throw new Error('La plantilla no tiene secciones definidas en su esquema.');
    }

    // 6. Find the position starting index
    const lastNode = await tx.node.findFirst({
      where: {
        brainId: parentNode.brainId,
        parentId: nodeId,
        deletedAt: null,
      },
      orderBy: {
        position: 'desc',
      },
    });
    let nextPosition = lastNode ? lastNode.position + 1 : 0;

    const createdNodes: Node[] = [];

    // 7. Create each section as a child node
    for (const section of schema.sections) {
      const name = section.name || 'seccion';
      const title = section.label || name;

      // Generate unique slug
      const slug = await generateUniqueSlug(tx, parentNode.brainId, nodeId, title);

      // Create node
      const childNode = await tx.node.create({
        data: {
          brainId: parentNode.brainId,
          parentId: nodeId,
          templateId: templateId,
          title,
          slug,
          contentMarkdown: '',
          status: 'draft',
          ownerUserId: userId,
          responsibleUserId: userId,
          position: nextPosition,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      nextPosition++;

      // Create version
      await tx.nodeVersion.create({
        data: {
          nodeId: childNode.id,
          title: childNode.title,
          contentMarkdown: childNode.contentMarkdown,
          status: childNode.status,
          savedBy: userId,
          changeNote: `Creado desde plantilla: ${template.name}`,
        },
      });

      createdNodes.push({
        id: childNode.id,
        brainId: childNode.brainId,
        parentId: childNode.parentId,
        templateId: childNode.templateId,
        title: childNode.title,
        slug: childNode.slug,
        contentMarkdown: childNode.contentMarkdown,
        status: childNode.status,
        description: childNode.description,
        category: childNode.category,
        ownerUserId: childNode.ownerUserId,
        responsibleUserId: childNode.responsibleUserId,
        position: childNode.position,
        lockedBy: childNode.lockedBy,
        lockedAt: childNode.lockedAt,
        createdBy: childNode.createdBy,
        updatedBy: childNode.updatedBy,
        reviewedAt: childNode.reviewedAt,
        nextReviewAt: childNode.nextReviewAt,
        createdAt: childNode.createdAt,
        updatedAt: childNode.updatedAt,
        deletedAt: childNode.deletedAt,
      });
    }

    return createdNodes;
  });
}

/**
 * Fetches root-level archived nodes for a brain, limited to 100 entries, ordered by deletedAt DESC.
 * A root archived node is a node that is archived (deletedAt !== null) and whose parent is either null or active (deletedAt === null).
 */
export async function getArchivedNodes(brainId: string) {
  const rootArchivedNodes = await db.node.findMany({
    where: {
      brainId,
      deletedAt: { not: null },
      OR: [
        { parentId: null },
        { parent: { deletedAt: null } }
      ]
    },
    orderBy: {
      deletedAt: 'desc'
    },
    take: 100,
    include: {
      parent: {
        select: {
          title: true
        }
      }
    }
  });

  const allNodes = await db.node.findMany({
    where: { brainId },
    select: { id: true, parentId: true, deletedAt: true }
  });

  const parentToChildren = new Map<string, string[]>();
  for (const n of allNodes) {
    if (n.parentId) {
      const list = parentToChildren.get(n.parentId) || [];
      list.push(n.id);
      parentToChildren.set(n.parentId, list);
    }
  }

  return rootArchivedNodes.map(node => {
    // Count descendant count (only count descendants that are archived)
    let descendantCount = 0;
    const queue = [node.id];
    const visited = new Set<string>([node.id]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = parentToChildren.get(currentId) || [];
      for (const childId of children) {
        if (!visited.has(childId)) {
          visited.add(childId);
          const childNode = allNodes.find(x => x.id === childId);
          if (childNode && childNode.deletedAt !== null) {
            descendantCount++;
            queue.push(childId);
          }
        }
      }
    }

    return {
      id: node.id,
      title: node.title,
      slug: node.slug,
      parentId: node.parentId,
      parentTitle: node.parent?.title || null,
      deletedAt: node.deletedAt,
      updatedBy: node.updatedBy,
      descendantCount
    };
  });
}

/**
 * Atomically restores an archived node tree.
 * Determines the target parent destination (moves to root if original parent is archived or non-existent).
 * Recursively restores descendants whose deletedAt >= archivedAt.
 * Regenerates unique slugs per level.
 * Regenerates position for the root restored node in its target destination level.
 * Creates a version entry in node_versions for the restored root node only.
 */
export async function restoreNodeTree(
  nodeId: string,
  userId: string
): Promise<{ restoredNode: Node; restoredCount: number } | null> {
  const rootNode = await db.node.findUnique({
    where: { id: nodeId }
  });

  if (!rootNode || rootNode.deletedAt === null) {
    return null;
  }

  const archivedAt = rootNode.deletedAt;

  return await db.$transaction(async (tx) => {
    // 1. Determine destination parent
    let targetParentId: string | null = null;
    if (rootNode.parentId) {
      const parentNode = await tx.node.findUnique({
        where: { id: rootNode.parentId }
      });
      if (parentNode && parentNode.deletedAt === null) {
        targetParentId = rootNode.parentId;
      }
    }

    // 2. Fetch all nodes in the brain to build the hierarchy in memory
    const allNodes = await tx.node.findMany({
      where: { brainId: rootNode.brainId }
    });

    // 3. Collect descendants to restore using BFS
    const descendantsToRestore: typeof allNodes = [];
    const queue = [rootNode];
    const visited = new Set<string>([rootNode.id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = allNodes.filter(n => n.parentId === current.id);
      for (const child of children) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          // Only restore if archived and deletedAt >= archivedAt (meaning it was not archived independently before)
          if (child.deletedAt !== null && child.deletedAt.getTime() >= archivedAt.getTime()) {
            descendantsToRestore.push(child);
            queue.push(child);
          }
        }
      }
    }

    // 4. Recalculate slug and position for the root restored node
    const rootSlug = await generateUniqueSlug(tx, rootNode.brainId, targetParentId, rootNode.title);
    
    const lastActiveNode = await tx.node.findFirst({
      where: {
        brainId: rootNode.brainId,
        parentId: targetParentId,
        deletedAt: null,
      },
      orderBy: {
        position: 'desc',
      },
    });
    const rootPosition = lastActiveNode ? lastActiveNode.position + 1 : 0;

    // 5. Restore the root node
    const updatedRoot = await tx.node.update({
      where: { id: rootNode.id },
      data: {
        parentId: targetParentId,
        slug: rootSlug,
        position: rootPosition,
        deletedAt: null,
        updatedBy: userId,
        updatedAt: new Date(),
      }
    });

    // 6. Create a new NodeVersion for the restored root node only
    await tx.nodeVersion.create({
      data: {
        nodeId: rootNode.id,
        title: updatedRoot.title,
        contentMarkdown: updatedRoot.contentMarkdown,
        status: updatedRoot.status,
        savedBy: userId,
        changeNote: "Nodo restaurado desde papelera.",
      }
    });

    // 7. Restore all collected descendants sequentially to update their slugs
    for (const descendant of descendantsToRestore) {
      const newSlug = await generateUniqueSlug(tx, descendant.brainId, descendant.parentId, descendant.title);
      await tx.node.update({
        where: { id: descendant.id },
        data: {
          slug: newSlug,
          deletedAt: null,
          updatedBy: userId,
          updatedAt: new Date(),
        }
      });
    }

    const domainRoot: Node = {
      id: updatedRoot.id,
      brainId: updatedRoot.brainId,
      parentId: updatedRoot.parentId,
      templateId: updatedRoot.templateId,
      title: updatedRoot.title,
      slug: updatedRoot.slug,
      contentMarkdown: updatedRoot.contentMarkdown,
      status: updatedRoot.status,
      description: updatedRoot.description,
      category: updatedRoot.category,
      ownerUserId: updatedRoot.ownerUserId,
      responsibleUserId: updatedRoot.responsibleUserId,
      position: updatedRoot.position,
      lockedBy: updatedRoot.lockedBy,
      lockedAt: updatedRoot.lockedAt,
      createdBy: updatedRoot.createdBy,
      updatedBy: updatedRoot.updatedBy,
      reviewedAt: updatedRoot.reviewedAt,
      nextReviewAt: updatedRoot.nextReviewAt,
      createdAt: updatedRoot.createdAt,
      updatedAt: updatedRoot.updatedAt,
      deletedAt: updatedRoot.deletedAt,
    };

    return {
      restoredNode: domainRoot,
      restoredCount: 1 + descendantsToRestore.length
    };
  });
}








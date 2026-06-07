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



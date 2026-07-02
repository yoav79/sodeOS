import 'server-only';
import { getBrainNodeTree } from '@/services/nodeService';
import {
  AgentToolDefinition,
  MAX_TOOL_TREE_NODES,
  makeSuccessResult,
  makeErrorResult,
} from './types';
import { NodeStatus } from '@prisma/client';

export interface BrainTreeNodeLite {
  id: string;
  parentId: string | null;
  title: string;
  slug: string;
  status: NodeStatus;
  position: number;
  updatedAt: Date;
  children: BrainTreeNodeLite[];
}

export interface GetBrainTreeOutput {
  tree: BrainTreeNodeLite[];
  totalNodes: number;
  truncated: boolean;
}

export const getBrainTree: AgentToolDefinition<void, GetBrainTreeOutput> = {
  name: 'getBrainTree',
  description: 'Obtiene la estructura jerárquica de todos los documentos activos del cerebro actual sin incluir el contenido de texto.',
  execute: async (ctx) => {
    try {
      const fullTree = await getBrainNodeTree(ctx.brainId);

      // Helper to count total nodes in a nested tree
      function countTreeNodes(nodes: import('@/types').NodeTreeItem[]): number {
        let count = 0;
        for (const node of nodes) {
          count += 1 + countTreeNodes(node.children || []);
        }
        return count;
      }

      const totalNodes = countTreeNodes(fullTree);
      const isTruncated = totalNodes > MAX_TOOL_TREE_NODES;

      const allowedIds = new Set<string>();

      if (isTruncated) {
        // BFS traversal to select top 200 nodes hierarchically
        const queue: import('@/types').NodeTreeItem[] = [...fullTree];
        while (queue.length > 0 && allowedIds.size < MAX_TOOL_TREE_NODES) {
          const current = queue.shift();
          if (current) {
            allowedIds.add(current.id);
            if (current.children && current.children.length > 0) {
              queue.push(...current.children);
            }
          }
        }
      }

      // Helper to recursively build clean tree structure
      function buildCleanTree(nodes: import('@/types').NodeTreeItem[]): BrainTreeNodeLite[] {
        const cleanNodes: BrainTreeNodeLite[] = [];

        for (const node of nodes) {
          // If truncated mode, only include if node is in allowedIds
          if (isTruncated && !allowedIds.has(node.id)) {
            continue;
          }

          const cleaned: BrainTreeNodeLite = {
            id: node.id,
            parentId: node.parentId,
            title: node.title,
            slug: node.slug,
            status: node.status,
            position: node.position,
            updatedAt: node.updatedAt,
            children: buildCleanTree(node.children || []),
          };
          cleanNodes.push(cleaned);
        }

        return cleanNodes;
      }

      const cleanTree = buildCleanTree(fullTree);
      const warnings: string[] = [];
      if (isTruncated) {
        warnings.push(
          `La estructura de documentos supera el límite de ${MAX_TOOL_TREE_NODES} nodos y ha sido truncada.`
        );
      }

      return makeSuccessResult(
        'getBrainTree',
        {
          tree: cleanTree,
          totalNodes,
          truncated: isTruncated,
        },
        {
          truncated: isTruncated,
          itemCount: isTruncated ? MAX_TOOL_TREE_NODES : totalNodes,
        },
        warnings
      );
    } catch (error) {
      console.error('[getBrainTree] Error executing tool:', error);
      return makeErrorResult(
        'getBrainTree',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Error interno al obtener el árbol de documentos.'
      );
    }
  },
};

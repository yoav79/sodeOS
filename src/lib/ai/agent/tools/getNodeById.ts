import 'server-only';
import { getNodeDetail } from '@/services/nodeService';
import {
  AgentToolDefinition,
  MAX_TOOL_CONTENT_CHARS,
  truncateText,
  makeSuccessResult,
  makeErrorResult,
} from './types';
import { NodeStatus } from '@prisma/client';

export interface GetNodeByIdInput {
  nodeId: string;
}

export interface GetNodeByIdOutput {
  id: string;
  title: string;
  status: NodeStatus;
  parentId: string | null;
  contentMarkdown: string;
  description: string | null;
  category: string | null;
  tags: string[];
  updatedAt: Date;
  truncated: boolean;
}

export const getNodeById: AgentToolDefinition<GetNodeByIdInput, GetNodeByIdOutput> = {
  name: 'getNodeById',
  description: 'Obtiene el contenido y los metadatos de cualquier documento activo del cerebro especificando su ID.',
  execute: async (ctx, input) => {
    try {
      if (!input || typeof input.nodeId !== 'string' || input.nodeId.trim() === '') {
        return makeErrorResult('getNodeById', 'VALIDATION_ERROR', 'El campo "nodeId" es obligatorio y debe ser un string no vacío.');
      }

      const nodeId = input.nodeId.trim();
      const node = await getNodeDetail(nodeId);

      // CRITICAL SECURITY AUDIT:
      // If the node does not exist, or belongs to a different brain, return NOT_FOUND (404/Not Found).
      // Returning NOT_FOUND instead of FORBIDDEN for nodes in different brains prevents ID enumeration attacks,
      // ensuring that external users/agents cannot verify node existence or extract metadata across brains.
      if (!node || node.brainId !== ctx.brainId) {
        return makeErrorResult(
          'getNodeById',
          'NOT_FOUND',
          'El documento solicitado no existe, está archivado o no pertenece al espacio de trabajo actual.'
        );
      }

      const { text: contentMarkdown, truncated } = truncateText(node.contentMarkdown || '', MAX_TOOL_CONTENT_CHARS);

      const resultData: GetNodeByIdOutput = {
        id: node.id,
        title: node.title,
        status: node.status,
        parentId: node.parentId,
        contentMarkdown,
        description: node.description,
        category: node.category,
        tags: node.tags || [],
        updatedAt: node.updatedAt,
        truncated,
      };

      return makeSuccessResult(
        'getNodeById',
        resultData,
        {
          truncated,
          charCount: contentMarkdown.length,
        }
      );
    } catch (error) {
      console.error('[getNodeById] Error executing tool:', error);
      return makeErrorResult(
        'getNodeById',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Error interno al obtener el documento solicitado.'
      );
    }
  },
};

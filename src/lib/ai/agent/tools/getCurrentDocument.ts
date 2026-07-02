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

export interface GetCurrentDocumentOutput {
  id: string;
  title: string;
  status: NodeStatus;
  contentMarkdown: string;
  description: string | null;
  category: string | null;
  tags: string[];
  updatedAt: Date;
  truncated: boolean;
}

export const getCurrentDocument: AgentToolDefinition<void, GetCurrentDocumentOutput> = {
  name: 'getCurrentDocument',
  description: 'Obtiene el contenido y los metadatos del documento actualmente activo en el editor.',
  execute: async (ctx) => {
    try {
      const node = await getNodeDetail(ctx.nodeId);
      if (!node) {
        return makeErrorResult('getCurrentDocument', 'NOT_FOUND', 'El documento activo no existe o ha sido eliminado.');
      }

      if (node.brainId !== ctx.brainId) {
        return makeErrorResult('getCurrentDocument', 'FORBIDDEN', 'El documento activo no pertenece al espacio de trabajo actual.');
      }

      const { text: contentMarkdown, truncated } = truncateText(node.contentMarkdown || '', MAX_TOOL_CONTENT_CHARS);

      const resultData: GetCurrentDocumentOutput = {
        id: node.id,
        title: node.title,
        status: node.status,
        contentMarkdown,
        description: node.description,
        category: node.category,
        tags: node.tags || [],
        updatedAt: node.updatedAt,
        truncated,
      };

      return makeSuccessResult(
        'getCurrentDocument',
        resultData,
        {
          truncated,
          charCount: contentMarkdown.length,
        }
      );
    } catch (error) {
      console.error('[getCurrentDocument] Error executing tool:', error);
      return makeErrorResult(
        'getCurrentDocument',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Error interno al obtener el documento actual.'
      );
    }
  },
};

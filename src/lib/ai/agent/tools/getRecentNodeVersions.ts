import 'server-only';
import { getNodeDetail, getNodeVersions } from '@/services/nodeService';
import {
  AgentToolDefinition,
  MAX_TOOL_VERSIONS,
  MAX_TOOL_VERSION_CONTENT_CHARS,
  truncateText,
  makeSuccessResult,
  makeErrorResult,
} from './types';
import { NodeStatus } from '@prisma/client';

export interface GetRecentNodeVersionsInput {
  nodeId: string;
  limit?: number;
}

export interface NodeVersionLite {
  id: string;
  title: string;
  contentMarkdown: string;
  status: NodeStatus;
  changeNote: string | null;
  savedByName: string;
  createdAt: Date;
  truncated: boolean;
}

export interface GetRecentNodeVersionsOutput {
  nodeId: string;
  versions: NodeVersionLite[];
  totalReturned: number;
}

export const getRecentNodeVersions: AgentToolDefinition<GetRecentNodeVersionsInput, GetRecentNodeVersionsOutput> = {
  name: 'getRecentNodeVersions',
  description: 'Obtiene el historial de las últimas versiones guardadas de un documento.',
  execute: async (ctx, input) => {
    try {
      if (!input || typeof input.nodeId !== 'string' || input.nodeId.trim() === '') {
        return makeErrorResult(
          'getRecentNodeVersions',
          'VALIDATION_ERROR',
          'El campo "nodeId" es obligatorio y debe ser un string no vacío.'
        );
      }

      const nodeId = input.nodeId.trim();

      // Verify node existence and cross-brain security
      const node = await getNodeDetail(nodeId);
      if (!node || node.brainId !== ctx.brainId) {
        return makeErrorResult(
          'getRecentNodeVersions',
          'NOT_FOUND',
          'El documento solicitado no existe, está archivado o no pertenece al espacio de trabajo actual.'
        );
      }

      let limit = MAX_TOOL_VERSIONS;
      if (input.limit !== undefined) {
        if (typeof input.limit !== 'number' || isNaN(input.limit) || input.limit < 1) {
          return makeErrorResult(
            'getRecentNodeVersions',
            'VALIDATION_ERROR',
            'El parámetro "limit" debe ser un número entero positivo.'
          );
        }
        if (input.limit > MAX_TOOL_VERSIONS) {
          return makeErrorResult(
            'getRecentNodeVersions',
            'LIMIT_EXCEEDED',
            `El límite máximo de versiones a consultar es de ${MAX_TOOL_VERSIONS}.`
          );
        }
        limit = input.limit;
      }

      const rawVersions = await getNodeVersions(nodeId);
      if (!rawVersions) {
        return makeErrorResult(
          'getRecentNodeVersions',
          'NOT_FOUND',
          'No se encontraron versiones para el documento especificado.'
        );
      }

      const slicedVersions = rawVersions.slice(0, limit);
      interface RawNodeVersion {
        id: string;
        title: string;
        contentMarkdown: string;
        status: NodeStatus;
        changeNote: string | null;
        createdAt: Date;
        saver?: {
          name: string | null;
        } | null;
      }

      const versions: NodeVersionLite[] = (slicedVersions as RawNodeVersion[]).map((v) => {
        const { text: contentMarkdown, truncated } = truncateText(v.contentMarkdown || '', MAX_TOOL_VERSION_CONTENT_CHARS);
        return {
          id: v.id,
          title: v.title,
          contentMarkdown,
          status: v.status,
          changeNote: v.changeNote,
          savedByName: v.saver?.name || 'Desconocido',
          createdAt: v.createdAt,
          truncated,
        };
      });

      return makeSuccessResult(
        'getRecentNodeVersions',
        {
          nodeId,
          versions,
          totalReturned: versions.length,
        },
        {
          itemCount: versions.length,
        }
      );
    } catch (error) {
      console.error('[getRecentNodeVersions] Error executing tool:', error);
      return makeErrorResult(
        'getRecentNodeVersions',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Error interno al obtener el historial de versiones.'
      );
    }
  },
};

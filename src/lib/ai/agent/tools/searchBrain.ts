import 'server-only';
import { searchNodesInBrain } from '@/services/nodeService';
import {
  AgentToolDefinition,
  MAX_TOOL_SEARCH_QUERY_LENGTH,
  MAX_TOOL_SEARCH_RESULTS,
  MAX_TOOL_SNIPPET_CHARS,
  truncateText,
  makeSuccessResult,
  makeErrorResult,
} from './types';
import { NodeStatus } from '@prisma/client';

export interface SearchBrainInput {
  query: string;
  limit?: number;
}

export interface SearchBrainOutputItem {
  id: string;
  title: string;
  status: NodeStatus;
  parentId: string | null;
  matchedField: 'title' | 'content';
  snippet: string;
  updatedAt: Date;
}

export interface SearchBrainOutput {
  results: SearchBrainOutputItem[];
  query: string;
  totalReturned: number;
}

export const searchBrain: AgentToolDefinition<SearchBrainInput, SearchBrainOutput> = {
  name: 'searchBrain',
  description: 'Busca documentos activos dentro del cerebro por título o contenido, devolviendo resúmenes cortos.',
  execute: async (ctx, input) => {
    try {
      if (!input || typeof input.query !== 'string') {
        return makeErrorResult('searchBrain', 'VALIDATION_ERROR', 'El campo "query" es requerido y debe ser un string.');
      }

      const query = input.query.trim();

      if (query.length < 2) {
        return makeErrorResult('searchBrain', 'VALIDATION_ERROR', 'La consulta debe tener al menos 2 caracteres.');
      }

      if (query.length > MAX_TOOL_SEARCH_QUERY_LENGTH) {
        return makeErrorResult(
          'searchBrain',
          'VALIDATION_ERROR',
          `La consulta no puede superar los ${MAX_TOOL_SEARCH_QUERY_LENGTH} caracteres.`
        );
      }

      let limit = MAX_TOOL_SEARCH_RESULTS;
      if (input.limit !== undefined) {
        if (typeof input.limit !== 'number' || isNaN(input.limit) || input.limit < 1) {
          return makeErrorResult('searchBrain', 'VALIDATION_ERROR', 'El parámetro "limit" debe ser un número entero positivo.');
        }
        limit = Math.min(input.limit, MAX_TOOL_SEARCH_RESULTS);
      }

      const rawResults = await searchNodesInBrain(ctx.brainId, query, limit);

      const results: SearchBrainOutputItem[] = rawResults.map((item) => {
        const { text: snippet } = truncateText(item.snippet || '', MAX_TOOL_SNIPPET_CHARS);
        return {
          id: item.id,
          title: item.title,
          status: item.status as NodeStatus,
          parentId: item.parentId,
          matchedField: item.matchedField,
          snippet,
          updatedAt: item.updatedAt,
        };
      });

      return makeSuccessResult(
        'searchBrain',
        {
          results,
          query,
          totalReturned: results.length,
        },
        {
          itemCount: results.length,
        }
      );
    } catch (error) {
      console.error('[searchBrain] Error executing tool:', error);
      return makeErrorResult(
        'searchBrain',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Error interno al buscar en el cerebro.'
      );
    }
  },
};

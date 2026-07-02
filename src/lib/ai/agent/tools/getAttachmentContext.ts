import 'server-only';
import {
  AgentToolDefinition,
  makeSuccessResult,
  makeErrorResult,
  truncateText,
} from './types';
import db from '@/lib/db';

export interface GetAttachmentContextInput {
  query?: string;
  maxFiles?: number;
  maxChunksPerFile?: number;
  maxTotalChars?: number;
}

export interface AttachmentContextResult {
  filename: string;
  contentType: string;
  chunkIndex: number;
  excerpt: string;
  truncated: boolean;
}

export interface GetAttachmentContextOutput {
  query: string | null;
  nodeId: string;
  results: AttachmentContextResult[];
  totalFilesFound: number;
  warnings?: string[];
}

export const getAttachmentContext: AgentToolDefinition<GetAttachmentContextInput, GetAttachmentContextOutput> = {
  name: 'getAttachmentContext',
  description: 'Busca fragmentos de texto relevantes en los archivos adjuntos (.txt y .md) procesados en el nodo actual.',
  execute: async (ctx, input) => {
    try {
      // 1. Input parameters validation
      let query: string | null = null;
      if (input && input.query !== undefined) {
        if (typeof input.query !== 'string') {
          return makeErrorResult('getAttachmentContext', 'VALIDATION_ERROR', 'El campo "query" debe ser una cadena de texto.');
        }
        const trimmed = input.query.trim();
        if (trimmed.length > 0) {
          if (trimmed.length < 3) {
            return makeErrorResult('getAttachmentContext', 'VALIDATION_ERROR', 'La consulta de búsqueda debe tener al menos 3 caracteres.');
          }
          if (trimmed.length > 200) {
            return makeErrorResult('getAttachmentContext', 'VALIDATION_ERROR', 'La consulta de búsqueda no puede superar los 200 caracteres.');
          }
          query = trimmed;
        }
      }

      // Resolve limits with safe clamp values
      const maxFiles = Math.min(Math.max(1, input?.maxFiles ?? 3), 5);
      const maxChunksPerFile = Math.min(Math.max(1, input?.maxChunksPerFile ?? 2), 5);
      const maxTotalChars = Math.min(Math.max(100, input?.maxTotalChars ?? 3000), 5000);
      const excerptCharLimit = 500;

      // 2. Fetch attachments with chunks from active node and brain
      const attachments = await db.nodeAttachment.findMany({
        where: {
          nodeId: ctx.nodeId,
          brainId: ctx.brainId,
          extractionStatus: 'done',
        },
        include: {
          chunks: {
            where: query ? {
              content: {
                contains: query,
                mode: 'insensitive',
              },
            } : undefined,
            orderBy: {
              chunkIndex: 'asc',
            },
          },
        },
      });

      // Filter to keep only attachments that have matching chunks
      const validAttachments = attachments.filter((att) => att.chunks.length > 0);
      const totalFilesFound = validAttachments.length;

      if (totalFilesFound === 0) {
        return makeSuccessResult(
          'getAttachmentContext',
          {
            query,
            nodeId: ctx.nodeId,
            results: [],
            totalFilesFound: 0,
          },
          { itemCount: 0 },
          ['No se encontraron archivos de texto procesados o fragmentos que coincidan con la búsqueda en este nodo.']
        );
      }

      const results: AttachmentContextResult[] = [];
      let accumulatedChars = 0;
      let limitReached = false;
      const warnings: string[] = [];

      // Process up to maxFiles
      const slicedAttachments = validAttachments.slice(0, maxFiles);

      for (const att of slicedAttachments) {
        if (limitReached) break;

        // Process up to maxChunksPerFile per attachment
        const slicedChunks = att.chunks.slice(0, maxChunksPerFile);

        for (const chunk of slicedChunks) {
          const { text: excerpt, truncated } = truncateText(chunk.content, excerptCharLimit);

          // Check if adding this chunk exceeds the global character limit
          if (accumulatedChars + excerpt.length > maxTotalChars) {
            limitReached = true;
            warnings.push('Algunos fragmentos de texto fueron omitidos para no exceder el límite de caracteres del contexto.');
            break;
          }

          results.push({
            filename: att.filename,
            contentType: att.contentType,
            chunkIndex: chunk.chunkIndex,
            excerpt,
            truncated,
          });

          accumulatedChars += excerpt.length;
        }
      }

      if (validAttachments.length > maxFiles && !limitReached) {
        warnings.push(`Se encontraron más archivos adjuntos de los permitidos por el límite (${maxFiles}). Se muestran solo los primeros.`);
      }

      return makeSuccessResult(
        'getAttachmentContext',
        {
          query,
          nodeId: ctx.nodeId,
          results,
          totalFilesFound,
        },
        {
          itemCount: results.length,
          charCount: accumulatedChars,
          truncated: limitReached,
        },
        warnings.length > 0 ? warnings : undefined
      );

    } catch (error) {
      console.error('[getAttachmentContext] Error executing tool:', error);
      return makeErrorResult(
        'getAttachmentContext',
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Error inesperado al consultar el contexto de archivos adjuntos.'
      );
    }
  },
};

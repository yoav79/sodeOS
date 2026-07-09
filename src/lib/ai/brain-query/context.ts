import 'server-only';

import db from '@/lib/db';
import type {
  BrainQueryContextItem,
  BrainQueryContextResult,
  BrainQuerySource,
} from './types';

const DEFAULT_MAX_CONTEXT_CHARS = 8000;
const MAX_DOCUMENT_RESULTS = 4;
const MAX_CHUNK_RESULTS = 6;
const DOC_SNIPPET_CHARS = 1600;
const CHUNK_SNIPPET_CHARS = 900;

function normalizeQuery(query: string): string {
  return query.trim().normalize('NFKC');
}

function extractQueryTerms(query: string): string[] {
  const normalized = normalizeQuery(query).toLowerCase();
  if (!normalized) return [];

  const rawTerms = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  return Array.from(new Set(rawTerms)).slice(0, 8);
}

function truncateAtWordBoundary(text: string, maxChars: number): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;

  const softLimit = Math.max(1, Math.floor(maxChars * 0.9));
  const slice = clean.slice(0, softLimit);
  const lastSpace = slice.lastIndexOf(' ');
  const cutIndex = lastSpace > 40 ? lastSpace : maxChars;
  return `${clean.slice(0, cutIndex).trimEnd()}…`;
}

function countTermHits(text: string, terms: string[]): number {
  const haystack = text.toLowerCase();
  return terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
}

function dedupeSources(sources: BrainQuerySource[]): BrainQuerySource[] {
  const seen = new Set<string>();
  const result: BrainQuerySource[] = [];

  for (const source of sources) {
    const key = [
      source.type,
      source.id ?? '',
      source.nodeId ?? '',
      source.attachmentId ?? '',
      source.chunkId ?? '',
      source.chunkIndex ?? '',
      source.filename ?? '',
      source.title ?? '',
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(source);
  }

  return result;
}

function formatDocumentSection(item: BrainQueryContextItem): string {
  const source = item.source;
  const title = source.title || 'Documento sin título';

  return [
    `## Documento: ${title}`,
    source.nodeId ? `Nodo: ${source.nodeId}` : null,
    item.score !== undefined ? `Relevancia: ${item.score.toFixed(2)}` : null,
    '',
    item.text.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}

function formatAttachmentSection(item: BrainQueryContextItem): string {
  const source = item.source;
  const filename = source.filename || source.title || 'Archivo adjunto';
  const chunkLabel = source.chunkIndex !== undefined ? `Chunk ${source.chunkIndex}` : 'Chunk';

  return [
    `## Archivo adjunto: ${filename} (${chunkLabel})`,
    source.attachmentId ? `Attachment ID: ${source.attachmentId}` : null,
    source.nodeId ? `Nodo: ${source.nodeId}` : null,
    item.score !== undefined ? `Relevancia: ${item.score.toFixed(2)}` : null,
    '',
    item.text.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}

function appendSectionsWithinLimit(items: BrainQueryContextItem[], maxContextChars: number): { contextText: string; warnings: string[] } {
  const warnings: string[] = [];
  const sections: string[] = [];
  let usedChars = 0;

  for (const item of items) {
    const section = item.source.type === 'document'
      ? formatDocumentSection(item)
      : formatAttachmentSection(item);

    const separator = sections.length > 0 ? '\n\n' : '';
    const extraChars = separator.length + section.length;

    if (usedChars + extraChars <= maxContextChars) {
      sections.push(section);
      usedChars += extraChars;
      continue;
    }

    const remaining = maxContextChars - usedChars - separator.length;
    if (remaining <= 120) {
      warnings.push('El contexto recuperado fue truncado para respetar el límite de caracteres.');
      break;
    }

    const truncatedSection = truncateAtWordBoundary(section, remaining);
    sections.push(truncatedSection);
    usedChars = maxContextChars;
    warnings.push('El contexto recuperado fue truncado para respetar el límite de caracteres.');
    break;
  }

  return {
    contextText: sections.join('\n\n'),
    warnings,
  };
}

export async function getBrainQueryContext(params: {
  brainId: string;
  query: string;
  maxContextChars?: number;
}): Promise<BrainQueryContextResult> {
  const brainId = params.brainId.trim();
  const query = normalizeQuery(params.query);
  const maxContextChars = Math.min(Math.max(params.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS, 500), 20000);
  const terms = extractQueryTerms(query);

  if (!brainId) {
    return {
      items: [],
      contextText: '',
      sources: [],
      warnings: ['No se pudo recuperar contexto porque el brainId es inválido.'],
    };
  }

  if (!terms.length) {
    return {
      items: [],
      contextText: '',
      sources: [],
      warnings: ['No se encontró contexto relevante para la consulta proporcionada.'],
    };
  }

  const documentWhere = {
    brainId,
    deletedAt: null,
    status: {
      not: 'archived' as const,
    },
    OR: [
      ...terms.map((term) => ({ title: { contains: term, mode: 'insensitive' as const } })),
      ...terms.map((term) => ({ description: { contains: term, mode: 'insensitive' as const } })),
      ...terms.map((term) => ({ contentMarkdown: { contains: term, mode: 'insensitive' as const } })),
      { title: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
      { contentMarkdown: { contains: query, mode: 'insensitive' as const } },
    ],
  };

  const attachmentWhere = {
    brainId,
    attachment: {
      extractionStatus: 'done' as const,
    },
    OR: [
      ...terms.map((term) => ({ content: { contains: term, mode: 'insensitive' as const } })),
      { content: { contains: query, mode: 'insensitive' as const } },
    ],
  };

  const [documents, chunks] = await Promise.all([
    db.node.findMany({
      where: documentWhere,
      take: 12,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        contentMarkdown: true,
        updatedAt: true,
      },
    }),
    db.nodeAttachmentChunk.findMany({
      where: attachmentWhere,
      take: 18,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        attachmentId: true,
        nodeId: true,
        brainId: true,
        chunkIndex: true,
        content: true,
        attachment: {
          select: {
            filename: true,
            extractionStatus: true,
          },
        },
        node: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  const documentItems = documents
    .map<BrainQueryContextItem>((doc) => {
      const combinedText = [
        doc.title,
        doc.description ?? '',
        doc.contentMarkdown,
      ]
        .filter(Boolean)
        .join('\n\n');

      const score = countTermHits(doc.title, terms) * 3
        + countTermHits(doc.description ?? '', terms) * 2
        + countTermHits(doc.contentMarkdown, terms);

      return {
        source: {
          type: 'document',
          id: doc.id,
          title: doc.title,
          nodeId: doc.id,
        },
        text: truncateAtWordBoundary(combinedText, DOC_SNIPPET_CHARS),
        score,
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MAX_DOCUMENT_RESULTS);

  const attachmentItems = chunks
    .filter((chunk) => chunk.attachment.extractionStatus === 'done')
    .map<BrainQueryContextItem>((chunk) => {
      const combinedText = [
        chunk.node.title,
        chunk.attachment.filename,
        chunk.content,
      ]
        .filter(Boolean)
        .join('\n\n');

      const score = countTermHits(chunk.content, terms) * 2
        + countTermHits(chunk.attachment.filename, terms)
        + countTermHits(chunk.node.title, terms);

      return {
        source: {
          type: 'attachment_text',
          id: chunk.id,
          title: chunk.node.title,
          nodeId: chunk.nodeId,
          attachmentId: chunk.attachmentId,
          filename: chunk.attachment.filename,
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
        },
        text: truncateAtWordBoundary(combinedText, CHUNK_SNIPPET_CHARS),
        score,
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, MAX_CHUNK_RESULTS);

  const items = [...documentItems, ...attachmentItems];
  const dedupedSources = dedupeSources(items.map((item) => item.source));

  if (items.length === 0) {
    return {
      items: [],
      contextText: '',
      sources: [],
      warnings: ['No se encontró contexto relevante en documentos ni archivos adjuntos para esta consulta.'],
    };
  }

  const { contextText, warnings } = appendSectionsWithinLimit(items, maxContextChars);

  return {
    items,
    contextText,
    sources: dedupedSources,
    warnings,
  };
}

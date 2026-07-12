import 'server-only';
import db from '@/lib/db';
import type {
  BrainQueryContextItem,
  BrainQueryContextResult,
  BrainQuerySource,
} from './types';
import {
  extractQueryTerms,
  countTermHits,
  truncateAtWordBoundary,
  appendSectionsWithinLimit,
  extractMentionedDocumentName,
  normalizeStringForComparison,
  extractSectionContent,
  DOC_SNIPPET_CHARS,
  CHUNK_SNIPPET_CHARS
} from './context_helpers';
import { dedupeSources } from './sources';
import type { ResolvedDocumentTarget, ResolvedQueryScope } from './scope';

const MAX_DOCUMENT_RESULTS = 4;
const MAX_CHUNK_RESULTS = 6;

function asksForCharacterCount(query: string): boolean {
  return /(letras|letra|caracteres|carácter|caracter|character count)/i.test(query);
}

interface RetrieveNormalOptions {
  document?: ResolvedDocumentTarget;
  warnings?: string[];
}

function emptyContext(warnings: string[] = []): BrainQueryContextResult {
  return {
    items: [],
    contextText: '',
    sources: [],
    warnings,
  };
}


function extractMarkdownHeadings(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^#{1,6}\s+\S/.test(line))
    .map((line) => line.replace(/^#{1,6}\s+/, '').trim())
    .filter(Boolean);
}

function lineLooksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+\S/.test(trimmed)) return true;
  if (/^(\d+\.|\d+\.\d+|[IVXLCDM]+\.)\s+\S/i.test(trimmed)) return true;
  return trimmed.length <= 90 && /^(cap[ií]tulo|secci[oó]n|apartado|referencias|bibliograf[ií]a|fuentes|enlaces|links)\b/i.test(trimmed);
}

function extractLikelyHeadings(content: string): string[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(lineLooksLikeHeading)
    .slice(0, 30);
}

function extractNamedSection(content: string, sectionName: string): { sectionText: string; sectionName: string } | null {
  const normalizedSection = normalizeStringForComparison(sectionName);
  if (!normalizedSection) return null;

  const lines = content.split('\n');
  let sectionStartIndex = -1;
  let detectedName = sectionName;

  for (let i = 0; i < lines.length; i++) {
    const cleanLine = lines[i].replace(/^[#*_\-\s]+/, '').trim();
    const normalizedLine = normalizeStringForComparison(cleanLine);
    if (!normalizedLine) continue;

    if (normalizedLine === normalizedSection || normalizedLine.includes(normalizedSection)) {
      sectionStartIndex = i;
      detectedName = cleanLine || sectionName;
      break;
    }
  }

  if (sectionStartIndex === -1) return null;

  const sectionLines: string[] = [lines[sectionStartIndex]];
  for (let i = sectionStartIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || /^(\d+\.|\d+\.\d+|[IVXLCDM]+\.)\s+\S/i.test(trimmed)) {
      break;
    }
    sectionLines.push(line);
  }

  return {
    sectionText: sectionLines.join('\n').trim(),
    sectionName: detectedName,
  };
}

export async function retrieveStructuralContext(
  brainId: string,
  maxContextChars: number
): Promise<BrainQueryContextResult | null> {
  try {
    const allNodes = await db.node.findMany({
      where: {
        brainId,
        deletedAt: null,
        status: {
          not: 'archived',
        },
      },
      orderBy: [
        { parentId: 'asc' },
        { position: 'asc' },
        { title: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        parentId: true,
        status: true,
        description: true,
      },
    });

    const nodeMap = new Map<string, typeof allNodes[0]>();
    for (const n of allNodes) {
      nodeMap.set(n.id, n);
    }

    const getDepth = (nodeId: string): number => {
      let depth = 0;
      let currentId = nodeId;
      const visited = new Set<string>();
      while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        const parent = nodeMap.get(currentId)?.parentId;
        if (parent) {
          depth++;
          currentId = parent;
        } else {
          break;
        }
      }
      return depth;
    };

    let maxDepth = 0;
    for (const n of allNodes) {
      const d = getDepth(n.id);
      if (d > maxDepth) {
        maxDepth = d;
      }
    }

    const totalNodes = allNodes.length;
    const rootNodes = allNodes.filter((n) => !n.parentId).length;
    const subNodes = allNodes.filter((n) => n.parentId).length;

    const summaryText = [
      'Resumen estructural del cerebro:',
      `- Total de documentos/nodos activos: ${totalNodes}`,
      `- Nodos raíz (principales): ${rootNodes}`,
      `- Subnodos (secundarios/hijos): ${subNodes}`,
      `- Profundidad máxima de la jerarquía: ${maxDepth + 1} niveles`,
    ].join('\n');

    const childrenMap = new Map<string | null, typeof allNodes>();
    for (const n of allNodes) {
      const parent = n.parentId;
      if (!childrenMap.has(parent)) {
        childrenMap.set(parent, []);
      }
      childrenMap.get(parent)!.push(n);
    }

    const roots = childrenMap.get(null) || [];
    const lines: string[] = [];

    const renderTree = (nodeId: string, indent: string) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      lines.push(`${indent}- ${node.title} (ID: ${node.id}, Estado: ${node.status})`);

      const children = childrenMap.get(nodeId) || [];
      for (const child of children) {
        renderTree(child.id, indent + '  ');
      }
    };

    for (const r of roots) {
      renderTree(r.id, '');
    }

    const fullTreeText = lines.join('\n');
    const maxTreeChars = maxContextChars - summaryText.length - 200;
    let treeText = fullTreeText;
    const warnings: string[] = [];

    if (treeText.length > maxTreeChars) {
      treeText = treeText.substring(0, maxTreeChars) + '\n... [Lista de nodos truncada debido al límite de caracteres]';
      warnings.push('La lista detallada del inventario de nodos fue truncada para respetar el límite de caracteres, pero los conteos globales son exactos.');
    }

    const contextText = `${summaryText}\n\nInventario detallado de nodos y jerarquía:\n${treeText}`;

    const renderedNodes = allNodes.filter((n) => treeText.includes(n.id));
    const items: BrainQueryContextItem[] = renderedNodes.map((n) => ({
      source: {
        type: 'document',
        id: n.id,
        title: n.title,
        nodeId: n.id,
      },
      text: `Documento: ${n.title} (ID: ${n.id}, parentId: ${n.parentId || 'Ninguno'}, status: ${n.status}, descripción: ${n.description || 'Ninguna'})`,
      score: 1.0,
    }));

    const sources = dedupeSources(items.map((item) => item.source));

    return {
      items,
      contextText,
      sources,
      warnings,
    };
  } catch (err: unknown) {
    console.error('Error fetching structural context:', err);
    return null;
  }
}

export async function retrieveSpecificDocumentContext(
  brainId: string,
  query: string,
  maxContextChars: number
): Promise<BrainQueryContextResult | null> {
  const candidateName = extractMentionedDocumentName(query);
  if (!candidateName) return null;

  try {
    const normalizedCandidate = normalizeStringForComparison(candidateName);
    const allNodes = await db.node.findMany({
      where: {
        brainId,
        deletedAt: null,
        status: {
          not: 'archived',
        },
      },
      select: {
        id: true,
        title: true,
        contentMarkdown: true,
        description: true,
        status: true,
      },
    });

    let bestNode = allNodes.find((n) => normalizeStringForComparison(n.title) === normalizedCandidate);

    if (!bestNode) {
      bestNode = allNodes.find((n) => {
        const normTitle = normalizeStringForComparison(n.title);
        return normTitle.includes(normalizedCandidate) || normalizedCandidate.includes(normTitle);
      });
    }

    if (!bestNode) {
      return {
        items: [],
        contextText: '',
        sources: [],
        warnings: [`Se mencionó el documento "${candidateName}" pero no se encontró ninguna coincidencia exacta en el cerebro.`],
      };
    }

    const sectionInfo = extractSectionContent(bestNode.contentMarkdown, query);
    const warnings: string[] = [];

    let contextText = '';
    if (sectionInfo) {
      contextText = [
        `Documento solicitado: ${bestNode.title} (ID: ${bestNode.id})`,
        `Sección encontrada: ${sectionInfo.sectionName}`,
        '',
        'Contenido de la sección:',
        '=========================================',
        sectionInfo.sectionText,
        '=========================================',
      ].join('\n');

      const docHeader = `\n\nContenido completo del documento:\n=========================================\n`;
      const availableChars = maxContextChars - contextText.length - docHeader.length - 100;
      if (availableChars > 200) {
        contextText += docHeader + truncateAtWordBoundary(bestNode.contentMarkdown, availableChars) + '\n=========================================\n';
      }
    } else {
      const sectionKeywords = ['fuentes', 'referencias', 'bibliografía', 'bibliografia', 'links', 'enlaces'];
      const queryMentionsSection = sectionKeywords.some((k) => query.toLowerCase().includes(k));

      if (queryMentionsSection) {
        warnings.push(`Se detectó una consulta sobre una sección específica del documento "${bestNode.title}", pero no se encontró un encabezado o sección con ese nombre en el contenido.`);
      }

      contextText = [
        `Documento solicitado: ${bestNode.title} (ID: ${bestNode.id})`,
        '',
        'Contenido del documento:',
        '=========================================',
        truncateAtWordBoundary(bestNode.contentMarkdown, maxContextChars - 200),
        '=========================================',
      ].join('\n');
    }

    const items: BrainQueryContextItem[] = [
      {
        source: {
          type: 'document',
          id: bestNode.id,
          title: bestNode.title,
          nodeId: bestNode.id,
        },
        text: bestNode.contentMarkdown,
        score: 1.0,
      },
    ];

    const sources: BrainQuerySource[] = [
      {
        type: 'document',
        id: bestNode.id,
        title: bestNode.title,
        nodeId: bestNode.id,
      },
    ];

    return {
      items,
      contextText,
      sources,
      warnings,
    };
  } catch (err: unknown) {
    console.error('Error fetching specific document context:', err);
    return null;
  }
}

export async function retrieveNormalRagContext(
  brainId: string,
  query: string,
  maxContextChars: number,
  options: RetrieveNormalOptions = {}
): Promise<BrainQueryContextResult> {
  const terms = extractQueryTerms(query);

  if (!terms.length) {
    return {
      items: [],
      contextText: '',
      sources: [],
      warnings: ['No se encontró contexto relevante para la consulta proporcionada.', ...(options.warnings ?? [])],
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

  if (options.document?.kind === 'node' && options.document.nodeId) {
    Object.assign(documentWhere, { id: options.document.nodeId });
  } else if (options.document?.kind === 'attachment') {
    Object.assign(documentWhere, { id: '__no_node_document__' });
  }

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

  if (options.document?.kind === 'attachment' && options.document.attachmentId) {
    Object.assign(attachmentWhere, { attachmentId: options.document.attachmentId });
  } else if (options.document?.kind === 'node' && options.document.nodeId) {
    Object.assign(attachmentWhere, { nodeId: options.document.nodeId });
  }

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
          title: chunk.attachment.filename,
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
      warnings: ['No se encontró contexto relevante en documentos ni archivos adjuntos para esta consulta.', ...(options.warnings ?? [])],
    };
  }

  const { contextText, warnings } = appendSectionsWithinLimit(items, maxContextChars);

  return {
    items,
    contextText,
    sources: dedupedSources,
    warnings: [...warnings, ...(options.warnings ?? [])],
  };
}

export async function retrieveMetadataLikeContext(
  brainId: string,
  query: string,
  scope: ResolvedQueryScope
): Promise<BrainQueryContextResult> {
  const warnings: string[] = [];
  if (!scope.document) {
    return emptyContext(['La consulta pide metadata documental, pero no se detectó un documento específico.']);
  }

  if (scope.document.kind === 'node' && scope.document.nodeId) {
    const node = await db.node.findFirst({
      where: {
        id: scope.document.nodeId,
        brainId,
        deletedAt: null,
        status: { not: 'archived' },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!node) return emptyContext(['No se encontró el documento solicitado para recuperar metadata disponible.']);

    const q = query.toLowerCase();
    if (/(autor|author|creador|creator)/.test(q)) {
      warnings.push('El autor de los documentos no se persiste en esta fase del sistema; no se inventarán valores.');
    }
    if (/(idioma|lenguaje|language)/.test(q)) {
      warnings.push('El idioma de los documentos no se persiste en esta fase del sistema; no se inventarán valores.');
    }
    if (/(pág|pag|page)/.test(q)) {
      warnings.push('El número de páginas no está disponible para documentos internos.');
    }
    if (/(palabra|word)/.test(q)) {
      warnings.push('El conteo de palabras no está disponible para documentos internos.');
    }
    if (asksForCharacterCount(query)) {
      warnings.push('El conteo de letras/caracteres no está disponible para documentos internos.');
    }

    const text = [
      `Metadata disponible del documento/nodo: ${node.title}`,
      `- Título: ${node.title}`,
      node.description ? `- Descripción: ${node.description}` : null,
      `- Estado: ${node.status}`,
      `- Creado en sodeOS: ${node.createdAt.toISOString()}`,
      `- Actualizado en sodeOS: ${node.updatedAt.toISOString()}`,
    ].filter(Boolean).join('\n');

    const item: BrainQueryContextItem = {
      source: { type: 'document', id: node.id, title: node.title, nodeId: node.id },
      text,
      score: 1,
    };

    return { items: [item], contextText: text, sources: [item.source], warnings };
  }

  if (scope.document.kind === 'attachment' && scope.document.attachmentId) {
    const attachment = await db.nodeAttachment.findFirst({
      where: { id: scope.document.attachmentId, brainId },
      include: {
        node: { select: { title: true } },
      },
    });

    if (!attachment) return emptyContext(['No se encontró el archivo solicitado para recuperar metadata disponible.']);

    const q = query.toLowerCase();
    if (/(autor|author|creador|creator)/.test(q)) {
      warnings.push('El autor del archivo no se persiste en esta fase del sistema; no se inventarán valores.');
    }
    if (/(idioma|lenguaje|language)/.test(q)) {
      warnings.push('El idioma del archivo no se persiste en esta fase del sistema; no se inventarán valores.');
    }
    if (/(pág|pag|page)/.test(q)) {
      if (attachment.pageCount === null) {
        warnings.push('El número de páginas no está disponible para este archivo o aún no fue procesado con metadata de páginas.');
      }
    }
    if (/(palabra|word)/.test(q)) {
      if (attachment.wordCount === null) {
        warnings.push('El conteo de palabras no está disponible para este archivo o aún no fue procesado.');
      }
    }
    if (asksForCharacterCount(query) && attachment.characterCount === null) {
      warnings.push('El conteo de letras/caracteres no está disponible para este archivo o aún no fue procesado.');
    }

    const text = [
      `Metadata disponible del archivo: ${attachment.filename}`,
      `- Filename: ${attachment.filename}`,
      `- Content-Type: ${attachment.contentType}`,
      `- Tamaño en bytes: ${attachment.size}`,
      `- Fecha de subida en sodeOS: ${attachment.createdAt.toISOString()}`,
      `- Estado de extracción: ${attachment.extractionStatus}`,
      attachment.extractionError ? `- Error de extracción: ${attachment.extractionError}` : null,
      attachment.processedAt ? `- Procesado en sodeOS: ${attachment.processedAt.toISOString()}` : '- Fecha de procesamiento: no hay fecha de procesamiento registrada',
      attachment.pageCount !== null ? `- Número de páginas: ${attachment.pageCount}` : null,
      attachment.wordCount !== null ? `- Cantidad de palabras: ${attachment.wordCount}` : null,
      attachment.characterCount !== null ? `- Cantidad de caracteres/letras extraídas: ${attachment.characterCount}` : null,
      `- Nodo origen: ${attachment.node.title}`,
    ].filter(Boolean).join('\n');

    const item: BrainQueryContextItem = {
      source: {
        type: 'attachment_text',
        id: attachment.id,
        title: attachment.filename,
        nodeId: attachment.nodeId,
        attachmentId: attachment.id,
        filename: attachment.filename,
      },
      text,
      score: 1,
    };

    return { items: [item], contextText: text, sources: [item.source], warnings };
  }

  return emptyContext(['No se pudo resolver la metadata disponible para el documento solicitado.']);
}

export async function retrieveOutlineLikeContext(
  brainId: string,
  scope: ResolvedQueryScope,
  maxContextChars: number
): Promise<BrainQueryContextResult> {
  if (!scope.document) {
    return emptyContext(['La consulta solicita un índice/outline, pero no se detectó un documento específico.']);
  }

  if (scope.document.kind === 'node' && scope.document.nodeId) {
    const node = await db.node.findFirst({
      where: { id: scope.document.nodeId, brainId, deletedAt: null, status: { not: 'archived' } },
      select: { id: true, title: true, contentMarkdown: true },
    });
    if (!node) return emptyContext(['No se encontró el documento solicitado para extraer su índice.']);

    const headings = extractMarkdownHeadings(node.contentMarkdown);
    if (headings.length === 0) return emptyContext([`No se encontraron encabezados Markdown en el documento "${node.title}"; no se inventará un índice.`]);

    const text = [`Índice detectado del documento: ${node.title}`, ...headings.map((h, idx) => `${idx + 1}. ${h}`)].join('\n');
    const item: BrainQueryContextItem = { source: { type: 'document', id: node.id, title: node.title, nodeId: node.id }, text, score: 1 };
    const { contextText, warnings } = appendSectionsWithinLimit([item], maxContextChars);
    return { items: [item], contextText, sources: [item.source], warnings };
  }

  if (scope.document.kind === 'attachment' && scope.document.attachmentId) {
    const chunks = await db.nodeAttachmentChunk.findMany({
      where: { brainId, attachmentId: scope.document.attachmentId, attachment: { extractionStatus: 'done' } },
      orderBy: { chunkIndex: 'asc' },
      take: 40,
      select: {
        id: true,
        attachmentId: true,
        nodeId: true,
        chunkIndex: true,
        content: true,
        attachment: { select: { filename: true } },
        node: { select: { title: true } },
      },
    });

    const headings = chunks.flatMap((chunk) => extractLikelyHeadings(chunk.content).map((heading) => ({ heading, chunk })));
    if (headings.length === 0) return emptyContext(['No hay estructura/índice persistido para este archivo y no se detectaron encabezados claros en sus chunks.']);

    const text = [`Índice aproximado detectado en archivo: ${headings[0].chunk.attachment.filename}`, ...headings.slice(0, 30).map((h, idx) => `${idx + 1}. ${h.heading}`)].join('\n');
    const sourceChunk = headings[0].chunk;
    const item: BrainQueryContextItem = {
      source: {
        type: 'attachment_text',
        id: sourceChunk.id,
        title: sourceChunk.node.title,
        nodeId: sourceChunk.nodeId,
        attachmentId: sourceChunk.attachmentId,
        filename: sourceChunk.attachment.filename,
        chunkId: sourceChunk.id,
        chunkIndex: sourceChunk.chunkIndex,
      },
      text,
      score: 1,
    };
    const { contextText, warnings } = appendSectionsWithinLimit([item], maxContextChars);
    warnings.push('El índice de archivos adjuntos es aproximado porque no existe metadata estructural persistida todavía.');
    return { items: [item], contextText, sources: [item.source], warnings };
  }

  return emptyContext(['No se pudo recuperar un índice para el documento solicitado.']);
}

export async function retrieveSourceSectionContext(
  brainId: string,
  query: string,
  scope: ResolvedQueryScope,
  maxContextChars: number
): Promise<BrainQueryContextResult> {
  const sourceTerms = ['fuentes consultadas', 'referencias', 'bibliografía', 'bibliografia', 'links', 'enlaces', 'fuentes'];
  const items: BrainQueryContextItem[] = [];

  if (!scope.document || scope.document.kind === 'node') {
    const nodes = await db.node.findMany({
      where: {
        brainId,
        deletedAt: null,
        status: { not: 'archived' },
        ...(scope.document?.kind === 'node' && scope.document.nodeId ? { id: scope.document.nodeId } : {}),
      },
      select: { id: true, title: true, contentMarkdown: true },
      take: scope.document ? 1 : 12,
    });

    for (const node of nodes) {
      const section = extractSectionContent(node.contentMarkdown, query)
        ?? sourceTerms.map((term) => extractNamedSection(node.contentMarkdown, term)).find(Boolean);
      if (!section) continue;
      items.push({
        source: { type: 'document', id: node.id, title: node.title, nodeId: node.id },
        text: [`Documento: ${node.title}`, `Sección encontrada: ${section.sectionName}`, '', section.sectionText].join('\n'),
        score: 2,
      });
    }
  }

  if (!scope.document || scope.document.kind === 'attachment') {
    const chunks = await db.nodeAttachmentChunk.findMany({
      where: {
        brainId,
        attachment: { extractionStatus: 'done' },
        ...(scope.document?.kind === 'attachment' && scope.document.attachmentId ? { attachmentId: scope.document.attachmentId } : {}),
        OR: sourceTerms.map((term) => ({ content: { contains: term, mode: 'insensitive' as const } })),
      },
      orderBy: { createdAt: 'desc' },
      take: scope.document ? 12 : 18,
      select: {
        id: true,
        attachmentId: true,
        nodeId: true,
        chunkIndex: true,
        content: true,
        attachment: { select: { filename: true } },
        node: { select: { title: true } },
      },
    });

    const neighborKeys = chunks.flatMap((chunk) => [chunk.chunkIndex - 1, chunk.chunkIndex + 1].filter((idx) => idx >= 0).map((idx) => ({ attachmentId: chunk.attachmentId, chunkIndex: idx })));
    const neighbors = neighborKeys.length > 0 ? await db.nodeAttachmentChunk.findMany({
      where: {
        brainId,
        OR: neighborKeys.map((key) => ({ attachmentId: key.attachmentId, chunkIndex: key.chunkIndex })),
      },
      select: {
        id: true,
        attachmentId: true,
        nodeId: true,
        chunkIndex: true,
        content: true,
        attachment: { select: { filename: true } },
        node: { select: { title: true } },
      },
    }) : [];

    const chunkMap = new Map([...chunks, ...neighbors].map((chunk) => [`${chunk.attachmentId}:${chunk.chunkIndex}`, chunk]));
    for (const chunk of chunks) {
      const ordered = [chunk.chunkIndex - 1, chunk.chunkIndex, chunk.chunkIndex + 1]
        .map((idx) => chunkMap.get(`${chunk.attachmentId}:${idx}`))
        .filter(Boolean);
      const text = ordered.map((c) => `Chunk ${c!.chunkIndex}:\n${c!.content}`).join('\n\n');
      items.push({
        source: {
          type: 'attachment_text',
          id: chunk.id,
          title: chunk.attachment.filename,
          nodeId: chunk.nodeId,
          attachmentId: chunk.attachmentId,
          filename: chunk.attachment.filename,
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
        },
        text,
        score: 2,
      });
    }
  }

  if (items.length === 0) {
    return emptyContext(['No se encontró una sección de fuentes/referencias explícita; se usará búsqueda normal como fallback.']);
  }

  const { contextText, warnings } = appendSectionsWithinLimit(items, maxContextChars);
  return { items, contextText, sources: dedupeSources(items.map((item) => item.source)), warnings };
}

export async function retrieveSectionContext(
  brainId: string,
  query: string,
  scope: ResolvedQueryScope,
  maxContextChars: number
): Promise<BrainQueryContextResult> {
  const sectionName = scope.sectionName;
  if (!sectionName) return emptyContext(['La consulta parece pedir una sección, pero no se detectó el nombre de sección.']);

  if (!scope.document) {
    return emptyContext([`Se solicitó la sección "${sectionName}" pero no se detectó un documento específico.`]);
  }

  if (scope.document.kind === 'node' && scope.document.nodeId) {
    const node = await db.node.findFirst({
      where: { id: scope.document.nodeId, brainId, deletedAt: null, status: { not: 'archived' } },
      select: { id: true, title: true, contentMarkdown: true },
    });
    if (!node) return emptyContext(['No se encontró el documento solicitado para recuperar la sección.']);
    const section = extractNamedSection(node.contentMarkdown, sectionName) ?? extractSectionContent(node.contentMarkdown, query);
    if (!section) return emptyContext([`No se encontró la sección "${sectionName}" en el documento "${node.title}".`]);
    const text = [`Documento: ${node.title}`, `Sección encontrada: ${section.sectionName}`, '', section.sectionText].join('\n');
    const item: BrainQueryContextItem = { source: { type: 'document', id: node.id, title: node.title, nodeId: node.id }, text, score: 1 };
    return { items: [item], contextText: text, sources: [item.source], warnings: [] };
  }

  if (scope.document.kind === 'attachment' && scope.document.attachmentId) {
    const chunks = await db.nodeAttachmentChunk.findMany({
      where: {
        brainId,
        attachmentId: scope.document.attachmentId,
        attachment: { extractionStatus: 'done' },
        content: { contains: sectionName, mode: 'insensitive' },
      },
      orderBy: { chunkIndex: 'asc' },
      take: 8,
      select: {
        id: true,
        attachmentId: true,
        nodeId: true,
        chunkIndex: true,
        content: true,
        attachment: { select: { filename: true } },
        node: { select: { title: true } },
      },
    });
    if (chunks.length === 0) return emptyContext([`No se encontró la sección "${sectionName}" en los chunks del archivo solicitado.`]);
    const items = chunks.map<BrainQueryContextItem>((chunk) => ({
      source: {
        type: 'attachment_text',
        id: chunk.id,
        title: chunk.attachment.filename,
        nodeId: chunk.nodeId,
        attachmentId: chunk.attachmentId,
        filename: chunk.attachment.filename,
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
      },
      text: chunk.content,
      score: 1,
    }));
    const { contextText, warnings } = appendSectionsWithinLimit(items, maxContextChars);
    warnings.push('La recuperación de secciones en archivos adjuntos usa chunks textuales porque no existe estructura persistida todavía.');
    return { items, contextText, sources: dedupeSources(items.map((item) => item.source)), warnings };
  }

  return emptyContext(['No se pudo recuperar la sección solicitada.']);
}

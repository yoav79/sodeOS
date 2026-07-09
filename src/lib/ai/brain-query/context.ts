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

function isStructuralQuery(query: string): boolean {
  const q = query.toLowerCase();
  
  // Terms asking for quantity or counts
  const countTerms = [
    'cuántos',
    'cuantos',
    'cuántas',
    'cuantas',
    'cantidad',
    'total',
    'conteo',
    'número',
    'numero',
    'inventario',
    'resumen estructural',
  ];
  
  // Terms representing structure
  const structureTerms = [
    'documentos',
    'nodos',
    'subnodos',
    'ramas',
    'estructura',
    'árbol',
    'arbol',
    'jerarquía',
    'jerarquia',
    'componen este cerebro',
    'componen el cerebro',
  ];
  
  const hasCount = countTerms.some((term) => q.includes(term));
  const hasStructure = structureTerms.some((term) => q.includes(term));
  
  if (hasCount && hasStructure) {
    return true;
  }
  
  const explicitStructure = [
    'estructura del cerebro',
    'jerarquía del cerebro',
    'arbol de nodos',
    'árbol de nodos',
    'componen este cerebro',
    'componen el cerebro',
  ];
  
  if (explicitStructure.some((term) => q.includes(term))) {
    return true;
  }
  
  return false;
}

function extractMentionedDocumentName(query: string): string | null {
  const q = query.toLowerCase();
  const regex = /(?:en\s+el\s+|del\s+|de\s+)?(?:documento|docuemnto|doc)\s+(?:de\s+|del\s+)?([a-z0-9\s_-]+)/i;
  const match = q.match(regex);
  if (match && match[1]) {
    const candidate = match[1].trim();
    if (candidate.length >= 2) {
      return candidate;
    }
  }
  return null;
}

function normalizeStringForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extractSectionContent(content: string, query: string): { sectionText: string; sectionName: string } | null {
  const q = query.toLowerCase();
  
  const sectionKeywords = [
    { name: 'Fuentes consultadas', keys: ['fuentes consultadas', 'fuentes'] },
    { name: 'Referencias', keys: ['referencias'] },
    { name: 'Bibliografía', keys: ['bibliografia', 'bibliografía'] },
    { name: 'Enlaces/Links', keys: ['links', 'enlaces'] },
  ];
  
  const matchedSection = sectionKeywords.find((sec) => sec.keys.some((k) => q.includes(k)));
  if (!matchedSection) return null;
  
  const lines = content.split('\n');
  let sectionStartIndex = -1;
  let detectedName = matchedSection.name;
  
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase();
    const isSectionHeader = matchedSection.keys.some((k) => {
      const cleanLine = lineLower.replace(/[#*_\-]/g, '').trim();
      return cleanLine === k || cleanLine.startsWith(k);
    });
    
    if (isSectionHeader) {
      sectionStartIndex = i;
      detectedName = lines[i].replace(/[#*_\-]/g, '').trim() || matchedSection.name;
      break;
    }
  }
  
  if (sectionStartIndex !== -1) {
    const sectionLines: string[] = [];
    sectionLines.push(lines[sectionStartIndex]);
    
    for (let i = sectionStartIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const lineTrimmed = line.trim();
      if (lineTrimmed.startsWith('#')) {
        break;
      }
      sectionLines.push(line);
    }
    
    return {
      sectionText: sectionLines.join('\n'),
      sectionName: detectedName,
    };
  }
  
  return null;
}

export async function getBrainQueryContext(params: {
  brainId: string;
  query: string;
  maxContextChars?: number;
}): Promise<BrainQueryContextResult> {
  const brainId = params.brainId.trim();
  const query = normalizeQuery(params.query);
  const maxContextChars = Math.min(Math.max(params.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS, 500), 20000);

  if (!brainId) {
    return {
      items: [],
      contextText: '',
      sources: [],
      warnings: ['No se pudo recuperar contexto porque el brainId es inválido.'],
    };
  }

  // Check if query is structural/inventory based
  if (isStructuralQuery(query)) {
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

      // Helper to calculate depth of a node
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
      // fallback to normal query flow if DB call fails
    }
  }

  // Check if query mentions a specific document
  const candidateName = extractMentionedDocumentName(query);
  let bestNode: {
    id: string;
    title: string;
    contentMarkdown: string;
    description: string | null;
    status: import('@prisma/client').NodeStatus;
  } | undefined = undefined;
  let specificDocWarning: string | null = null;

  if (candidateName) {
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

      bestNode = allNodes.find((n) => normalizeStringForComparison(n.title) === normalizedCandidate);

      if (!bestNode) {
        bestNode = allNodes.find((n) => {
          const normTitle = normalizeStringForComparison(n.title);
          return normTitle.includes(normalizedCandidate) || normalizedCandidate.includes(normTitle);
        });
      }

      if (!bestNode) {
        specificDocWarning = `Se mencionó el documento "${candidateName}" pero no se encontró ninguna coincidencia exacta en el cerebro.`;
      }
    } catch (err: unknown) {
      console.error('Error fetching specific document context:', err);
    }
  }

  if (bestNode) {
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
  }

  const terms = extractQueryTerms(query);

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
  if (specificDocWarning) {
    warnings.push(specificDocWarning);
  }

  return {
    items,
    contextText,
    sources: dedupedSources,
    warnings,
  };
}

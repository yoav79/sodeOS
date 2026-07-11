import 'server-only';
import type { BrainQueryContextItem } from './types';

export const DOC_SNIPPET_CHARS = 1600;
export const CHUNK_SNIPPET_CHARS = 900;

export function normalizeQuery(query: string): string {
  return query.trim().normalize('NFKC');
}

export function extractQueryTerms(query: string): string[] {
  const normalized = normalizeQuery(query).toLowerCase();
  if (!normalized) return [];

  const rawTerms = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  return Array.from(new Set(rawTerms)).slice(0, 8);
}

export function truncateAtWordBoundary(text: string, maxChars: number): string {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean;

  const softLimit = Math.max(1, Math.floor(maxChars * 0.9));
  const slice = clean.slice(0, softLimit);
  const lastSpace = slice.lastIndexOf(' ');
  const cutIndex = lastSpace > 40 ? lastSpace : maxChars;
  return `${clean.slice(0, cutIndex).trimEnd()}…`;
}

export function countTermHits(text: string, terms: string[]): number {
  const haystack = text.toLowerCase();
  return terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
}

export function formatDocumentSection(item: BrainQueryContextItem): string {
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

export function formatAttachmentSection(item: BrainQueryContextItem): string {
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

export function appendSectionsWithinLimit(
  items: BrainQueryContextItem[],
  maxContextChars: number
): { contextText: string; warnings: string[] } {
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

export function isStructuralQuery(query: string): boolean {
  const q = query.toLowerCase();

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

export function extractMentionedDocumentName(query: string): string | null {
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

export function normalizeStringForComparison(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function extractSectionContent(
  content: string,
  query: string
): { sectionText: string; sectionName: string } | null {
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

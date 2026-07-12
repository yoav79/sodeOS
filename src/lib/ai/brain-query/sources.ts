import 'server-only';
import type { BrainQuerySource } from './types';

/**
 * Deduplica una lista de fuentes de consulta (BrainQuerySource) manteniendo el orden de inserción original (orden estable).
 * Compara las propiedades críticas para identificar fuentes idénticas.
 *
 * @param sources Lista de fuentes encontradas durante el proceso de recuperación de contexto.
 * @returns Lista de fuentes deduplicada.
 */
export function dedupeSources(sources: BrainQuerySource[]): BrainQuerySource[] {
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
export function buildSourceFromNode(node: { id: string; title: string }): BrainQuerySource {
  return {
    type: 'document',
    id: node.id,
    title: node.title,
    nodeId: node.id
  };
}

export function buildSourceFromAttachment(att: { id: string; filename: string; nodeId: string; node: { title: string } }): BrainQuerySource {
  return {
    type: 'attachment_text',
    id: att.id,
    title: att.filename,
    nodeId: att.nodeId,
    attachmentId: att.id,
    filename: att.filename
  };
}

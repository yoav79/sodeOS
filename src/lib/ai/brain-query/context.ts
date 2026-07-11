import 'server-only';
import type { BrainQueryContextResult } from './types';
import { normalizeQuery, isStructuralQuery } from './context_helpers';
import { classifyQueryIntent } from './intent';
import { resolveQueryScope } from './scope';
import {
  retrieveMetadataLikeContext,
  retrieveOutlineLikeContext,
  retrieveSourceSectionContext,
  retrieveSectionContext,
  retrieveStructuralContext,
  retrieveSpecificDocumentContext,
  retrieveNormalRagContext,
} from './retrievers';

const DEFAULT_MAX_CONTEXT_CHARS = 8000;

function withFallbackWarnings(
  result: BrainQueryContextResult,
  warnings: string[]
): BrainQueryContextResult {
  if (warnings.length === 0) return result;
  return {
    ...result,
    warnings: [...warnings, ...result.warnings],
  };
}

/**
 * Recupera el contexto de RAG para responder una consulta dentro del cerebro.
 * Este archivo actúa como coordinador del flujo en la Fase 1.
 */
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

  // 1. Intent estructural / Inventario de nodos
  if (isStructuralQuery(query)) {
    const structuralRes = await retrieveStructuralContext(brainId, maxContextChars);
    if (structuralRes) {
      return structuralRes;
    }
  }

  const intent = classifyQueryIntent(query);
  const scope = await resolveQueryScope({ brainId, query });

  if (scope.ambiguous) {
    const fallback = await retrieveNormalRagContext(brainId, query, maxContextChars);
    return withFallbackWarnings(fallback, scope.warnings);
  }

  if (intent === 'source_request') {
    const sourceRes = await retrieveSourceSectionContext(brainId, query, scope, maxContextChars);
    if (sourceRes.items.length > 0) {
      return withFallbackWarnings(sourceRes, scope.warnings);
    }

    const fallback = await retrieveNormalRagContext(brainId, query, maxContextChars, {
      document: scope.document,
      warnings: [...scope.warnings, ...sourceRes.warnings],
    });
    return fallback;
  }

  if (intent === 'section_request') {
    const sectionRes = await retrieveSectionContext(brainId, query, scope, maxContextChars);
    if (sectionRes.items.length > 0) {
      return withFallbackWarnings(sectionRes, scope.warnings);
    }

    const fallback = await retrieveNormalRagContext(brainId, query, maxContextChars, {
      document: scope.document,
      warnings: [...scope.warnings, ...sectionRes.warnings],
    });
    return fallback;
  }

  if (intent === 'document_metadata') {
    const metadataRes = await retrieveMetadataLikeContext(brainId, query, scope);
    if (metadataRes.items.length > 0) {
      return withFallbackWarnings(metadataRes, scope.warnings);
    }

    const fallback = await retrieveNormalRagContext(brainId, query, maxContextChars, {
      document: scope.document,
      warnings: [...scope.warnings, ...metadataRes.warnings],
    });
    return fallback;
  }

  if (intent === 'document_outline') {
    const outlineRes = await retrieveOutlineLikeContext(brainId, scope, maxContextChars);
    if (outlineRes.items.length > 0) {
      return withFallbackWarnings(outlineRes, scope.warnings);
    }

    const fallback = await retrieveNormalRagContext(brainId, query, maxContextChars, {
      document: scope.document,
      warnings: [...scope.warnings, ...outlineRes.warnings],
    });
    return fallback;
  }

  if (intent === 'document_summary') {
    const fallback = await retrieveNormalRagContext(brainId, query, maxContextChars, {
      document: scope.document,
      warnings: scope.document ? scope.warnings : [...scope.warnings, 'La consulta solicita un resumen sin documento específico; se usará búsqueda normal en todo el cerebro.'],
    });
    return fallback;
  }

  if (intent === 'document_content' && scope.type === 'document' && scope.document) {
    return retrieveNormalRagContext(brainId, query, maxContextChars, {
      document: scope.document,
      warnings: scope.warnings,
    });
  }

  // 2. Intent de documento o sección mencionado explícitamente
  let specificDocWarning: string | null = null;
  const specificDocRes = await retrieveSpecificDocumentContext(brainId, query, maxContextChars);
  if (specificDocRes) {
    if (specificDocRes.items.length > 0) {
      return specificDocRes;
    } else if (specificDocRes.warnings.length > 0) {
      // Si se mencionó un documento pero no se encontró, guardamos la advertencia para el fallback
      specificDocWarning = specificDocRes.warnings[0];
    }
  }

  // 3. Fallback a búsqueda normal de palabras clave (RAG estándar)
  const normalRes = await retrieveNormalRagContext(brainId, query, maxContextChars);
  if (specificDocWarning) {
    normalRes.warnings.push(specificDocWarning);
  }

  return normalRes;
}

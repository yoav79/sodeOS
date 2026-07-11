import 'server-only';

/**
 * Representa las intenciones de consulta soportadas en sodeOS.
 * Fase 1: Clasificador local basado en reglas heurísticas (RegExp/Keywords).
 * Nota: Este archivo forma parte de la Fase 1 y no debe considerarse definitivo.
 * En futuras fases se integrará clasificación híbrida o semántica.
 */
export type QueryIntent =
  | 'document_metadata'
  | 'document_outline'
  | 'document_summary'
  | 'document_content'
  | 'cross_document_search'
  | 'section_request'
  | 'source_request';

/**
 * Clasifica la intención de una consulta basándose exclusivamente en reglas locales.
 * No realiza llamadas a LLM ni a base de datos.
 *
 * @param query Consulta en texto plano realizada por el usuario.
 * @returns QueryIntent que representa la categoría de la consulta.
 */
export function classifyQueryIntent(query: string): QueryIntent {
  // Normalización básica: trim, minúsculas y descomposición de acentos unicode si se prefiere
  // pero tolerando búsquedas de acentos directas
  const q = query.trim().toLowerCase().normalize('NFKC');

  // 1. source_request
  const sourceRegex = /(fuente|referencia|bibliograf|link|enlace|cita|de dónde sale|de donde sale|qué archivo|que archivo)/;
  if (sourceRegex.test(q)) {
    return 'source_request';
  }

  // 2. document_outline
  const outlineRegex = /(índice|indice|tabla de contenido|tabla de contenidos|estructura del documento|outline|apartado|capítulo|capitulo|sección del documento|secciones del documento)/;
  if (outlineRegex.test(q)) {
    return 'document_outline';
  }

  // 3. document_metadata
  const metadataRegex = /(cuántas páginas|cuantas paginas|número de páginas|numero de paginas|page count|autor|idioma|lenguaje|fecha de creación|fecha de creacion|metadata|metadatos|tamaño|tamano|peso del archivo|palabras|word count)/;
  if (metadataRegex.test(q)) {
    return 'document_metadata';
  }

  // 4. document_summary
  const summaryRegex = /(resumen|resúmelo|resumelo|resúmeme|resumeme|resume|sintetiza|síntesis|sintesis|de qué trata|de que trata|haz un resumen)/;
  if (summaryRegex.test(q)) {
    return 'document_summary';
  }

  // 5. section_request
  const sectionRegex = /(sección|seccion|capítulo|capitulo|apartado|texto completo de|sección completa|seccion completa|dame la sección|dame la seccion)/;
  if (sectionRegex.test(q)) {
    return 'section_request';
  }

  // 6. document_content
  // Si no coincide con ninguna intención estructural, pero el usuario menciona explícitamente palabras clave
  // relacionadas con un documento/archivo específico.
  const documentFocusRegex = /(documento|docuemnto|doc|archivo|pdf|manual|nota|nodo)/;
  if (documentFocusRegex.test(q)) {
    return 'document_content';
  }

  // 7. cross_document_search (Fallback)
  // Preguntas generales sobre conocimiento en la base de datos sin referirse a un documento específico.
  return 'cross_document_search';
}

/*
================================================================================
CASOS DE PRUEBA INTERNOS (Uso de referencia manual)
================================================================================
1. "¿Cuáles son las fuentes consultadas?" -> 'source_request'
2. "tabla de contenidos del archivo de seguridad" -> 'document_outline'
3. "¿cuántas páginas tiene el pdf?" -> 'document_metadata'
4. "haz un resumen del manual de ingreso" -> 'document_summary'
5. "ve a la seccion completa de reembolsos" -> 'section_request'
6. "¿qué dice el manual sobre las vacaciones?" -> 'document_content'
7. "¿cuál es la política general de gastos?" -> 'cross_document_search'
================================================================================
*/

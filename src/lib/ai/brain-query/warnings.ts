import 'server-only';

// ---------------------------------------------------------------------------
// Helpers puros para advertencias reutilizables de brain query.
// Módulo de Fase 3: no conectado a runtime todavía.
// No consulta DB, no importa Prisma, no llama IA, no depende de estado global.
// ---------------------------------------------------------------------------

// --- Warnings estáticos de metadata ---

export const pageCountUnavailableForAttachment =
  'El número de páginas no está disponible para este archivo o aún no fue procesado con metadata de páginas.';

export const wordCountUnavailableForAttachment =
  'El conteo de palabras no está disponible para este archivo o aún no fue procesado.';

export const characterCountUnavailableForAttachment =
  'El conteo de letras/caracteres no está disponible para este archivo o aún no fue procesado.';

export const pageCountUnavailableForNode =
  'El número de páginas no está disponible para documentos internos.';

export const wordCountUnavailableForNode =
  'El conteo de palabras no está disponible para documentos internos.';

export const characterCountUnavailableForNode =
  'El conteo de letras/caracteres no está disponible para documentos internos.';

export const authorNotPersisted =
  'El autor del archivo no se persiste en esta fase del sistema; no se inventarán valores.';

export const authorNotPersistedForNode =
  'El autor de los documentos no se persiste en esta fase del sistema; no se inventarán valores.';

export const languageNotPersisted =
  'El idioma del archivo no se persiste en esta fase del sistema; no se inventarán valores.';

export const languageNotPersistedForNode =
  'El idioma de los documentos no se persiste en esta fase del sistema; no se inventarán valores.';

// --- Warnings dinámicos ---

export function documentNotFoundWarning(candidate: string): string {
  return `Se mencionó el documento "${candidate}" pero no se encontró en este cerebro.`;
}

export function sectionWithoutDocumentWarning(sectionName: string): string {
  return `Se solicitó la sección "${sectionName}" pero no se detectó el documento específico.`;
}

export function ambiguousDocumentWarning(candidates: string[], tierName: string): string {
  const names = candidates.join(', ');
  return `Múltiples documentos coinciden con la búsqueda (${tierName}): ${names}.`;
}

export function globalFallbackWarning(): string {
  return 'No se pudo resolver un documento específico; se usará contexto global del cerebro.';
}

// --- Helpers utilitarios ---

export function uniqueWarnings(warnings: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of warnings) {
    if (!seen.has(w)) {
      seen.add(w);
      result.push(w);
    }
  }
  return result;
}

export function appendWarning(
  warnings: string[],
  warning?: string | null
): string[] {
  if (!warning) return warnings;
  return [...warnings, warning];
}

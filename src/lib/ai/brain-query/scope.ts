import 'server-only';
import db from '@/lib/db';

/**
 * Tipos de ámbitos de consulta soportados en sodeOS.
 * - 'brain': Búsqueda global en todo el cerebro.
 * - 'document': Búsqueda acotada a un único nodo o archivo adjunto.
 * - 'section': Búsqueda restringida a una sección específica de un documento.
 */
export type QueryScopeType = 'brain' | 'document' | 'section';

/**
 * Representa el documento o archivo objetivo resuelto en base de datos.
 */
export interface ResolvedDocumentTarget {
  kind: 'node' | 'attachment';
  id: string;
  title?: string;
  filename?: string;
  nodeId?: string;
  attachmentId?: string;
}

/**
 * Estructura de retorno al resolver el ámbito de la consulta.
 */
export interface ResolvedQueryScope {
  type: QueryScopeType;
  document?: ResolvedDocumentTarget;
  sectionName?: string | null;
  ambiguous: boolean;
  warnings: string[];
}

/**
 * Normaliza una cadena para facilitar la comparación de nombres de documentos.
 * Remueve minúsculas, espacios, acentos, guiones y caracteres no alfanuméricos.
 * Tolera camelCase y extensiones al aplanar todo a minúsculas sin caracteres especiales.
 */
export function normalizeForScopeMatch(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remueve acentos
    .replace(/[^a-z0-9]/g, '');      // Conserva solo letras y números
}

/**
 * Extrae un candidato a nombre de documento de la consulta de entrada usando patrones de RegExp.
 */
export function extractDocumentCandidate(query: string): string | null {
  const patterns = [
    /en\s+el\s+documento\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /del\s+documento\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /en\s+el\s+archivo\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /del\s+archivo\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /en\s+el\s+reporte\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /del\s+reporte\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /en\s+el\s+documento\s+([a-z0-9\s_\-\.]+)/i,
    /del\s+documento\s+([a-z0-9\s_\-\.]+)/i,
    /en\s+el\s+archivo\s+([a-z0-9\s_\-\.]+)/i,
    /del\s+archivo\s+([a-z0-9\s_\-\.]+)/i,
    /en\s+el\s+reporte\s+([a-z0-9\s_\-\.]+)/i,
    /del\s+reporte\s+([a-z0-9\s_\-\.]+)/i,
    /documento\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /docuemnto\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /archivo\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /reporte\s+de\s+([a-z0-9\s_\-\.]+)/i,
    /documento\s+([a-z0-9\s_\-\.]+)/i,
    /docuemnto\s+([a-z0-9\s_\-\.]+)/i,
    /doc\s+([a-z0-9\s_\-\.]+)/i,
    /archivo\s+([a-z0-9\s_\-\.]+)/i,
    /reporte\s+([a-z0-9\s_\-\.]+)/i,
    /pdf\s+([a-z0-9\s_\-\.]+)/i,
    /manual\s+([a-z0-9\s_\-\.]+)/i,
    /nota\s+([a-z0-9\s_\-\.]+)/i,
    /nodo\s+([a-z0-9\s_\-\.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const val = match[1].trim();
      const stopWords = ['indice', 'índice', 'resumen', 'fuentes', 'referencias', 'secciones', 'capitulos', 'capítulos', 'sección', 'seccion', 'capitulo', 'capítulo'];
      if (val.length >= 2 && !stopWords.includes(val.toLowerCase())) {
        return val;
      }
    }
  }

  // Fallback: patrón simple "en X", previniendo falsos positivos obvios
  const enPattern = /en\s+([a-z0-9\s_\-\.]+)/i;
  const enMatch = query.match(enPattern);
  if (enMatch && enMatch[1]) {
    const val = enMatch[1].trim();
    const stopWords = [
      'general', 'detalle', 'español', 'espanol', 'ingles', 'inglés',
      'particular', 'teoría', 'teoria', 'práctica', 'practica', 'resumen',
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'
    ];
    if (val.length >= 3 && !stopWords.includes(val.toLowerCase())) {
      return val;
    }
  }

  return null;
}

/**
 * Extrae un candidato a nombre de sección de la consulta.
 */
export function extractSectionCandidate(query: string): string | null {
  const q = query.toLowerCase().normalize('NFKC');

  // Coincidencias exactas de secciones especiales
  const directSections = [
    'fuentes consultadas',
    'referencias',
    'bibliografía',
    'bibliografia',
    'fuentes',
    'citas'
  ];

  for (const ds of directSections) {
    if (q.includes(ds)) {
      return ds;
    }
  }

  const sectionPatterns = [
    /(?:sección|seccion|capítulo|capitulo|apartado)\s+([a-z0-9\s_\-\.\u00c0-\u00ff]+)/i
  ];

  for (const pattern of sectionPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const val = match[1].trim();
      if (val.length >= 2) {
        return val;
      }
    }
  }

  return null;
}

/**
 * Resuelve el ámbito de la consulta dentro del cerebro especificado.
 * Busca coincidencias exactas o parciales contra nombres de archivos y títulos de notas.
 * Nota: Módulo correspondiente a la Fase 1; se usa desde context.ts como routing conservador.
 */
export async function resolveQueryScope(params: {
  brainId: string;
  query: string;
}): Promise<ResolvedQueryScope> {
  const { brainId, query } = params;

  const docCandidate = extractDocumentCandidate(query);
  const secCandidate = extractSectionCandidate(query);

  let document: ResolvedDocumentTarget | undefined;
  let ambiguous = false;
  const warnings: string[] = [];

  if (docCandidate) {
    const cleanCandidate = normalizeForScopeMatch(docCandidate);

    // Consulta de nodos y adjuntos dentro del cerebro
    const [nodes, attachments] = await Promise.all([
      db.node.findMany({
        where: {
          brainId,
          deletedAt: null,
          status: { not: 'archived' }
        },
        select: {
          id: true,
          title: true
        }
      }),
      db.nodeAttachment.findMany({
        where: {
          brainId
        },
        select: {
          id: true,
          filename: true,
          nodeId: true
        }
      })
    ]);

    // Tier 1: Coincidencia exacta de archivo con extensión
    const tier1 = attachments.filter(att => {
      return normalizeForScopeMatch(att.filename) === cleanCandidate;
    }).map(att => ({
      kind: 'attachment' as const,
      id: att.id,
      filename: att.filename,
      attachmentId: att.id,
      nodeId: att.nodeId
    }));

    // Tier 2: Coincidencia exacta de archivo sin extensión
    const tier2 = attachments.filter(att => {
      const dotIndex = att.filename.lastIndexOf('.');
      const nameNoExt = dotIndex !== -1 ? att.filename.substring(0, dotIndex) : att.filename;
      return normalizeForScopeMatch(nameNoExt) === cleanCandidate;
    }).map(att => ({
      kind: 'attachment' as const,
      id: att.id,
      filename: att.filename,
      attachmentId: att.id,
      nodeId: att.nodeId
    }));

    // Tier 3: Coincidencia exacta de título de nodo
    const tier3 = nodes.filter(n => {
      return normalizeForScopeMatch(n.title) === cleanCandidate;
    }).map(n => ({
      kind: 'node' as const,
      id: n.id,
      title: n.title,
      nodeId: n.id
    }));

    // Tier 4: Coincidencia parcial de archivo (solo si el candidato tiene longitud razonable)
    const tier4 = cleanCandidate.length >= 3 ? attachments.filter(att => {
      const norm = normalizeForScopeMatch(att.filename);
      return norm.includes(cleanCandidate) || cleanCandidate.includes(norm);
    }).map(att => ({
      kind: 'attachment' as const,
      id: att.id,
      filename: att.filename,
      attachmentId: att.id,
      nodeId: att.nodeId
    })) : [];

    // Tier 5: Coincidencia parcial de título de nodo
    const tier5 = cleanCandidate.length >= 3 ? nodes.filter(n => {
      const norm = normalizeForScopeMatch(n.title);
      return norm.includes(cleanCandidate) || cleanCandidate.includes(norm);
    }).map(n => ({
      kind: 'node' as const,
      id: n.id,
      title: n.title,
      nodeId: n.id
    })) : [];

    // Selección por prioridad
    let selectedMatches: ResolvedDocumentTarget[] = [];
    let matchedTierName = '';

    if (tier1.length > 0) {
      selectedMatches = tier1;
      matchedTierName = 'archivo exacto';
    } else if (tier2.length > 0) {
      selectedMatches = tier2;
      matchedTierName = 'archivo sin extensión';
    } else if (tier3.length > 0) {
      selectedMatches = tier3;
      matchedTierName = 'nodo exacto';
    } else if (tier4.length > 0) {
      selectedMatches = tier4;
      matchedTierName = 'archivo parcial';
    } else if (tier5.length > 0) {
      selectedMatches = tier5;
      matchedTierName = 'nodo parcial';
    }

    if (selectedMatches.length === 1) {
      document = selectedMatches[0];
    } else if (selectedMatches.length > 1) {
      ambiguous = true;
      const names = selectedMatches.map(m => m.filename || m.title).join(', ');
      warnings.push(`Múltiples documentos coinciden con la búsqueda (${matchedTierName}): ${names}.`);
    } else {
      warnings.push(`Se mencionó el documento "${docCandidate}" pero no se encontró en este cerebro.`);
    }
  }

  // Determinación de tipo de ámbito final
  let type: QueryScopeType = 'brain';
  if (document && !ambiguous) {
    type = secCandidate ? 'section' : 'document';
  } else if (secCandidate) {
    type = 'section';
    if (!document) {
      ambiguous = true;
      warnings.push(`Se solicitó la sección "${secCandidate}" pero no se detectó el documento específico.`);
    }
  }

  return {
    type,
    document,
    sectionName: secCandidate,
    ambiguous,
    warnings
  };
}

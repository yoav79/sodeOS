import 'server-only';

export interface BuildMetadataAnswerInput {
  kind: 'node' | 'attachment';
  title?: string | null;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  createdAt?: string | Date | null;
  processedAt?: string | Date | null;
  extractionStatus?: string | null;
  wordCount?: number | null;
  characterCount?: number | null;
  pageCount?: number | null;
  nodeTitle?: string | null;
  warnings?: string[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Construye una respuesta determinista formateada en markdown a partir de los metadatos de un nodo o attachment.
 */
export function buildMetadataAnswer(input: BuildMetadataAnswerInput): string {
  const lines: string[] = [];

  if (input.kind === 'node') {
    const docName = input.title || 'Documento sin título';
    lines.push(`Aquí tienes la información y los metadatos disponibles del documento interno **${docName}**:`);
    lines.push('');
    lines.push(`- **Tipo:** Nota de texto interna de sodeOS`);

    if (input.createdAt) {
      lines.push(`- **Fecha de creación:** ${formatDate(input.createdAt)}`);
    }
    if (input.extractionStatus) {
      lines.push(`- **Estado:** ${input.extractionStatus}`);
    }
  } else {
    const filename = input.filename || 'Archivo sin nombre';
    lines.push(`Aquí tienes la información y los metadatos disponibles del archivo **${filename}**:`);
    lines.push('');
    lines.push(`- **Nombre del archivo:** ${filename}`);

    if (input.contentType) {
      lines.push(`- **Tipo de contenido:** ${input.contentType}`);
    }
    if (input.size !== undefined && input.size !== null) {
      lines.push(`- **Tamaño:** ${formatBytes(input.size)} (${input.size.toLocaleString('es-ES')} bytes)`);
    }
    if (input.createdAt) {
      lines.push(`- **Fecha de subida:** ${formatDate(input.createdAt)}`);
    }
    if (input.extractionStatus) {
      lines.push(`- **Estado de extracción:** ${input.extractionStatus}`);
    }
    if (input.processedAt) {
      lines.push(`- **Fecha de procesamiento:** ${formatDate(input.processedAt)}`);
    } else {
      lines.push(`- **Fecha de procesamiento:** No hay fecha de procesamiento registrada`);
    }
    if (input.pageCount !== undefined && input.pageCount !== null) {
      lines.push(`- **Número de páginas:** ${input.pageCount} ${input.pageCount === 1 ? 'página' : 'páginas'}`);
    }
    if (input.wordCount !== undefined && input.wordCount !== null) {
      lines.push(`- **Cantidad de palabras:** ${input.wordCount.toLocaleString('es-ES')} ${input.wordCount === 1 ? 'palabra' : 'palabras'}`);
    }
    if (input.characterCount !== undefined && input.characterCount !== null) {
      lines.push(`- **Caracteres/letras extraídas:** ${input.characterCount.toLocaleString('es-ES')} ${input.characterCount === 1 ? 'carácter/letra' : 'caracteres/letras'}`);
    }
    if (input.nodeTitle) {
      lines.push(`- **Ubicación (Nodo origen):** ${input.nodeTitle}`);
    }
  }

  // Agregar notas o advertencias al final si se incluyeron en el input
  if (input.warnings && input.warnings.length > 0) {
    lines.push('');
    lines.push('### Notas e información adicional:');
    for (const warning of input.warnings) {
      lines.push(`- *${warning}*`);
    }
  }

  return lines.join('\n');
}

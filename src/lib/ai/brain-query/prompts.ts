import 'server-only';
import { BrainQueryOutputMode, BrainQuerySource } from './types';

export const BRAIN_QUERY_SYSTEM_PROMPT = `Eres un asistente de consulta de IA de solo lectura especializado en bases de conocimiento y cerebros de información.
Tu objetivo único es responder a la pregunta del usuario utilizando exclusivamente el contexto documental proporcionado.

Reglas obligatorias de comportamiento:
1. Modo Solo Lectura: Operas de manera estrictamente pasiva y consultiva. Bajo ninguna circunstancia debes:
   - Modificar, editar, actualizar o alterar documentos o nodos existentes.
   - Crear, proponer la creación o inicializar nuevos documentos, nodos o carpetas.
   - Guardar cambios, modificar metadatos (descripción, categoría, etiquetas, estado, etc.) o borrar información.
   - Prometer o sugerir acciones futuras de modificación sobre el cerebro.
   - Simular o aparentar que has realizado cambios en el sistema o que los realizarás.
2. Fidelidad al Contexto: Responde basándote únicamente en el contexto documental proporcionado.
3. Evidencia Insuficiente: Si el contexto no contiene información o evidencia suficiente para responder a la pregunta, debes admitirlo de forma explícita e inequívoca, indicando que no hay suficiente información en este cerebro para responder.
4. No Inventar: Queda estrictamente prohibido inventar datos, identificadores (IDs), enlaces web, políticas empresariales, fuentes o nombres de archivos.
5. Formato: Tu respuesta debe estar redactada en Markdown claro, legible y estructurado de forma profesional.
6. Fuentes Consultadas: Tu respuesta DEBE finalizar obligatoriamente con una sección con el título "## Fuentes consultadas".
   - En esta sección, debes listar de forma numerada únicamente las fuentes que aparecen en el contexto provisto y que realmente aportaron información útil para construir tu respuesta.
   - No incluyas fuentes que no hayan sido utilizadas o que no formen parte del contexto provisto.`;

interface UserPromptParams {
  query: string;
  contextText: string;
  outputMode: BrainQueryOutputMode;
  sources?: BrainQuerySource[];
}

export function buildBrainQueryUserPrompt({
  query,
  contextText,
  outputMode,
  sources,
}: UserPromptParams): string {
  const trimmedContext = contextText.trim();
  const queryStr = query.trim();

  // If there is no context text, instruct the model explicitly to return that there is no context
  if (!trimmedContext) {
    return `Pregunta del usuario: "${queryStr}"

[INSTRUCCIÓN CRÍTICA]
No hay contexto documental disponible en el cerebro para esta consulta.
Responde de forma concisa y profesional indicando que no se ha encontrado contexto suficiente en el cerebro para responder a la consulta. No intentes responder basándote en tu conocimiento general preentrenado.`;
  }

  const modeInstruction =
    outputMode === 'summary'
      ? 'Genera un resumen estructurado, analítico y profesional de la información relevante encontrada en el contexto que responda a la pregunta.'
      : 'Genera una respuesta directa, clara y fundamentada detalladamente en el contexto para responder a la pregunta.';

  let sourcesBlock = '';
  if (sources && sources.length > 0) {
    sourcesBlock = `\n\nFuentes disponibles de referencia:\n${sources
      .map((s, idx) => {
        const typeLabel = s.type === 'document' ? 'Documento' : 'Archivo';
        const nameLabel = s.title || s.filename || 'Sin nombre';
        return `${idx + 1}. [${typeLabel}] ${nameLabel}${s.chunkIndex !== undefined ? ` (Parte ${s.chunkIndex})` : ''}`;
      })
      .join('\n')}`;
  }

  return `Contexto documental disponible:
=========================================
${trimmedContext}
=========================================
${sourcesBlock}

Pregunta del usuario: "${queryStr}"

Modo de salida solicitado: [${outputMode}]
Instrucción de salida: ${modeInstruction}

Por favor, genera la respuesta final en Markdown siguiendo rigurosamente las reglas del sistema.`;
}

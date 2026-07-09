import 'server-only';
import { AIDocumentAction } from './types';

export function getSystemPrompt(): string {
  return `Eres un asistente de redacción experto para una base de conocimiento empresarial. Tu tarea es procesar el texto proporcionado en Markdown.
Debes retornar ÚNICAMENTE el código Markdown modificado correspondiente.
No incluyas preámbulos, explicaciones, introducciones ni bloques de código de marcado de markdown general (como \`\`\`markdown ... \`\`\`).
Tu respuesta debe ser directamente el contenido final listo para ser insertado.
Conserva toda la estructura organizativa básica del texto de entrada, como tablas, enlaces o listas si el contexto lo requiere.
Si te falta contexto para expandir el texto o crear nuevo contenido, genera una estructura clara y profesional que sirva de plantilla útil y genérica para el ámbito empresarial, evitando inventar datos confidenciales o específicos.`;
}

export function getUserPrompt(action: AIDocumentAction, title: string, contentMarkdown: string, instruction?: string): string {
  const instructionBlock = instruction && instruction.trim()
    ? `\n\nSigue estrictamente esta directriz u orientación de estilo del usuario: "${instruction.trim()}"`
    : '';

  switch (action) {
    case 'create':
      return `Genera una propuesta de contenido nueva y detallada para el documento titulado: "${title}".${instructionBlock}`;
    case 'format':
      return `Optimiza la estructura y el formato Markdown del siguiente documento. Asegura que los encabezados sigan una jerarquía adecuada, corrige el espaciado de tablas, citas o listas, pero conserva toda la información original.${instructionBlock}\n\nDocumento original:\n${contentMarkdown}`;
    case 'grammar':
      return `Corrige la gramática y optimiza la redacción del siguiente documento. Asegura coherencia textual, buen estilo profesional y tono corporativo.${instructionBlock}\n\nDocumento original:\n${contentMarkdown}`;
    case 'spelling':
      return `Revisa y corrige exclusivamente los errores ortográficos, de puntuación, tildes y erratas tipográficas del siguiente documento. No alteres la estructura Markdown ni el estilo salvo para corregir fallas ortográficas.${instructionBlock}\n\nDocumento original:\n${contentMarkdown}`;
    case 'metadata':
      return `¡ATENCIÓN! IGNORA CUALQUIER OTRA INSTRUCCIÓN SOBRE RETORNAR MARKDOWN. Tu única tarea es analizar el documento adjunto y generar metadatos estructurados.
Debes devolver ÚNICAMENTE un objeto JSON válido.
No incluyas preámbulos, no pongas explicaciones ni notas de introducción.
No uses delimitadores de código de markdown (como \`\`\`json o \`\`\`). Tu respuesta debe empezar directamente con '{' y terminar con '}'.

El JSON debe seguir este esquema exacto:
{
  "description": "string",
  "category": "string",
  "tags": ["string"],
  "revisionNote": "string"
}

Reglas obligatorias para los campos:
1. "description": Un resumen ejecutivo claro y profesional del documento. Máximo 200 caracteres.
2. "category": Una categoría conceptual corta (máximo 50 caracteres) que represente el área o tema del documento (ej: Ventas, Recursos Humanos, Operaciones, TI, etc.).
3. "tags": Array de 3 a 7 etiquetas relevantes para clasificar el documento. Cada etiqueta debe tener máximo 35 caracteres, estar en minúsculas, no tener espacios internos extras (reemplaza espacios por guiones si es necesario), no contener el símbolo "#" y no tener duplicados.
4. "revisionNote": Una nota breve y profesional que describa los cambios o actualizaciones principales identificados en la revisión del borrador del documento. Máximo 180 caracteres.
5. No inventes información confidencial o no presente en el documento. Si el contenido es insuficiente, genera metadatos profesionales prudentes y genéricos útiles para la empresa.

Documento original a analizar:\n${contentMarkdown}`;
  }
}

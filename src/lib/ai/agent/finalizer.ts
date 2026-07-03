import 'server-only';
import { AgentObservation, AgentRunResult } from './run/types';
import {
  AgentFinalizeSource,
  AgentFinalizeResult,
  AgentOutputMode,
  MAX_AGENT_FINALIZER_CONTEXT_CHARS,
  MAX_AGENT_FINALIZER_CONTENT_CHARS,
  MAX_AGENT_FINALIZER_QUERY_CHARS,
} from './finalize/types';
import { OpenAIResponse } from '../types';

/**
 * Maps a single tool execution observation to a structured finalize source type.
 */
export function mapObservationToSource(observation: AgentObservation): AgentFinalizeSource | null {
  if (!observation.ok) return null;

  switch (observation.toolName) {
    case 'getCurrentDocument': {
      const doc = observation.data as { title?: string } | null;
      return {
        toolName: observation.toolName,
        type: 'current_document',
        label: doc?.title || 'Documento actual',
        truncated: observation.meta?.truncated,
      };
    }
    case 'getBrainTree':
      return {
        toolName: observation.toolName,
        type: 'brain_tree',
        label: 'Estructura general del Cerebro',
        truncated: observation.meta?.truncated,
      };
    case 'searchBrain':
      return {
        toolName: observation.toolName,
        type: 'brain_search',
        label: 'Resultados de búsqueda en Cerebro',
        truncated: observation.meta?.truncated,
      };
    case 'getNodeById': {
      const node = observation.data as { title?: string } | null;
      return {
        toolName: observation.toolName,
        type: 'node',
        label: node?.title || 'Documento específico',
        truncated: observation.meta?.truncated,
      };
    }
    case 'getRecentNodeVersions': {
      const nodeInfo = observation.data as { node?: { title?: string } } | null;
      const title = nodeInfo?.node?.title || 'Documento';
      return {
        toolName: observation.toolName,
        type: 'node_version',
        label: `Historial de versiones: ${title}`,
        truncated: observation.meta?.truncated,
      };
    }
    case 'webSearch': {
      const searchData = observation.data as { query?: string } | null;
      return {
        toolName: observation.toolName,
        type: 'web_search',
        label: `Búsqueda Web: ${searchData?.query || 'Internet'}`,
        truncated: observation.meta?.truncated,
      };
    }
    case 'getAttachmentContext': {
      const attData = observation.data as { results?: Array<{ filename: string; excerpt?: string }> } | null;
      const firstResult = attData?.results?.[0];
      const firstFilename = firstResult?.filename;
      const firstExcerpt = firstResult?.excerpt;
      return {
        toolName: observation.toolName,
        type: 'attachment_text',
        label: firstFilename ? `Archivo adjunto: ${firstFilename}` : 'Archivos adjuntos',
        truncated: observation.meta?.truncated,
        snippet: firstExcerpt ? firstExcerpt.trim().slice(0, 500) : undefined,
      };
    }
    default:
      return null;
  }
}

/**
 * Filters out database/server internal IDs, audit metadata, and sensitive tokens
 * to reduce prompt tokens and protect system structure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeData(toolName: string, data: any): any {
  if (!data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitizeNode = (n: any): any => {
    if (!n) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = {};
    if (typeof n.title === 'string') res.title = n.title;
    if (typeof n.status === 'string') res.status = n.status;
    if (typeof n.description === 'string') res.description = n.description;
    if (Array.isArray(n.children)) {
      res.children = n.children.map(sanitizeNode).filter(Boolean);
    }
    return res;
  };

  if (toolName === 'getCurrentDocument' || toolName === 'getNodeById') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = {};
    if (typeof data.title === 'string') res.title = data.title;
    if (typeof data.description === 'string') res.description = data.description;
    if (typeof data.contentMarkdown === 'string') res.contentMarkdown = data.contentMarkdown;
    if (typeof data.status === 'string') res.status = data.status;
    if (typeof data.category === 'string') res.category = data.category;
    if (Array.isArray(data.tags)) res.tags = data.tags;
    return res;
  }

  if (toolName === 'getBrainTree') {
    if (Array.isArray(data)) {
      return data.map(sanitizeNode).filter(Boolean);
    }
    return sanitizeNode(data);
  }

  if (toolName === 'searchBrain') {
    if (Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((item: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = {};
        if (typeof item.title === 'string') res.title = item.title;
        if (typeof item.status === 'string') res.status = item.status;
        if (typeof item.matchedField === 'string') res.matchedField = item.matchedField;
        if (typeof item.snippet === 'string') res.snippet = item.snippet;
        if (typeof item.updatedAt === 'string') res.updatedAt = item.updatedAt;
        return res;
      });
    }
    return data;
  }

  if (toolName === 'getRecentNodeVersions') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = {};
    if (data && data.node) {
      if (typeof data.node.title === 'string') res.title = data.node.title;
    }
    if (data && Array.isArray(data.versions)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.versions = data.versions.map((v: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const versionRes: any = {};
        if (typeof v.title === 'string') versionRes.title = v.title;
        if (typeof v.contentMarkdown === 'string') versionRes.contentMarkdown = v.contentMarkdown;
        if (typeof v.status === 'string') versionRes.status = v.status;
        if (typeof v.changeNote === 'string') versionRes.changeNote = v.changeNote;
        if (typeof v.createdAt === 'string') versionRes.createdAt = v.createdAt;
        return versionRes;
      });
    } else if (Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((v: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const versionRes: any = {};
        if (typeof v.title === 'string') versionRes.title = v.title;
        if (typeof v.contentMarkdown === 'string') versionRes.contentMarkdown = v.contentMarkdown;
        if (typeof v.status === 'string') versionRes.status = v.status;
        if (typeof v.changeNote === 'string') versionRes.changeNote = v.changeNote;
        if (typeof v.createdAt === 'string') versionRes.createdAt = v.createdAt;
        return versionRes;
      });
    }
    return res;
  }

  if (toolName === 'webSearch') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = {};
    if (data && typeof data.query === 'string') res.query = data.query;
    if (data && typeof data.provider === 'string') res.provider = data.provider;
    if (data && Array.isArray(data.results)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.results = data.results.map((item: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemRes: any = {};
        if (typeof item.title === 'string') itemRes.title = item.title;
        if (typeof item.url === 'string') itemRes.url = item.url;
        if (typeof item.snippet === 'string') itemRes.snippet = item.snippet;
        if (typeof item.publishedAt === 'string') itemRes.publishedAt = item.publishedAt;
        return itemRes;
      });
    }
    return res;
  }

  if (toolName === 'getAttachmentContext') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = {};
    if (data && typeof data.query === 'string') res.query = data.query;
    if (data && typeof data.nodeId === 'string') res.nodeId = data.nodeId;
    if (data && typeof data.totalFilesFound === 'number') res.totalFilesFound = data.totalFilesFound;
    if (data && Array.isArray(data.results)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res.results = data.results.map((item: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemRes: any = {};
        if (typeof item.filename === 'string') itemRes.filename = item.filename;
        if (typeof item.contentType === 'string') itemRes.contentType = item.contentType;
        if (typeof item.chunkIndex === 'number') itemRes.chunkIndex = item.chunkIndex;
        if (typeof item.excerpt === 'string') itemRes.excerpt = item.excerpt;
        if (typeof item.truncated === 'boolean') itemRes.truncated = item.truncated;
        return itemRes;
      });
    }
    return res;
  }

  return data;
}

/**
 * Builds the filtered observations context, maps the sources, and populates step warning messages.
 */
export function buildAgentFinalizerContext(
  runResult: AgentRunResult,
  contentMarkdown?: string,
  userQuery?: string,
  enableWebSearch?: boolean
) {
  let contextString = '';
  const sources: AgentFinalizeSource[] = [];
  const warnings: string[] = [];
  let accumulatedChars = 0;
  let observationsUsedCount = 0;

  // 1. Process run status warnings
  if (runResult.status === 'partial_success') {
    warnings.push('La ejecución del plan fue parcialmente exitosa; algunos pasos fallaron.');
  }

  // 2. Process steps execution warnings
  for (const step of runResult.steps) {
    if (step.status === 'skipped') {
      if (step.skippedReason === 'unsupported_tool') {
        warnings.push(
          `El paso ${step.stepNumber} (${step.estimatedTool}) fue omitido por no estar soportado en esta fase.`
        );
      } else if (step.skippedReason === 'max_steps_limit') {
        warnings.push(
          `El paso ${step.stepNumber} (${step.estimatedTool}) fue omitido porque se alcanzó el límite máximo de pasos ejecutados.`
        );
      }
    } else if (step.status === 'failed') {
      const errMessage = step.observation?.errorMessage || 'Error desconocido en la herramienta';
      warnings.push(`El paso ${step.stepNumber} (${step.estimatedTool}) falló: ${errMessage}`);
    }
  }

  // 3. Process web search requests mismatch
  const queryText = userQuery || '';
  const planRequestedWeb = runResult.steps.some((s) => s.estimatedTool === 'webSearch');
  const queryMentionsWeb = /\b(web|buscar\s+en\s+la\s+web|internet|google|buscar\s+online)\b/i.test(queryText);
  const webSearchExecuted = runResult.observations.some(obs => obs.toolName === 'webSearch' && obs.ok);
  if ((planRequestedWeb || queryMentionsWeb) && !webSearchExecuted) {
    if (enableWebSearch === false) {
      warnings.push('La búsqueda web requiere autorización explícita.');
    } else {
      warnings.push('No se realizó búsqueda web en esta fase; la respuesta usa solo información interna.');
    }
  }

  // 3.5 Deduce detailed status of webSearch and getAttachmentContext for LLM awareness
  let webSearchStatus = '';
  const webSearchObs = runResult.observations.find((o) => o.toolName === 'webSearch');
  if (webSearchObs) {
    if (webSearchObs.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const searchData = webSearchObs.data as any;
      const resultsCount = searchData && Array.isArray(searchData.results) ? searchData.results.length : 0;
      if (resultsCount > 0) {
        webSearchStatus = 'WebSearch ejecutado con resultados.';
      } else {
        webSearchStatus = 'WebSearch ejecutado sin resultados.';
      }
    } else {
      const errMsg = webSearchObs.errorMessage || '';
      if (
        errMsg.toLowerCase().includes('consent') ||
        errMsg.toLowerCase().includes('consentimiento') ||
        enableWebSearch === false
      ) {
        webSearchStatus = 'La búsqueda web requiere autorización explícita.';
      } else if (
        errMsg.toLowerCase().includes('lector') ||
        errMsg.toLowerCase().includes('reader') ||
        errMsg.toLowerCase().includes('permiso') ||
        webSearchObs.errorCode === 'FORBIDDEN'
      ) {
        webSearchStatus = 'La búsqueda web requiere permisos de edición.';
      } else {
        webSearchStatus = `La búsqueda web está disponible pero falló durante la ejecución: ${errMsg}`;
      }
    }
  } else {
    if (planRequestedWeb) {
      if (enableWebSearch === false) {
        webSearchStatus = 'La búsqueda web requiere autorización explícita.';
      } else {
        webSearchStatus = 'No se ejecutó una búsqueda web en este plan.';
      }
    } else {
      if (enableWebSearch === false) {
        webSearchStatus = 'La búsqueda web requiere autorización explícita.';
      } else {
        webSearchStatus = 'La búsqueda web está disponible, pero este plan no la utilizó.';
      }
    }
  }

  let getAttachmentContextStatus = '';
  const planRequestedAttachments = runResult.steps.some((s) => s.estimatedTool === 'getAttachmentContext');
  const attachmentsObs = runResult.observations.find((o) => o.toolName === 'getAttachmentContext');
  if (attachmentsObs) {
    if (attachmentsObs.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attData = attachmentsObs.data as any;
      const resultsCount = attData && Array.isArray(attData.results) ? attData.results.length : 0;
      if (resultsCount > 0) {
        getAttachmentContextStatus = 'getAttachmentContext ejecutado con resultados.';
      } else {
        getAttachmentContextStatus = 'Solo puedo consultar archivos TXT/MD ya procesados del nodo actual. No se encontraron archivos de texto procesados en este nodo.';
      }
    } else {
      getAttachmentContextStatus = `getAttachmentContext fallido durante la ejecución: ${attachmentsObs.errorMessage || 'Error desconocido'}`;
    }
  } else {
    if (planRequestedAttachments) {
      getAttachmentContextStatus = 'getAttachmentContext planificado pero no ejecutado.';
    } else {
      getAttachmentContextStatus = 'getAttachmentContext no planificado.';
    }
  }

  const queryLower = queryText.toLowerCase();
  const userAskedForPdfDocx =
    queryLower.includes('pdf') ||
    queryLower.includes('docx') ||
    queryLower.includes('word') ||
    queryLower.includes('powerpoint') ||
    queryLower.includes('excel');

  let toolStatusesString = `* Búsqueda Web (webSearch): ${webSearchStatus}\n* Consulta de Adjuntos (getAttachmentContext): ${getAttachmentContextStatus}`;
  if (userAskedForPdfDocx) {
    toolStatusesString += `\n* Nota de formato: PDF/DOCX todavía no tienen extracción de texto implementada.`;
  }

  // 4. Serialize and truncate observations
  for (const obs of runResult.observations) {
    if (!obs.ok) continue;

    const source = mapObservationToSource(obs);
    if (!source) continue;

    const cleanData = sanitizeData(obs.toolName, obs.data);
    let serializedData = JSON.stringify(cleanData, null, 2);

    let isTruncated = false;
    if (accumulatedChars + serializedData.length > MAX_AGENT_FINALIZER_CONTEXT_CHARS) {
      isTruncated = true;
      const remainingBudget = MAX_AGENT_FINALIZER_CONTEXT_CHARS - accumulatedChars;
      if (remainingBudget > 200) {
        serializedData =
          serializedData.slice(0, remainingBudget - 100) +
          '\n... [OBSERVACIÓN TRUNCADA POR LÍMITE DE CONTEXTO] ...';
      } else {
        serializedData = '[OBSERVACIÓN OMITIDA POR LÍMITE DE CONTEXTO]';
      }
      source.truncated = true;
      warnings.push(
        `La observación del paso ${obs.stepNumber} (${obs.toolName}) fue truncada para respetar el límite de contexto del LLM.`
      );
    }

    source.truncated = source.truncated || isTruncated;
    
    // For webSearch observations, register each result as a separate cited source
    if (obs.toolName === 'webSearch') {
      const searchData = cleanData as { results?: Array<{ title?: string; url?: string; snippet?: string }> } | null;
      if (searchData && Array.isArray(searchData.results) && searchData.results.length > 0) {
        for (const item of searchData.results) {
          sources.push({
            toolName: obs.toolName,
            type: 'web_search',
            label: item.title || 'Resultado Web',
            url: item.url || '',
            snippet: item.snippet || '',
            truncated: source.truncated,
          });
        }
      } else {
        sources.push(source);
      }
    } else {
      sources.push(source);
    }
    
    observationsUsedCount++;

    const section = `\n### Paso ${obs.stepNumber}: ${obs.toolName} (${source.label})\n\`\`\`json\n${serializedData}\n\`\`\`\n`;
    contextString += section;
    accumulatedChars += section.length;

    if (accumulatedChars >= MAX_AGENT_FINALIZER_CONTEXT_CHARS) {
      break;
    }
  }

  // 5. Check if any observations were left out entirely due to limit
  for (let i = observationsUsedCount; i < runResult.observations.length; i++) {
    const obs = runResult.observations[i];
    if (!obs.ok) continue;
    const source = mapObservationToSource(obs);
    if (source) {
      source.truncated = true;
      sources.push(source);
      warnings.push(
        `La observación del paso ${obs.stepNumber} (${obs.toolName}) no se incluyó en el contexto por límite de capacidad.`
      );
    }
  }

  return {
    contextString,
    sources,
    warnings,
    contextChars: accumulatedChars,
    observationsUsedCount,
    toolStatusesString,
  };
}

/**
 * Generates system prompt instruction with safety and formatting rules.
 */
export function getAgentFinalizerSystemPrompt(outputMode: AgentOutputMode): string {
  let modeInstruction = '';
  switch (outputMode) {
    case 'answer':
      modeInstruction =
        'Responde a la pregunta del usuario de forma directa y clara en Markdown, usando la información interna disponible.';
      break;
    case 'proposal':
      modeInstruction =
        'Genera una propuesta de contenido nuevo y detallado para expandir o crear el documento solicitado, estructurado en secciones lógicas.';
      break;
    case 'summary':
      modeInstruction =
        'Genera un resumen analítico y estructurado de la información interna encontrada en las observaciones, destacando los puntos clave.';
      break;
    case 'rewrite':
      modeInstruction =
        'Propón una versión reescrita y mejorada del documento actual, incorporando la información de las observaciones de forma fluida y profesional.';
      break;
    case 'structure':
      modeInstruction =
        'Genera una propuesta de estructura o índice detallado (outline) para organizar el documento, con explicaciones breves de qué incluir en cada sección.';
      break;
  }

  return `Eres un asistente de redacción y conocimiento empresarial experto. Tu objetivo es generar una respuesta estructurada en Markdown basándote en la información interna provista y opcionalmente en los resultados de búsqueda web externa de 'webSearch'.

Reglas fundamentales de comportamiento:
1. Usa ÚNICAMENTE la información contenida en las observaciones provistas (tanto internas de la base de conocimiento como externas de búsqueda web). No inventes hechos, datos de contacto ni detalles empresariales no especificados.
2. Si la información provista es insuficiente para responder a la petición, indícalo claramente detallando qué datos faltan.
3. NO afirmes haber realizado búsquedas web o consultas en tiempo real en internet a menos que se te proporcionen explícitamente observaciones de la herramienta 'webSearch'. Distingue claramente la información interna factual de la obtenida vía webSearch.
4. NO incluyas en la respuesta IDs técnicos del sistema (como UUIDs, nodeId, brainId o userId). Úsalos solo de forma interna si es necesario, pero nunca los expongas en el texto final.
5. NO menciones correos electrónicos personales ni datos de auditoría interna a menos que estén explícitamente en el texto que se te pide formatear.
6. NO propongas ejecutar acciones en la base de datos ni simules guardar o modificar archivos. Eres un generador de propuestas de texto.
7. Devuelve ÚNICAMENTE el código Markdown limpio de la respuesta.
8. NO envuelvas toda tu respuesta en un bloque de código Markdown (evita colocar \`\`\`markdown al inicio y \`\`\` al final). Devuelve el texto listo para el editor.
9. Distingue claramente en tu redacción la información interna factual observada de tus inferencias o conclusiones derivadas.
10. ${modeInstruction}
11. Si en la sección "Estado de las Herramientas y Autorizaciones" se detalla que alguna herramienta no fue ejecutada o que no hay datos disponibles (como archivos PDF/DOCX no soportados, búsqueda web no autorizada, o falta de chunks), explícaselo al usuario de forma precisa y profesional cuando sea relevante para su consulta.
    NUNCA utilices frases genéricas incorrectas como "no tengo acceso a internet en esta fase" cuando la herramienta sí existe pero fue bloqueada, no planificada o saltada. En su lugar, explica con precisión la situación real de acuerdo con las siguientes directrices:
    - Si la búsqueda web no fue autorizada por el usuario: "La búsqueda web requiere autorización explícita."
    - Si la búsqueda web fue autorizada pero no se planificó o no se ejecutó: "No se ejecutó una búsqueda web en este plan." o "La búsqueda web está disponible, pero este plan no la utilizó."
    - Si la búsqueda web fue bloqueada por permisos: "La búsqueda web requiere permisos de edición."
    - Si getAttachmentContext se ejecutó sin chunks: "Solo puedo consultar archivos TXT/MD ya procesados del nodo actual."
    - Si se pregunta por PDF/DOCX: "PDF/DOCX todavía no tienen extracción de texto implementada."`;
}

/**
 * Builds user prompt for LLM consumption containing original query, execution overview,
 * observations and document context.
 */
export function buildAgentFinalizerUserPrompt(args: {
  userQuery: string;
  outputMode: AgentOutputMode;
  runResult: AgentRunResult;
  observationsPrompt: string;
  toolStatuses: string;
  contentMarkdown?: string;
}): string {
  const queryTruncated = args.userQuery.slice(0, MAX_AGENT_FINALIZER_QUERY_CHARS);

  let docBlock = '';
  if (
    args.contentMarkdown &&
    (args.outputMode === 'rewrite' || args.outputMode === 'proposal' || args.outputMode === 'structure')
  ) {
    const docTruncated = args.contentMarkdown.slice(0, MAX_AGENT_FINALIZER_CONTENT_CHARS);
    docBlock = `\n## Documento actual (Contexto en edición, solo lectura)\n\`\`\`markdown\n${docTruncated}\n\`\`\`\n`;
  }

  const executedTools =
    args.runResult.steps
      .filter((s) => s.status === 'executed')
      .map((s) => s.estimatedTool)
      .join(', ') || 'ninguna';

  return `## Petición del usuario
"${queryTruncated}"

## Resumen de la ejecución
- Estado general: ${args.runResult.status}
- Pasos en el plan: ${args.runResult.summary.totalSteps}
- Pasos ejecutados exitosamente: ${args.runResult.summary.executedSteps}
- Herramientas utilizadas: ${executedTools}
${docBlock}
## Estado de las Herramientas y Autorizaciones
${args.toolStatuses}

## Observaciones internas del Cerebro y Búsquedas Web
${args.observationsPrompt}
## Instrucción de salida
Por favor, genera la respuesta final en Markdown según el modo de salida '${args.outputMode}'.
Al final de la respuesta, incluye un apartado de referencias titulado "## Fuentes consultadas" enumerando de forma amigable los documentos o secciones internas y las fuentes web externas (con sus respectivos enlaces URL) que aportaron información.`;
}

/**
 * Executes the LLM call to finalize the response using observations context.
 */
export async function generateAgentFinalResponse(args: {
  runResult: AgentRunResult;
  userQuery: string;
  outputMode?: AgentOutputMode;
  contentMarkdown?: string;
  enableWebSearch?: boolean;
}): Promise<AgentFinalizeResult> {
  const outputMode = args.outputMode || 'answer';
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const maxTokensStr = process.env.AI_AGENT_MAX_TOKENS || process.env.AI_MAX_TOKENS;
  const maxTokens = maxTokensStr ? parseInt(maxTokensStr, 10) : 2000;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('El proveedor de IA no está configurado (falta API Key).');
  }

  if (provider !== 'openai') {
    throw new Error(`Proveedor de IA no soportado: ${provider}`);
  }

  // 1. Build prompts and context
  const { contextString, sources, warnings, contextChars, observationsUsedCount, toolStatusesString } =
    buildAgentFinalizerContext(args.runResult, args.contentMarkdown, args.userQuery, args.enableWebSearch);

  const systemPrompt = getAgentFinalizerSystemPrompt(outputMode);
  const userPrompt = buildAgentFinalizerUserPrompt({
    userQuery: args.userQuery,
    outputMode,
    runResult: args.runResult,
    observationsPrompt: contextString,
    contentMarkdown: args.contentMarkdown,
    toolStatuses: toolStatusesString,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response from OpenAI API:', errorText);
    throw new Error(`Error de comunicación con el proveedor de IA: ${response.statusText}`);
  }

  const data: OpenAIResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  let finalMarkdown = data.choices[0]?.message?.content || '';

  // Clean markdown block enclosure if LLM returns it wrapped in ```markdown ... ```
  if (finalMarkdown.startsWith('```markdown')) {
    finalMarkdown = finalMarkdown.replace(/^```markdown\n/, '').replace(/\n```$/, '');
  } else if (finalMarkdown.startsWith('```')) {
    finalMarkdown = finalMarkdown.replace(/^```\n/, '').replace(/\n```$/, '');
  }

  finalMarkdown = finalMarkdown.trim();

  // If response is empty, adjust canApplyToDraft and append a warning
  const isEmpty = finalMarkdown.length === 0;
  if (isEmpty) {
    warnings.push('El modelo de lenguaje devolvió una respuesta vacía.');
  }

  return {
    success: !isEmpty,
    finalMarkdown,
    outputMode,
    sources,
    warnings,
    metadata: {
      model: data.model || model,
      tokensUsed: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      runId: args.runResult.runId,
      runStatus: args.runResult.status,
      observationsUsed: observationsUsedCount,
      contextChars,
    },
    canApplyToDraft: !isEmpty,
  };
}

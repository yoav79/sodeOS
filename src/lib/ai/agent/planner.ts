import 'server-only';
import {
  AgentRequest,
  AgentPlan,
  AgentStep,
  AgentIntent,
  AgentToolName,
  AGENT_INTENTS,
  MAX_AGENT_PLAN_STEPS,
  isValidAgentIntent,
  isValidAgentToolName,
} from './types';

// ─────────────────────────────────────────────
// Error type
// ─────────────────────────────────────────────

export class AgentPlanError extends Error {
  code: 'PLAN_PARSE_ERROR' | 'PLAN_INVALID_SCHEMA' | 'AI_CONFIG_ERROR';
  constructor(message: string, code: AgentPlanError['code']) {
    super(message);
    this.name = 'AgentPlanError';
    this.code = code;
  }
}

// ─────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────

function buildPlannerSystemPrompt(): string {
  return `Eres un planificador de agente IA experto integrado en una base de conocimiento empresarial.

Tu ÚNICA responsabilidad en esta fase es analizar la solicitud del usuario y devolver un plan JSON estructurado.

RESTRICCIONES ABSOLUTAS — NUNCA las ignores:
- NO ejecutes ninguna herramienta.
- NO realices búsquedas en internet.
- NO modifiques ningún documento.
- NO crees nodos.
- NO guardes nada en base de datos.
- NO realices llamadas DELETE, PATCH ni POST de creación.
- NO incluyas pasos destructivos en el plan.
- NO inventes herramientas fuera del conjunto permitido.
- NO guardes cambios automáticamente.

INTENCIONES PERMITIDAS (intent):
${AGENT_INTENTS.map(i => `  - "${i}"`).join('\n')}

HERRAMIENTAS PERMITIDAS (estimatedTool por paso) Y SUS DESCRIPCIONES:
  - "getCurrentDocument": leer el documento/nodo actual.
  - "getBrainTree": obtener estructura del cerebro.
  - "searchBrain": buscar nodos/contenido interno del cerebro, no archivos adjuntos.
  - "getNodeById": leer un nodo específico por ID.
  - "getRecentNodeVersions": consultar versiones recientes del nodo.
  - "webSearch": buscar información pública externa en internet; usar solo si el usuario pide datos actuales, externos o verificables fuera del cerebro; requiere consentimiento y no debe recibir contenido interno.
  - "getAttachmentContext": leer excerpts seguros de archivos TXT/MD/PDF/DOCX ya procesados del nodo actual; usar cuando el usuario pregunta por archivos adjuntos, documentos cargados o contenido de attachments.

REGLAS DEL PLAN:
- Máximo ${MAX_AGENT_PLAN_STEPS} pasos en "steps".
- Cada paso DEBE tener un campo "estimatedTool" del listado permitido arriba.
- Si ninguna herramienta encaja perfectamente, elige la más cercana.
- "estimatedTools" en la raíz es la lista deduplicada de tools usadas en steps.
- Activar "enableWebSearch" no significa que siempre deba usar "webSearch". La herramienta "webSearch" solo debe planificarse si la consulta del usuario lo justifica.
- Si el usuario pide explícitamente buscar en internet (datos actuales, externos o verificables fuera del cerebro) y "enableWebSearch" está permitido, debe planificar "webSearch".
- Si el usuario pregunta por archivos adjuntos del nodo actual (documentos cargados o contenido de attachments), debe planificar "getAttachmentContext".
- Si el usuario pregunta por formatos de archivo como PDF o DOCX, debe planificar "getAttachmentContext" pero reconocer que solo habrá datos si ya fueron extraídos y procesados exitosamente.
- El campo "intent" en el JSON de respuesta DEBE ser obligatoriamente una de las INTENCIONES PERMITIDAS especificadas arriba. NUNCA uses nombres de herramientas (como "getAttachmentContext", "webSearch", etc.) como valor de "intent".
- No debes inventar capacidades o herramientas no implementadas en el sistema.
- No debes usar "webSearch" para enviar contenido interno del cerebro (extractos de documentos, datos privados) a internet.
- Si la consulta del usuario requiere búsqueda web externa, marca "requiresWebSearch": true. Si no es necesaria, marca "requiresWebSearch": false.
- Si el plan requiere búsqueda web o implica aplicar propuestas de cambios al borrador del documento, marca "requiresUserConfirmation": true.

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un JSON válido que siga este esquema exacto, sin texto adicional antes ni después:

{
  "intent": "redactar" | "reescribir" | "investigar" | "resumir" | "comparar" | "mejorar_documento" | "crear_estructura" | "responder_pregunta" | "buscar_cerebro" | "buscar_web",
  "steps": [
    {
      "stepNumber": 1,
      "description": "<qué hace este paso>",
      "estimatedTool": "<AgentToolName>",
      "rationale": "<por qué esta herramienta>"
    }
  ],
  "estimatedTools": ["<AgentToolName>"],
  "requiresWebSearch": false,
  "requiresUserConfirmation": false,
  "planSummary": "<resumen de 1 a 3 oraciones del plan>",
  "warnings": []
}`;
}

function buildPlannerUserPrompt(input: AgentRequest): string {
  const parts: string[] = [];

  parts.push(`Solicitud del usuario: "${input.userQuery}"`);
  parts.push(`BrainId: ${input.brainId}`);
  parts.push(`NodeId: ${input.nodeId}`);

  if (input.enableWebSearch) {
    parts.push('El usuario ha autorizado búsquedas web en internet si el plan lo considera necesario.');
  } else {
    parts.push('El usuario NO ha autorizado búsquedas web. Si la petición requiere buscar en internet, marca "requiresWebSearch": true y "requiresUserConfirmation": true, pero NO programes un paso con "webSearch" en la lista de steps ejecutables.');
  }

  if (input.contentMarkdown && input.contentMarkdown.trim().length > 0) {
    // Send only a safe excerpt to avoid token bloat; full content is in DB
    const excerpt = input.contentMarkdown.slice(0, 2000);
    const truncated = input.contentMarkdown.length > 2000;
    parts.push(`\nContexto del documento actual (primeros 2000 caracteres${truncated ? ', truncado' : ''}):\n${excerpt}`);
  } else {
    parts.push('No se proporcionó contenido del documento como contexto.');
  }

  parts.push('\nDevuelve ÚNICAMENTE el JSON del plan. Sin explicaciones adicionales.');

  return parts.join('\n');
}

// ─────────────────────────────────────────────
// Low-level JSON call helper (isolated from generateProposal)
// ─────────────────────────────────────────────

/**
 * Calls the OpenAI-compatible chat endpoint and returns the raw response text.
 * Deliberately separated from generateProposal to avoid any risk of coupling
 * with the IA v1 flow. Uses the same env vars (AI_PROVIDER_API_KEY, AI_MODEL).
 */
async function callModelForJSON(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const provider = process.env.AI_PROVIDER || 'openai';

  if (!apiKey || apiKey.trim() === '') {
    throw new AgentPlanError(
      'El proveedor de IA no está configurado (falta API Key).',
      'AI_CONFIG_ERROR'
    );
  }

  if (provider !== 'openai') {
    throw new AgentPlanError(
      `Proveedor de IA no soportado para planificación: ${provider}`,
      'AI_CONFIG_ERROR'
    );
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.1,
      // Hint the model to respond with JSON where the API supports it
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AgentPlanner] OpenAI API error response:', errorText);
    throw new AgentPlanError(
      `Error de comunicación con el proveedor de IA: ${response.statusText}`,
      'AI_CONFIG_ERROR'
    );
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new AgentPlanError(data.error.message, 'AI_CONFIG_ERROR');
  }

  const content = data.choices?.[0]?.message?.content ?? '';
  return content;
}

// ─────────────────────────────────────────────
// Plan parser & validator
// ─────────────────────────────────────────────

/**
 * Parses, validates and normalises the raw JSON string returned by the model
 * into a well-typed AgentPlan.
 *
 * Normalisation decisions:
 * - Unknown tools are replaced with `getCurrentDocument` and a warning is added.
 * - Steps beyond MAX_AGENT_PLAN_STEPS are truncated and a warning is added.
 * - Invalid intent falls back to `responder_pregunta` with a warning.
 */
function parsePlanJSON(raw: string): AgentPlan {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AgentPlanError(
      'El modelo devolvió un JSON inválido. No se puede generar el plan.',
      'PLAN_PARSE_ERROR'
    );
  }

  const warnings: string[] = [];

  // ── Intent ──────────────────────────────────
  let intent: AgentIntent;
  if (isValidAgentIntent(parsed.intent)) {
    intent = parsed.intent;
  } else {
    warnings.push(`Intención inválida recibida del modelo ("${parsed.intent}"). Usando "responder_pregunta".`);
    intent = 'responder_pregunta';
  }

  // ── Steps ────────────────────────────────────
  if (!Array.isArray(parsed.steps)) {
    throw new AgentPlanError(
      'El plan del modelo no contiene un array "steps" válido.',
      'PLAN_INVALID_SCHEMA'
    );
  }

  let rawSteps = parsed.steps as Array<Record<string, unknown>>;

  // Truncate if over the limit
  if (rawSteps.length > MAX_AGENT_PLAN_STEPS) {
    warnings.push(
      `El modelo devolvió ${rawSteps.length} pasos (máx ${MAX_AGENT_PLAN_STEPS}). Los pasos sobrantes fueron eliminados.`
    );
    rawSteps = rawSteps.slice(0, MAX_AGENT_PLAN_STEPS);
  }

  const steps: AgentStep[] = rawSteps.map((s, idx) => {
    let estimatedTool: AgentToolName;
    if (isValidAgentToolName(s.estimatedTool)) {
      estimatedTool = s.estimatedTool as AgentToolName;
    } else {
      warnings.push(
        `Herramienta inválida en paso ${idx + 1} ("${s.estimatedTool}"). Sustituida por "getCurrentDocument".`
      );
      estimatedTool = 'getCurrentDocument';
    }

    return {
      stepNumber: typeof s.stepNumber === 'number' ? s.stepNumber : idx + 1,
      description: typeof s.description === 'string' ? s.description : '(sin descripción)',
      estimatedTool,
      rationale: typeof s.rationale === 'string' ? s.rationale : '',
    };
  });

  // ── estimatedTools ────────────────────────────
  // Derive from validated steps (ignore whatever the model sent; this is safer)
  const estimatedTools: AgentToolName[] = Array.from(
    new Set(steps.map(s => s.estimatedTool))
  );

  // ── Flags ─────────────────────────────────────
  const requiresWebSearch = Boolean(parsed.requiresWebSearch);
  // Always require confirmation when web search is needed or when the plan touches the draft
  const requiresUserConfirmation =
    Boolean(parsed.requiresUserConfirmation) || requiresWebSearch;

  // ── Summary ───────────────────────────────────
  const planSummary =
    typeof parsed.planSummary === 'string' && parsed.planSummary.trim().length > 0
      ? parsed.planSummary.trim()
      : 'Plan generado automáticamente.';

  return {
    intent,
    steps,
    estimatedTools,
    requiresWebSearch,
    requiresUserConfirmation,
    planSummary,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Creates an AgentPlan from a user request.
 *
 * This function ONLY plans — it never executes tools, never writes to the DB,
 * never modifies documents, and never performs web searches.
 */
export async function createAgentPlan(input: AgentRequest): Promise<AgentPlan> {
  const systemPrompt = buildPlannerSystemPrompt();
  const userPrompt = buildPlannerUserPrompt(input);

  const rawJSON = await callModelForJSON(systemPrompt, userPrompt);

  return parsePlanJSON(rawJSON);
}

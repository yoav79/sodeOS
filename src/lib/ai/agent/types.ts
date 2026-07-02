import 'server-only';

// ─────────────────────────────────────────────
// Intents
// ─────────────────────────────────────────────

export type AgentIntent =
  | 'redactar'
  | 'reescribir'
  | 'investigar'
  | 'resumir'
  | 'comparar'
  | 'mejorar_documento'
  | 'crear_estructura'
  | 'responder_pregunta'
  | 'buscar_cerebro'
  | 'buscar_web';

export const AGENT_INTENTS: AgentIntent[] = [
  'redactar',
  'reescribir',
  'investigar',
  'resumir',
  'comparar',
  'mejorar_documento',
  'crear_estructura',
  'responder_pregunta',
  'buscar_cerebro',
  'buscar_web',
];

// ─────────────────────────────────────────────
// Tool names (read-only — none are executed in AGENT-2)
// ─────────────────────────────────────────────

export type AgentToolName =
  | 'getCurrentDocument'
  | 'getBrainTree'
  | 'searchBrain'
  | 'getNodeById'
  | 'getRecentNodeVersions'
  | 'generateMarkdownProposal'
  | 'webSearch'
  | 'getAttachmentContext'
  | 'fetchWebPageSummary'
  | 'citeSources';

export const AGENT_TOOL_NAMES: AgentToolName[] = [
  'getCurrentDocument',
  'getBrainTree',
  'searchBrain',
  'getNodeById',
  'getRecentNodeVersions',
  'generateMarkdownProposal',
  'webSearch',
  'getAttachmentContext',
  'fetchWebPageSummary',
  'citeSources',
];

// ─────────────────────────────────────────────
// Limits
// ─────────────────────────────────────────────

/** Maximum length in characters for the user query sent to the planner. */
export const MAX_AGENT_QUERY_LENGTH = 1000;

/** Maximum length in characters for the document content sent as context. */
export const MAX_AGENT_CONTENT_LENGTH = 32000;

/** Maximum number of steps the model is allowed to return in a plan. */
export const MAX_AGENT_PLAN_STEPS = 8;

// ─────────────────────────────────────────────
// Request / Response shapes
// ─────────────────────────────────────────────

export interface AgentRequest {
  /** ID of the brain workspace. */
  brainId: string;
  /** ID of the node being consulted. */
  nodeId: string;
  /** Natural-language query from the user. */
  userQuery: string;
  /** Optional current document content for context (read-only). */
  contentMarkdown?: string;
  /** Whether the user has pre-authorised a web search step. */
  enableWebSearch?: boolean;
}

export interface AgentStep {
  /** 1-indexed position in the plan. */
  stepNumber: number;
  /** Human-readable description of this step. */
  description: string;
  /** The tool estimated to be used in this step (read-only estimation). */
  estimatedTool: AgentToolName;
  /** Reason why this tool was selected for this step. */
  rationale: string;
}

export interface AgentPlan {
  /** Classified intent of the user query. */
  intent: AgentIntent;
  /** Ordered list of planned steps. Max 8. */
  steps: AgentStep[];
  /** De-duplicated list of all tools referenced across steps. */
  estimatedTools: AgentToolName[];
  /** True if any step would require a live web search. */
  requiresWebSearch: boolean;
  /** True if the plan includes applying changes to the draft (requires explicit user approval). */
  requiresUserConfirmation: boolean;
  /** Short human-readable summary of the plan (1–3 sentences). */
  planSummary: string;
  /** Non-critical warnings (e.g. unknown tools stripped, steps truncated). */
  warnings?: string[];
}

// ─────────────────────────────────────────────
// Helper validators
// ─────────────────────────────────────────────

/** Returns true if the value is a valid AgentIntent. */
export function isValidAgentIntent(value: unknown): value is AgentIntent {
  return typeof value === 'string' && (AGENT_INTENTS as string[]).includes(value);
}

/** Returns true if the value is a valid AgentToolName. */
export function isValidAgentToolName(value: unknown): value is AgentToolName {
  return typeof value === 'string' && (AGENT_TOOL_NAMES as string[]).includes(value);
}

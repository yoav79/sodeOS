import 'server-only';
import { BrainRole } from '@prisma/client';

// ─────────────────────────────────────────────
// Shared Context & Registry Interfaces
// ─────────────────────────────────────────────

export interface AgentToolContext {
  userId: string;
  brainId: string;
  nodeId: string;
  role: BrainRole;
  requestId?: string;
  maxSteps: number;
  enableWebSearch?: boolean;
}

export interface AgentToolResult<T = unknown> {
  ok: true;
  toolName: string;
  data: T;
  warnings?: string[];
  meta?: {
    itemCount?: number;
    truncated?: boolean;
    charCount?: number;
  };
}

export interface AgentToolError {
  ok: false;
  toolName: string;
  code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR' | 'LIMIT_EXCEEDED';
  message: string;
}

export type AgentToolResponse<T = unknown> = AgentToolResult<T> | AgentToolError;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AgentToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description: string;
  execute: (ctx: AgentToolContext, input: TInput) => Promise<AgentToolResponse<TOutput>>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AgentToolRegistry = Map<string, AgentToolDefinition<any, any>>;

// ─────────────────────────────────────────────
// Execution limits
// ─────────────────────────────────────────────

export const MAX_TOOL_TREE_NODES = 200;
export const MAX_TOOL_SEARCH_RESULTS = 10;
export const MAX_TOOL_CONTENT_CHARS = 8000;
export const MAX_TOOL_VERSIONS = 5;
export const MAX_TOOL_VERSION_CONTENT_CHARS = 2000;
export const MAX_TOOL_SEARCH_QUERY_LENGTH = 100;
export const MAX_TOOL_SNIPPET_CHARS = 200;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export function truncateText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }
  return {
    text: text.slice(0, maxChars),
    truncated: true,
  };
}

export function makeSuccessResult<T>(toolName: string, data: T, meta?: AgentToolResult<T>['meta'], warnings?: string[]): AgentToolResult<T> {
  return {
    ok: true,
    toolName,
    data,
    ...(meta ? { meta } : {}),
    ...(warnings && warnings.length > 0 ? { warnings } : {}),
  };
}

export function makeErrorResult(toolName: string, code: AgentToolError['code'], message: string): AgentToolError {
  return {
    ok: false,
    toolName,
    code,
    message,
  };
}

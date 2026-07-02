import 'server-only';
import { AgentToolName } from '../types';
import { AgentRunStatus } from '../run/types';

export type AgentOutputMode =
  | 'answer'
  | 'proposal'
  | 'summary'
  | 'rewrite'
  | 'structure';

export type AgentFinalizeSourceType =
  | 'current_document'
  | 'brain_tree'
  | 'brain_search'
  | 'node'
  | 'node_version'
  | 'web_search'
  | 'attachment_text';

export interface AgentFinalizeSource {
  toolName: AgentToolName;
  type: AgentFinalizeSourceType;
  label: string;
  truncated?: boolean;
  url?: string;
  snippet?: string;
}

export interface AgentFinalizeResult {
  success: boolean;
  finalMarkdown: string;
  outputMode: AgentOutputMode;
  sources: AgentFinalizeSource[];
  warnings: string[];
  metadata: {
    model: string;
    tokensUsed?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    runId: string;
    runStatus: AgentRunStatus;
    observationsUsed: number;
    contextChars: number;
  };
  canApplyToDraft: boolean;
}

export const MAX_AGENT_FINALIZER_CONTEXT_CHARS = 18000;
export const MAX_AGENT_FINALIZER_CONTENT_CHARS = 4000;
export const MAX_AGENT_FINALIZER_QUERY_CHARS = 500;

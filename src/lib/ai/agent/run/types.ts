import 'server-only';
import { AgentPlan, AgentToolName } from '../types';

export const MAX_AGENT_RUN_EXECUTABLE_STEPS = 5;
export const MAX_AGENT_RUN_OBSERVATIONS = 5;
export const MAX_AGENT_RUN_OBSERVATION_CHARS = 25000;

export type AgentRunStatus = 'success' | 'partial_success' | 'failed';
export type AgentStepStatus = 'executed' | 'skipped' | 'failed';

export interface AgentRunRequest {
  brainId: string;
  nodeId: string;
  userQuery: string;
  contentMarkdown?: string;
  approvedPlan: AgentPlan;
  enableWebSearch?: boolean;
  maxSteps?: number;
  inputsMap?: Record<string | number, Record<string, unknown>>;
}

export interface AgentObservation {
  stepNumber: number;
  toolName: AgentToolName;
  ok: boolean;
  data?: unknown;
  errorMessage?: string;
  errorCode?: string;
  warnings?: string[];
  meta?: {
    charCount?: number;
    itemCount?: number;
    truncated?: boolean;
  };
}

export interface AgentRunStepResult {
  stepNumber: number;
  description: string;
  estimatedTool: AgentToolName;
  status: AgentStepStatus;
  observation?: AgentObservation;
  skippedReason?: 'unsupported_tool' | 'max_steps_limit';
}

export interface AgentRunResult {
  runId: string;
  status: AgentRunStatus;
  steps: AgentRunStepResult[];
  observations: AgentObservation[];
  summary: {
    totalSteps: number;
    executedSteps: number;
    skippedSteps: number;
    failedSteps: number;
    totalChars: number;
  };
  warnings?: string[];
}

export interface AgentRunError {
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_PLAN' | 'TIMEOUT' | 'BAD_REQUEST' | 'INTERNAL_ERROR';
}

import 'server-only';

export type BrainQueryOutputMode = 'answer' | 'summary';

export type BrainQuerySourceType = 'document' | 'attachment_text';

export interface BrainQueryRequest {
  brainId: string;
  query: string;
  outputMode?: BrainQueryOutputMode;
}

export interface BrainQuerySource {
  type: BrainQuerySourceType;
  id?: string;
  title?: string;
  nodeId?: string;
  attachmentId?: string;
  filename?: string;
  chunkId?: string;
  chunkIndex?: number;
}

export interface BrainQueryTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface BrainQueryMetadata {
  model?: string;
  tokensUsed?: BrainQueryTokenUsage;
}

export interface BrainQuerySuccessResponse {
  success: true;
  answer: string;
  sources: BrainQuerySource[];
  metadata?: BrainQueryMetadata;
  warnings?: string[];
}

export type BrainQueryErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'NO_CONTEXT'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'AI_PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface BrainQueryErrorResponse {
  success: false;
  error: string;
  code: BrainQueryErrorCode;
}

export type BrainQueryResponse = BrainQuerySuccessResponse | BrainQueryErrorResponse;

export interface BrainQueryContextItem {
  source: BrainQuerySource;
  text: string;
  score?: number;
}

export interface BrainQueryContextResult {
  items: BrainQueryContextItem[];
  contextText: string;
  sources: BrainQuerySource[];
  warnings: string[];
}

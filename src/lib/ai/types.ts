import 'server-only';

export type AIDocumentAction = 'create' | 'format' | 'grammar' | 'spelling' | 'metadata';

export const AI_DOCUMENT_ACTIONS: AIDocumentAction[] = ['create', 'format', 'grammar', 'spelling', 'metadata'];

export const MAX_AI_INSTRUCTION_LENGTH = 500;
export const MAX_AI_CONTENT_LENGTH = 50000;

export interface AIDocumentPayload {
  brainId: string;
  nodeId: string;
  action: AIDocumentAction;
  instruction?: string;
  contentMarkdown: string;
}

export interface AIDocumentResponse {
  proposal: string;
  model: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  model: string;
  usage?: OpenAIUsage;
  error?: {
    message: string;
  };
}

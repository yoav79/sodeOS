import 'server-only';
import { AIDocumentAction, OpenAIResponse } from './types';
import { getSystemPrompt, getUserPrompt } from './prompts';

export class AIConfigError extends Error {
  code: 'AI_NOT_CONFIGURED';
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigError';
    this.code = 'AI_NOT_CONFIGURED';
  }
}

export interface GenerateProposalResult {
  proposal: string;
  model: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function generateProposal(
  action: AIDocumentAction,
  title: string,
  contentMarkdown: string,
  instruction?: string
): Promise<GenerateProposalResult> {
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const maxTokensStr = process.env.AI_MAX_TOKENS;
  const maxTokens = maxTokensStr ? parseInt(maxTokensStr, 10) : 2000;

  if (!apiKey || apiKey.trim() === '') {
    throw new AIConfigError('El proveedor de IA no está configurado (falta API Key).');
  }

  if (provider !== 'openai') {
    throw new Error(`Proveedor de IA no soportado: ${provider}`);
  }

  const systemPrompt = getSystemPrompt();
  const userPrompt = getUserPrompt(action, title, contentMarkdown, instruction);

  try {
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
          { role: 'user', content: userPrompt }
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

    const proposal = data.choices[0]?.message?.content || '';

    return {
      proposal,
      model: data.model,
      tokensUsed: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  } catch (error: unknown) {
    if (error instanceof AIConfigError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Error interno al procesar con IA.';
    throw new Error(message);
  }
}

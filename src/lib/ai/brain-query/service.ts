import 'server-only';

import { getBrainQueryContext } from './context';
import { BRAIN_QUERY_SYSTEM_PROMPT, buildBrainQueryUserPrompt } from './prompts';
import type {
  BrainQueryRequest,
  BrainQueryResponse,
  BrainQueryOutputMode,
} from './types';
import type { OpenAIResponse } from '../types';

/**
 * Runs a read-only query against the given brain.
 * Retrieves relevant context from documents and attachments, constructs prompts,
 * and calls the LLM provider to obtain a synthetic answer.
 */
export async function runBrainQuery(request: BrainQueryRequest): Promise<BrainQueryResponse> {
  const { brainId, query } = request;
  const outputMode: BrainQueryOutputMode = request.outputMode || 'answer';

  // 1. Inputs validation
  if (!brainId || typeof brainId !== 'string' || brainId.trim() === '') {
    return {
      success: false,
      error: 'El campo "brainId" es requerido y no puede estar vacío.',
      code: 'INVALID_INPUT',
    };
  }

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return {
      success: false,
      error: 'La consulta ("query") es requerida y no puede estar vacía.',
      code: 'INVALID_INPUT',
    };
  }

  if (query.length > 1000) {
    return {
      success: false,
      error: 'La consulta no puede superar los 1000 caracteres.',
      code: 'INVALID_INPUT',
    };
  }

  if (outputMode !== 'answer' && outputMode !== 'summary') {
    return {
      success: false,
      error: 'El modo de salida solicitado ("outputMode") no es válido. Debe ser "answer" o "summary".',
      code: 'INVALID_INPUT',
    };
  }

  // 2. Retrieve context from documents and chunks
  let contextResult;
  try {
    contextResult = await getBrainQueryContext({
      brainId: brainId.trim(),
      query: query.trim(),
    });
  } catch (err: unknown) {
    console.error('Error retrieving brain query context:', err);
    return {
      success: false,
      error: 'Error al recuperar el contexto del cerebro.',
      code: 'INTERNAL_ERROR',
    };
  }

  // Bypass the LLM call for deterministic responses (such as document_metadata)
  if (contextResult.shouldCallLlm === false && contextResult.deterministicAnswer) {
    return {
      success: true,
      answer: contextResult.deterministicAnswer,
      sources: contextResult.sources,
      warnings: contextResult.warnings.length > 0 ? contextResult.warnings : undefined,
    };
  }

  const hasContextText = contextResult.contextText.trim().length > 0;
  const hasItems = contextResult.items && contextResult.items.length > 0;

  // 3. Handle case when no context is found (do not call the AI provider)
  if (!hasContextText || !hasItems) {
    return {
      success: true,
      answer: 'No se ha encontrado contexto suficiente en el cerebro para responder a la consulta.',
      sources: [],
      warnings: contextResult.warnings,
    };
  }

  // 4. Retrieve and validate LLM provider configuration
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const maxTokensStr = process.env.AI_MAX_TOKENS;
  const maxTokens = maxTokensStr ? parseInt(maxTokensStr, 10) : 2000;

  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      error: 'El proveedor de IA no está configurado (falta API Key).',
      code: 'AI_PROVIDER_UNAVAILABLE',
    };
  }

  if (provider !== 'openai') {
    return {
      success: false,
      error: `Proveedor de IA no soportado: ${provider}`,
      code: 'AI_PROVIDER_UNAVAILABLE',
    };
  }

  // 5. Build prompts
  const systemPrompt = BRAIN_QUERY_SYSTEM_PROMPT;
  const userPrompt = buildBrainQueryUserPrompt({
    query: query.trim(),
    contextText: contextResult.contextText,
    outputMode,
    sources: contextResult.sources,
  });

  // 6. Call the OpenAI completions API
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
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response from OpenAI API in brain query:', errorText);
      return {
        success: false,
        error: `Error de comunicación con el proveedor de IA: ${response.statusText}`,
        code: 'AI_PROVIDER_ERROR',
      };
    }

    const data: OpenAIResponse = await response.json();

    if (data.error) {
      return {
        success: false,
        error: data.error.message,
        code: 'AI_PROVIDER_ERROR',
      };
    }

    const answer = data.choices[0]?.message?.content || '';

    return {
      success: true,
      answer: answer.trim(),
      sources: contextResult.sources,
      warnings: contextResult.warnings.length > 0 ? contextResult.warnings : undefined,
      metadata: {
        model: data.model || model,
        tokensUsed: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      },
    };
  } catch (error: unknown) {
    console.error('Unexpected error in runBrainQuery provider call:', error);
    const message = error instanceof Error ? error.message : 'Error interno al procesar con IA.';
    return {
      success: false,
      error: message,
      code: 'INTERNAL_ERROR',
    };
  }
}

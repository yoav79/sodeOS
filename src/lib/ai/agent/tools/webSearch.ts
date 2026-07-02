import 'server-only';
import { AgentToolDefinition, makeSuccessResult, makeErrorResult } from './types';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface WebSearchInput {
  query: string;
  maxResults?: number;
}

export interface WebSearchOutput {
  query: string;
  provider: 'serper';
  results: WebSearchResult[];
}

export const webSearch: AgentToolDefinition<WebSearchInput, WebSearchOutput> = {
  name: 'webSearch',
  description: 'Busca información relevante en internet usando un motor de búsqueda externo. Requiere consentimiento explícito y permisos de edición.',
  execute: async (ctx, input) => {
    // 1. Consent validation
    if (!ctx.enableWebSearch) {
      return makeErrorResult(
        'webSearch',
        'FORBIDDEN',
        'No se ha proporcionado consentimiento para realizar búsquedas en la web externa.'
      );
    }

    // 2. Role validation (only owner or editor allowed)
    if (ctx.role === 'reader') {
      return makeErrorResult(
        'webSearch',
        'FORBIDDEN',
        'Los usuarios con rol de lector no están autorizados a realizar búsquedas web.'
      );
    }

    // 3. Input validation
    if (!input || typeof input.query !== 'string') {
      return makeErrorResult(
        'webSearch',
        'VALIDATION_ERROR',
        'La consulta de búsqueda "query" es requerida y debe ser un texto.'
      );
    }

    const trimmedQuery = input.query.trim();
    if (trimmedQuery.length < 3) {
      return makeErrorResult(
        'webSearch',
        'VALIDATION_ERROR',
        'La consulta de búsqueda debe tener al menos 3 caracteres.'
      );
    }

    if (trimmedQuery.length > 200) {
      return makeErrorResult(
        'webSearch',
        'VALIDATION_ERROR',
        'La consulta de búsqueda no puede superar los 200 caracteres.'
      );
    }

    const maxResults = Math.min(Math.max(1, input.maxResults ?? 5), 5);

    // 4. API Key validation
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      return makeErrorResult(
        'webSearch',
        'INTERNAL_ERROR',
        'El proveedor de búsqueda web (Serper) no está configurado en el servidor.'
      );
    }

    // 5. Fetch search results with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: trimmedQuery,
          num: maxResults,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[webSearch] Serper API error status:', response.status);
        return makeErrorResult(
          'webSearch',
          'INTERNAL_ERROR',
          `Error al consultar el proveedor de búsqueda externo (Código: ${response.status}).`
        );
      }

      interface SerperResultItem {
        title?: string;
        link?: string;
        snippet?: string;
        date?: string;
      }

      const data = (await response.json()) as { organic?: SerperResultItem[] };
      const organic = data.organic;

      if (!Array.isArray(organic) || organic.length === 0) {
        return makeSuccessResult(
          'webSearch',
          {
            query: trimmedQuery,
            provider: 'serper',
            results: [],
          },
          { itemCount: 0 },
          ['No se encontraron resultados relevantes en la web.']
        );
      }

      // 6. Map and sanitize results (Strict privacy: no HTML, limit snippet to 300 chars)
      const results: WebSearchResult[] = organic.slice(0, maxResults).map((item) => {
        let snippet = item.snippet || '';
        // Basic HTML tag stripping
        snippet = snippet.replace(/<\/?[^>]+(>|$)/g, '');
        if (snippet.length > 300) {
          snippet = snippet.slice(0, 300) + '...';
        }

        return {
          title: item.title || 'Sin título',
          url: item.link || '',
          snippet,
          ...(item.date ? { publishedAt: item.date } : {}),
        };
      });

      return makeSuccessResult(
        'webSearch',
        {
          query: trimmedQuery,
          provider: 'serper',
          results,
        },
        { itemCount: results.length }
      );

    } catch (error: unknown) {
      clearTimeout(timeoutId);
      console.error('[webSearch] Exception during Serper fetch:', error);
      const isAbort = error instanceof Error && error.name === 'AbortError';
      return makeErrorResult(
        'webSearch',
        'INTERNAL_ERROR',
        isAbort
          ? 'La búsqueda web externa ha superado el tiempo de espera límite (8 segundos).'
          : error instanceof Error ? error.message : 'Error inesperado al conectar con el motor de búsqueda.'
      );
    }
  },
};

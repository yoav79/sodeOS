import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess } from '@/lib/auth';
import { runBrainQuery } from '@/lib/ai/brain-query/service';
import type { BrainQueryRequest } from '@/lib/ai/brain-query/types';
import db from '@/lib/db';
import { recordUsage } from '@/lib/usage';
import { UsageFeature } from '@prisma/client';
import { assertWithinLimit, UsageLimitError } from '@/lib/limits';

export const runtime = 'nodejs';

interface RawQueryRequestBody {
  brainId?: unknown;
  query?: unknown;
  outputMode?: unknown;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'No autenticado.', code: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }

    // 2. Parse request JSON body
    let body: RawQueryRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Payload JSON inválido.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    const { brainId, query, outputMode } = body;

    // 3. Validate required fields
    if (!brainId || typeof brainId !== 'string' || brainId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'El campo "brainId" es requerido.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // UUID format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(brainId)) {
      return NextResponse.json(
        { success: false, error: 'El campo "brainId" debe ser un UUID válido.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'La consulta ("query") es requerida.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'La consulta no puede superar los 1000 caracteres.', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // 4. Validate optional fields
    if (outputMode !== undefined) {
      if (outputMode !== 'answer' && outputMode !== 'summary') {
        return NextResponse.json(
          {
            success: false,
            error: 'El campo "outputMode" especificado no es válido. Debe ser "answer" o "summary".',
            code: 'INVALID_INPUT',
          },
          { status: 400 }
        );
      }
    }

    // 5. Verify brain access (minimum reader role required)
    try {
      await verifyBrainAccess(currentUser.id, brainId, 'reader');
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'El cerebro especificado no existe o no tienes acceso.',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // 6. Fetch organization info to check and assert limits
    const brain = await db.brain.findUnique({
      where: { id: brainId },
      select: {
        id: true,
        organization: {
          select: {
            id: true,
            plan: true,
          },
        },
      },
    });

    if (!brain || !brain.organization) {
      return NextResponse.json(
        {
          success: false,
          error: 'El cerebro especificado no existe o no tienes acceso.',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const organizationId = brain.organization.id;
    const plan = brain.organization.plan;

    // 7. Check usage limits before invoking LLM generation
    await assertWithinLimit({
      organizationId,
      plan,
      check: 'ai_requests',
      incrementBy: 1,
    });

    // 8. Invoke internal service
    const serviceRequest: BrainQueryRequest = {
      brainId,
      query,
      outputMode: outputMode as 'answer' | 'summary' | undefined,
    };

    const result = await runBrainQuery(serviceRequest);

    // 9. If query was successful, record usage and return 200
    if (result.success) {
      if (result.metadata?.tokensUsed) {
        await recordUsage({
          organizationId,
          feature: UsageFeature.ai_agent,
          userId: currentUser.id,
          brainId,
          quantity: 1,
          tokensPrompt: result.metadata.tokensUsed.promptTokens ?? null,
          tokensCompletion: result.metadata.tokensUsed.completionTokens ?? null,
          tokensTotal: result.metadata.tokensUsed.totalTokens ?? null,
          metadata: {
            stage: 'brain_query',
            model: result.metadata.model || 'gpt-4o-mini',
            route: '/api/ai/brain/query',
          },
        });
      }

      return NextResponse.json(result, { status: 200 });
    }

    // 10. Map service error code to HTTP status
    let status = 500;
    switch (result.code) {
      case 'INVALID_INPUT':
        status = 400;
        break;
      case 'UNAUTHENTICATED':
        status = 401;
        break;
      case 'FORBIDDEN':
        status = 403;
        break;
      case 'NOT_FOUND':
        status = 404;
        break;
      case 'AI_PROVIDER_UNAVAILABLE':
        status = 503;
        break;
      case 'AI_PROVIDER_ERROR':
        status = 502;
        break;
      case 'RATE_LIMITED':
        status = 429;
        break;
      case 'INTERNAL_ERROR':
      default:
        status = 500;
        break;
    }

    return NextResponse.json(result, { status });
  } catch (error: unknown) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        { success: false, error: error.message, code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }
    console.error('[brain/query] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

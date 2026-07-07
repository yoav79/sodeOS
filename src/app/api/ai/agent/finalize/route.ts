import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { generateAgentFinalResponse } from '@/lib/ai/agent/finalizer';
import { AgentRunResult } from '@/lib/ai/agent/run/types';
import { AgentOutputMode } from '@/lib/ai/agent/finalize/types';
import db from '@/lib/db';
import { recordUsage } from '@/lib/usage';
import { UsageFeature } from '@prisma/client';
import { assertWithinLimit, UsageLimitError } from '@/lib/limits';

export const runtime = 'nodejs';

interface RawFinalizeRequestBody {
  brainId?: unknown;
  nodeId?: unknown;
  userQuery?: unknown;
  runResult?: {
    runId?: unknown;
    status?: unknown;
    steps?: unknown[];
    observations?: unknown[];
    summary?: unknown;
    warnings?: unknown;
  };
  outputMode?: unknown;
  contentMarkdown?: unknown;
  enableWebSearch?: unknown;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Parse request JSON body
    let body: RawFinalizeRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
    }

    const { brainId, nodeId, userQuery, runResult, outputMode, contentMarkdown, enableWebSearch } = body;

    // 3. Validate required fields
    if (!brainId || typeof brainId !== 'string' || brainId.trim() === '') {
      return NextResponse.json({ error: 'El campo "brainId" es requerido.' }, { status: 400 });
    }

    if (!nodeId || typeof nodeId !== 'string' || nodeId.trim() === '') {
      return NextResponse.json({ error: 'El campo "nodeId" es requerido.' }, { status: 400 });
    }

    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim() === '') {
      return NextResponse.json({ error: 'El campo "userQuery" es requerido.' }, { status: 400 });
    }

    if (!runResult || typeof runResult !== 'object') {
      return NextResponse.json({ error: 'El campo "runResult" es requerido.' }, { status: 400 });
    }

    // Validate runResult basic structure
    if (typeof runResult.status !== 'string' || !Array.isArray(runResult.observations)) {
      return NextResponse.json({ error: 'Estructura de "runResult" inválida.' }, { status: 400 });
    }

    // Reject if runResult.status is failed and has no ok observations
    const hasOkObservations = runResult.observations.some(
      (obs) => obs && typeof obs === 'object' && 'ok' in obs && (obs as { ok?: unknown }).ok === true
    );
    if (!hasOkObservations) {
      return NextResponse.json(
        { error: 'No se encontraron observaciones exitosas en el resultado de ejecución para realizar la finalización.' },
        { status: 400 }
      );
    }

    // 4. Validate optional fields
    if (outputMode !== undefined) {
      const validModes: AgentOutputMode[] = ['answer', 'proposal', 'summary', 'rewrite', 'structure'];
      if (!validModes.includes(outputMode as AgentOutputMode)) {
        return NextResponse.json({ error: 'El campo "outputMode" especificado no es válido.' }, { status: 400 });
      }
    }

    if (contentMarkdown !== undefined) {
      if (typeof contentMarkdown !== 'string') {
        return NextResponse.json({ error: 'El campo "contentMarkdown" debe ser una cadena de texto.' }, { status: 400 });
      }
      if (contentMarkdown.length > 100000) {
        return NextResponse.json({ error: 'El campo "contentMarkdown" excede el tamaño máximo permitido.' }, { status: 400 });
      }
    }

    if (enableWebSearch !== undefined && typeof enableWebSearch !== 'boolean') {
      return NextResponse.json({ error: 'El campo "enableWebSearch" debe ser un booleano.' }, { status: 400 });
    }

    // 5. Verify node existence and association to the brain
    const node = await db.node.findFirst({
      where: {
        id: nodeId,
        brainId: brainId,
        deletedAt: null,
      },
      select: {
        id: true,
        brain: {
          select: {
            organization: {
              select: {
                id: true,
                plan: true,
              }
            }
          }
        }
      },
    });

    if (!node) {
      return NextResponse.json(
        { error: 'Nodo no encontrado o no pertenece a este espacio de trabajo.' },
        { status: 404 }
      );
    }

    // 6. Verify brain access (minimum reader role required)
    try {
      await verifyBrainAccess(currentUser.id, brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const organizationId = node.brain.organization.id;
    const plan = node.brain.organization.plan;

    // Check usage limits before finalize LLM generation
    await assertWithinLimit({
      organizationId,
      plan,
      check: 'ai_requests',
      incrementBy: 1,
    });

    // 7. Invoke generateAgentFinalResponse to perform LLM call
    const result = await generateAgentFinalResponse({
      runResult: runResult as AgentRunResult,
      userQuery,
      outputMode: outputMode as AgentOutputMode,
      contentMarkdown: contentMarkdown as string,
      enableWebSearch: enableWebSearch !== undefined ? Boolean(enableWebSearch) : undefined,
    });

    await recordUsage({
      organizationId,
      feature: UsageFeature.ai_agent,
      userId: currentUser.id,
      brainId,
      nodeId,
      quantity: 1,
      tokensPrompt: result.metadata.tokensUsed?.promptTokens ?? null,
      tokensCompletion: result.metadata.tokensUsed?.completionTokens ?? null,
      tokensTotal: result.metadata.tokensUsed?.totalTokens ?? null,
      metadata: {
        stage: 'finalize',
        model: result.metadata.model,
        route: '/api/ai/agent/finalize',
      },
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('[agent/finalize] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { AgentRequest, MAX_AGENT_QUERY_LENGTH, MAX_AGENT_CONTENT_LENGTH } from '@/lib/ai/agent/types';
import { createAgentPlan, AgentPlanError } from '@/lib/ai/agent/planner';
import db from '@/lib/db';
import { recordUsage } from '@/lib/usage';
import { UsageFeature } from '@prisma/client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Parse JSON body
    let body: AgentRequest & { enableWebSearch?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
    }

    const { brainId, nodeId, userQuery, contentMarkdown, enableWebSearch } = body;

    // 3. Validate required fields ─────────────────────────────────────────

    if (!brainId || typeof brainId !== 'string' || brainId.trim() === '') {
      return NextResponse.json({ error: 'El campo "brainId" es requerido.' }, { status: 400 });
    }

    if (!nodeId || typeof nodeId !== 'string' || nodeId.trim() === '') {
      return NextResponse.json({ error: 'El campo "nodeId" es requerido.' }, { status: 400 });
    }

    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim() === '') {
      return NextResponse.json({ error: 'El campo "userQuery" es requerido.' }, { status: 400 });
    }

    if (userQuery.length > MAX_AGENT_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `La consulta no puede superar los ${MAX_AGENT_QUERY_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    // 4. Validate optional fields ─────────────────────────────────────────

    if (contentMarkdown !== undefined && typeof contentMarkdown !== 'string') {
      return NextResponse.json(
        { error: 'El campo "contentMarkdown" debe ser un string.' },
        { status: 400 }
      );
    }

    if (typeof contentMarkdown === 'string' && contentMarkdown.length > MAX_AGENT_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `El contenido del documento no puede superar los ${MAX_AGENT_CONTENT_LENGTH} caracteres.` },
        { status: 413 }
      );
    }

    if (enableWebSearch !== undefined && typeof enableWebSearch !== 'boolean') {
      return NextResponse.json(
        { error: 'El campo "enableWebSearch" debe ser un booleano.' },
        { status: 400 }
      );
    }

    // 5. Verify node existence and association to the brain ───────────────

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
            organizationId: true,
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

    // 6. Verify brain access (minimum reader role) ─────────────────────────

    try {
      await verifyBrainAccess(currentUser.id, brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // 7. Build plan input ─────────────────────────────────────────────────
    // SAFETY: contentMarkdown is passed as context only; it is never written back.
    // We deliberately do NOT log contentMarkdown to avoid leaking sensitive content.

    const agentInput: AgentRequest = {
      brainId,
      nodeId,
      userQuery,
      ...(typeof contentMarkdown === 'string' ? { contentMarkdown } : {}),
      enableWebSearch: enableWebSearch === true,
    };

    // 8. Generate plan (read-only — no tools executed, no DB writes) ───────

    const result = await createAgentPlan(agentInput);

    await recordUsage({
      organizationId: node.brain.organizationId,
      feature: UsageFeature.ai_agent,
      userId: currentUser.id,
      brainId,
      nodeId,
      quantity: 1,
      tokensPrompt: result.tokensUsed?.promptTokens ?? null,
      tokensCompletion: result.tokensUsed?.completionTokens ?? null,
      tokensTotal: result.tokensUsed?.totalTokens ?? null,
      metadata: {
        stage: 'plan',
        model: result.model,
        route: '/api/ai/agent/plan',
      },
    });

    return NextResponse.json(result.plan, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof AgentPlanError) {
      if (error.code === 'AI_CONFIG_ERROR') {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      // PLAN_PARSE_ERROR or PLAN_INVALID_SCHEMA
      return NextResponse.json(
        { error: `Error al generar el plan: ${error.message}` },
        { status: 422 }
      );
    }

    console.error('[agent/plan] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

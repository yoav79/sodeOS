import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { AgentToolContext } from '@/lib/ai/agent/tools';
import { executeAgentPlan } from '@/lib/ai/agent/run/executor';
import { MAX_AGENT_PLAN_STEPS, AgentPlan } from '@/lib/ai/agent/types';
import db from '@/lib/db';
import { recordUsage } from '@/lib/usage';
import { UsageFeature } from '@prisma/client';
import { assertWithinLimit, UsageLimitError } from '@/lib/limits';

export const runtime = 'nodejs';

interface RawRequestBody {
  brainId?: unknown;
  nodeId?: unknown;
  userQuery?: unknown;
  approvedPlan?: {
    intent?: unknown;
    steps?: unknown[];
    estimatedTools?: unknown[];
    requiresWebSearch?: unknown;
    requiresUserConfirmation?: unknown;
    planSummary?: unknown;
    warnings?: unknown;
  };
  enableWebSearch?: unknown;
  maxSteps?: unknown;
  inputsMap?: Record<string | number, Record<string, unknown>>;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Parse request JSON body
    let body: RawRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
    }

    const { brainId, nodeId, userQuery, approvedPlan, enableWebSearch, maxSteps, inputsMap } = body;

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

    if (!approvedPlan || typeof approvedPlan !== 'object') {
      return NextResponse.json({ error: 'El campo "approvedPlan" es requerido.' }, { status: 400 });
    }

    if (!Array.isArray(approvedPlan.steps) || approvedPlan.steps.length === 0) {
      return NextResponse.json({ error: 'El plan aprobado debe contener un array "steps" no vacío.' }, { status: 400 });
    }

    if (approvedPlan.steps.length > MAX_AGENT_PLAN_STEPS) {
      return NextResponse.json(
        { error: `El número máximo de pasos permitidos en un plan es de ${MAX_AGENT_PLAN_STEPS}.` },
        { status: 400 }
      );
    }

    // 4. Validate optional fields
    if (enableWebSearch !== undefined && typeof enableWebSearch !== 'boolean') {
      return NextResponse.json({ error: 'El campo "enableWebSearch" debe ser un booleano.' }, { status: 400 });
    }

    if (maxSteps !== undefined) {
      if (typeof maxSteps !== 'number' || isNaN(maxSteps) || maxSteps < 1 || maxSteps > 5) {
        return NextResponse.json({ error: 'El campo "maxSteps" debe ser un número entero entre 1 y 5.' }, { status: 400 });
      }
    }

    if (inputsMap !== undefined && typeof inputsMap !== 'object') {
      return NextResponse.json({ error: 'El campo "inputsMap" debe ser un objeto.' }, { status: 400 });
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
    let membership;
    try {
      membership = await verifyBrainAccess(currentUser.id, brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // Role check for external web search
    if (enableWebSearch === true && membership.role === 'reader') {
      return NextResponse.json(
        { error: 'Los usuarios con rol de lector no están autorizados a realizar búsquedas web.' },
        { status: 403 }
      );
    }

    const organizationId = node.brain.organization.id;
    const plan = node.brain.organization.plan;

    // Calculate estimated web search steps from the approved plan
    const estimatedWebSearchCount = (approvedPlan.steps as { estimatedTool?: string }[]).filter(
      (step) => step?.estimatedTool === 'webSearch'
    ).length;

    // Verify web search limits before execution if the plan contains web search steps
    if (estimatedWebSearchCount > 0) {
      await assertWithinLimit({
        organizationId,
        plan,
        check: 'web_searches',
        incrementBy: estimatedWebSearchCount,
      });
    }

    // 7. Construct AgentToolContext server-side
    const context: AgentToolContext = {
      userId: currentUser.id,
      brainId,
      nodeId,
      role: membership.role,
      maxSteps: (maxSteps as number) ?? 5,
      enableWebSearch: Boolean(enableWebSearch),
    };

    // 8. Execute the agent plan sequentially
    const result = await executeAgentPlan(
      context,
      approvedPlan as AgentPlan,
      userQuery,
      inputsMap
    );

    // 9. Record usage of successful web searches
    const actualWebSearchCount = result.observations.filter(
      (observation) =>
        observation.toolName === 'webSearch' &&
        observation.ok === true
    ).length;

    if (actualWebSearchCount > 0) {
      await recordUsage({
        organizationId,
        feature: UsageFeature.web_search,
        userId: currentUser.id,
        brainId,
        nodeId,
        quantity: actualWebSearchCount,
        metadata: {
          tool: 'webSearch',
          route: '/api/ai/agent/run',
          successfulRequests: actualWebSearchCount,
        },
      });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('[agent/run] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

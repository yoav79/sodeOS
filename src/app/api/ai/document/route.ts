import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { AIDocumentPayload, AI_DOCUMENT_ACTIONS, MAX_AI_INSTRUCTION_LENGTH, MAX_AI_CONTENT_LENGTH } from '@/lib/ai/types';
import { generateProposal, AIConfigError } from '@/lib/ai/provider';
import db from '@/lib/db';
import { recordUsage } from '@/lib/usage';
import { UsageFeature } from '@prisma/client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Parse request payload
    let body: AIDocumentPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
    }

    const { brainId, nodeId, action, instruction, contentMarkdown } = body;

    // 3. Payload validation
    if (!brainId || typeof brainId !== 'string' || brainId.trim() === '') {
      return NextResponse.json({ error: 'El campo "brainId" es requerido.' }, { status: 400 });
    }

    if (!nodeId || typeof nodeId !== 'string' || nodeId.trim() === '') {
      return NextResponse.json({ error: 'El campo "nodeId" es requerido.' }, { status: 400 });
    }

    if (!action || !AI_DOCUMENT_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `La acción de IA es inválida. Debe ser una de: ${AI_DOCUMENT_ACTIONS.join(', ')}` }, { status: 400 });
    }

    if (contentMarkdown === undefined || typeof contentMarkdown !== 'string') {
      return NextResponse.json({ error: 'El campo "contentMarkdown" es requerido.' }, { status: 400 });
    }

    if (instruction !== undefined && typeof instruction !== 'string') {
      return NextResponse.json({ error: 'El campo "instruction" debe ser un string.' }, { status: 400 });
    }

    if (instruction && instruction.length > MAX_AI_INSTRUCTION_LENGTH) {
      return NextResponse.json({ error: `La instrucción no puede superar los ${MAX_AI_INSTRUCTION_LENGTH} caracteres.` }, { status: 400 });
    }

    if (contentMarkdown.length > MAX_AI_CONTENT_LENGTH) {
      return NextResponse.json({ error: `El contenido del documento no puede superar los ${MAX_AI_CONTENT_LENGTH} caracteres.` }, { status: 413 });
    }

    // 4. Verify node existence and association to the brain, retrieving organizationId
    const node = await db.node.findFirst({
      where: {
        id: nodeId,
        brainId: brainId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        brain: {
          select: {
            organizationId: true,
          }
        }
      }
    });

    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado o no pertenece a este espacio de trabajo.' }, { status: 404 });
    }

    // 5. Authorize access (reader access required)
    try {
      await verifyBrainAccess(currentUser.id, brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // TODO: Implement rate limiting here in the future if infrastructure is available

    // 6. Generate proposal using server side provider
    const result = await generateProposal(action, node.title, contentMarkdown, instruction);

    // 7. Record usage (fault tolerant — does not throw on failure)
    const organizationId = node.brain.organizationId;
    await recordUsage({
      organizationId,
      feature: UsageFeature.ai_document,
      userId: currentUser.id,
      brainId,
      nodeId,
      quantity: 1,
      tokensPrompt: result.tokensUsed?.promptTokens ?? null,
      tokensCompletion: result.tokensUsed?.completionTokens ?? null,
      tokensTotal: result.tokensUsed?.totalTokens ?? null,
      metadata: {
        action,
        model: result.model,
        route: '/api/ai/document',
      },
    });

    return NextResponse.json({
      proposal: result.proposal,
      model: result.model,
      tokensUsed: result.tokensUsed
    }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Error generating document proposal:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


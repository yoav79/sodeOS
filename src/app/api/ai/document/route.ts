import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { AIDocumentPayload, AI_DOCUMENT_ACTIONS, MAX_AI_INSTRUCTION_LENGTH, MAX_AI_CONTENT_LENGTH } from '@/lib/ai/types';
import { generateProposal, AIConfigError } from '@/lib/ai/provider';
import db from '@/lib/db';
import { recordUsage } from '@/lib/usage';
import { UsageFeature } from '@prisma/client';
import { assertWithinLimit, UsageLimitError } from '@/lib/limits';

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

    // 4. Verify node existence and association to the brain, retrieving organizationId and plan
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
            organization: {
              select: {
                id: true,
                plan: true,
              }
            }
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

    const organizationId = node.brain.organization.id;
    const plan = node.brain.organization.plan;

    // Check usage limit before invoking LLM proposal generation
    await assertWithinLimit({
      organizationId,
      plan,
      check: 'ai_requests',
      incrementBy: 1,
    });

    // 6. Generate proposal using server side provider
    const result = await generateProposal(action, node.title, contentMarkdown, instruction);

    let proposal = result.proposal;

    if (action === 'metadata') {
      try {
        let cleanJson = result.proposal.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```[a-zA-Z]*\n?/, '');
          cleanJson = cleanJson.replace(/\n?```$/, '');
          cleanJson = cleanJson.trim();
        }

        const parsed = JSON.parse(cleanJson);

        const description = typeof parsed.description === 'string'
          ? parsed.description.substring(0, 200).trim()
          : '';

        const category = typeof parsed.category === 'string'
          ? parsed.category.substring(0, 50).trim()
          : '';

        let tags: string[] = [];
        if (Array.isArray(parsed.tags)) {
          const rawTags = parsed.tags
            .map((t: any): string => typeof t === 'string'
              ? t.trim().toLowerCase().replace(/\s+/g, '-').replace(/#/g, '').substring(0, 35)
              : ''
            )
            .filter(Boolean);
          tags = (Array.from(new Set(rawTags)) as string[]).slice(0, 15);
        }

        const revisionNote = typeof parsed.revisionNote === 'string'
          ? parsed.revisionNote.substring(0, 180).trim()
          : 'Sugerencia de revisión generada automáticamente por la IA.';

        proposal = JSON.stringify({
          description,
          category,
          tags,
          revisionNote,
        });
      } catch (err) {
        console.error('Failed to parse metadata JSON from AI proposal:', err, result.proposal);
        return NextResponse.json(
          { error: 'La respuesta de la IA no tiene un formato JSON válido para metadatos.' },
          { status: 502 }
        );
      }
    }

    // 7. Record usage (fault tolerant — does not throw on failure)
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
      proposal,
      model: result.model,
      tokensUsed: result.tokensUsed
    }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('Error generating document proposal:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { getNodeDetail, updateNodeContent, archiveNodeTree } from '@/services/nodeService';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/content/sanitizeHtml';
import db from '@/lib/db';
import { logAuditEvent, AuditAction } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;

    if (!nodeId) {
      return NextResponse.json({ error: 'El ID del nodo es requerido.' }, { status: 400 });
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Fetch node detail
    const node = await getNodeDetail(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

    // 3. Authorize access (reader access required)
    try {
      await verifyBrainAccess(currentUser.id, node.brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ node }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching node detail:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;

    if (!nodeId) {
      return NextResponse.json({ error: 'El ID del nodo es requerido.' }, { status: 400 });
    }

    const body = await request.json();
    const { title, contentMarkdown, status, changeNote, description, category, tags } = body;

    // Payload validation
    if (title === undefined || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'El campo "title" es obligatorio y no puede estar vacío.' },
        { status: 400 }
      );
    }

    if (contentMarkdown === undefined || typeof contentMarkdown !== 'string') {
      return NextResponse.json(
        { error: 'El campo "contentMarkdown" es obligatorio y debe ser un string.' },
        { status: 400 }
      );
    }

    const validStatuses = ['draft', 'active', 'needs_review', 'archived'];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'El estado enviado es inválido. Debe ser uno de: draft, active, needs_review, archived.' },
        { status: 400 }
      );
    }

    // Validate and normalize description
    let normalizedDescription: string | null | undefined = undefined;
    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return NextResponse.json(
          { error: 'El campo "description" debe ser un string o null.' },
          { status: 400 }
        );
      }
      if (typeof description === 'string') {
        const trimmed = description.trim();
        if (trimmed.length === 0) {
          normalizedDescription = null;
        } else if (trimmed.length > 200) {
          return NextResponse.json(
            { error: 'La descripción no puede superar los 200 caracteres.' },
            { status: 400 }
          );
        } else {
          normalizedDescription = trimmed;
        }
      } else {
        normalizedDescription = null;
      }
    }

    // Validate and normalize category
    let normalizedCategory: string | null | undefined = undefined;
    if (category !== undefined) {
      if (category !== null && typeof category !== 'string') {
        return NextResponse.json(
          { error: 'El campo "category" debe ser un string o null.' },
          { status: 400 }
        );
      }
      if (typeof category === 'string') {
        const trimmed = category.trim();
        if (trimmed.length === 0) {
          normalizedCategory = null;
        } else if (trimmed.length > 50) {
          return NextResponse.json(
            { error: 'La categoría no puede superar los 50 caracteres.' },
            { status: 400 }
          );
        } else {
          normalizedCategory = trimmed;
        }
      } else {
        normalizedCategory = null;
      }
    }

    // Validate and normalize tags
    let normalizedTags: string[] | undefined = undefined;
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          { error: 'El campo "tags" debe ser un array de strings.' },
          { status: 400 }
        );
      }

      for (let i = 0; i < tags.length; i++) {
        if (typeof tags[i] !== 'string') {
          return NextResponse.json(
            { error: 'Todos los elementos del campo "tags" deben ser strings.' },
            { status: 400 }
          );
        }
      }

      const processedTags: string[] = [];
      for (const rawTag of tags) {
        const normalized = rawTag.trim().toLowerCase().replace(/\s+/g, ' ');
        if (normalized.length > 0) {
          if (normalized.length > 35) {
            return NextResponse.json(
              { error: `La etiqueta "${normalized}" supera el límite de 35 caracteres.` },
              { status: 400 }
            );
          }
          if (!processedTags.includes(normalized)) {
            processedTags.push(normalized);
          }
        }
      }

      if (processedTags.length > 15) {
        return NextResponse.json(
          { error: 'Un nodo no puede tener más de 15 etiquetas.' },
          { status: 400 }
        );
      }

      normalizedTags = processedTags;
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Fetch node detail to find its brainId
    const node = await getNodeDetail(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

    // 3. Authorize access (editor access required)
    try {
      await verifyBrainAccess(currentUser.id, node.brainId, 'editor');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 403 }
      );
    }

    const result = await updateNodeContent(nodeId, {
      title,
      contentMarkdown: sanitizeHtml(contentMarkdown),
      status: status,
      changeNote,
      userId: currentUser.id,
      description: normalizedDescription,
      category: normalizedCategory,
      tags: normalizedTags,
    });

    if (!result.node) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

    return NextResponse.json(
      { node: result.node, unchanged: result.unchanged },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error updating node:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;

    if (!nodeId) {
      return NextResponse.json({ error: 'El ID del nodo es requerido.' }, { status: 400 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const node = await getNodeDetail(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

    try {
      await verifyBrainAccess(currentUser.id, node.brainId, 'editor');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 403 }
      );
    }

    const brain = await db.brain.findUnique({
      where: { id: node.brainId },
      select: { organizationId: true },
    });
    const organizationId = brain?.organizationId || null;

    const result = await archiveNodeTree(nodeId, currentUser.id);
    if (!result) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

    // Registrar auditoría de archivado de nodo
    await logAuditEvent({
      organizationId,
      actorUserId: currentUser.id,
      action: AuditAction.NODE_ARCHIVED,
      targetType: 'node',
      targetId: nodeId,
      metadata: {
        nodeId: nodeId,
        brainId: node.brainId,
        nodeTitle: node.title,
        archivedDescendantsCount: result.count,
      },
    });

    return NextResponse.json({ success: true, count: result.count }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error deleting node:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}



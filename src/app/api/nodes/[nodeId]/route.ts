import { NextResponse } from 'next/server';
import { getNodeDetail, updateNodeContent, archiveNodeTree } from '@/services/nodeService';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';

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
    const { title, contentMarkdown, status, changeNote } = body;

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
      contentMarkdown,
      status: status,
      changeNote,
      userId: currentUser.id,
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

    const result = await archiveNodeTree(nodeId, currentUser.id);
    if (!result) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

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



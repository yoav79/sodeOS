import { NextResponse } from 'next/server';
import { getNodeDetail, updateNodeContent } from '@/services/nodeService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
    }

    const node = await getNodeDetail(nodeId);

    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado' }, { status: 404 });
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
      return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
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

    // Fijo temporal del usuario demo del seed
    // TODO: Reemplazar por el ID del usuario autenticado cuando exista auth real
    const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

    const result = await updateNodeContent(nodeId, {
      title,
      contentMarkdown,
      status: status,
      changeNote,
      userId: MOCK_USER_ID,
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


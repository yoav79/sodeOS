import { NextResponse } from 'next/server';
import { getNodeDetail, renameNode } from '@/services/nodeService';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;

    if (!nodeId) {
      return NextResponse.json({ error: 'El ID del nodo es requerido.' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de solicitud JSON inválido.' }, { status: 400 });
    }

    const { title } = body;

    if (typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json(
        { error: 'El campo "title" es obligatorio y no puede estar vacío.' },
        { status: 400 }
      );
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
        return NextResponse.json({ error: err.message }, { status: err.status });
      }

      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const result = await renameNode(nodeId, {
      title,
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
    console.error('Error renaming node:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

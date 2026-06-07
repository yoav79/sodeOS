import { NextResponse } from 'next/server';
import { getNodeDetail, moveNode } from '@/services/nodeService';
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

    const body = await request.json();
    const { newParentId, newPosition } = body;

    // Payload validation
    if (newParentId === undefined) {
      return NextResponse.json(
        { error: 'El campo "newParentId" es requerido (puede ser un string UUID o null).' },
        { status: 400 }
      );
    }

    if (newParentId !== null && typeof newParentId !== 'string') {
      return NextResponse.json(
        { error: 'El campo "newParentId" debe ser un string UUID o null.' },
        { status: 400 }
      );
    }

    if (newPosition !== undefined && typeof newPosition !== 'number') {
      return NextResponse.json(
        { error: 'El campo "newPosition" debe ser un número.' },
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

    // 3. Authorize access (editor access required to move/reorder nodes)
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

    // 4. Perform moving logic
    try {
      const updatedNode = await moveNode(
        nodeId,
        {
          newParentId,
          newPosition,
        },
        currentUser.id
      );

      if (!updatedNode) {
        return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
      }

      return NextResponse.json({ node: updatedNode }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al mover el nodo.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error in move node API:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { restoreNodeTree } from '@/services/nodeService';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';

export async function POST(
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

    // 2. Fetch the node to find its brainId and verify it's archived
    const node = await db.node.findUnique({
      where: { id: nodeId },
    });

    if (!node || node.deletedAt === null) {
      return NextResponse.json(
        { error: 'Nodo no encontrado o no está archivado.' },
        { status: 404 }
      );
    }

    // 3. Authorize access (editor role required at minimum to restore)
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

    // 4. Restore node tree
    const result = await restoreNodeTree(nodeId, currentUser.id);
    if (!result) {
      return NextResponse.json(
        { error: 'No se pudo restaurar el nodo.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { restoredNode: result.restoredNode, restoredCount: result.restoredCount },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error restoring node:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

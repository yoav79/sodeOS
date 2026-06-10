import { NextResponse } from 'next/server';
import { getNodeDetail, restoreNodeVersion } from '@/services/nodeService';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ nodeId: string; versionId: string }> }
) {
  try {
    const { nodeId, versionId } = await params;

    if (!nodeId) {
      return NextResponse.json({ error: 'El ID del nodo es requerido.' }, { status: 400 });
    }

    if (!versionId) {
      return NextResponse.json({ error: 'El ID de la versión es requerido.' }, { status: 400 });
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

    // 4. Execute the restoration
    try {
      const restoredNode = await restoreNodeVersion(nodeId, versionId, currentUser.id);
      if (!restoredNode) {
        return NextResponse.json({ error: 'Nodo o versión no encontrados.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, node: restoredNode }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al restaurar la versión.';
      
      // Determine response code based on error message
      if (message.includes('no encontrado') || message.includes('no encontrada')) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      if (message.includes('no pertenece') || message.includes('archivado')) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      
      throw err; // Re-throw to be caught by the outer catch
    }
  } catch (error: unknown) {
    console.error('Error in restore node version route:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

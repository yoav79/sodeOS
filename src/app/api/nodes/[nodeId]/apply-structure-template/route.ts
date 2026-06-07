import { NextResponse } from 'next/server';
import { applyStructureTemplateToNode, getNodeDetail } from '@/services/nodeService';
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

    // Parse payload
    const body = await request.json();
    const { templateId } = body;

    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json({ error: 'El ID de la plantilla es requerido.' }, { status: 400 });
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Fetch node details to get brainId
    const node = await getNodeDetail(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

    // 3. Authorize access (editor required to add subnodes under parent)
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

    // 4. Apply structure template to node
    try {
      const createdNodes = await applyStructureTemplateToNode(nodeId, templateId, currentUser.id);
      return NextResponse.json({ createdNodes }, { status: 201 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al aplicar la plantilla de estructura.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error applying structure template:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

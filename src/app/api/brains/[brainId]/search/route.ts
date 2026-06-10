import { NextResponse } from 'next/server';
import { searchNodesInBrain } from '@/services/nodeService';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brainId: string }> }
) {
  try {
    const { brainId } = await params;

    if (!brainId) {
      return NextResponse.json({ error: 'El ID del cerebro es requerido.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ error: 'La búsqueda debe tener al menos 2 caracteres.' }, { status: 400 });
    }

    if (q.length > 100) {
      return NextResponse.json({ error: 'La búsqueda no puede exceder los 100 caracteres.' }, { status: 400 });
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Authorize access
    try {
      await verifyBrainAccess(currentUser.id, brainId, 'reader');
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

    const results = await searchNodesInBrain(brainId, q);
    return NextResponse.json({ results }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error searching nodes in brain:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

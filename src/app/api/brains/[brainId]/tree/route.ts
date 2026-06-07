import { NextResponse } from 'next/server';
import { getBrainNodeTree } from '@/services/nodeService';
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

    const tree = await getBrainNodeTree(brainId);
    return NextResponse.json({ tree }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching node tree:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


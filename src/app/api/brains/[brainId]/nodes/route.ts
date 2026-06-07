import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { createNode } from '@/services/nodeService';
import { NodeStatus } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ brainId: string }> }
) {
  try {
    const { brainId } = await params;

    if (!brainId) {
      return NextResponse.json(
        { error: 'El ID del cerebro es requerido.' },
        { status: 400 }
      );
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      );
    }

    // 2. Authorize access (minimum 'editor' required to create nodes)
    try {
      await verifyBrainAccess(currentUser.id, brainId, 'editor');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { error: 'No autorizado para crear nodos en este cerebro.' },
        { status: 403 }
      );
    }

    // 3. Parse and validate JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { title, parentId, contentMarkdown, status } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'El título del nodo es obligatorio y no puede estar vacío.' },
        { status: 400 }
      );
    }

    if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
      return NextResponse.json(
        { error: 'El parentId debe ser una cadena de texto o null.' },
        { status: 400 }
      );
    }

    if (contentMarkdown !== undefined && typeof contentMarkdown !== 'string') {
      return NextResponse.json(
        { error: 'El contentMarkdown debe ser una cadena de texto.' },
        { status: 400 }
      );
    }

    const validStatuses: NodeStatus[] = ['draft', 'active', 'needs_review', 'archived'];
    if (status !== undefined && (!validStatuses.includes(status))) {
      return NextResponse.json(
        { error: `El estado del nodo debe ser uno de: ${validStatuses.join(', ')}.` },
        { status: 400 }
      );
    }

    // 4. Create the node
    const newNode = await createNode(brainId, {
      title: title.trim(),
      parentId: parentId || null,
      contentMarkdown: contentMarkdown || '',
      status: (status as NodeStatus) || 'draft',
      userId: currentUser.id,
    });

    return NextResponse.json({ node: newNode }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating node:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

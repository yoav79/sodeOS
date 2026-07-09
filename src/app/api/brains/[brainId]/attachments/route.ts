import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/brains/[brainId]/attachments
 * Lists all attachments across the entire brain (global library).
 * Optional query param: ?nodeId=xxx to filter by source node.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ brainId: string }> }
) {
  try {
    const { brainId } = await params;
    const { searchParams } = new URL(request.url);
    const filterNodeId = searchParams.get('nodeId');

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Authorize brain access (reader required)
    try {
      await verifyBrainAccess(user.id, brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // 3. If nodeId filter provided, validate it belongs to this brain
    if (filterNodeId) {
      const node = await db.node.findFirst({
        where: {
          id: filterNodeId,
          brainId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!node) {
        return NextResponse.json(
          { error: 'El nodo especificado no existe o no pertenece a este cerebro.' },
          { status: 404 }
        );
      }
    }

    // 4. Build query
    const where: Record<string, unknown> = { brainId };
    if (filterNodeId) {
      where.nodeId = filterNodeId;
    }

    // 5. Fetch attachments with node title and uploader info
    const attachments = await db.nodeAttachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        node: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // 6. Map response (strip r2Key for security)
    const mappedAttachments = attachments.map((att) => ({
      id: att.id,
      nodeId: att.nodeId,
      nodeTitle: att.node.title,
      brainId: att.brainId,
      uploadedById: att.uploadedById,
      filename: att.filename,
      contentType: att.contentType,
      size: att.size,
      createdAt: att.createdAt,
      uploadedBy: att.uploadedBy,
      extractionStatus: att.extractionStatus,
      extractionError: att.extractionError,
    }));

    return NextResponse.json({ attachments: mappedAttachments }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error fetching brain attachments:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener los archivos del cerebro.' },
      { status: 500 }
    );
  }
}

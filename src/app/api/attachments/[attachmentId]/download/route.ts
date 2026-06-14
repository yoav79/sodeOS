import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { getAttachmentFile } from '@/lib/storage/files';
import db from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/attachments/[attachmentId]/download
 * Validates access permissions, checks for soft-deleted nodes,
 * and streams the file from Cloudflare R2 back to the user.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params;

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Fetch attachment details from DB
    const attachment = await db.nodeAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        node: {
          select: {
            deletedAt: true,
          }
        }
      }
    });

    if (!attachment) {
      return NextResponse.json({ error: 'Adjunto no encontrado.' }, { status: 404 });
    }

    // 3. Block download if node is soft-deleted
    if (attachment.node.deletedAt !== null) {
      return NextResponse.json({ error: 'El nodo del adjunto ha sido eliminado.' }, { status: 404 });
    }

    // 4. Verify brain access (reader required)
    try {
      await verifyBrainAccess(user.id, attachment.brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // 5. Download from R2
    let file;
    try {
      file = await getAttachmentFile(attachment.brainId, attachment.nodeId, attachment.r2Key);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('no existe')) {
        return NextResponse.json({ error: 'El archivo solicitado no existe en R2.' }, { status: 404 });
      }
      throw error;
    }

    // 6. Generate Response with headers
    const safeFilename = encodeURIComponent(file.filename);
    const headers = new Headers();
    headers.set('Content-Type', file.contentType);
    headers.set('Content-Length', file.size.toString());
    
    const isInlineType = 
      file.contentType.startsWith('image/') || 
      file.contentType === 'application/pdf' || 
      file.contentType.startsWith('text/');
    
    const dispositionMode = isInlineType ? 'inline' : 'attachment';
    headers.set(
      'Content-Disposition',
      `${dispositionMode}; filename="${file.filename}"; filename*=UTF-8''${safeFilename}`
    );

    return new Response(file.stream as unknown as BodyInit, {
      status: 200,
      headers,
    });

  } catch (error: unknown) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al descargar el adjunto.' },
      { status: 500 }
    );
  }
}

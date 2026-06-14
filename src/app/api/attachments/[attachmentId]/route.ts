import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { deleteAttachmentFile } from '@/lib/storage/files';
import db from '@/lib/db';

export const runtime = 'nodejs';

/**
 * DELETE /api/attachments/[attachmentId]
 * Deletes the node attachment metadata from DB first, then deletes it from R2.
 * Permissions: Owner can delete any attachment; Editor can only delete their own uploads.
 */
export async function DELETE(
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

    // 2. Fetch attachment from DB
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

    // 3. Block deletion if node is soft-deleted
    if (attachment.node.deletedAt !== null) {
      return NextResponse.json({ error: 'El nodo del adjunto ha sido eliminado.' }, { status: 404 });
    }

    // 4. Verify brain access (editor access required)
    let membership;
    try {
      membership = await verifyBrainAccess(user.id, attachment.brainId, 'editor');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // 5. Enforce delete policy:
    // Owner can delete anything, Editor can only delete their own attachments.
    const isOwner = membership.role === 'owner';
    const isUploader = attachment.uploadedById === user.id;

    if (!isOwner && !isUploader) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este adjunto. Solo el propietario del cerebro o el usuario que subió el archivo pueden hacerlo.' },
        { status: 403 }
      );
    }

    // 6. Delete metadata from Prisma DB first
    try {
      await db.nodeAttachment.delete({
        where: { id: attachmentId },
      });
    } catch (dbError) {
      console.error('Error deleting attachment record from DB:', dbError);
      return NextResponse.json(
        { error: 'Error al eliminar el registro del adjunto de la base de datos.' },
        { status: 500 }
      );
    }

    // 7. Delete object from R2 (if R2 fails or key is missing, do not crash response)
    try {
      await deleteAttachmentFile(attachment.brainId, attachment.nodeId, attachment.r2Key);
    } catch (r2Error) {
      console.warn('R2 deletion failed or was already deleted for key:', attachment.r2Key, r2Error);
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error in DELETE /api/attachments/[attachmentId]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar el adjunto.' },
      { status: 500 }
    );
  }
}

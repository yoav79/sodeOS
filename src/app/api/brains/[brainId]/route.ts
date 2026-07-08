import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { logAuditEvent, AuditAction } from '@/lib/audit';

export async function DELETE(
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

    // 1. Validar sesión
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      );
    }

    // 2. Validar existencia del Brain
    const brain = await db.brain.findUnique({
      where: { id: brainId },
    });
    if (!brain) {
      return NextResponse.json(
        { error: 'El cerebro no existe.' },
        { status: 404 }
      );
    }

    // 3. Validar owner (solo el owner del cerebro puede eliminarlo)
    try {
      await verifyBrainAccess(currentUser.id, brainId, 'owner');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { error: 'No autorizado para realizar esta acción.' },
        { status: 403 }
      );
    }

    // 4. Borrar Brain (dependemos de los onDelete: Cascade del schema Prisma)
    await db.brain.delete({
      where: { id: brainId },
    });

    // 4.1 Registrar auditoría de borrado de cerebro
    await logAuditEvent({
      organizationId: brain.organizationId,
      actorUserId: currentUser.id,
      action: AuditAction.BRAIN_DELETED,
      targetType: 'brain',
      targetId: brainId,
      metadata: {
        brainId: brainId,
        brainName: brain.name,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error al eliminar el cerebro:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

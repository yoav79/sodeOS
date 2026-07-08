import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { BrainRole } from '@prisma/client';
import { logAuditEvent, AuditAction } from '@/lib/audit';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ brainId: string; memberId: string }> }
) {
  try {
    const { brainId, memberId } = await params;

    if (!brainId || !memberId) {
      return NextResponse.json(
        { error: 'El ID del cerebro y del miembro son requeridos.' },
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

    // 2. Authorize access (minimum 'owner' required to manage members)
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
        { error: 'No autorizado para gestionar miembros en este cerebro.' },
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

    const { role } = body;

    const validRoles: BrainRole[] = ['owner', 'editor', 'reader'];
    if (!role || !validRoles.includes(role as BrainRole)) {
      return NextResponse.json(
        { error: `El rol especificado es inválido. Debe ser uno de: ${validRoles.join(', ')}.` },
        { status: 400 }
      );
    }

    // 4. Update role atomically in a transaction protecting the last owner
    try {
      let previousRole: BrainRole | null = null;
      let targetUserId: string | null = null;
      let organizationId: string | null = null;

      const updatedMember = await db.$transaction(async (tx) => {
        const targetMember = await tx.brainMember.findUnique({
          where: { id: memberId },
          include: {
            brain: {
              select: { organizationId: true }
            }
          }
        });

        if (!targetMember || targetMember.brainId !== brainId) {
          throw new Error('NOT_FOUND');
        }

        previousRole = targetMember.role;
        targetUserId = targetMember.userId;
        organizationId = targetMember.brain.organizationId;

        // If currently owner and trying to downgrade, verify owner count
        if (targetMember.role === 'owner' && role !== 'owner') {
          const ownerCount = await tx.brainMember.count({
            where: { brainId, role: 'owner' },
          });
          if (ownerCount <= 1) {
            throw new Error('LAST_OWNER');
          }
        }

        return tx.brainMember.update({
          where: { id: memberId },
          data: { role: role as BrainRole },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        });
      });

      // 4.1 Registrar auditoría de cambio de rol en el cerebro
      await logAuditEvent({
        organizationId,
        actorUserId: currentUser.id,
        action: AuditAction.BRAIN_MEMBER_ROLE_CHANGED,
        targetType: 'brain_member',
        targetId: memberId,
        metadata: {
          brainId,
          userId: targetUserId,
          previousRole,
          newRole: role,
        },
      });

      return NextResponse.json({ member: updatedMember }, { status: 200 });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg === 'NOT_FOUND') {
        return NextResponse.json(
          { error: 'La membresía no existe o no pertenece a este cerebro.' },
          { status: 404 }
        );
      }
      if (errMsg === 'LAST_OWNER') {
        return NextResponse.json(
          { error: 'No se puede degradar al único propietario del cerebro. Debe asignar a otro propietario primero.' },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (error: unknown) {
    console.error('Error updating member role:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brainId: string; memberId: string }> }
) {
  try {
    const { brainId, memberId } = await params;

    if (!brainId || !memberId) {
      return NextResponse.json(
        { error: 'El ID del cerebro y del miembro son requeridos.' },
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

    // 2. Authorize access (minimum 'owner' required to manage members)
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
        { error: 'No autorizado para gestionar miembros en este cerebro.' },
        { status: 403 }
      );
    }

    // 3. Delete member atomically in a transaction protecting the last owner
    try {
      let targetUserId: string | null = null;
      let organizationId: string | null = null;

      await db.$transaction(async (tx) => {
        const targetMember = await tx.brainMember.findUnique({
          where: { id: memberId },
          include: {
            brain: {
              select: { organizationId: true }
            }
          }
        });

        if (!targetMember || targetMember.brainId !== brainId) {
          throw new Error('NOT_FOUND');
        }

        targetUserId = targetMember.userId;
        organizationId = targetMember.brain.organizationId;

        // If currently owner, verify owner count
        if (targetMember.role === 'owner') {
          const ownerCount = await tx.brainMember.count({
            where: { brainId, role: 'owner' },
          });
          if (ownerCount <= 1) {
            throw new Error('LAST_OWNER');
          }
        }

        return tx.brainMember.delete({
          where: { id: memberId },
        });
      });

      // 3.1 Registrar auditoría de remoción de miembro en el cerebro
      await logAuditEvent({
        organizationId,
        actorUserId: currentUser.id,
        action: AuditAction.BRAIN_MEMBER_REMOVED,
        targetType: 'brain_member',
        targetId: memberId,
        metadata: {
          brainId,
          userId: targetUserId,
        },
      });

      return new Response(null, { status: 204 });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (errMsg === 'NOT_FOUND') {
        return NextResponse.json(
          { error: 'La membresía no existe o no pertenece a este cerebro.' },
          { status: 404 }
        );
      }
      if (errMsg === 'LAST_OWNER') {
        return NextResponse.json(
          { error: 'No se puede eliminar al único propietario del cerebro. Debe asignar a otro propietario primero.' },
          { status: 400 }
        );
      }
      throw err;
    }
  } catch (error: unknown) {
    console.error('Error deleting member:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

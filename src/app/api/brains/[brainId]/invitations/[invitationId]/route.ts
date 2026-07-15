import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { getInvitationStatus } from '@/lib/invitations';
import { BrainRole } from '@prisma/client';

interface UserSelect {
  id: string;
  name: string;
  email: string;
}

interface InvitationWithUsers {
  id: string;
  email: string;
  role: BrainRole;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  invitedBy: UserSelect | null;
  acceptedBy: UserSelect | null;
}

/**
 * Serializes a db invitation record safely for API responses.
 * Never includes tokenHash, token, or acceptUrl.
 */
function serializeInvitation(invitation: InvitationWithUsers) {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: getInvitationStatus({
      acceptedAt: invitation.acceptedAt,
      expiresAt: invitation.expiresAt,
      revokedAt: invitation.revokedAt,
    }),
    expiresAt: invitation.expiresAt.toISOString(),
    invitedAt: invitation.createdAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    invitedBy: invitation.invitedBy
      ? {
          id: invitation.invitedBy.id,
          name: invitation.invitedBy.name,
          email: invitation.invitedBy.email,
        }
      : null,
    acceptedBy: invitation.acceptedBy
      ? {
          id: invitation.acceptedBy.id,
          name: invitation.acceptedBy.name,
          email: invitation.acceptedBy.email,
        }
      : null,
  };
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brainId: string; invitationId: string }> }
) {
  try {
    const { brainId, invitationId } = await params;

    if (!brainId) {
      return NextResponse.json(
        { error: 'El ID del cerebro es requerido.' },
        { status: 400 }
      );
    }

    if (!invitationId) {
      return NextResponse.json(
        { error: 'El ID de la invitación es requerido.' },
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

    // 2. Authorize access (minimum 'owner' required to revoke invitations)
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
        { error: 'No autorizado para gestionar invitaciones en este cerebro.' },
        { status: 403 }
      );
    }

    // 3. Fetch invitation to verify state
    const invitation = await db.brainInvitation.findFirst({
      where: {
        id: invitationId,
        brainId: brainId,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'La invitación no existe.' },
        { status: 404 }
      );
    }

    // 4. Validate current state before revocation
    if (invitation.acceptedAt !== null) {
      return NextResponse.json(
        { error: 'No se puede revocar una invitación ya aceptada.' },
        { status: 409 }
      );
    }

    if (invitation.revokedAt !== null) {
      return NextResponse.json(
        { error: 'La invitación ya fue revocada.' },
        { status: 409 }
      );
    }

    // 5. Perform logical revocation (setting revokedAt timestamp)
    const updatedInvitation = await db.brainInvitation.update({
      where: { id: invitationId },
      data: { revokedAt: new Date() },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // 6. Return response safely
    return NextResponse.json(
      { invitation: serializeInvitation(updatedInvitation) },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

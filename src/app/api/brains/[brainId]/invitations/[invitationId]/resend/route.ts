import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import {
  createInvitationTokenPair,
  getInvitationExpiresAt,
  getInvitationStatus,
  normalizeInvitationEmail,
  buildInvitationAcceptUrl,
  getBrainRoleLabel,
} from '@/lib/invitations';
import { sendEmail } from '@/lib/email';
import { renderBrainInvitationEmail } from '@/lib/email/templates';
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

export async function POST(
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

    // 2. Authorize access (minimum 'owner' required to resend invitations)
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

    // 3. Fetch invitation
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

    // 4. Validate state — cannot resend accepted invitations
    if (invitation.acceptedAt !== null) {
      return NextResponse.json(
        { error: 'La invitación ya fue aceptada.' },
        { status: 409 }
      );
    }

    // 5. Check if invited user is already a brain member
    const cleanEmail = normalizeInvitationEmail(invitation.email);
    const existingMember = await db.brainMember.findFirst({
      where: {
        brainId,
        user: {
          email: cleanEmail,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'El usuario ya es miembro de este cerebro.' },
        { status: 409 }
      );
    }

    // 6. Snapshot current state for rollback on email failure
    const previousTokenHash = invitation.tokenHash;
    const previousExpiresAt = invitation.expiresAt;
    const previousRevokedAt = invitation.revokedAt;

    // 7. Generate new token pair and expiration
    const { token, tokenHash } = createInvitationTokenPair();
    const expiresAt = getInvitationExpiresAt();

    // 8. Update invitation with new token and un-revoke
    const updatedInvitation = await db.brainInvitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        expiresAt,
        revokedAt: null,
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

    // 9. Resolve brain name for email
    const brain = await db.brain.findUnique({
      where: { id: brainId },
      select: { name: true },
    });
    const brainName = brain?.name || 'este cerebro';

    // 10. Build accept URL and render email
    const acceptUrl = buildInvitationAcceptUrl({ token });
    const roleLabel = getBrainRoleLabel(invitation.role as BrainRole);
    const inviterName = currentUser.name || currentUser.email || 'Un usuario';

    const emailTemplate = renderBrainInvitationEmail({
      inviterName,
      brainName,
      roleLabel,
      acceptUrl,
      expiresIn: '48 horas',
    });

    // 11. Send invitation email
    const emailResult = await sendEmail({
      to: cleanEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    // 12. If email failed, restore previous state
    if (!emailResult.success) {
      await db.brainInvitation.update({
        where: { id: invitationId },
        data: {
          tokenHash: previousTokenHash,
          expiresAt: previousExpiresAt,
          revokedAt: previousRevokedAt,
        },
      }).catch(() => {});

      return NextResponse.json(
        { error: 'No se pudo reenviar el email de invitación.' },
        { status: 502 }
      );
    }

    // 13. Return response safely (never includes token, tokenHash, or acceptUrl)
    return NextResponse.json(
      { invitation: serializeInvitation(updatedInvitation) },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

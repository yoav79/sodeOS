import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hashInvitationToken, normalizeInvitationEmail, isInvitationExpired } from '@/lib/invitations';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      );
    }

    // 2. Parse body safely
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El token es requerido.' },
        { status: 400 }
      );
    }

    const { token } = body;
    if (typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { error: 'El token es requerido.' },
        { status: 400 }
      );
    }

    // 3. Hash token and query invitation
    const tokenHash = hashInvitationToken(token);
    const invitation = await db.brainInvitation.findUnique({
      where: { tokenHash },
      include: {
        brain: {
          select: {
            id: true,
            organizationId: true,
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

    // 4. Validate states
    if (invitation.acceptedAt !== null) {
      return NextResponse.json(
        { error: 'La invitación ya fue aceptada.' },
        { status: 409 }
      );
    }

    if (invitation.revokedAt !== null) {
      return NextResponse.json(
        { error: 'La invitación ya fue revocada.' },
        { status: 409 }
      );
    }

    if (isInvitationExpired(invitation.expiresAt)) {
      return NextResponse.json(
        { error: 'La invitación ha expirado.' },
        { status: 410 }
      );
    }

    // 5. Verify email matches
    const invitationEmail = normalizeInvitationEmail(invitation.email);
    const userEmail = normalizeInvitationEmail(currentUser.email);
    if (invitationEmail !== userEmail) {
      return NextResponse.json(
        { error: 'El correo de la sesión no coincide con el destinatario de la invitación.' },
        { status: 403 }
      );
    }

    // 6. Check existing brain membership before transaction to return a clear 409
    const existingBrainMember = await db.brainMember.findUnique({
      where: {
        brainId_userId: {
          brainId: invitation.brainId,
          userId: currentUser.id,
        },
      },
    });
    if (existingBrainMember) {
      return NextResponse.json(
        { error: 'Ya eres miembro de este cerebro.' },
        { status: 409 }
      );
    }

    // 7. Transaction to register memberships and mark invitation accepted
    try {
      await db.$transaction(async (tx) => {
        // Concurrency check: Re-verify invitation status inside transaction
        const txInvitation = await tx.brainInvitation.findUnique({
          where: { id: invitation.id },
        });

        if (!txInvitation) {
          throw new Error('INVITATION_NOT_FOUND');
        }
        if (txInvitation.acceptedAt !== null) {
          throw new Error('ALREADY_ACCEPTED');
        }
        if (txInvitation.revokedAt !== null) {
          throw new Error('REVOKED');
        }

        // Concurrency check: Re-verify brain membership inside transaction
        const txBrainMember = await tx.brainMember.findUnique({
          where: {
            brainId_userId: {
              brainId: invitation.brainId,
              userId: currentUser.id,
            },
          },
        });
        if (txBrainMember) {
          throw new Error('ALREADY_MEMBER');
        }

        // Verify/Create OrganizationMembership if needed
        const orgId = invitation.brain.organizationId;
        const existingOrgMember = await tx.organizationMembership.findUnique({
          where: {
            organizationId_userId: {
              organizationId: orgId,
              userId: currentUser.id,
            },
          },
        });

        if (!existingOrgMember) {
          await tx.organizationMembership.create({
            data: {
              organizationId: orgId,
              userId: currentUser.id,
              role: 'org_member',
            },
          });
        }

        // Create BrainMember
        await tx.brainMember.create({
          data: {
            brainId: invitation.brainId,
            userId: currentUser.id,
            role: invitation.role,
          },
        });

        // Update BrainInvitation
        await tx.brainInvitation.update({
          where: { id: invitation.id },
          data: {
            acceptedAt: new Date(),
            acceptedById: currentUser.id,
          },
        });
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      if (
        errMsg === 'ALREADY_ACCEPTED' ||
        errMsg === 'REVOKED' ||
        errMsg === 'ALREADY_MEMBER' ||
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')
      ) {
        return NextResponse.json(
          { error: 'Conflicto al procesar la aceptación de la invitación.' },
          { status: 409 }
        );
      }
      throw err;
    }

    // 8. Return response successfully
    return NextResponse.json(
      {
        brainId: invitation.brainId,
        role: invitation.role,
        message: 'Invitación aceptada.',
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

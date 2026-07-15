import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { hashInvitationToken, isInvitationExpired, getBrainRoleLabel } from '@/lib/invitations';

export async function GET(request: NextRequest) {
  try {
    // 1. Read token from searchParams
    const token = request.nextUrl.searchParams.get('token');

    // 2. Validate token presence and length
    if (!token || typeof token !== 'string' || !token.trim()) {
      return NextResponse.json(
        { error: 'El token es requerido.' },
        { status: 400 }
      );
    }

    // 3. Hash the raw token for DB lookup
    const tokenHash = hashInvitationToken(token);

    // 4. Query BrainInvitation including only the brain's name
    const invitation = await db.brainInvitation.findUnique({
      where: { tokenHash },
      include: {
        brain: {
          select: {
            name: true,
          },
        },
      },
    });

    // 5. Handle non-existent invitation
    if (!invitation) {
      return NextResponse.json(
        { error: 'La invitación no existe.' },
        { status: 404 }
      );
    }

    // 6. Handle already accepted invitation
    if (invitation.acceptedAt !== null) {
      return NextResponse.json(
        { error: 'La invitación ya fue aceptada.' },
        { status: 409 }
      );
    }

    // 7. Handle revoked invitation
    if (invitation.revokedAt !== null) {
      return NextResponse.json(
        { error: 'La invitación ya fue revocada.' },
        { status: 409 }
      );
    }

    // 8. Handle expired invitation
    if (isInvitationExpired(invitation.expiresAt)) {
      return NextResponse.json(
        { error: 'La invitación ha expirado.' },
        { status: 410 }
      );
    }

    // 9. Return safe response structure
    return NextResponse.json(
      {
        invitation: {
          email: invitation.email,
          brainName: invitation.brain.name,
          role: invitation.role,
          roleLabel: getBrainRoleLabel(invitation.role),
          expiresAt: invitation.expiresAt.toISOString(),
        },
      },
      { status: 200 }
    );

  } catch {
    // Prevent logging raw token or tokenHash secrets, log a safe error message
    console.error('Error retrieving invitation info: Internal Server Error');
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

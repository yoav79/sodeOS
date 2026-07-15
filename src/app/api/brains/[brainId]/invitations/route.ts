import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import {
  createInvitationTokenPair,
  getInvitationExpiresAt,
  getInvitationStatus,
  normalizeInvitationEmail,
} from '@/lib/invitations';
import { Prisma, BrainRole } from '@prisma/client';

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

export async function GET(
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

    // 2. Authorize access (minimum 'owner' required to manage invitations)
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

    // 3. Fetch invitations
    const dbInvitations = await db.brainInvitation.findMany({
      where: { brainId },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 4. Serialize and return response
    const serialized = dbInvitations.map(serializeInvitation);
    return NextResponse.json({ invitations: serialized }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

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

    // 2. Authorize access (minimum 'owner' required to manage invitations)
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

    const { email, role } = body;

    // Validate email
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'El email del usuario es obligatorio.' },
        { status: 400 }
      );
    }

    const cleanEmail = normalizeInvitationEmail(email);
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json(
        { error: 'El formato del email es inválido.' },
        { status: 400 }
      );
    }

    // Validate role (strictly block 'owner', only allow 'reader' or 'editor')
    const allowedRoles: BrainRole[] = ['reader', 'editor'];
    if (!role || !allowedRoles.includes(role as BrainRole)) {
      return NextResponse.json(
        { error: 'El rol especificado es inválido. Solo se permite invitar con rol "editor" o "reader".' },
        { status: 400 }
      );
    }

    // 4. Check if target user is already a member of the brain
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

    // 5. Check if there is already a pending invitation for this email and brain
    const now = new Date();
    const existingPendingInvitation = await db.brainInvitation.findFirst({
      where: {
        brainId,
        email: cleanEmail,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
    });

    if (existingPendingInvitation) {
      return NextResponse.json(
        { error: 'Ya existe una invitación pendiente para este email en este cerebro.' },
        { status: 409 }
      );
    }

    // 6. Generate token pair and expiration date
    const { tokenHash } = createInvitationTokenPair();
    const expiresAt = getInvitationExpiresAt();

    // 7. Create BrainInvitation in DB
    let newInvitation;
    try {
      newInvitation = await db.brainInvitation.create({
        data: {
          email: cleanEmail,
          brainId,
          role: role as BrainRole,
          tokenHash,
          expiresAt,
          invitedById: currentUser.id,
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
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json(
          { error: 'Ya existe una invitación para este email en este cerebro.' },
          { status: 409 }
        );
      }
      throw err;
    }

    // 8. Return response safely
    return NextResponse.json(
      { invitation: serializeInvitation(newInvitation) },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

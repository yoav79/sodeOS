import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError, resolveActiveOrganization } from '@/lib/auth';
import db from '@/lib/db';
import { BrainRole } from '@prisma/client';

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

    // 3. List members
    const dbMembers = await db.brainMember.findMany({
      where: { brainId },
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

    // 4. Stable order: owner first, then editor, reader, and secondary sort by createdAt ascending
    const roleOrder: Record<BrainRole, number> = {
      owner: 1,
      editor: 2,
      reader: 3,
    };

    const sortedMembers = [...dbMembers].sort((a, b) => {
      const weightA = roleOrder[a.role] || 3;
      const weightB = roleOrder[b.role] || 3;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return NextResponse.json({ members: sortedMembers }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error('Error fetching members:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
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

    // 3. Resolve active organization
    const activeOrg = await resolveActiveOrganization();

    // 4. Parse and validate JSON body
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

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'El email del usuario es obligatorio y no puede estar vacío.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json(
        { error: 'El formato del email es inválido.' },
        { status: 400 }
      );
    }

    const validRoles: BrainRole[] = ['owner', 'editor', 'reader'];
    if (!role || !validRoles.includes(role as BrainRole)) {
      return NextResponse.json(
        { error: `El rol especificado es inválido. Debe ser uno de: ${validRoles.join(', ')}.` },
        { status: 400 }
      );
    }

    // 5. Check if user exists by email
    const targetUser = await db.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'El usuario con el email especificado no está registrado en el sistema.' },
        { status: 404 }
      );
    }

    // 6. Verify targetUser belongs to the active organization
    const targetOrgMembership = await db.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: activeOrg.id,
          userId: targetUser.id,
        },
      },
    });

    if (!targetOrgMembership) {
      return NextResponse.json(
        { error: 'El usuario debe pertenecer a la misma organización para ser agregado al cerebro.' },
        { status: 400 }
      );
    }

    // 7. Check if user is already a member of the brain
    const existingMembership = await db.brainMember.findUnique({
      where: {
        brainId_userId: {
          brainId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'El usuario ya es miembro de este cerebro.' },
        { status: 409 }
      );
    }

    // 8. Create the membership
    const newMember = await db.brainMember.create({
      data: {
        brainId,
        userId: targetUser.id,
        role: role as BrainRole,
      },
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

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error('Error adding member:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

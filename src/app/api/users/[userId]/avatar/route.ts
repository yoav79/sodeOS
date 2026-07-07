import { NextResponse } from 'next/server';
import { getCurrentUser, resolveActiveOrganization, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { getInternalAvatarKey } from '@/lib/storage/avatar';
import { getFile } from '@/lib/storage/files';

export const runtime = 'nodejs';

/**
 * GET /api/users/[userId]/avatar
 * Serves the internal R2 avatar image of a user to authenticated users.
 * Omit ownership checks on the requester so teammate avatars can be viewed.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 1. Authenticate the requester session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Await dynamic route parameters
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'El ID de usuario es requerido.' }, { status: 400 });
    }

    // 2.1 Multi-tenant — Resolve active organization and enforce shared membership
    let activeOrg;
    try {
      activeOrg = await resolveActiveOrganization();
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
      }
      throw err;
    }

    if (currentUser.id !== userId) {
      const requesterMembership = await db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: activeOrg.id,
            userId: currentUser.id,
          },
        },
      });

      if (!requesterMembership) {
        return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
      }

      const targetMembership = await db.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: activeOrg.id,
            userId: userId,
          },
        },
      });

      if (!targetMembership) {
        return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
      }
    }

    // 3. Retrieve target user from DB to read the stored avatar path
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, avatarUrl: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'El usuario solicitado no existe.' }, { status: 404 });
    }

    if (!targetUser.avatarUrl) {
      return NextResponse.json({ error: 'El usuario no tiene una imagen de avatar configurada.' }, { status: 404 });
    }

    // 4. Check if the avatar is an internal R2 upload
    const internalKey = getInternalAvatarKey(targetUser.avatarUrl);
    if (!internalKey) {
      return NextResponse.json(
        { error: 'El avatar de este usuario no está guardado en el almacenamiento R2 (es una URL externa).' },
        { status: 400 }
      );
    }

    // 5. Download the file from R2 using targetUser.id (the owner) instead of currentUser.id
    // to allow authorized peers to display each other's avatars.
    try {
      const file = await getFile(targetUser.id, internalKey);

      // 6. Generate inline headers
      const safeFilename = encodeURIComponent(file.filename);
      const headers = new Headers();
      headers.set('Content-Type', file.contentType);
      headers.set('Content-Length', file.size.toString());
      headers.set('Content-Disposition', `inline; filename="${file.filename}"; filename*=UTF-8''${safeFilename}`);

      return new Response(file.stream as unknown as BodyInit, {
        status: 200,
        headers,
      });

    } catch (innerError: unknown) {
      if (innerError instanceof Error) {
        if (innerError.message.includes('no existe')) {
          return NextResponse.json(
            { error: 'La imagen de avatar solicitada no existe en el almacenamiento.' },
            { status: 404 }
          );
        }
        if (innerError.message.includes('Acceso no autorizado')) {
          return NextResponse.json(
            { error: 'Acceso no autorizado al recurso del avatar.' },
            { status: 403 }
          );
        }
      }
      throw innerError;
    }

  } catch (error: unknown) {
    console.error('Error in GET /api/users/[userId]/avatar:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor.';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

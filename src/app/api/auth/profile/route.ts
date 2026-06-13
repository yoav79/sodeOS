import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { name, avatarUrl } = body;

    // 3. Validate name (required)
    if (name === undefined || name === null || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'El nombre es requerido y debe ser una cadena de texto.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 2 y 80 caracteres.' },
        { status: 400 }
      );
    }

    // 4. Validate avatarUrl (optional)
    const updateData: { name: string; avatarUrl?: string | null } = {
      name: trimmedName,
    };

    if (avatarUrl !== undefined) {
      let normalizedAvatarUrl: string | null = null;
      if (avatarUrl !== null) {
        if (typeof avatarUrl !== 'string') {
          return NextResponse.json(
            { error: 'El avatarUrl debe ser una cadena de texto o null.' },
            { status: 400 }
          );
        }
        const trimmedAvatar = avatarUrl.trim();
        if (trimmedAvatar !== '') {
          if (trimmedAvatar.length > 500) {
            return NextResponse.json(
              { error: 'El avatarUrl no puede exceder los 500 caracteres.' },
              { status: 400 }
            );
          }
          try {
            new URL(trimmedAvatar);
          } catch {
            return NextResponse.json(
              { error: 'El avatarUrl debe ser una URL válida.' },
              { status: 400 }
            );
          }
          normalizedAvatarUrl = trimmedAvatar;
        }
      }
      updateData.avatarUrl = normalizedAvatarUrl;
    }

    // 5. Update user in DB
    const updatedUser = await db.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    // 6. Return safe user data
    return NextResponse.json(
      {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatarUrl: updatedUser.avatarUrl,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating user profile:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

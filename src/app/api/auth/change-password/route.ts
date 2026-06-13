import { NextResponse } from 'next/server';
import { getCurrentUser, verifyPassword } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

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

    const { currentPassword, newPassword } = body;

    // 3. Validate currentPassword
    if (currentPassword === undefined || currentPassword === null || typeof currentPassword !== 'string' || currentPassword === '') {
      return NextResponse.json(
        { error: 'La contraseña actual es requerida.' },
        { status: 400 }
      );
    }

    // 4. Validate newPassword
    if (newPassword === undefined || newPassword === null || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'La nueva contraseña es requerida.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    if (newPassword.length > 128) {
      return NextResponse.json(
        { error: 'La nueva contraseña no puede tener más de 128 caracteres.' },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: 'La nueva contraseña no puede ser igual a la contraseña actual.' },
        { status: 400 }
      );
    }

    // 5. Fetch user credential
    const userCredential = await db.userCredential.findUnique({
      where: { userId: currentUser.id },
    });

    if (!userCredential) {
      return NextResponse.json(
        { error: 'Credenciales del usuario no encontradas.' },
        { status: 400 }
      );
    }

    // 6. Verify current password
    const isPasswordCorrect = await verifyPassword(currentPassword, userCredential.passwordHash);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta.' },
        { status: 401 }
      );
    }

    // 7. Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 8. Update password hash in DB
    await db.userCredential.update({
      where: { userId: currentUser.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // 9. Return safe response
    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in change-password endpoint:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

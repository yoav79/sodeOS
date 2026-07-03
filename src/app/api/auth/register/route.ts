import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/auth/register
 * Handles self-registration of a new User and UserCredential.
 * Requires a registration access code defined in the environment.
 */
export async function POST(request: Request) {
  try {
    // 1. Verify REGISTRATION_ACCESS_CODE exists in environment
    const expectedAccessCode = process.env.REGISTRATION_ACCESS_CODE;
    if (!expectedAccessCode) {
      return NextResponse.json(
        { error: 'El auto-registro está deshabilitado temporalmente en este servidor.' },
        { status: 503 }
      );
    }

    // 2. Parse request JSON body safely
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { email, name, password, confirmPassword, accessCode } = body;

    // 3. Validation: accessCode
    if (typeof accessCode !== 'string' || !accessCode) {
      return NextResponse.json(
        { error: 'El código de acceso de registro es requerido.' },
        { status: 400 }
      );
    }

    if (accessCode !== expectedAccessCode) {
      return NextResponse.json(
        { error: 'El código de acceso de registro es incorrecto.' },
        { status: 401 }
      );
    }

    // 4. Validation: email
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'El correo electrónico es requerido.' },
        { status: 400 }
      );
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'El formato del correo electrónico es inválido.' },
        { status: 400 }
      );
    }

    // 5. Validation: name
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre es requerido.' },
        { status: 400 }
      );
    }
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 80) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 2 y 80 caracteres.' },
        { status: 400 }
      );
    }

    // 6. Validation: password
    if (typeof password !== 'string' || !password) {
      return NextResponse.json(
        { error: 'La contraseña es requerida.' },
        { status: 400 }
      );
    }
    if (password.length < 12) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 12 caracteres.' },
        { status: 400 }
      );
    }

    // 7. Validation: confirmPassword
    if (typeof confirmPassword !== 'string' || !confirmPassword) {
      return NextResponse.json(
        { error: 'La confirmación de la contraseña es requerida.' },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Las contraseñas no coinciden.' },
        { status: 400 }
      );
    }

    // 8. Verify unique email in database
    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'El correo electrónico ya está registrado.' },
        { status: 409 }
      );
    }

    // 9. Generate UUID and Hash Password
    const newUserId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // 10. Atomic transaction to create User and UserCredential
    const createdUser = await db.$transaction(async (tx) => {
      // 10.1 Create User
      const user = await tx.user.create({
        data: {
          id: newUserId,
          email: cleanEmail,
          name: cleanName,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        }
      });

      // 10.2 Create UserCredential
      await tx.userCredential.create({
        data: {
          userId: newUserId,
          passwordHash,
        }
      });

      return user;
    });

    // 11. Return successful response
    return NextResponse.json(
      {
        message: 'Usuario registrado exitosamente.',
        user: createdUser
      },
      { status: 201 }
    );

  } catch {
    // Log error securely without exposing input secrets
    console.error('Error in /api/auth/register POST: Internal server error');
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar el registro.' },
      { status: 500 }
    );
  }
}

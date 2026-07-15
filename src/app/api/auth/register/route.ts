import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createSession, SESSION_COOKIE_NAME, SESSION_DURATION_MS } from '@/lib/auth';
import { hashInvitationToken, isInvitationExpired, normalizeInvitationEmail } from '@/lib/invitations';

export const runtime = 'nodejs';

/**
 * POST /api/auth/register
 * Handles self-registration of a new User and UserCredential.
 * Supports standard registration with accessCode or invitation-based registration.
 */
export async function POST(request: Request) {
  try {
    // 1. Parse request JSON body safely
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { email, name, password, confirmPassword, accessCode, invitationToken } = body;

    const isInvitationMode = typeof invitationToken === 'string' && invitationToken.trim().length > 0;

    // 2. Validation: accessCode (Only required if not in invitation mode)
    if (!isInvitationMode) {
      const expectedAccessCode = process.env.REGISTRATION_ACCESS_CODE;
      if (!expectedAccessCode) {
        return NextResponse.json(
          { error: 'El auto-registro está deshabilitado temporalmente en este servidor.' },
          { status: 503 }
        );
      }

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
    } else {
      // 3. Validation: invitationToken (Only required if in invitation mode)
      const tokenHash = hashInvitationToken(invitationToken);
      const invitation = await db.brainInvitation.findUnique({
        where: { tokenHash },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: 'La invitación no existe.' },
          { status: 404 }
        );
      }

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

      const reqEmail = typeof email === 'string' ? email : '';
      if (normalizeInvitationEmail(reqEmail) !== normalizeInvitationEmail(invitation.email)) {
        return NextResponse.json(
          { error: 'El correo no coincide con el destinatario de la invitación.' },
          { status: 403 }
        );
      }
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
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
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

    // 11. If in invitation mode, perform auto-login
    if (isInvitationMode) {
      const sessionToken = await createSession(createdUser.id);
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        expires: new Date(Date.now() + SESSION_DURATION_MS),
      });

      return NextResponse.json(
        {
          message: 'Usuario registrado y autenticado exitosamente.',
          user: createdUser,
          autoLogin: true
        },
        { status: 201 }
      );
    }

    // 12. Return successful response for normal mode
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

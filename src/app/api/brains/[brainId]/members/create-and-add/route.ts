import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { BrainRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

    // 1. Autenticar al usuario llamador
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autenticado.' },
        { status: 401 }
      );
    }

    // 2. Autorizar acceso: Solo rol 'owner' en el cerebro actual puede invocar este endpoint
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

    // 3. Parsear y validar el cuerpo de la solicitud
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { email, name, password, role } = body;

    // Validación de Email
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'El email del usuario es obligatorio.' },
        { status: 400 }
      );
    }
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'El formato del email es inválido.' },
        { status: 400 }
      );
    }

    // Validación de Nombre
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del usuario es obligatorio.' },
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

    // Validación de Contraseña
    if (typeof password !== 'string' || !password) {
      return NextResponse.json(
        { error: 'La contraseña es obligatoria.' },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    // Validación de Rol a asignar
    const allowedRoles: BrainRole[] = ['editor', 'reader'];
    if (!role || !allowedRoles.includes(role as BrainRole)) {
      return NextResponse.json(
        {
          error: 'El rol especificado es inválido. Solo se permite crear usuarios con el rol "editor" o "reader".'
        },
        { status: 400 }
      );
    }

    // 4. Verificar si el usuario ya existe en el sistema
    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          where: { brainId }
        }
      }
    });

    if (existingUser) {
      // Caso A: Ya es miembro de este cerebro
      if (existingUser.memberships.length > 0) {
        return NextResponse.json(
          { error: 'El usuario ya es miembro de este cerebro.' },
          { status: 409 }
        );
      }

      // Caso B: El usuario existe en el sistema pero no es miembro de este cerebro
      // Decisión: Para mantener una separación estricta de responsabilidades (y evitar sobrescribir/duplicar
      // contraseñas o datos), indicamos al owner que agregue al usuario existente mediante la invitación estándar.
      return NextResponse.json(
        {
          error: 'El usuario ya existe en el sistema. Utilice el flujo de invitación de miembros existentes para agregarlo al cerebro.'
        },
        { status: 409 }
      );
    }

    // 5. Generar UUID y cifrado de contraseña
    const newUserId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. Transacción atómica de creación y membresía
    const result = await db.$transaction(async (tx) => {
      // 6.1 Crear el usuario
      const newUser = await tx.user.create({
        data: {
          id: newUserId,
          email: cleanEmail,
          name: cleanName,
        },
        select: {
          id: true,
          email: true,
          name: true,
        }
      });

      // 6.2 Crear la credencial de autenticación
      await tx.userCredential.create({
        data: {
          userId: newUserId,
          passwordHash,
        }
      });

      // 6.3 Crear el registro de membresía
      const newMembership = await tx.brainMember.create({
        data: {
          brainId,
          userId: newUserId,
          role: role as BrainRole,
        },
        select: {
          role: true,
        }
      });

      return { user: newUser, member: newMembership };
    });

    // 7. Retornar respuesta segura sin contraseñas ni hashes
    return NextResponse.json(
      {
        message: 'Usuario creado y agregado al cerebro exitosamente.',
        user: result.user,
        member: result.member,
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    console.error('Error in create-and-add member endpoint:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

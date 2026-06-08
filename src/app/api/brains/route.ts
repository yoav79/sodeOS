import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { BrainVisibility } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // 1. Auth — Require active session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'No autorizado. Debe iniciar sesión.' },
        { status: 401 }
      );
    }

    // 2. Parse payload
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud JSON inválido.' },
        { status: 400 }
      );
    }

    const { name, description, visibility } = body;

    // 3. Validation: name
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre del cerebro es obligatorio y no puede estar vacío.' },
        { status: 400 }
      );
    }
    const cleanName = name.trim();
    if (cleanName.length > 100) {
      return NextResponse.json(
        { error: 'El nombre del cerebro no puede exceder los 100 caracteres.' },
        { status: 400 }
      );
    }

    // 4. Validation: description (optional)
    let cleanDescription = null;
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json(
          { error: 'La descripción debe ser un texto.' },
          { status: 400 }
        );
      }
      cleanDescription = description.trim();
      if (cleanDescription.length > 500) {
        return NextResponse.json(
          { error: 'La descripción no puede exceder los 500 caracteres.' },
          { status: 400 }
        );
      }
    }

    // 5. Validation: visibility (optional, default: private)
    let cleanVisibility: BrainVisibility = 'private';
    if (visibility !== undefined && visibility !== null) {
      if (!['private', 'invited_only', 'company'].includes(visibility)) {
        return NextResponse.json(
          { error: 'Visibilidad inválida. Debe ser: private, invited_only o company.' },
          { status: 400 }
        );
      }
      cleanVisibility = visibility as BrainVisibility;
    }

    // 6. Transaction: Create Brain, BrainMember (owner), Root Node and initial NodeVersion
    const brain = await db.$transaction(async (tx) => {
      // A. Create Brain
      const newBrain = await tx.brain.create({
        data: {
          name: cleanName,
          description: cleanDescription,
          visibility: cleanVisibility,
          createdBy: currentUser.id,
        },
      });

      // B. Create BrainMember (owner)
      await tx.brainMember.create({
        data: {
          brainId: newBrain.id,
          userId: currentUser.id,
          role: 'owner',
        },
      });

      // C. Create Root Node (parentId = null, slug = "inicio")
      const rootNode = await tx.node.create({
        data: {
          brainId: newBrain.id,
          parentId: null,
          title: cleanName,
          slug: 'inicio',
          contentMarkdown: '',
          status: 'draft',
          position: 0,
          ownerUserId: currentUser.id,
          responsibleUserId: currentUser.id,
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
        },
      });

      // D. Create Initial Version
      await tx.nodeVersion.create({
        data: {
          nodeId: rootNode.id,
          title: rootNode.title,
          contentMarkdown: rootNode.contentMarkdown,
          status: rootNode.status,
          savedBy: currentUser.id,
          changeNote: 'Creación inicial del cerebro.',
        },
      });

      return newBrain;
    });

    return NextResponse.json({ brain }, { status: 201 });
  } catch (error) {
    console.error('Error al crear el cerebro:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la creación.' },
      { status: 500 }
    );
  }
}

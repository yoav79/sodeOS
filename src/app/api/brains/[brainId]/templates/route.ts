import { NextResponse } from 'next/server';
import { getTemplatesForBrain, createTemplate } from '@/services/templateService';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brainId: string }> }
) {
  try {
    const { brainId } = await params;

    if (!brainId) {
      return NextResponse.json({ error: 'El ID del cerebro es requerido.' }, { status: 400 });
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Authorize access (reader access required to view templates)
    try {
      await verifyBrainAccess(currentUser.id, brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json(
          { error: err.message },
          { status: err.status }
        );
      }
      return NextResponse.json(
        { error: 'No autorizado.' },
        { status: 403 }
      );
    }

    // 3. Fetch templates
    const templates = await getTemplatesForBrain(brainId);
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in get templates API:', error);
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
      return NextResponse.json({ error: 'El ID del cerebro es requerido.' }, { status: 400 });
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Authorize access (owner required to create templates)
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
        { error: 'No autorizado para crear plantillas.' },
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

    const { name, description, templateType, schemaJson } = body;

    try {
      const template = await createTemplate({
        brainId,
        name,
        description,
        templateType,
        schemaJson,
      }, currentUser.id);

      return NextResponse.json({ template }, { status: 201 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la plantilla.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error creating template:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

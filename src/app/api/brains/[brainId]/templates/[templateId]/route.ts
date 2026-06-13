import { NextResponse } from 'next/server';
import { getTemplateById, updateTemplate, deleteTemplate } from '@/services/templateService';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ brainId: string; templateId: string }> }
) {
  try {
    const { brainId, templateId } = await params;

    if (!brainId || !templateId) {
      return NextResponse.json({ error: 'El ID del cerebro y el ID de la plantilla son requeridos.' }, { status: 400 });
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Authorize access (owner required to update templates)
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
        { error: 'No autorizado para actualizar plantillas.' },
        { status: 403 }
      );
    }

    // 3. Fetch template and check if it exists and belongs to this brain
    const template = await getTemplateById(templateId);
    if (!template || template.brainId !== brainId) {
      return NextResponse.json({ error: 'Plantilla no encontrada en este cerebro.' }, { status: 404 });
    }

    // 4. Parse JSON body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { name, description, schemaJson, templateType } = body;

    // Check if user is attempting to change templateType
    if (templateType !== undefined && templateType !== template.templateType) {
      return NextResponse.json(
        { error: 'No está permitido cambiar el tipo de plantilla.' },
        { status: 400 }
      );
    }

    try {
      const updated = await updateTemplate(
        templateId,
        {
          name,
          description,
          schemaJson,
        },
        currentUser.id
      );

      if (!updated) {
        return NextResponse.json({ error: 'Plantilla no encontrada en este cerebro.' }, { status: 404 });
      }

      return NextResponse.json({ template: updated }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la plantilla.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error updating template:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ brainId: string; templateId: string }> }
) {
  try {
    const { brainId, templateId } = await params;

    if (!brainId || !templateId) {
      return NextResponse.json({ error: 'El ID del cerebro y el ID de la plantilla son requeridos.' }, { status: 400 });
    }

    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Authorize access (owner required to delete templates)
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
        { error: 'No autorizado para eliminar plantillas.' },
        { status: 403 }
      );
    }

    // 3. Fetch template and check if it exists and belongs to this brain
    const template = await getTemplateById(templateId);
    if (!template || template.brainId !== brainId) {
      return NextResponse.json({ error: 'Plantilla no encontrada en este cerebro.' }, { status: 404 });
    }

    // 4. Delete template
    const deleted = await deleteTemplate(templateId);
    if (!deleted) {
      return NextResponse.json({ error: 'Plantilla no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error deleting template:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

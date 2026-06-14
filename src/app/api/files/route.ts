import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { putFile, deleteFile } from '@/lib/storage/files';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

/**
 * POST /api/files
 * Uploads a file to Cloudflare R2
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Parse multi-part form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud inválido. Debe ser multipart/form-data.' },
        { status: 400 }
      );
    }

    const file = formData.get('file');

    // 3. Validation: file exists
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Archivo no encontrado en la solicitud. Debe proporcionarse bajo el campo "file".' },
        { status: 400 }
      );
    }

    // 4. Validation: non-empty file
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'El archivo está vacío (0 bytes).' },
        { status: 400 }
      );
    }

    // 5. Validation: file size (Max 10 MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 10 MB.' },
        { status: 400 }
      );
    }

    // 6. Validation: MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type || 'desconocido'}.` },
        { status: 400 }
      );
    }

    // 7. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 8. Upload to R2 via server layer
    const result = await putFile(user.id, buffer, file.name, file.type);

    return NextResponse.json(
      {
        success: true,
        key: result.key,
        filename: file.name,
        size: result.size,
        contentType: result.contentType,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/files:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al subir el archivo.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files?key=...
 * Deletes a file from Cloudflare R2
 */
export async function DELETE(request: Request) {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Parse key from query params
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'El parámetro "key" es requerido.' },
        { status: 400 }
      );
    }

    // 3. Delete file via server layer (contains ownership assertions)
    try {
      await deleteFile(user.id, key);
    } catch (innerError: unknown) {
      if (innerError instanceof Error) {
        if (innerError.message.includes('Acceso no autorizado')) {
          return NextResponse.json(
            { error: 'Acceso denegado: este archivo no pertenece a su cuenta.' },
            { status: 403 }
          );
        }
        if (innerError.message.includes('no existe')) {
          return NextResponse.json(
            { error: 'El archivo especificado no existe.' },
            { status: 404 }
          );
        }
      }
      throw innerError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/files:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar el archivo.' },
      { status: 500 }
    );
  }
}

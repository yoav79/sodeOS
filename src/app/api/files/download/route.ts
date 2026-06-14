import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getFile } from '@/lib/storage/files';

export const runtime = 'nodejs';

/**
 * GET /api/files/download?key=...
 * Serves the file content directly from the server.
 * Ensures the file belongs to the logged-in user.
 */
export async function GET(request: Request) {
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

    // 3. Retrieve file from R2 via server layer (contains ownership assertions)
    try {
      const file = await getFile(user.id, key);

      // 4. Generate safe headers
      const safeFilename = encodeURIComponent(file.filename);
      const headers = new Headers();
      headers.set('Content-Type', file.contentType);
      headers.set('Content-Length', file.size.toString());
      
      // Use inline for images and PDFs so the browser can preview them, otherwise attachment
      const isInlineType = 
        file.contentType.startsWith('image/') || 
        file.contentType === 'application/pdf' || 
        file.contentType.startsWith('text/');
      
      const dispositionMode = isInlineType ? 'inline' : 'attachment';
      headers.set(
        'Content-Disposition',
        `${dispositionMode}; filename="${file.filename}"; filename*=UTF-8''${safeFilename}`
      );

      // Return binary stream response
      return new Response(file.stream as unknown as BodyInit, {
        status: 200,
        headers,
      });

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
            { error: 'El archivo solicitado no existe.' },
            { status: 404 }
          );
        }
      }
      throw innerError;
    }
  } catch (error: unknown) {
    console.error('Error in GET /api/files/download:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al descargar el archivo.' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listFiles } from '@/lib/storage/files';

export const runtime = 'nodejs';

/**
 * GET /api/files/list
 * Lists files belonging exclusively to the authenticated user
 */
export async function GET() {
  try {
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Fetch file list via R2 layer
    const result = await listFiles(user.id);

    return NextResponse.json(
      {
        success: true,
        files: result.files,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/files/list:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al listar los archivos.' },
      { status: 500 }
    );
  }
}

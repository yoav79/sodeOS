import { NextResponse } from 'next/server';
import { verifySysadmin, AuthError } from '@/lib/auth';
import db from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await verifySysadmin();

    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q');
    const limitStr = searchParams.get('limit');

    if (!q || q.trim().length < 2) {
      return NextResponse.json(
        { error: 'El parámetro "q" es requerido y debe tener al menos 2 caracteres.' },
        { status: 400 }
      );
    }

    const trimmedQ = q.trim();

    let limit = 10;
    if (limitStr) {
      const parsed = parseInt(limitStr, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 50) {
        return NextResponse.json(
          { error: 'El parámetro "limit" debe ser un número entero entre 1 y 50.' },
          { status: 400 }
        );
      }
      limit = parsed;
    }

    const users = await db.user.findMany({
      where: {
        OR: [
          { email: { contains: trimmedQ, mode: 'insensitive' } },
          { name: { contains: trimmedQ, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { email: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error in GET /api/admin/users/search:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

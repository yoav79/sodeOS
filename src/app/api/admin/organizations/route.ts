import { NextResponse } from 'next/server';
import { verifySysadmin, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { OrganizationPlan, Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // 1. Validar sesión y privilegios de sysadmin global
    await verifySysadmin();

    const { searchParams } = new URL(request.url);

    const pageStr = searchParams.get('page');
    const pageSizeStr = searchParams.get('pageSize');
    const planParam = searchParams.get('plan');
    const isActiveParam = searchParams.get('isActive');
    const q = searchParams.get('q');

    // 2. Validar paginación
    const page = parseInt(pageStr || '1', 10);
    const pageSize = parseInt(pageSizeStr || '20', 10);

    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'El parámetro "page" debe ser un número entero mayor o igual a 1.' },
        { status: 400 }
      );
    }

    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'El parámetro "pageSize" debe ser un número entero entre 1 y 100.' },
        { status: 400 }
      );
    }

    // 3. Validar filtros y armar query de búsqueda
    const where: Prisma.OrganizationWhereInput = {};

    if (planParam) {
      if (planParam !== 'free' && planParam !== 'pro' && planParam !== 'enterprise') {
        return NextResponse.json(
          { error: 'El plan especificado no es válido. Debe ser uno de: free, pro, enterprise.' },
          { status: 400 }
        );
      }
      where.plan = planParam as OrganizationPlan;
    }

    if (isActiveParam !== null) {
      if (isActiveParam !== 'true' && isActiveParam !== 'false') {
        return NextResponse.json(
          { error: 'El parámetro "isActive" debe ser "true" o "false".' },
          { status: 400 }
        );
      }
      where.isActive = isActiveParam === 'true';
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * pageSize;

    // 4. Ejecutar consultas en paralelo utilizando Promise.all
    const [total, items] = await Promise.all([
      db.organization.count({ where }),
      db.organization.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              memberships: true,
              brains: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // 5. Retornar payload paginado
    return NextResponse.json(
      {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error in GET /api/admin/organizations:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

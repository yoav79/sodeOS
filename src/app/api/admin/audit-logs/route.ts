import { NextResponse } from 'next/server';
import { verifySysadmin, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    // 1. Validar sesión y privilegios de sysadmin global
    await verifySysadmin();

    const { searchParams } = new URL(request.url);

    const pageStr = searchParams.get('page');
    const pageSizeStr = searchParams.get('pageSize');
    const organizationId = searchParams.get('organizationId');
    const actorUserId = searchParams.get('actorUserId');
    const action = searchParams.get('action');
    const targetType = searchParams.get('targetType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

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

    // 3. Validar filtros y fechas
    const where: Prisma.AuditLogWhereInput = {};

    if (organizationId) {
      where.organizationId = organizationId;
    }
    if (actorUserId) {
      where.actorUserId = actorUserId;
    }
    if (action) {
      where.action = action;
    }
    if (targetType) {
      where.targetType = targetType;
    }

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (from) {
      const parsedFrom = Date.parse(from);
      if (isNaN(parsedFrom)) {
        return NextResponse.json(
          { error: 'El parámetro "from" no es una fecha válida en formato ISO.' },
          { status: 400 }
        );
      }
      fromDate = new Date(parsedFrom);
    }

    if (to) {
      const parsedTo = Date.parse(to);
      if (isNaN(parsedTo)) {
        return NextResponse.json(
          { error: 'El parámetro "to" no es una fecha válida en formato ISO.' },
          { status: 400 }
        );
      }
      toDate = new Date(parsedTo);
    }

    if (fromDate && toDate && fromDate > toDate) {
      return NextResponse.json(
        { error: 'La fecha de inicio "from" no puede ser posterior a la fecha de término "to".' },
        { status: 400 }
      );
    }

    if (fromDate || toDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (fromDate) {
        createdAtFilter.gte = fromDate;
      }
      if (toDate) {
        createdAtFilter.lte = toDate;
      }
      where.createdAt = createdAtFilter;
    }

    const skip = (page - 1) * pageSize;

    // 4. Ejecutar consultas en paralelo utilizando Promise.all
    const [total, items] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          organizationId: true,
          actorUserId: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
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

    console.error('Error in GET /api/admin/audit-logs:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

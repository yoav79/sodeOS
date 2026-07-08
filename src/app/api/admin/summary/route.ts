import { NextResponse } from 'next/server';
import { verifySysadmin, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { getCurrentMonthStart } from '@/lib/limits';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // 1. Verificar sesión y rol de sysadmin global
    await verifySysadmin();

    const periodStart = getCurrentMonthStart();

    // 2. Ejecutar consultas en paralelo utilizando Promise.all
    const [totalOrganizations, activeOrganizations, totalUsers, costAgg] = await Promise.all([
      db.organization.count(),
      db.organization.count({
        where: { isActive: true },
      }),
      db.user.count(),
      db.usageRecord.aggregate({
        where: {
          createdAt: {
            gte: periodStart,
          },
        },
        _sum: {
          estimatedCostUsd: true,
        },
      }),
    ]);

    // 3. Convertir Decimal a float de JavaScript de forma segura
    const estimatedCostDecimal = costAgg._sum.estimatedCostUsd;
    const estimatedCostUsdCurrentMonth = estimatedCostDecimal ? estimatedCostDecimal.toNumber() : 0;

    // 4. Retornar los KPIs globales
    return NextResponse.json(
      {
        totalOrganizations,
        activeOrganizations,
        totalUsers,
        estimatedCostUsdCurrentMonth,
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

    console.error('Error in GET /api/admin/summary:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

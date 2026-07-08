import { NextResponse } from 'next/server';
import { verifySysadmin, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { PLAN_LIMITS, getUsageSummary, getCurrentMonthStart } from '@/lib/limits';
import { UsageFeature } from '@prisma/client';

export const runtime = 'nodejs';

function bigintToNumber(val: bigint): number {
  if (val > BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number(val);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    // 1. Validar sesión y privilegios de sysadmin global
    await verifySysadmin();

    const { orgId } = await params;

    if (!orgId || orgId.trim() === '') {
      return NextResponse.json(
        { error: 'El ID de la organización es requerido.' },
        { status: 400 }
      );
    }

    // 2. Buscar la organización por id
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organización no encontrada.' },
        { status: 404 }
      );
    }

    // 3. Ejecutar consultas relacionadas con límites de 10 en paralelo utilizando Promise.all
    const [
      totalMembers,
      memberships,
      totalBrains,
      brains,
      recentLogs,
      // Métricas de usage mensual
      aiSummary,
      webSearchSummary,
      fileUploadSummary,
      storageSummary,
    ] = await Promise.all([
      // Conteo de miembros
      db.organizationMembership.count({
        where: { organizationId: orgId },
      }),
      // Items de miembros (limitado a 10)
      db.organizationMembership.findMany({
        where: { organizationId: orgId },
        take: 10,
        orderBy: { createdAt: 'asc' },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: true,
          createdAt: true,
        },
      }),
      // Conteo de brains
      db.brain.count({
        where: { organizationId: orgId },
      }),
      // Items de brains (limitado a 10)
      db.brain.findMany({
        where: { organizationId: orgId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          visibility: true,
          createdAt: true,
          _count: {
            select: {
              members: true,
            },
          },
        },
      }),
      // Últimos 10 audit logs de la organización
      db.auditLog.findMany({
        where: { organizationId: orgId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          createdAt: true,
          actor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
      // Usage mensual
      getUsageSummary({
        organizationId: orgId,
        features: [UsageFeature.ai_document, UsageFeature.ai_agent],
        periodStart: getCurrentMonthStart(),
      }),
      getUsageSummary({
        organizationId: orgId,
        features: [UsageFeature.web_search],
        periodStart: getCurrentMonthStart(),
      }),
      getUsageSummary({
        organizationId: orgId,
        features: [UsageFeature.file_upload],
        periodStart: getCurrentMonthStart(),
      }),
      getUsageSummary({
        organizationId: orgId,
        features: [UsageFeature.file_upload],
      }),
    ]);

    // 4. Formatear la lista de miembros de forma segura
    const formattedMembers = memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    // 5. Formatear métricas de usage mensual
    const planLimits = PLAN_LIMITS[org.plan];
    const periodStart = getCurrentMonthStart();

    const responsePayload = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      isActive: org.isActive,
      createdAt: org.createdAt,
      members: {
        total: totalMembers,
        items: formattedMembers,
      },
      brains: {
        total: totalBrains,
        items: brains,
      },
      usage: {
        periodStart: periodStart.toISOString(),
        metrics: {
          ai_requests: {
            used: aiSummary.totalQuantity,
            limit: planLimits.aiRequestsMonthly,
          },
          ai_tokens: {
            used: aiSummary.totalTokens,
            limit: planLimits.aiTokensMonthly,
          },
          web_searches: {
            used: webSearchSummary.totalQuantity,
            limit: planLimits.webSearchesMonthly,
          },
          file_uploads: {
            used: fileUploadSummary.totalQuantity,
            limit: planLimits.fileUploadsMonthly,
          },
          storage_bytes: {
            used: bigintToNumber(storageSummary.totalBytesIn),
            limit: planLimits.storageBytesMax,
          },
        },
      },
      recentAuditLogs: recentLogs,
    };

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error in GET /api/admin/organizations/[orgId]:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { verifySysadmin, AuthError } from '@/lib/auth';
import db from '@/lib/db';
import { OrganizationPlan, Prisma, OrgRole } from '@prisma/client';
import { logAuditEvent, AuditAction } from '@/lib/audit';

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

export async function POST(request: Request) {
  try {
    // 1. Validar sesión y privilegios de sysadmin global
    const sysadmin = await verifySysadmin();

    // 2. Parsear el body de la petición de forma segura
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la solicitud debe ser un JSON válido.' },
        { status: 400 }
      );
    }

    const { name, slug, ownerEmail, plan } = body;

    // 3. Validaciones de campos obligatorios
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre de la organización es requerido.' },
        { status: 400 }
      );
    }
    const cleanName = name.trim();

    if (typeof slug !== 'string' || !slug.trim()) {
      return NextResponse.json(
        { error: 'El slug de la organización es requerido.' },
        { status: 400 }
      );
    }
    const cleanSlug = slug.trim().toLowerCase();
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(cleanSlug)) {
      return NextResponse.json(
        { error: 'El slug debe contener únicamente letras minúsculas, números y guiones.' },
        { status: 400 }
      );
    }

    if (typeof ownerEmail !== 'string' || !ownerEmail.trim()) {
      return NextResponse.json(
        { error: 'El correo electrónico del propietario es requerido.' },
        { status: 400 }
      );
    }
    const cleanOwnerEmail = ownerEmail.trim().toLowerCase();

    // Validar plan si viene en la petición
    let cleanPlan: OrganizationPlan = OrganizationPlan.free;
    if (plan !== undefined) {
      if (plan !== 'free' && plan !== 'pro' && plan !== 'enterprise') {
        return NextResponse.json(
          { error: 'El plan especificado no es válido. Debe ser uno de: free, pro, enterprise.' },
          { status: 400 }
        );
      }
      cleanPlan = plan as OrganizationPlan;
    }

    // 4. Buscar si el ownerEmail corresponde a un usuario registrado
    const ownerUser = await db.user.findUnique({
      where: { email: cleanOwnerEmail },
      select: { id: true, email: true },
    });

    if (!ownerUser) {
      return NextResponse.json(
        { error: 'El correo del propietario no corresponde a ningún usuario registrado.' },
        { status: 404 }
      );
    }

    // 5. Pre-validar si el slug ya existe para evitar carreras innecesarias
    const existingSlug = await db.organization.findUnique({
      where: { slug: cleanSlug },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'El slug ya está en uso por otra organización.' },
        { status: 409 }
      );
    }

    // 6. Transacción atómica para crear Organización y Membership
    let newOrg;
    try {
      newOrg = await db.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: cleanName,
            slug: cleanSlug,
            plan: cleanPlan,
            isActive: true,
          },
        });

        await tx.organizationMembership.create({
          data: {
            organizationId: org.id,
            userId: ownerUser.id,
            role: OrgRole.org_owner,
          },
        });

        return org;
      });
    } catch (txError: unknown) {
      // Capturar colisión concurrente (Unique constraint validation de Prisma client / DB engine)
      if (txError instanceof Prisma.PrismaClientKnownRequestError && txError.code === 'P2002') {
        return NextResponse.json(
          { error: 'El slug ya está en uso por otra organización.' },
          { status: 409 }
        );
      }
      throw txError;
    }

    // 7. Auditar eventos después de transacción exitosa (fuera de la transacción)
    await Promise.all([
      logAuditEvent({
        organizationId: newOrg.id,
        actorUserId: sysadmin.id,
        action: AuditAction.ORG_CREATED,
        targetType: 'organization',
        targetId: newOrg.id,
        metadata: {
          organizationId: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          plan: newOrg.plan,
          ownerUserId: ownerUser.id,
          ownerEmail: ownerUser.email,
        },
      }),
      logAuditEvent({
        organizationId: newOrg.id,
        actorUserId: sysadmin.id,
        action: AuditAction.ORG_MEMBER_INVITED,
        targetType: 'user',
        targetId: ownerUser.id,
        metadata: {
          invitedEmail: ownerUser.email,
          invitedUserId: ownerUser.id,
          orgRole: OrgRole.org_owner,
        },
      }),
    ]);

    // 8. Retornar payload exitoso
    return NextResponse.json(
      {
        message: 'Organización creada exitosamente.',
        organization: {
          id: newOrg.id,
          name: newOrg.name,
          slug: newOrg.slug,
          plan: newOrg.plan,
          isActive: newOrg.isActive,
          createdAt: newOrg.createdAt.toISOString(),
        },
        owner: {
          userId: ownerUser.id,
          email: ownerUser.email,
          role: OrgRole.org_owner,
        },
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error('Error in POST /api/admin/organizations:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al crear la organización.' },
      { status: 500 }
    );
  }
}

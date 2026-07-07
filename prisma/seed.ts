import { PrismaClient, BrainVisibility, BrainRole, NodeStatus, TemplateType, OrgRole, OrganizationPlan } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined for seeding.");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const prisma = prismaClientSingleton();

async function main() {
  console.log("Starting database seed...");

  // Constants for demo organization
  const demoOrgId = "00000000-0000-0000-0000-000000000100";
  const demoOrgSlug = "demo";
  const demoOrgMembershipId = "00000000-0000-0000-0000-000000000101";

  // 1. Seed Demo Organization
  const org = await prisma.organization.upsert({
    where: { id: demoOrgId },
    update: {
      name: "Demo Organization",
      slug: demoOrgSlug,
      plan: OrganizationPlan.pro,
      isActive: true,
    },
    create: {
      id: demoOrgId,
      name: "Demo Organization",
      slug: demoOrgSlug,
      plan: OrganizationPlan.pro,
      isActive: true,
    },
  });
  console.log(`Organization seeded: ${org.name}`);

  // 2. Seed Mock User
  const mockUserId = "00000000-0000-0000-0000-000000000001";
  const user = await prisma.user.upsert({
    where: { id: mockUserId },
    update: {
      name: "Usuario Demo",
      email: "demo@cerebroempresarial.com",
      isSysadmin: true,
    },
    create: {
      id: mockUserId,
      name: "Usuario Demo",
      email: "demo@cerebroempresarial.com",
      isSysadmin: true,
    },
  });
  console.log(`Mock user seeded: ${user.name}`);

  // 3. Seed Organization Membership (Owner)
  const orgMembership = await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: demoOrgId,
        userId: mockUserId,
      },
    },
    update: {
      role: OrgRole.org_owner,
    },
    create: {
      id: demoOrgMembershipId,
      organizationId: demoOrgId,
      userId: mockUserId,
      role: OrgRole.org_owner,
    },
  });
  console.log(`Organization membership seeded: ${orgMembership.role} for user`);

  // Seed User Credential for Local Auth
  const passwordHash = await bcrypt.hash("DemoPassword123!", 10);
  await prisma.userCredential.upsert({
    where: { userId: mockUserId },
    update: {
      passwordHash,
    },
    create: {
      userId: mockUserId,
      passwordHash,
    },
  });
  console.log("Mock user credentials seeded with local password hash");

  // 4. Seed Brain Workspace
  const demoBrainId = "00000000-0000-0000-0000-000000000002";
  const brain = await prisma.brain.upsert({
    where: { id: demoBrainId },
    update: {
      name: "Cerebro Empresarial Demo",
      description: "Espacio de trabajo demo para validar el árbol de conocimiento de la empresa.",
      visibility: BrainVisibility.company,
      organizationId: demoOrgId,
    },
    create: {
      id: demoBrainId,
      name: "Cerebro Empresarial Demo",
      description: "Espacio de trabajo demo para validar el árbol de conocimiento de la empresa.",
      visibility: BrainVisibility.company,
      createdBy: mockUserId,
      organizationId: demoOrgId,
    },
  });
  console.log(`Brain seeded: ${brain.name}`);

  // 5. Seed Brain Membership (Owner)
  const brainMemberId = "00000000-0000-0000-0000-000000000005";
  const membership = await prisma.brainMember.upsert({
    where: {
      brainId_userId: {
        brainId: demoBrainId,
        userId: mockUserId,
      },
    },
    update: {
      role: BrainRole.owner,
    },
    create: {
      id: brainMemberId,
      brainId: demoBrainId,
      userId: mockUserId,
      role: BrainRole.owner,
    },
  });
  console.log(`Membership seeded: ${membership.role} for user`);

  // 4. Seed Tags
  const tagVentasId = "00000000-0000-0000-0000-000000000030";
  const tagProcesoId = "00000000-0000-0000-0000-000000000031";
  const tagPuestoId = "00000000-0000-0000-0000-000000000032";

  await prisma.tag.upsert({
    where: { brainId_name: { brainId: demoBrainId, name: "ventas" } },
    update: {},
    create: { id: tagVentasId, brainId: demoBrainId, name: "ventas" },
  });
  await prisma.tag.upsert({
    where: { brainId_name: { brainId: demoBrainId, name: "proceso" } },
    update: {},
    create: { id: tagProcesoId, brainId: demoBrainId, name: "proceso" },
  });
  await prisma.tag.upsert({
    where: { brainId_name: { brainId: demoBrainId, name: "puesto" } },
    update: {},
    create: { id: tagPuestoId, brainId: demoBrainId, name: "puesto" },
  });
  console.log("Tags seeded successfully");

  // 5. Seed Templates
  const pageTemplateId = "00000000-0000-0000-0000-000000000003";
  const structureTemplateId = "00000000-0000-0000-0000-000000000004";

  await prisma.template.upsert({
    where: { id: pageTemplateId },
    update: {
      name: "Plantilla de Página Estándar",
      description: "Plantilla básica para documentar procesos y guías de la empresa.",
      templateType: TemplateType.page,
      schemaJson: {
        fields: [
          { name: "seccion_principal", label: "Sección Principal", type: "markdown" },
        ],
      },
    },
    create: {
      id: pageTemplateId,
      brainId: demoBrainId,
      name: "Plantilla de Página Estándar",
      description: "Plantilla básica para documentar procesos y guías de la empresa.",
      templateType: TemplateType.page,
      schemaJson: {
        fields: [
          { name: "seccion_principal", label: "Sección Principal", type: "markdown" },
        ],
      },
      createdBy: mockUserId,
    },
  });

  await prisma.template.upsert({
    where: { id: structureTemplateId },
    update: {
      name: "Plantilla de Estructura de Puestos",
      description: "Define las secciones para la documentación de puestos de la empresa.",
      templateType: TemplateType.structure,
      schemaJson: {
        sections: [
          { name: "funciones", label: "Funciones del puesto" },
          { name: "responsabilidades", label: "Responsabilidades del puesto" },
        ],
      },
    },
    create: {
      id: structureTemplateId,
      brainId: demoBrainId,
      name: "Plantilla de Estructura de Puestos",
      description: "Define las secciones para la documentación de puestos de la empresa.",
      templateType: TemplateType.structure,
      schemaJson: {
        sections: [
          { name: "funciones", label: "Funciones del puesto" },
          { name: "responsabilidades", label: "Responsabilidades del puesto" },
        ],
      },
      createdBy: mockUserId,
    },
  });
  console.log("Templates seeded successfully");

  // 6. Seed nested Node tree (Ventas, Ventas/Puestos, etc.)
  interface NodeSeedInput {
    id: string;
    parentId: string | null;
    title: string;
    slug: string;
    contentMarkdown: string;
    position: number;
    templateId?: string;
  }

  const nodesToSeed: NodeSeedInput[] = [
    {
      id: "00000000-0000-0000-0000-000000000010",
      parentId: null,
      title: "Ventas",
      slug: "ventas",
      contentMarkdown: "# Área de Ventas\n\nBienvenido a la sección de ventas.",
      position: 1,
    },
    {
      id: "00000000-0000-0000-0000-000000000011",
      parentId: "00000000-0000-0000-0000-000000000010",
      title: "Puestos",
      slug: "puestos",
      contentMarkdown: "# Puestos de Ventas\n\nAquí se documentan los roles y perfiles del área.",
      position: 1,
    },
    {
      id: "00000000-0000-0000-0000-000000000012",
      parentId: "00000000-0000-0000-0000-000000000011",
      title: "Ejecutivo de Ventas",
      slug: "ejecutivo-de-ventas",
      contentMarkdown: "# Ejecutivo de Ventas\n\nDetalles del puesto de Ejecutivo de Ventas.",
      position: 1,
      templateId: structureTemplateId,
    },
    {
      id: "00000000-0000-0000-0000-000000000013",
      parentId: "00000000-0000-0000-0000-000000000012",
      title: "Funciones",
      slug: "funciones",
      contentMarkdown: "# Funciones\n\n1. Prospección de clientes.\n2. Presentación de propuestas.",
      position: 1,
    },
    {
      id: "00000000-0000-0000-0000-000000000014",
      parentId: "00000000-0000-0000-0000-000000000012",
      title: "Responsabilidades",
      slug: "responsabilidades",
      contentMarkdown: "# Responsabilidades\n\n1. Cumplir con la cuota mensual.\n2. Mantener actualizado el CRM.",
      position: 2,
    },
    {
      id: "00000000-0000-0000-0000-000000000015",
      parentId: "00000000-0000-0000-0000-000000000010",
      title: "Procesos",
      slug: "procesos",
      contentMarkdown: "# Procesos de Ventas\n\nGuías operativas paso a paso.",
      position: 2,
    },
    {
      id: "00000000-0000-0000-0000-000000000016",
      parentId: "00000000-0000-0000-0000-000000000015",
      title: "Alta de Cliente",
      slug: "alta-de-cliente",
      contentMarkdown: "# Alta de Cliente\n\nFlujo de trabajo para dar de alta a nuevos clientes.",
      position: 1,
      templateId: pageTemplateId,
    },
    {
      id: "00000000-0000-0000-0000-000000000017",
      parentId: "00000000-0000-0000-0000-000000000010",
      title: "Reglas",
      slug: "reglas",
      contentMarkdown: "# Reglas de Ventas\n\nPolíticas y restricciones corporativas.",
      position: 3,
    },
    {
      id: "00000000-0000-0000-0000-000000000018",
      parentId: "00000000-0000-0000-0000-000000000017",
      title: "Política de Descuentos",
      slug: "politica-de-descuentos",
      contentMarkdown: "# Política de Descuentos\n\nDescuentos máximos aprobados por nivel directivo.",
      position: 1,
    },
  ];

  for (const nodeInput of nodesToSeed) {
    await prisma.node.upsert({
      where: { id: nodeInput.id },
      update: {
        title: nodeInput.title,
        slug: nodeInput.slug,
        contentMarkdown: nodeInput.contentMarkdown,
        position: nodeInput.position,
        parentId: nodeInput.parentId,
        templateId: nodeInput.templateId || null,
      },
      create: {
        id: nodeInput.id,
        brainId: demoBrainId,
        parentId: nodeInput.parentId,
        templateId: nodeInput.templateId || null,
        title: nodeInput.title,
        slug: nodeInput.slug,
        contentMarkdown: nodeInput.contentMarkdown,
        status: NodeStatus.active,
        ownerUserId: mockUserId,
        responsibleUserId: mockUserId,
        position: nodeInput.position,
        createdBy: mockUserId,
        updatedBy: mockUserId,
      },
    });
  }
  console.log("Nested node tree seeded successfully");

  // 7. Seed NodeVersion (Version 1 for Ventas node)
  const nodeVersionId = "00000000-0000-0000-0000-000000000050";
  await prisma.nodeVersion.upsert({
    where: { id: nodeVersionId },
    update: {},
    create: {
      id: nodeVersionId,
      nodeId: "00000000-0000-0000-0000-000000000010",
      title: "Ventas",
      contentMarkdown: "# Área de Ventas\n\nBienvenido a la sección de ventas.",
      status: NodeStatus.active,
      savedBy: mockUserId,
      changeNote: "Versión inicial del nodo Ventas creada por el sembrador.",
    },
  });
  console.log("Node version seeded successfully");

  // 8. Associate Tags to Nodes via node_tags
  const nodeTagsToSeed = [
    { nodeId: "00000000-0000-0000-0000-000000000010", tagId: tagVentasId },
    { nodeId: "00000000-0000-0000-0000-000000000016", tagId: tagProcesoId },
    { nodeId: "00000000-0000-0000-0000-000000000012", tagId: tagPuestoId },
  ];

  for (const nodeTagInput of nodeTagsToSeed) {
    await prisma.nodeTag.upsert({
      where: {
        nodeId_tagId: {
          nodeId: nodeTagInput.nodeId,
          tagId: nodeTagInput.tagId,
        },
      },
      update: {},
      create: {
        nodeId: nodeTagInput.nodeId,
        tagId: nodeTagInput.tagId,
      },
    });
  }
  console.log("Node-Tag associations seeded successfully");

  console.log("Database seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error("Error during database seed execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import db from '@/lib/db';
import { Template, TemplateType } from '@/types';
import { Prisma } from '@prisma/client';

export interface CreateTemplateInput {
  brainId: string;
  name: string;
  description?: string | null;
  templateType: TemplateType;
  schemaJson: Record<string, unknown>;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  schemaJson?: Record<string, unknown>;
}

function normalizeDescription(desc: unknown): string | null | undefined {
  if (desc === undefined) return undefined;
  if (desc === null) return null;
  if (typeof desc !== 'string') return null;
  const trimmed = desc.trim();
  return trimmed === '' ? null : trimmed;
}

export function validateTemplateData(
  data: {
    name?: unknown;
    description?: unknown;
    templateType?: unknown;
    schemaJson?: unknown;
  },
  isUpdate = false,
  existingType?: TemplateType
) {
  // Validate name
  if (!isUpdate || data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new Error('El nombre de la plantilla es obligatorio y no puede estar vacío.');
    }
    if (data.name.trim().length > 100) {
      throw new Error('El nombre de la plantilla no puede exceder los 100 caracteres.');
    }
  }

  // Validate description
  if (data.description !== undefined) {
    if (data.description !== null) {
      if (typeof data.description !== 'string') {
        throw new Error('La descripción debe ser un texto o nula.');
      }
      if (data.description.length > 300) {
        throw new Error('La descripción no puede exceder los 300 caracteres.');
      }
    }
  }

  // Determine templateType for schema validation
  let type: TemplateType;
  if (!isUpdate) {
    if (data.templateType !== 'page' && data.templateType !== 'structure') {
      throw new Error('El tipo de plantilla debe ser "page" o "structure".');
    }
    type = data.templateType as TemplateType;
  } else {
    type = existingType!;
  }

  // Validate schemaJson
  if (!isUpdate || data.schemaJson !== undefined) {
    const schema = data.schemaJson;
    if (typeof schema !== 'object' || schema === null || Array.isArray(schema)) {
      throw new Error('El esquema debe ser un objeto válido.');
    }

    const record = schema as Record<string, unknown>;

    if (type === 'page') {
      const fields = record.fields;
      if (!Array.isArray(fields) || fields.length === 0) {
        throw new Error('Una plantilla de página debe tener un array "fields" no vacío.');
      }
      for (const field of fields) {
        if (typeof field !== 'object' || field === null || Array.isArray(field)) {
          throw new Error('Cada campo en "fields" debe ser un objeto.');
        }
        const f = field as Record<string, unknown>;
        if (typeof f.name !== 'string' || !f.name.trim()) {
          throw new Error('Cada campo debe tener una propiedad "name" de tipo texto no vacía.');
        }
        if (f.label !== undefined && typeof f.label !== 'string') {
          throw new Error('La propiedad "label" del campo debe ser de tipo texto.');
        }
        if (f.type !== undefined && typeof f.type !== 'string') {
          throw new Error('La propiedad "type" del campo debe ser de tipo texto.');
        }
      }
    } else if (type === 'structure') {
      const sections = record.sections;
      if (!Array.isArray(sections) || sections.length === 0) {
        throw new Error('Una plantilla de estructura debe tener un array "sections" no vacío.');
      }
      for (const section of sections) {
        if (typeof section !== 'object' || section === null || Array.isArray(section)) {
          throw new Error('Cada sección en "sections" debe ser un objeto.');
        }
        const s = section as Record<string, unknown>;
        if (typeof s.name !== 'string' || !s.name.trim()) {
          throw new Error('Cada sección debe tener una propiedad "name" de tipo texto no vacía.');
        }
        if (s.label !== undefined && typeof s.label !== 'string') {
          throw new Error('La propiedad "label" de la sección debe ser de tipo texto.');
        }
      }
    }
  }
}

export async function getTemplatesForBrain(brainId: string): Promise<Template[]> {
  const dbTemplates = await db.template.findMany({
    where: { brainId },
    orderBy: [
      { templateType: 'asc' },
      { name: 'asc' }
    ],
  });

  return dbTemplates.map((t) => ({
    id: t.id,
    brainId: t.brainId,
    name: t.name,
    description: t.description,
    templateType: t.templateType as TemplateType,
    schemaJson: t.schemaJson as Record<string, unknown>,
    createdBy: t.createdBy,
    updatedBy: t.updatedBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

export async function getTemplateById(templateId: string): Promise<Template | null> {
  const t = await db.template.findUnique({
    where: { id: templateId },
  });

  if (!t) return null;

  return {
    id: t.id,
    brainId: t.brainId,
    name: t.name,
    description: t.description,
    templateType: t.templateType as TemplateType,
    schemaJson: t.schemaJson as Record<string, unknown>,
    createdBy: t.createdBy,
    updatedBy: t.updatedBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function createTemplate(input: CreateTemplateInput, userId: string): Promise<Template> {
  const normalizedDesc = normalizeDescription(input.description);

  validateTemplateData({
    name: input.name,
    description: normalizedDesc,
    templateType: input.templateType,
    schemaJson: input.schemaJson,
  });

  const t = await db.template.create({
    data: {
      brainId: input.brainId,
      name: input.name.trim(),
      description: normalizedDesc ?? null,
      templateType: input.templateType,
      schemaJson: input.schemaJson as Prisma.InputJsonValue,
      createdBy: userId,
    },
  });

  return {
    id: t.id,
    brainId: t.brainId,
    name: t.name,
    description: t.description,
    templateType: t.templateType as TemplateType,
    schemaJson: t.schemaJson as Record<string, unknown>,
    createdBy: t.createdBy,
    updatedBy: t.updatedBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function updateTemplate(
  templateId: string,
  input: UpdateTemplateInput,
  userId: string
): Promise<Template | null> {
  const existing = await db.template.findUnique({
    where: { id: templateId },
  });

  if (!existing) return null;

  const normalizedDesc = normalizeDescription(input.description);

  validateTemplateData(
    {
      name: input.name,
      description: normalizedDesc,
      schemaJson: input.schemaJson,
    },
    true,
    existing.templateType as TemplateType
  );

  const dataToUpdate: {
    name?: string;
    description?: string | null;
    schemaJson?: Prisma.InputJsonValue;
    updatedBy: string;
  } = {
    updatedBy: userId,
  };
  if (input.name !== undefined) {
    dataToUpdate.name = input.name.trim();
  }
  if (normalizedDesc !== undefined) {
    dataToUpdate.description = normalizedDesc;
  }
  if (input.schemaJson !== undefined) {
    dataToUpdate.schemaJson = input.schemaJson as Prisma.InputJsonValue;
  }

  const t = await db.template.update({
    where: { id: templateId },
    data: dataToUpdate,
  });

  return {
    id: t.id,
    brainId: t.brainId,
    name: t.name,
    description: t.description,
    templateType: t.templateType as TemplateType,
    schemaJson: t.schemaJson as Record<string, unknown>,
    createdBy: t.createdBy,
    updatedBy: t.updatedBy,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  const existing = await db.template.findUnique({
    where: { id: templateId },
  });

  if (!existing) return false;

  await db.template.delete({
    where: { id: templateId },
  });

  return true;
}

import db from '@/lib/db';
import { Template, TemplateType } from '@/types';

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

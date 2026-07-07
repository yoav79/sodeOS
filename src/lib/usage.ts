import 'server-only';
import db from '@/lib/db';
import { UsageFeature, Prisma } from '@prisma/client';

export type RecordUsageInput = {
  organizationId: string;
  feature: UsageFeature;
  userId?: string | null;
  brainId?: string | null;
  nodeId?: string | null;
  quantity?: number;
  tokensPrompt?: number | null;
  tokensCompletion?: number | null;
  tokensTotal?: number | null;
  bytesIn?: bigint | number | null;
  bytesOut?: bigint | number | null;
  estimatedCostUsd?: Prisma.Decimal | number | string | null;
  metadata?: Prisma.InputJsonValue | null;
};

/**
 * Helper centralizado para registrar de forma tolerante a fallos el uso de
 * servicios consumidos (IA, búsqueda web, transferencias R2, extracciones).
 */
export async function recordUsage(input: RecordUsageInput): Promise<void> {
  try {
    const {
      organizationId,
      feature,
      userId,
      brainId,
      nodeId,
      quantity,
      tokensPrompt,
      tokensCompletion,
      tokensTotal,
      bytesIn,
      bytesOut,
      estimatedCostUsd,
      metadata,
    } = input;

    // 1. Validar que venga organizationId
    if (!organizationId || organizationId.trim() === '') {
      console.warn('[recordUsage] Se omitió el registro de consumo: organizationId es requerido.');
      return;
    }

    // 2. Resolver quantity default
    const finalQuantity = typeof quantity === 'number' ? quantity : 1;

    // 3. Convertir bytes a BigInt si vienen como number
    const finalBytesIn = typeof bytesIn === 'number' ? BigInt(bytesIn) : bytesIn;
    const finalBytesOut = typeof bytesOut === 'number' ? BigInt(bytesOut) : bytesOut;

    // 4. Convertir cost a Decimal si viene como number/string
    let finalCost: Prisma.Decimal | null = null;
    if (estimatedCostUsd !== undefined && estimatedCostUsd !== null) {
      if (estimatedCostUsd instanceof Prisma.Decimal) {
        finalCost = estimatedCostUsd;
      } else {
        try {
          finalCost = new Prisma.Decimal(estimatedCostUsd);
        } catch (decErr) {
          console.error('[recordUsage] Error al parsear estimatedCostUsd a Decimal:', decErr);
        }
      }
    }

    // 5. Construir payload de inserción de forma explícita
    const data: Prisma.UsageRecordCreateInput = {
      organization: {
        connect: { id: organizationId },
      },
      feature,
      quantity: finalQuantity,
      tokensPrompt: tokensPrompt ?? null,
      tokensCompletion: tokensCompletion ?? null,
      tokensTotal: tokensTotal ?? null,
      bytesIn: finalBytesIn ?? null,
      bytesOut: finalBytesOut ?? null,
      estimatedCostUsd: finalCost,
      metadata: (metadata !== null && metadata !== undefined) ? metadata : undefined,
    };

    if (userId) {
      data.user = { connect: { id: userId } };
    }
    if (brainId) {
      data.brain = { connect: { id: brainId } };
    }
    if (nodeId) {
      data.node = { connect: { id: nodeId } };
    }

    // 6. Insertar en base de datos
    await db.usageRecord.create({ data });

  } catch (error: unknown) {
    // 7. Tolerancia a fallos: capturar error, loguear, y no relanzar.
    console.error('[recordUsage] Error inesperado al registrar el consumo operativo:', error);
  }
}

/**
 * Type guard para verificar si un valor desconocido es una característica de uso válida.
 */
export function isUsageFeature(value: unknown): value is UsageFeature {
  if (typeof value !== 'string') return false;
  return Object.values(UsageFeature).includes(value as UsageFeature);
}

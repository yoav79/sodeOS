import 'server-only';
import db from '@/lib/db';
import { OrganizationPlan, UsageFeature } from '@prisma/client';

export type UsageLimitCheck =
  | 'ai_requests'
  | 'ai_tokens'
  | 'web_searches'
  | 'file_uploads'
  | 'storage_bytes'
  | 'max_file_size_bytes'
  | 'attachment_extractions';

export class UsageLimitError extends Error {
  public readonly check: UsageLimitCheck;
  public readonly limitValue: number;
  public readonly currentUsage: number;
  public readonly incrementBy: number;

  constructor(
    check: UsageLimitCheck,
    limitValue: number,
    currentUsage: number,
    incrementBy: number
  ) {
    super(`Usage limit exceeded for ${check}`);
    this.name = 'UsageLimitError';
    this.check = check;
    this.limitValue = limitValue;
    this.currentUsage = currentUsage;
    this.incrementBy = incrementBy;

    // Set the prototype explicitly (standard TypeScript practice for custom errors)
    Object.setPrototypeOf(this, UsageLimitError.prototype);
  }
}

export const PLAN_LIMITS = {
  free: {
    aiRequestsMonthly: 30,
    aiTokensMonthly: 100000,
    webSearchesMonthly: 0,
    maxFileSizeBytes: 5 * 1024 * 1024,
    fileUploadsMonthly: 10,
    storageBytesMax: 100 * 1024 * 1024,
    attachmentExtractionsMonthly: 5,
  },
  pro: {
    aiRequestsMonthly: 500,
    aiTokensMonthly: 2000000,
    webSearchesMonthly: 100,
    maxFileSizeBytes: 20 * 1024 * 1024,
    fileUploadsMonthly: 200,
    storageBytesMax: 5 * 1024 * 1024 * 1024,
    attachmentExtractionsMonthly: 100,
  },
  enterprise: {
    aiRequestsMonthly: null,
    aiTokensMonthly: null,
    webSearchesMonthly: null,
    maxFileSizeBytes: null,
    fileUploadsMonthly: null,
    storageBytesMax: null,
    attachmentExtractionsMonthly: null,
  },
} as const;

export function getCurrentMonthStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

export async function getUsageSummary(params: {
  organizationId: string;
  features: UsageFeature[];
  periodStart?: Date;
}): Promise<{
  totalQuantity: number;
  totalTokens: number;
  totalBytesIn: bigint;
  totalBytesOut: bigint;
}> {
  const { organizationId, features, periodStart } = params;

  const result = await db.usageRecord.aggregate({
    where: {
      organizationId,
      feature: { in: features },
      ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
    },
    _sum: {
      quantity: true,
      tokensTotal: true,
      bytesIn: true,
      bytesOut: true,
    },
  });

  return {
    totalQuantity: result._sum.quantity ?? 0,
    totalTokens: result._sum.tokensTotal ?? 0,
    totalBytesIn: result._sum.bytesIn ?? BigInt(0),
    totalBytesOut: result._sum.bytesOut ?? BigInt(0),
  };
}

export async function assertWithinLimit(params: {
  organizationId: string;
  plan: OrganizationPlan;
  check: UsageLimitCheck;
  incrementBy?: number;
}): Promise<void> {
  const { organizationId, plan, check } = params;
  const incrementBy = typeof params.incrementBy === 'number' ? params.incrementBy : 1;

  // 1. Max File Size Check (does not query database)
  if (check === 'max_file_size_bytes') {
    const limit = PLAN_LIMITS[plan].maxFileSizeBytes;
    if (limit === null) return; // Enterprise / No limit

    if (incrementBy > limit) {
      throw new UsageLimitError(check, limit, 0, incrementBy);
    }
    return;
  }

  // 2. Resolve target configuration for other checks
  let limit: number | null = null;
  let features: UsageFeature[] = [];
  let useMonthlyPeriod = true;

  switch (check) {
    case 'ai_requests':
      limit = PLAN_LIMITS[plan].aiRequestsMonthly;
      features = [UsageFeature.ai_document, UsageFeature.ai_agent];
      useMonthlyPeriod = true;
      break;

    case 'ai_tokens':
      limit = PLAN_LIMITS[plan].aiTokensMonthly;
      features = [UsageFeature.ai_document, UsageFeature.ai_agent];
      useMonthlyPeriod = true;
      break;

    case 'web_searches':
      limit = PLAN_LIMITS[plan].webSearchesMonthly;
      features = [UsageFeature.web_search];
      useMonthlyPeriod = true;
      break;

    case 'file_uploads':
      limit = PLAN_LIMITS[plan].fileUploadsMonthly;
      features = [UsageFeature.file_upload];
      useMonthlyPeriod = true;
      break;

    case 'storage_bytes':
      limit = PLAN_LIMITS[plan].storageBytesMax;
      features = [UsageFeature.file_upload];
      useMonthlyPeriod = false; // Historic lifetime usage
      break;

    case 'attachment_extractions':
      limit = PLAN_LIMITS[plan].attachmentExtractionsMonthly;
      features = [UsageFeature.attachment_extraction];
      useMonthlyPeriod = true;
      break;

    default:
      // Fallback safe return
      return;
  }

  // If the plan has no limit for this check, skip DB query
  if (limit === null) {
    return;
  }

  // 3. Fetch current usage from Database
  const periodStart = useMonthlyPeriod ? getCurrentMonthStart() : undefined;
  const usage = await getUsageSummary({
    organizationId,
    features,
    periodStart,
  });

  // 4. Compare current usage + increment against limit
  if (check === 'ai_tokens') {
    const current = usage.totalTokens;
    if (current + incrementBy > limit) {
      throw new UsageLimitError(check, limit, current, incrementBy);
    }
  } else if (check === 'storage_bytes') {
    const current = usage.totalBytesIn; // bigint
    const limitBigInt = BigInt(limit);
    if (current + BigInt(incrementBy) > limitBigInt) {
      // Convert current bigint to number for the Error constructor (approximate is fine for metadata)
      const currentNum = current > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(current);
      throw new UsageLimitError(check, limit, currentNum, incrementBy);
    }
  } else {
    const current = usage.totalQuantity;
    if (current + incrementBy > limit) {
      throw new UsageLimitError(check, limit, current, incrementBy);
    }
  }
}

import { NextResponse } from 'next/server';
import { getCurrentUser, resolveActiveOrganization, verifyOrgAccess, AuthError } from '@/lib/auth';
import { PLAN_LIMITS, getUsageSummary, getCurrentMonthStart } from '@/lib/limits';
import { UsageFeature } from '@prisma/client';

export const runtime = 'nodejs';

function bigintToNumber(val: bigint): number {
  if (val > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('El valor de almacenamiento excede el límite máximo de enteros seguros en JavaScript.');
  }
  return Number(val);
}

export async function GET() {
  try {
    // 1. Authenticate user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Resolve active organization and verify access
    const activeOrg = await resolveActiveOrganization();
    await verifyOrgAccess(currentUser.id, activeOrg.id, 'org_member');

    const organizationId = activeOrg.id;
    const plan = activeOrg.plan;
    const limits = PLAN_LIMITS[plan];
    const periodStart = getCurrentMonthStart();

    // 3. Fetch all metrics in parallel using Promise.all
    const [
      aiSummary,
      webSearchSummary,
      fileUploadSummary,
      storageSummary,
      extractionSummary,
    ] = await Promise.all([
      // AI Requests & Tokens (monthly)
      getUsageSummary({
        organizationId,
        features: [UsageFeature.ai_document, UsageFeature.ai_agent],
        periodStart,
      }),
      // Web searches (monthly)
      getUsageSummary({
        organizationId,
        features: [UsageFeature.web_search],
        periodStart,
      }),
      // File uploads (monthly)
      getUsageSummary({
        organizationId,
        features: [UsageFeature.file_upload],
        periodStart,
      }),
      // Storage bytes (lifetime / historic)
      getUsageSummary({
        organizationId,
        features: [UsageFeature.file_upload],
      }),
      // Attachment extractions (monthly)
      getUsageSummary({
        organizationId,
        features: [UsageFeature.attachment_extraction],
        periodStart,
      }),
    ]);

    // 4. Construct JSON payload
    return NextResponse.json({
      organizationId,
      plan,
      periodStart: periodStart.toISOString(),
      generatedAt: new Date().toISOString(),
      limits: {
        ai_requests: {
          used: aiSummary.totalQuantity,
          limit: limits.aiRequestsMonthly,
          period: 'monthly',
        },
        ai_tokens: {
          used: aiSummary.totalTokens,
          limit: limits.aiTokensMonthly,
          period: 'monthly',
        },
        web_searches: {
          used: webSearchSummary.totalQuantity,
          limit: limits.webSearchesMonthly,
          period: 'monthly',
        },
        file_uploads: {
          used: fileUploadSummary.totalQuantity,
          limit: limits.fileUploadsMonthly,
          period: 'monthly',
        },
        storage_bytes: {
          used: bigintToNumber(storageSummary.totalBytesIn),
          limit: limits.storageBytesMax,
          period: 'lifetime',
        },
        max_file_size_bytes: {
          used: null,
          limit: limits.maxFileSizeBytes,
          period: 'per_request',
        },
        attachment_extractions: {
          used: extractionSummary.totalQuantity,
          limit: limits.attachmentExtractionsMonthly,
          period: 'monthly',
        },
      },
    }, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error in GET /api/usage/summary:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

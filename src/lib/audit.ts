import { Prisma } from '@prisma/client';
import db from '@/lib/db';

export const AuditAction = {
  ORG_CREATED: 'ORG_CREATED',
  ORG_PLAN_CHANGED: 'ORG_PLAN_CHANGED',
  ORG_MEMBER_INVITED: 'ORG_MEMBER_INVITED',
  ORG_MEMBER_REMOVED: 'ORG_MEMBER_REMOVED',
  ORG_MEMBER_ROLE_CHANGED: 'ORG_MEMBER_ROLE_CHANGED',
  BRAIN_CREATED: 'BRAIN_CREATED',
  BRAIN_DELETED: 'BRAIN_DELETED',
  BRAIN_MEMBER_ADDED: 'BRAIN_MEMBER_ADDED',
  BRAIN_MEMBER_REMOVED: 'BRAIN_MEMBER_REMOVED',
  BRAIN_MEMBER_ROLE_CHANGED: 'BRAIN_MEMBER_ROLE_CHANGED',
  NODE_ARCHIVED: 'NODE_ARCHIVED',
  NODE_DELETED: 'NODE_DELETED',
  ATTACHMENT_DELETED: 'ATTACHMENT_DELETED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_PASSWORD_CHANGED: 'USER_PASSWORD_CHANGED',
} as const;

export type AuditAction = typeof AuditAction[keyof typeof AuditAction];

export interface LogAuditEventInput {
  organizationId?: string | null;
  actorUserId?: string | null;
  action: AuditAction;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
}

const BLOCKED_METADATA_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'secret',
  'apikey',
  'api_key',
  'sessiontoken',
  'session_token',
  'authorization',
  'credential',
  'creditcard',
  'credit_card',
  'cvv',
  'ssn',
  'contentmarkdown',
  'content',
  'prompt',
  'response',
]);

function sanitizeAuditMetadata(
  raw: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!raw) return null;
  const safe: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    const lowerKey = key.toLowerCase();
    if (BLOCKED_METADATA_KEYS.has(lowerKey)) {
      safe[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects (up to 1 level to avoid circular references)
      safe[key] = sanitizeAuditMetadata(value as Record<string, unknown>);
    } else {
      safe[key] = value;
    }
  }

  return safe;
}

/**
 * Registers an audit event in the database.
 * Tolerant to errors: if database write fails, it logs to console but does not throw,
 * preventing disruptions in the main application flow.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    const sanitizedMetadata = sanitizeAuditMetadata(input.metadata);

    await db.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata: sanitizedMetadata as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error('[logAuditEvent] Error saving audit log to database:', error);
  }
}

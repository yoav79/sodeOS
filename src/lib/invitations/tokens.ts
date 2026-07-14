import crypto from 'crypto';
import type { BrainRole } from '@prisma/client';
import {
  DEFAULT_INVITATION_EXPIRATION_HOURS,
  type InvitationTokenPair,
  type InvitationExpirationInput,
  type GetInvitationStatusInput,
  type InvitationStatus,
  type InvitationRoleLabel,
  type BuildInvitationAcceptUrlInput,
} from './types';

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

export function createInvitationTokenPair(): InvitationTokenPair {
  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  return { token, tokenHash };
}

export function getInvitationExpiresAt(input?: InvitationExpirationInput): Date {
  const hours = input?.hours && input.hours > 0
    ? input.hours
    : DEFAULT_INVITATION_EXPIRATION_HOURS;
  const now = input?.now ?? new Date();
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

export function isInvitationExpired(expiresAt: Date | string, now?: Date): boolean {
  const expires = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const current = now ?? new Date();
  return current >= expires;
}

export function getInvitationStatus(input: GetInvitationStatusInput): InvitationStatus {
  if (input.revokedAt) return 'revoked';
  if (input.acceptedAt) return 'accepted';
  if (isInvitationExpired(input.expiresAt, input.now)) return 'expired';
  return 'pending';
}

export function buildInvitationAcceptUrl(input: BuildInvitationAcceptUrlInput): string {
  const base = (input.appUrl || process.env.EMAIL_APP_URL || 'http://localhost:3000')
    .replace(/\/+$/, '');
  return `${base}/invitations/accept?token=${encodeURIComponent(input.token)}`;
}

export function getBrainRoleLabel(role: BrainRole): InvitationRoleLabel {
  switch (role) {
    case 'owner':
      return 'Propietario';
    case 'editor':
      return 'Editor';
    case 'reader':
      return 'Lector';
    default:
      throw new Error(`Unexpected brain role: ${role}`);
  }
}

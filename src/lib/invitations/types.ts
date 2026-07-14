export const DEFAULT_INVITATION_EXPIRATION_HOURS = 48;

export interface InvitationTokenPair {
  token: string;
  tokenHash: string;
}

export interface BuildInvitationAcceptUrlInput {
  token: string;
  appUrl?: string;
}

export interface InvitationExpirationInput {
  hours?: number;
  now?: Date;
}

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'expired'
  | 'revoked';

export interface GetInvitationStatusInput {
  acceptedAt?: Date | string | null;
  expiresAt: Date | string;
  revokedAt?: Date | string | null;
  now?: Date;
}

export type InvitationRoleLabel = 'Propietario' | 'Editor' | 'Lector';

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

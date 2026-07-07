import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { User } from '@/types';
import { BrainRole, OrgRole, Organization, OrganizationMembership } from '@prisma/client';
import { cache } from 'react';
import { extractOrgSlugFromHost } from '@/lib/tenant';

export const SESSION_COOKIE_NAME = 'cerebro_session';
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Compares a plain text password with a bcrypt hash.
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Creates a new session for a user in the database.
 * Returns the generated unique session token.
 */
export async function createSession(userId: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({
    data: {
      userId,
      sessionToken,
      expiresAt,
    },
  });

  return sessionToken;
}

/**
 * Deletes a session from the database using the token.
 */
export async function deleteSession(sessionToken: string): Promise<void> {
  try {
    await db.session.delete({
      where: { sessionToken },
    });
  } catch (error) {
    // If the session was already deleted or doesn't exist, ignore the error
    console.warn('Session deletion attempted but failed (likely already revoked):', error);
  }
}

/**
 * Retrieves the current authenticated user by validating the session cookie.
 * Returns null if the session is invalid, expired, or missing.
 * Automatically deletes expired sessions from the database.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionTokenCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionTokenCookie || !sessionTokenCookie.value) {
      return null;
    }

    const sessionToken = sessionTokenCookie.value;

    const session = await db.session.findUnique({
      where: { sessionToken },
      include: {
        user: true,
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await deleteSession(sessionToken);
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
      phone: session.user.phone,
      company: session.user.company,
      department: session.user.department,
      jobTitle: session.user.jobTitle,
      isSysadmin: session.user.isSysadmin,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Enforces authentication. Retrieves the current user,
 * and throws an error if they are not authenticated.
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

// Map roles to hierarchical numeric values
const ROLE_VALUES: Record<BrainRole, number> = {
  owner: 3,
  editor: 2,
  reader: 1,
};

/**
 * Verifies if a user has access to a specific Brain with at least the minimum role required.
 * Returns the BrainMember record if access is allowed.
 * Throws an AuthError with status 403 or 404 if access is denied.
 */
export async function verifyBrainAccess(
  userId: string,
  brainId: string,
  minRole: BrainRole = 'reader'
) {
  // 1. Resolve active organization
  const activeOrg = await resolveActiveOrganization();

  // 2. Fetch brain to check organization ownership
  const brain = await db.brain.findUnique({
    where: { id: brainId },
    select: { id: true, organizationId: true },
  });

  if (!brain) {
    throw new AuthError('El cerebro especificado no existe.', 404);
  }

  // 3. Ensure the brain belongs to the active organization
  if (!brain.organizationId || brain.organizationId !== activeOrg.id) {
    throw new AuthError('El cerebro especificado no existe.', 404);
  }

  // 4. Validate brain membership and role hierarchy
  const membership = await db.brainMember.findUnique({
    where: {
      brainId_userId: {
        brainId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new AuthError('No tienes acceso a este cerebro.', 403);
  }

  const userRoleValue = ROLE_VALUES[membership.role];
  const requiredRoleValue = ROLE_VALUES[minRole];

  if (userRoleValue < requiredRoleValue) {
    throw new AuthError('Permisos insuficientes para realizar esta acción.', 403);
  }

  return membership;
}

/**
 * Resolves the active Organization.
 *
 * Priority:
 * 1. x-active-org-slug header (will be injected by middleware in Subfase 3D)
 * 2. Host-based extraction via extractOrgSlugFromHost()
 *
 * Falls back to DEV_ORG_SLUG || 'demo' in development.
 * Cached per request cycle.
 */
export const resolveActiveOrganization = cache(async (): Promise<Organization> => {
  const headersList = await headers();

  // 1. Check internal header first (middleware-injected in future)
  let slug = headersList.get('x-active-org-slug')?.trim() || '';

  // 2. Fallback: extract from host using the pure tenant helper
  if (!slug) {
    const host = headersList.get('host') || '';
    slug = extractOrgSlugFromHost(host) || '';
  }

  if (!slug) {
    throw new AuthError('No se pudo determinar la organización activa.', 400);
  }

  const organization = await db.organization.findUnique({
    where: { slug },
  });

  if (!organization) {
    throw new AuthError('La organización especificada no existe.', 404);
  }

  if (!organization.isActive) {
    throw new AuthError('La organización está inactiva.', 403);
  }

  return organization;
});

/**
 * Ranks OrgRoles to determine minimum role authorization hierarchy.
 */
const ORG_ROLE_VALUES: Record<OrgRole, number> = {
  org_owner: 2,
  org_member: 1,
};

/**
 * Verifies if a user has access to a specific Organization with the required minimum role.
 * Does NOT allow bypass for global sysadmins without explicit OrganizationMembership.
 */
export async function verifyOrgAccess(
  userId: string,
  organizationId: string,
  minRole: OrgRole = 'org_member'
): Promise<OrganizationMembership> {
  const membership = await db.organizationMembership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new AuthError('No eres miembro de esta organización.', 403);
  }

  const userRoleValue = ORG_ROLE_VALUES[membership.role];
  const requiredRoleValue = ORG_ROLE_VALUES[minRole];

  if (userRoleValue < requiredRoleValue) {
    throw new AuthError('Permisos insuficientes en la organización.', 403);
  }

  return membership;
}


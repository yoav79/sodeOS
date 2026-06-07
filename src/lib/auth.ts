import { cookies } from 'next/headers';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '@/lib/db';
import { User } from '@/types';

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

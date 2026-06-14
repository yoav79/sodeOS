import 'server-only';
import crypto from 'crypto';

/**
 * Sanitizes a filename to prevent path traversal, injection, or formatting issues.
 * Normalizes unicode (removing accents) and maps unsafe characters to underscores.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) {
    return 'unnamed_file';
  }

  // Normalize unicode NFD to split accents from base characters
  const normalized = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Extract extension and name
  const lastDot = normalized.lastIndexOf('.');
  let name = lastDot !== -1 ? normalized.substring(0, lastDot) : normalized;
  let ext = lastDot !== -1 ? normalized.substring(lastDot) : '';

  // Sanitize name: remove anything that is not alphanumeric, hyphen, dot, or underscore
  name = name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  // Sanitize extension: remove anything not alphanumeric
  ext = ext.replace(/[^.a-zA-Z0-9]/g, '');

  // Strip leading/trailing dots or hyphens
  name = name.replace(/^[.\-_]+|[.\-_]+$/g, '');

  // Final fallback if name became empty
  const safeName = name || 'file';

  return `${safeName}${ext}`.toLowerCase();
}

/**
 * Generates a standard prefix for all files belonging to a specific user.
 */
export function getUserStoragePrefix(userId: string): string {
  if (!userId) {
    throw new Error('UserId es requerido para obtener el prefijo de almacenamiento.');
  }
  return `raw/${userId}/`;
}

/**
 * Builds a secure, unique storage key for a user file.
 * Prevents overwrites by generating a UUID.
 */
export function buildStorageKey(userId: string, filename: string): string {
  const prefix = getUserStoragePrefix(userId);
  const uuid = crypto.randomUUID();
  const safeName = sanitizeFilename(filename);
  
  return `${prefix}${uuid}-${safeName}`;
}

/**
 * Asserts that a key belongs to a specific user based on the path structure.
 * Throws an error if the user is unauthorized.
 */
export function assertKeyBelongsToUser(userId: string, key: string): void {
  if (!userId || !key) {
    throw new Error('UserId y Key son requeridos para validar permisos de acceso.');
  }

  const prefix = getUserStoragePrefix(userId);
  
  // A key belongs to the user if it starts with "raw/{userId}/"
  if (!key.startsWith(prefix)) {
    throw new Error('Acceso no autorizado: el archivo no pertenece al usuario actual.');
  }

  // Check for path traversal attempts inside the key
  if (key.includes('..') || key.includes('\\')) {
    throw new Error('Acceso no autorizado: formato de clave inválido.');
  }
}

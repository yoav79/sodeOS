/**
 * Tenant helper — pure host parsing for org slug extraction.
 *
 * This helper is safe for middleware because it does NOT use the database.
 * `resolveActiveOrganization()` will continue to validate existence and
 * `isActive` in the database in a subsequent subphase.
 */

const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'app',
  'mail',
  'cdn',
  'static',
  'assets',
  'admin',
  'sysadmin',
];

/**
 * Extracts the organization slug from a host string.
 *
 * - Empty/null/undefined or whitespace-only → null
 * - Normalized: trimmed, lowercased, port stripped
 * - Localhost / 127.0.0.1 / development mode → DEV_ORG_SLUG env var or 'demo'
 * - Production subdomains (e.g. acme.sodeos.app) → 'acme'
 * - Root domain with fewer than 3 parts → null (unless dev fallback applies)
 * - Reserved subdomains (www, api, etc.) → null
 *
 * Does NOT query the database — safe for use in middleware.
 */
export function extractOrgSlugFromHost(host: string | null | undefined): string | null {
  if (!host || !host.trim()) {
    return null;
  }

  let normalized = host.trim().toLowerCase();

  // Strip port if present (e.g. "acme.sodeos.app:3000" → "acme.sodeos.app")
  const colonIndex = normalized.indexOf(':');
  if (colonIndex > 0) {
    normalized = normalized.slice(0, colonIndex);
  }

  // Dev fallback: localhost, 127.0.0.1, or explicit development mode
  if (
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    process.env.NODE_ENV === 'development'
  ) {
    return process.env.DEV_ORG_SLUG || 'demo';
  }

  // Split into parts and validate structure
  const parts = normalized.split('.');

  // Root domain or too few parts → not a subdomain-based org
  if (parts.length < 3) {
    return null;
  }

  const subdomain = parts[0];

  // Reserved subdomains are not org slugs
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }

  return subdomain;
}

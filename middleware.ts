import { NextRequest, NextResponse } from 'next/server';
import { extractOrgSlugFromHost } from '@/lib/tenant';

/**
 * Tenant middleware — injects x-active-org-slug header into every request.
 *
 * This middleware does NOT:
 * - Query the database
 * - Authenticate users
 * - Validate organization existence or status
 * - Import Prisma or auth.ts
 *
 * Organization validation is handled by resolveActiveOrganization() in auth.ts.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const slug = extractOrgSlugFromHost(host);

  if (slug) {
    const headers = new Headers(request.headers);
    headers.set('x-active-org-slug', slug);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - api/sysadmin (sysadmin endpoints)
     * - login (login page)
     * - register (register page)
     * - sysadmin (sysadmin page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml
     * - static file extensions (png, jpg, jpeg, gif, svg, ico, css, js, map, txt, xml, webmanifest)
     */
    '/((?!api/auth|api/sysadmin|login|register|sysadmin|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|txt|xml|webmanifest)$).*)',
  ],
};

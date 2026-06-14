import 'server-only';

/**
 * Detects if a URL is an internal R2 file download link.
 * Extracts the storage key safely if matches, otherwise returns null.
 */
export function getInternalAvatarKey(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  try {
    // Handle relative path: /api/files/download?key=...
    if (url.startsWith('/api/files/download')) {
      const parts = url.split('?');
      if (parts[1]) {
        const params = new URLSearchParams(parts[1]);
        const key = params.get('key');
        return key || null;
      }
    }

    // Handle absolute URL: http://.../api/files/download?key=...
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname === '/api/files/download') {
        return parsedUrl.searchParams.get('key') || null;
      }
    }
  } catch {
    // Silently catch and return null for invalid URLs
  }

  return null;
}

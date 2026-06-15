import DOMPurify from 'isomorphic-dompurify';

let isHookRegistered = false;

function registerHooks() {
  if (isHookRegistered) return;
  isHookRegistered = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DOMPurify.addHook('uponSanitizeAttribute', (node, data: any) => {
    // 1. Enforce strict CSS styling whitelist
    if (data.attrName === 'style') {
      const styleValue = data.attrValue;
      const declarations = styleValue.split(';');
      const cleanedDeclarations: string[] = [];

      const allowedStyles = ['color', 'background-color', 'text-decoration'];

      for (const decl of declarations) {
        if (!decl.trim()) continue;
        const parts = decl.split(':');
        if (parts.length < 2) continue;
        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(':').trim();

        if (allowedStyles.includes(key)) {
          const lowerVal = val.toLowerCase();
          if (
            !lowerVal.includes('url(') &&
            !lowerVal.includes('expression(') &&
            !lowerVal.includes('javascript:') &&
            !lowerVal.includes('<') &&
            !lowerVal.includes('>')
          ) {
            cleanedDeclarations.push(`${key}: ${val}`);
          }
        }
      }

      if (cleanedDeclarations.length > 0) {
        data.attrValue = cleanedDeclarations.join('; ');
      } else {
        node.removeAttribute('style');
        data.keepAttr = false;
      }
    }

    // 2. Restrict img[src] strictly to internal node attachments
    if (data.attrName === 'src' && node.tagName === 'IMG') {
      const src = data.attrValue;
      const attachmentPattern = /^\/api\/attachments\/[a-zA-Z0-9_-]+\/download$/;
      if (!attachmentPattern.test(src)) {
        data.keepAttr = false;
        node.removeAttribute('src');
      }
    }
  });

  // 3. Force rel="noopener noreferrer" for links with target="_blank"
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const target = node.getAttribute('target');
      if (target === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
}

/**
 * Sanitiza contenido HTML permitiendo únicamente una whitelist segura de etiquetas,
 * atributos y estilos CSS en línea (color, background-color, text-decoration).
 * Se bloquean imágenes externas, clases arbitrarias y data/base64 URIs.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  registerHooks();

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'strong', 'em', 's', 'span', 'mark', 'u', 'a', 'img'
    ],
    // Explicitly excluded 'class' attribute from the allowed list
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style'],
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  }) as string;
}

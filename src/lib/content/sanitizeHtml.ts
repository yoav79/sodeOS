import DOMPurify from 'isomorphic-dompurify';

let isHookRegistered = false;

function registerHooks() {
  if (isHookRegistered) return;
  isHookRegistered = true;

const ALLOWED_COLORS = [
  '#0f172a', 'rgb(15,23,42)',
  '#475569', 'rgb(71,85,105)',
  '#ef4444', 'rgb(239,68,68)',
  '#f97316', 'rgb(249,115,22)',
  '#ca8a04', 'rgb(202,138,4)',
  '#16a34a', 'rgb(22,163,74)',
  '#2563eb', 'rgb(37,99,235)',
  '#7c3aed', 'rgb(124,58,237)'
];

const ALLOWED_BACKGROUND_COLORS = [
  '#fef3c7', 'rgb(254,243,199)',
  '#dcfce7', 'rgb(220,252,231)',
  '#dbeafe', 'rgb(219,234,254)',
  '#ede9fe', 'rgb(237,233,254)',
  '#fee2e2', 'rgb(254,226,226)'
];

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
        const lowerVal = val.toLowerCase().replace(/\s+/g, '');
        if (
          !lowerVal.includes('url(') &&
          !lowerVal.includes('expression(') &&
          !lowerVal.includes('javascript:') &&
          !lowerVal.includes('<') &&
          !lowerVal.includes('>')
        ) {
          if (key === 'color') {
            if (ALLOWED_COLORS.includes(lowerVal)) {
              cleanedDeclarations.push(`${key}: ${val}`);
            }
          } else if (key === 'background-color') {
            if (ALLOWED_BACKGROUND_COLORS.includes(lowerVal)) {
              cleanedDeclarations.push(`${key}: ${val}`);
            }
          } else if (key === 'text-decoration') {
            if (lowerVal === 'underline') {
              cleanedDeclarations.push(`${key}: ${val}`);
            }
          }
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

    // 3. Allow only controlled image alignment metadata
    if (data.attrName === 'data-align') {
      const align = String(data.attrValue || '').toLowerCase();
      const isValidAlign = align === 'left' || align === 'center' || align === 'right';

      if (node.tagName !== 'IMG' || !isValidAlign) {
        data.keepAttr = false;
        node.removeAttribute('data-align');
      }
    }
  });

  // 4. Force rel="noopener noreferrer" for links with target="_blank"
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

  const codeFences: string[] = [];
  const contentWithPlaceholders = html.replace(
    /(```[^\r\n]*[\r\n][\s\S]*?[\r\n]```|~~~[^\r\n]*[\r\n][\s\S]*?[\r\n]~~~)/g,
    (match) => {
      const index = codeFences.push(match) - 1;
      return `__SODE_CODE_FENCE_PLACEHOLDER_${index}__`;
    }
  );

  const sanitized = DOMPurify.sanitize(contentWithPlaceholders, {
    ALLOWED_TAGS: [
    'p', 'br', 'hr', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'code',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'strong', 'em', 's', 'span', 'mark', 'u', 'a', 'img'
    ],
    // Explicitly excluded 'class' attribute from the allowed list
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'style', 'data-align'],
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  }) as string;

  return sanitized.replace(/__SODE_CODE_FENCE_PLACEHOLDER_(\d+)__/g, (_match, index) => {
    return codeFences[Number(index)] || '';
  });
}

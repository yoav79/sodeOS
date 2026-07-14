interface BaseEmailLayoutInput {
  title: string;
  previewText?: string;
  bodyHtml: string;
}

/**
 * Generates a clean, consistent HTML layout wrapper for all outgoing emails.
 * Uses inline styles for maximum compatibility.
 */
export function renderBaseEmailLayout({ title, previewText, bodyHtml }: BaseEmailLayoutInput): string {
  const preview = previewText
    ? `<span style="display: none; max-height: 0px; overflow: hidden;">${previewText}</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc;">
  ${preview}
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout:fixed; background-color:#f8fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td align="left" style="padding:32px 32px 16px 32px; border-bottom:1px solid #f1f5f9;">
              <h1 style="margin:0; font-size:20px; font-weight:700; color:#0f172a; letter-spacing:-0.025em;">sodeOS</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td align="left" style="padding:32px; font-size:15px; line-height:24px; color:#334155;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 32px; background-color:#f8fafc; border-top:1px solid #f1f5f9; font-size:12px; line-height:18px; color:#64748b;">
              <p style="margin:0;">Este es un correo automático enviado por sodeOS.</p>
              <p style="margin:4px 0 0 0;">Si crees que has recibido este mensaje por error, puedes ignorarlo.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Super simple utility to strip HTML tags for generating plain text fallbacks.
 */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<style([\s\S]*?)<\/style>/gi, '')
    .replace(/<script([\s\S]*?)<\/script>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

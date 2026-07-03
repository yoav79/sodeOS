import 'server-only';
import db from '@/lib/db';
import { AttachmentExtractionStatus } from '@prisma/client';
import { PDFParse } from 'pdf-parse';

/**
 * Checks if the file is a supported plain text format (TXT or MD)
 * or PDF based on its extension and MIME type.
 */
export function isSupportedTextFormat(filename: string, contentType: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mime = contentType.toLowerCase();

  const isTxt = mime === 'text/plain' || ext === 'txt';
  const isMd = 
    mime === 'text/markdown' || 
    mime === 'text/x-markdown' || 
    ext === 'md' || 
    ext === 'markdown';
  const isPdf = mime === 'application/pdf' || ext === 'pdf';

  return isTxt || isMd || isPdf;
}

/**
 * Normalizes extracted text: converts CRLF to LF, maps tabs to spaces,
 * removes non-printable control characters, collapses consecutive newlines,
 * and trims whitespace.
 */
export function normalizeText(text: string): string {
  // Replace CRLF and CR with LF
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Replace tabs with spaces
  normalized = normalized.replace(/\t/g, ' ');

  // Remove dangerous control characters (except line feeds)
  normalized = normalized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Collapse more than 3 consecutive newlines into exactly 2 newlines (double spacing)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  return normalized.trim();
}

/**
 * Splits normalized text into fixed-size chunks with a sliding window overlap.
 * Enforces a strict limit on the number of generated chunks.
 */
export function generateChunks(
  text: string,
  chunkSize = 1000,
  overlap = 200,
  maxChunks = 500
): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  // Protect against infinite loop if overlap is larger than or equal to chunkSize
  if (chunkSize <= overlap) {
    overlap = Math.floor(chunkSize / 5);
  }

  while (startIndex < text.length && chunks.length < maxChunks) {
    const chunk = text.substring(startIndex, Math.min(startIndex + chunkSize, text.length));
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Slide window forwards
    startIndex += (chunkSize - overlap);
  }

  return chunks;
}

/**
 * Main orchestrator for attachment text extraction.
 * Extracts UTF-8 text from raw buffer, normalizes, chunks, and persists in DB.
 * Gracefully updates attachment status without failing parent upload transactions.
 */
export async function processAttachmentExtraction(
  attachmentId: string,
  nodeId: string,
  brainId: string,
  filename: string,
  contentType: string,
  buffer: Buffer
): Promise<void> {
  // 1. Detect format support
  if (!isSupportedTextFormat(filename, contentType)) {
    await db.nodeAttachment.update({
      where: { id: attachmentId },
      data: {
        extractionStatus: AttachmentExtractionStatus.unsupported,
      },
    });
    return;
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  const mime = contentType.toLowerCase();
  const isPdf = mime === 'application/pdf' || ext === 'pdf';

  // 2. Validate size limit for processing (2 MB for TXT/MD, 5 MB for PDF)
  const MAX_EXTRACT_SIZE_BYTES = isPdf ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
  if (buffer.length > MAX_EXTRACT_SIZE_BYTES) {
    await db.nodeAttachment.update({
      where: { id: attachmentId },
      data: {
        extractionStatus: AttachmentExtractionStatus.failed,
        extractionError: isPdf 
          ? 'El archivo PDF supera el límite de extracción de 5 MB.' 
          : 'El archivo supera el límite de extracción de texto de 2 MB.',
      },
    });
    return;
  }

  try {
    // Transition status to PROCESSING
    await db.nodeAttachment.update({
      where: { id: attachmentId },
      data: {
        extractionStatus: AttachmentExtractionStatus.processing,
      },
    });

    let rawText = '';

    if (isPdf) {
      // 3a. Extract text from PDF buffer
      try {
        const parser = new PDFParse(new Uint8Array(buffer));
        const parsed = await parser.getText();
        const hasActualText = parsed.pages && parsed.pages.some((page: { text: string; num: number }) => page.text && page.text.trim().length > 0);
        rawText = hasActualText ? (parsed.text || '') : '';
      } catch (pdfErr: unknown) {
        console.error(`Error parsing PDF for attachment ${attachmentId}:`, pdfErr);
        const rawErr = pdfErr instanceof Error ? pdfErr.message : 'Error desconocido';
        const safeErrorMsg = rawErr.substring(0, 500);
        await db.nodeAttachment.update({
          where: { id: attachmentId },
          data: {
            extractionStatus: AttachmentExtractionStatus.failed,
            extractionError: `Error al procesar el archivo PDF: ${safeErrorMsg}`,
          },
        });
        return;
      }
    } else {
      // 3b. Decode buffer as UTF-8 for plain text / markdown
      rawText = buffer.toString('utf8');
    }

    // 4. Normalize and clean text
    let text = normalizeText(rawText);

    // 5. Truncate text if it exceeds maximum character limit (500k)
    const MAX_CHARS = 500000;
    if (text.length > MAX_CHARS) {
      text = text.substring(0, MAX_CHARS);
    }

    // 6. Validate minimum content length
    if (text.length < 3) {
      await db.nodeAttachment.update({
        where: { id: attachmentId },
        data: {
          extractionStatus: AttachmentExtractionStatus.failed,
          extractionError: isPdf 
            ? 'El archivo PDF no contiene texto extraíble.' 
            : 'No se pudo extraer texto útil del archivo.',
        },
      });
      return;
    }

    // 7. Segment text into chunks
    const chunkTexts = generateChunks(text);

    // 8. DB transaction to clean up and insert chunks
    await db.$transaction(async (tx) => {
      // Clear any previous chunks for this attachment (idempotency)
      await tx.nodeAttachmentChunk.deleteMany({
        where: { attachmentId },
      });

      if (chunkTexts.length > 0) {
        const chunksPayload = chunkTexts.map((content, index) => ({
          attachmentId,
          nodeId,
          brainId,
          chunkIndex: index,
          content,
        }));

        await tx.nodeAttachmentChunk.createMany({
          data: chunksPayload,
        });
      }

      // Mark extraction as successfully completed
      await tx.nodeAttachment.update({
        where: { id: attachmentId },
        data: {
          extractionStatus: AttachmentExtractionStatus.done,
          extractionError: null,
        },
      });
    });

  } catch (error: unknown) {
    console.error(`Error during text extraction for attachment ${attachmentId}:`, error);
    const rawError = error instanceof Error ? error.message : 'Error desconocido';
    const safeErrorMsg = rawError.substring(0, 500);

    await db.nodeAttachment.update({
      where: { id: attachmentId },
      data: {
        extractionStatus: AttachmentExtractionStatus.failed,
        extractionError: `Fallo en el pipeline de extracción: ${safeErrorMsg}`,
      },
    }).catch((dbErr) => {
      console.error(`Double fault: failed to save extraction error for ${attachmentId}:`, dbErr);
    });
  }
}

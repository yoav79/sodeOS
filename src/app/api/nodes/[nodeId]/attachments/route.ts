import { NextResponse } from 'next/server';
import { getCurrentUser, verifyBrainAccess, AuthError } from '@/lib/auth';
import { getNodeDetail } from '@/services/nodeService';
import { putAttachmentFile, deleteAttachmentFile } from '@/lib/storage/files';
import db from '@/lib/db';
import { processAttachmentExtraction } from '@/lib/attachments/textExtraction';
import { recordUsage } from '@/lib/usage';
import { UsageFeature } from '@prisma/client';
import { assertWithinLimit, UsageLimitError } from '@/lib/limits';


export const runtime = 'nodejs';

const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

/**
 * GET /api/nodes/[nodeId]/attachments
 * Lists all attachments of a specific active node.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    
    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Fetch node (ensures it exists and not deleted)
    const node = await getNodeDetail(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

    // 3. Authorize brain access (reader access required)
    try {
      await verifyBrainAccess(user.id, node.brainId, 'reader');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // 4. Fetch attachments
    const attachments = await db.nodeAttachment.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    // 5. Map and strip r2Key for security
    const mappedAttachments = attachments.map((att) => ({
      id: att.id,
      nodeId: att.nodeId,
      brainId: att.brainId,
      uploadedById: att.uploadedById,
      filename: att.filename,
      contentType: att.contentType,
      size: att.size,
      createdAt: att.createdAt,
      uploadedBy: att.uploadedBy,
      extractionStatus: att.extractionStatus,
      extractionError: att.extractionError,
    }));

    return NextResponse.json({ attachments: mappedAttachments }, { status: 200 });

  } catch (error: unknown) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al obtener los adjuntos.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nodes/[nodeId]/attachments
 * Uploads an attachment to Cloudflare R2 and records it in the database.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;

    // 1. Authenticate user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    // 2. Fetch node (ensures it exists and not deleted)
    const node = await getNodeDetail(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Nodo no encontrado o eliminado.' }, { status: 404 });
    }

    // 3. Authorize brain access (editor access required to upload)
    try {
      await verifyBrainAccess(user.id, node.brainId, 'editor');
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    // 4. Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud inválido. Debe ser multipart/form-data.' },
        { status: 400 }
      );
    }

    const file = formData.get('file');

    // 5. Validation: file exists
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Archivo no encontrado en la solicitud. Debe proporcionarse bajo el campo "file".' },
        { status: 400 }
      );
    }

    // 6. Validation: non-empty file
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'El archivo está vacío (0 bytes).' },
        { status: 400 }
      );
    }

    // 7. Validation: size limit
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 20 MB.' },
        { status: 400 }
      );
    }

    // 8. Validation: MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${file.type || 'desconocido'}.` },
        { status: 400 }
      );
    }

    // 9. Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Fetch organization and plan details preventively
    const brain = await db.brain.findFirst({
      where: { id: node.brainId },
      select: {
        organization: {
          select: {
            id: true,
            plan: true,
          }
        }
      },
    });

    if (!brain) {
      return NextResponse.json({ error: 'Cerebro no encontrado.' }, { status: 404 });
    }

    const organizationId = brain.organization.id;
    const plan = brain.organization.plan;

    // Validate attachment upload limits
    await assertWithinLimit({
      organizationId,
      plan,
      check: 'max_file_size_bytes',
      incrementBy: file.size,
    });

    await assertWithinLimit({
      organizationId,
      plan,
      check: 'file_uploads',
      incrementBy: 1,
    });

    await assertWithinLimit({
      organizationId,
      plan,
      check: 'storage_bytes',
      incrementBy: file.size,
    });

    // 10. Upload to R2
    let uploadResult;
    try {
      uploadResult = await putAttachmentFile(node.brainId, node.id, buffer, file.name, file.type);
    } catch (error) {
      console.error('Error uploading file to R2:', error);
      return NextResponse.json(
        { error: 'Error al subir el archivo al almacenamiento R2.' },
        { status: 500 }
      );
    }

    // 12. Create entry in Prisma DB
    try {
      const attachment = await db.nodeAttachment.create({
        data: {
          nodeId: node.id,
          brainId: node.brainId,
          uploadedById: user.id,
          r2Key: uploadResult.key,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      // Trigger plain text extraction and chunking in the background (non-blocking)
      void processAttachmentExtraction(
        attachment.id,
        node.id,
        node.brainId,
        file.name,
        file.type,
        buffer
      );

      // Record file upload usage
      await recordUsage({
        organizationId,
        feature: UsageFeature.file_upload,
        userId: user.id,
        brainId: node.brainId,
        nodeId,
        quantity: 1,
        bytesIn: file.size,
        metadata: {
          route: '/api/nodes/[nodeId]/attachments',
          attachmentId: attachment.id,
          mimeType: file.type,
          fileName: file.name,
        },
      });

      // Respond with 201 (exclude r2Key for security)
      const responseAttachment = {
        id: attachment.id,
        nodeId: attachment.nodeId,
        brainId: attachment.brainId,
        uploadedById: attachment.uploadedById,
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
        createdAt: attachment.createdAt,
        uploadedBy: attachment.uploadedBy,
        extractionStatus: attachment.extractionStatus,
        extractionError: attachment.extractionError,
      };

      return NextResponse.json({ attachment: responseAttachment }, { status: 201 });

    } catch (dbError) {
      console.error('Database insertion failed. Performing R2 cleanup rollback...', dbError);
      
      // Rollback: delete the uploaded R2 object to avoid orphan files
      try {
        await deleteAttachmentFile(node.brainId, node.id, uploadResult.key);
      } catch (cleanupError) {
        console.error('R2 rollback cleanup failed for key:', uploadResult.key, cleanupError);
      }

      return NextResponse.json(
        { error: 'Error al registrar el adjunto en la base de datos.' },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error in POST /api/nodes/[nodeId]/attachments:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al crear el adjunto.' },
      { status: 500 }
    );
  }
}

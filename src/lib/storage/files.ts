import 'server-only';
import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName } from './r2';
import {
  buildStorageKey,
  getUserStoragePrefix,
  assertKeyBelongsToUser,
  buildAttachmentKey,
  assertAttachmentKeyBelongsToNode
} from './keys';
import {
  UploadResult,
  ListResult,
  DownloadedFile,
  StorageFileMetadata
} from './types';

/**
 * Uploads a file buffer to Cloudflare R2 under a secure user path.
 * Automatically generates a unique, collision-resistant storage key.
 */
export async function putFile(
  userId: string,
  fileBuffer: Buffer | Uint8Array,
  filename: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  const client = getR2Client();
  const bucket = getR2BucketName();
  const key = buildStorageKey(userId, filename);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        // Optional metadata
        Metadata: {
          original_name: filename,
          uploaded_by: userId
        }
      })
    );

    return {
      success: true,
      key,
      size: fileBuffer.length,
      contentType
    };
  } catch (error) {
    console.error('Error al subir archivo a R2:', error);
    throw new Error('No se pudo completar la carga del archivo.');
  }
}

/**
 * Retrieves a file from Cloudflare R2 after validating that it belongs to the requesting user.
 * Returns the file body as a byte array alongside metadata.
 */
export async function getFile(userId: string, key: string): Promise<DownloadedFile> {
  // Validate ownership first
  assertKeyBelongsToUser(userId, key);

  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );

    if (!response.Body) {
      throw new Error('El archivo no contiene un cuerpo de datos.');
    }

    // Convert S3 stream to ByteArray for safe consumption in Next.js endpoints
    const byteArray = await response.Body.transformToByteArray();
    const contentType = response.ContentType || 'application/octet-stream';
    const size = response.ContentLength || byteArray.length;
    
    // Extract filename from key or metadata
    const originalFilename = response.Metadata?.original_name || key.split('-').slice(1).join('-') || 'file';

    return {
      stream: byteArray,
      contentType,
      size,
      filename: originalFilename
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      throw new Error('El archivo solicitado no existe.');
    }
    console.error('Error al descargar archivo desde R2:', error);
    throw new Error('No se pudo recuperar el archivo.');
  }
}

/**
 * Lists all storage keys belonging exclusively to the requesting user.
 * Avoids listing the entire bucket.
 */
export async function listFiles(userId: string): Promise<ListResult> {
  const prefix = getUserStoragePrefix(userId);
  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix
      })
    );

    const files: StorageFileMetadata[] = (response.Contents || []).map((item) => {
      // Determine content type from metadata where possible (fallback placeholder)
      return {
        key: item.Key || '',
        size: item.Size || 0,
        contentType: 'application/octet-stream', // ListCommand does not return Content-Type directly in Contents list
        lastModified: item.LastModified
      };
    });

    return {
      files,
      prefix
    };
  } catch (error) {
    console.error('Error al listar archivos desde R2:', error);
    throw new Error('No se pudo obtener la lista de archivos.');
  }
}

/**
 * Deletes a file from Cloudflare R2 after validating that it belongs to the requesting user.
 */
export async function deleteFile(userId: string, key: string): Promise<void> {
  // Validate ownership first
  assertKeyBelongsToUser(userId, key);

  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
  } catch (error) {
    console.error('Error al eliminar archivo de R2:', error);
    throw new Error('No se pudo completar la eliminación del archivo.');
  }
}

/**
 * Uploads an attachment file buffer to Cloudflare R2 under a specific brain and node path.
 * Automatically generates a unique, collision-resistant storage key.
 */
export async function putAttachmentFile(
  brainId: string,
  nodeId: string,
  fileBuffer: Buffer | Uint8Array,
  filename: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  const client = getR2Client();
  const bucket = getR2BucketName();
  const key = buildAttachmentKey(brainId, nodeId, filename);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          original_name: filename,
          brain_id: brainId,
          node_id: nodeId
        }
      })
    );

    return {
      success: true,
      key,
      size: fileBuffer.length,
      contentType
    };
  } catch (error) {
    console.error('Error al subir adjunto a R2:', error);
    throw new Error('No se pudo completar la carga del adjunto.');
  }
}

/**
 * Retrieves a node attachment from Cloudflare R2 after validating that it belongs to the requesting brain and node.
 * Returns the file body as a byte array alongside metadata.
 */
export async function getAttachmentFile(
  brainId: string,
  nodeId: string,
  key: string
): Promise<DownloadedFile> {
  // Validate prefix first
  assertAttachmentKeyBelongsToNode(brainId, nodeId, key);

  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );

    if (!response.Body) {
      throw new Error('El archivo no contiene un cuerpo de datos.');
    }

    const byteArray = await response.Body.transformToByteArray();
    const contentType = response.ContentType || 'application/octet-stream';
    const size = response.ContentLength || byteArray.length;
    
    // Extract filename from key or metadata
    const originalFilename = response.Metadata?.original_name || key.split('-').slice(3).join('-') || 'file';

    return {
      stream: byteArray,
      contentType,
      size,
      filename: originalFilename
    };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'NoSuchKey') {
      throw new Error('El archivo solicitado no existe.');
    }
    console.error('Error al descargar adjunto desde R2:', error);
    throw new Error('No se pudo recuperar el archivo.');
  }
}

/**
 * Deletes a node attachment from Cloudflare R2 after validating that it belongs to the requesting brain and node.
 */
export async function deleteAttachmentFile(
  brainId: string,
  nodeId: string,
  key: string
): Promise<void> {
  // Validate prefix first
  assertAttachmentKeyBelongsToNode(brainId, nodeId, key);

  const client = getR2Client();
  const bucket = getR2BucketName();

  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
  } catch (error) {
    console.error('Error al eliminar adjunto de R2:', error);
    throw new Error('No se pudo completar la eliminación del adjunto.');
  }
}

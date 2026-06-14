import 'server-only';

export interface StorageFileMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified?: Date;
}

export interface UploadResult {
  success: boolean;
  key: string;
  size: number;
  contentType: string;
}

export interface ListResult {
  files: StorageFileMetadata[];
  prefix: string;
}

export interface PutFilePayload {
  userId: string;
  fileBuffer: Buffer;
  filename: string;
  contentType?: string;
}

export interface DownloadedFile {
  stream: Uint8Array;
  contentType: string;
  size: number;
  filename: string;
}

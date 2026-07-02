-- CreateEnum
CREATE TYPE "AttachmentExtractionStatus" AS ENUM ('pending', 'processing', 'done', 'failed', 'unsupported');

-- AlterTable
ALTER TABLE "node_attachments" ADD COLUMN     "extraction_error" TEXT,
ADD COLUMN     "extraction_status" "AttachmentExtractionStatus" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "node_attachment_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attachment_id" UUID NOT NULL,
    "node_id" UUID NOT NULL,
    "brain_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_attachment_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "node_attachment_chunks_brain_id_idx" ON "node_attachment_chunks"("brain_id");

-- CreateIndex
CREATE INDEX "node_attachment_chunks_node_id_idx" ON "node_attachment_chunks"("node_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_attachment_chunks_attachment_id_chunk_index_key" ON "node_attachment_chunks"("attachment_id", "chunk_index");

-- AddForeignKey
ALTER TABLE "node_attachment_chunks" ADD CONSTRAINT "node_attachment_chunks_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "node_attachments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_attachment_chunks" ADD CONSTRAINT "node_attachment_chunks_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_attachment_chunks" ADD CONSTRAINT "node_attachment_chunks_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

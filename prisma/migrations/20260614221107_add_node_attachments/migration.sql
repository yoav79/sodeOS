-- CreateTable
CREATE TABLE "node_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "node_id" UUID NOT NULL,
    "brain_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "r2_key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "node_attachments_r2_key_key" ON "node_attachments"("r2_key");

-- CreateIndex
CREATE INDEX "node_attachments_node_id_created_at_idx" ON "node_attachments"("node_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "node_attachments_brain_id_idx" ON "node_attachments"("brain_id");

-- AddForeignKey
ALTER TABLE "node_attachments" ADD CONSTRAINT "node_attachments_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_attachments" ADD CONSTRAINT "node_attachments_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_attachments" ADD CONSTRAINT "node_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

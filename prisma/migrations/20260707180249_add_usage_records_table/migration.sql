-- CreateEnum
CREATE TYPE "UsageFeature" AS ENUM ('ai_document', 'ai_agent', 'web_search', 'file_upload', 'file_download', 'attachment_extraction');

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "brain_id" UUID,
    "node_id" UUID,
    "feature" "UsageFeature" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "tokens_prompt" INTEGER,
    "tokens_completion" INTEGER,
    "tokens_total" INTEGER,
    "bytes_in" BIGINT,
    "bytes_out" BIGINT,
    "estimated_cost_usd" DECIMAL(12,6),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_records_organization_id_created_at_idx" ON "usage_records"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_records_feature_created_at_idx" ON "usage_records"("feature", "created_at");

-- CreateIndex
CREATE INDEX "usage_records_brain_id_created_at_idx" ON "usage_records"("brain_id", "created_at");

-- CreateIndex
CREATE INDEX "usage_records_user_id_created_at_idx" ON "usage_records"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

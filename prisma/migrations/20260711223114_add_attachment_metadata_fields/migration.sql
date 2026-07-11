-- AlterTable
ALTER TABLE "node_attachments" ADD COLUMN     "character_count" INTEGER,
ADD COLUMN     "metadata_json" JSONB,
ADD COLUMN     "page_count" INTEGER,
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "word_count" INTEGER;

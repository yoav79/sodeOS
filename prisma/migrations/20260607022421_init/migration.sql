-- CreateEnum
CREATE TYPE "BrainVisibility" AS ENUM ('private', 'invited_only', 'company');

-- CreateEnum
CREATE TYPE "BrainRole" AS ENUM ('owner', 'editor', 'reader');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('draft', 'active', 'needs_review', 'archived');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('page', 'structure');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "BrainVisibility" NOT NULL DEFAULT 'private',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brain_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brain_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "BrainRole" NOT NULL DEFAULT 'reader',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brain_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brain_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template_type" "TemplateType" NOT NULL,
    "schema_json" JSONB NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brain_id" UUID NOT NULL,
    "parent_id" UUID,
    "template_id" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content_markdown" TEXT NOT NULL DEFAULT '',
    "status" "NodeStatus" NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "category" TEXT,
    "owner_user_id" UUID NOT NULL,
    "responsible_user_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "locked_by" UUID,
    "locked_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "reviewed_at" TIMESTAMP(3),
    "next_review_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "node_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content_markdown" TEXT NOT NULL,
    "status" "NodeStatus" NOT NULL,
    "saved_by" UUID NOT NULL,
    "change_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brain_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_tags" (
    "node_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "node_tags_pkey" PRIMARY KEY ("node_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "brain_members_user_id_brain_id_idx" ON "brain_members"("user_id", "brain_id");

-- CreateIndex
CREATE UNIQUE INDEX "brain_members_brain_id_user_id_key" ON "brain_members"("brain_id", "user_id");

-- CreateIndex
CREATE INDEX "nodes_brain_id_parent_id_position_idx" ON "nodes"("brain_id", "parent_id", "position");

-- CreateIndex
CREATE INDEX "nodes_brain_id_slug_idx" ON "nodes"("brain_id", "slug");

-- CreateIndex
CREATE INDEX "nodes_locked_by_idx" ON "nodes"("locked_by");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_brain_id_parent_id_slug_key" ON "nodes"("brain_id", "parent_id", "slug");

-- CreateIndex
CREATE INDEX "node_versions_node_id_created_at_idx" ON "node_versions"("node_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tags_brain_id_name_key" ON "tags"("brain_id", "name");

-- AddForeignKey
ALTER TABLE "brains" ADD CONSTRAINT "brains_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_members" ADD CONSTRAINT "brain_members_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_members" ADD CONSTRAINT "brain_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_versions" ADD CONSTRAINT "node_versions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_versions" ADD CONSTRAINT "node_versions_saved_by_fkey" FOREIGN KEY ("saved_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_tags" ADD CONSTRAINT "node_tags_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_tags" ADD CONSTRAINT "node_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

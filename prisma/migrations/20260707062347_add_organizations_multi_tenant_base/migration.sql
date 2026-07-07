-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('org_owner', 'org_member');

-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('free', 'pro', 'enterprise');

-- AlterTable
ALTER TABLE "brains" ADD COLUMN     "organization_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_sysadmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "OrganizationPlan" NOT NULL DEFAULT 'free',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'org_member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_memberships_user_id_organization_id_idx" ON "organization_memberships"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organization_id_user_id_key" ON "organization_memberships"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "brains_organization_id_idx" ON "brains"("organization_id");

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brains" ADD CONSTRAINT "brains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - Made the column `organization_id` on table `brains` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "brains" ALTER COLUMN "organization_id" SET NOT NULL;

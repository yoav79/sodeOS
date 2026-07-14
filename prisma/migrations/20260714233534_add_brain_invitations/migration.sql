-- CreateTable
CREATE TABLE "brain_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "brain_id" UUID NOT NULL,
    "role" "BrainRole" NOT NULL DEFAULT 'reader',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "accepted_by_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brain_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brain_invitations_token_hash_key" ON "brain_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "brain_invitations_email_idx" ON "brain_invitations"("email");

-- CreateIndex
CREATE INDEX "brain_invitations_brain_id_idx" ON "brain_invitations"("brain_id");

-- CreateIndex
CREATE INDEX "brain_invitations_invited_by_id_idx" ON "brain_invitations"("invited_by_id");

-- CreateIndex
CREATE INDEX "brain_invitations_accepted_by_id_idx" ON "brain_invitations"("accepted_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "brain_invitations_brain_id_email_key" ON "brain_invitations"("brain_id", "email");

-- AddForeignKey
ALTER TABLE "brain_invitations" ADD CONSTRAINT "brain_invitations_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_invitations" ADD CONSTRAINT "brain_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brain_invitations" ADD CONSTRAINT "brain_invitations_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

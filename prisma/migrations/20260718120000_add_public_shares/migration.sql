CREATE TABLE "public_shares" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "created_by" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "token_encrypted" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "snapshot" TEXT NOT NULL,
  "source_version" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "last_viewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "public_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "public_shares_token_hash_key" ON "public_shares"("token_hash");
CREATE INDEX "public_shares_tenant_id_status_expires_at_idx" ON "public_shares"("tenant_id", "status", "expires_at");
CREATE INDEX "public_shares_created_by_created_at_idx" ON "public_shares"("created_by", "created_at");
CREATE UNIQUE INDEX "public_shares_one_active_per_tenant" ON "public_shares"("tenant_id") WHERE "status" = 'ACTIVE';

ALTER TABLE "public_shares"
  ADD CONSTRAINT "public_shares_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public_shares"
  ADD CONSTRAINT "public_shares_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

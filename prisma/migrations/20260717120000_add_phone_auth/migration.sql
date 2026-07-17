ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE TABLE "auth_identities" (
  "id" TEXT NOT NULL,
  "user_id" INTEGER NOT NULL,
  "provider" TEXT NOT NULL,
  "identifier_hash" TEXT NOT NULL,
  "masked_value" TEXT,
  "verified_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_sessions" (
  "id" TEXT NOT NULL,
  "user_id" INTEGER NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3),
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_identities_provider_identifier_hash_key" ON "auth_identities"("provider", "identifier_hash");
CREATE INDEX "auth_identities_user_id_provider_idx" ON "auth_identities"("user_id", "provider");
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX "auth_sessions_user_id_revoked_at_expires_at_idx" ON "auth_sessions"("user_id", "revoked_at", "expires_at");

ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "verification_attempts" (
  "id" TEXT NOT NULL,
  "target_hash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_out_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "verification_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "verification_attempts_target_hash_purpose_status_expires_at_idx" ON "verification_attempts"("target_hash", "purpose", "status", "expires_at");

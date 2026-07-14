CREATE TABLE "invitations" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CONTRIBUTOR',
  "token_hash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "invited_by" INTEGER NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "memories" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "person_id" TEXT NOT NULL,
  "created_by" INTEGER NOT NULL,
  "title" TEXT,
  "raw_text" TEXT,
  "corrected_text" TEXT,
  "transcript_raw" TEXT,
  "transcript_details" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'FAMILY',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "published_at" TIMESTAMP(3),
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "media_assets" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "person_id" TEXT,
  "memory_id" TEXT,
  "created_by" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "object_key" TEXT NOT NULL,
  "original_name" TEXT,
  "content_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "duration_seconds" DOUBLE PRECISION,
  "checksum_sha256" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "events" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "person_id" TEXT NOT NULL,
  "created_by" INTEGER NOT NULL,
  "updated_by" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "narrative" TEXT NOT NULL,
  "event_type" TEXT NOT NULL DEFAULT 'OTHER',
  "time_text" TEXT,
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "sort_year" INTEGER,
  "date_precision" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "location" TEXT,
  "is_highlight" BOOLEAN NOT NULL DEFAULT false,
  "visibility" TEXT NOT NULL DEFAULT 'FAMILY',
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_sources" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "memory_id" TEXT NOT NULL,
  "source_quote" TEXT,
  "start_ms" INTEGER,
  "end_ms" INTEGER,
  CONSTRAINT "event_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_processing_jobs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "memory_id" TEXT,
  "asset_id" TEXT,
  "kind" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'TENCENT',
  "provider_task_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "input_snapshot" TEXT,
  "output_snapshot" TEXT,
  "error_message" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_processing_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_revisions" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "actor_user_id" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "snapshot" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "actor_user_id" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "metadata" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");
CREATE INDEX "invitations_tenant_id_status_idx" ON "invitations"("tenant_id", "status");
CREATE INDEX "invitations_email_status_idx" ON "invitations"("email", "status");
CREATE INDEX "memories_tenant_id_person_id_status_idx" ON "memories"("tenant_id", "person_id", "status");
CREATE INDEX "memories_created_by_status_idx" ON "memories"("created_by", "status");
CREATE UNIQUE INDEX "media_assets_object_key_key" ON "media_assets"("object_key");
CREATE INDEX "media_assets_tenant_id_person_id_idx" ON "media_assets"("tenant_id", "person_id");
CREATE INDEX "media_assets_memory_id_kind_idx" ON "media_assets"("memory_id", "kind");
CREATE INDEX "events_tenant_id_person_id_status_sort_year_idx" ON "events"("tenant_id", "person_id", "status", "sort_year");
CREATE INDEX "events_created_by_status_idx" ON "events"("created_by", "status");
CREATE UNIQUE INDEX "event_sources_event_id_memory_id_key" ON "event_sources"("event_id", "memory_id");
CREATE INDEX "ai_processing_jobs_tenant_id_status_kind_idx" ON "ai_processing_jobs"("tenant_id", "status", "kind");
CREATE INDEX "ai_processing_jobs_memory_id_kind_idx" ON "ai_processing_jobs"("memory_id", "kind");
CREATE INDEX "event_revisions_event_id_created_at_idx" ON "event_revisions"("event_id", "created_at");
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memories" ADD CONSTRAINT "memories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memories" ADD CONSTRAINT "memories_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "family_data"("tenant_id", "person_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memories" ADD CONSTRAINT "memories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_tenant_id_person_id_fkey" FOREIGN KEY ("tenant_id", "person_id") REFERENCES "family_data"("tenant_id", "person_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_sources" ADD CONSTRAINT "event_sources_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_processing_jobs" ADD CONSTRAINT "ai_processing_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_processing_jobs" ADD CONSTRAINT "ai_processing_jobs_memory_id_fkey" FOREIGN KEY ("memory_id") REFERENCES "memories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_processing_jobs" ADD CONSTRAINT "ai_processing_jobs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_revisions" ADD CONSTRAINT "event_revisions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_revisions" ADD CONSTRAINT "event_revisions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

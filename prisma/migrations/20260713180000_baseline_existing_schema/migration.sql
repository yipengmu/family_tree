CREATE TABLE "users" (
  "id" SERIAL NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_login_at" TIMESTAMP(3),
  "wechat_openid" TEXT,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_wechat_openid_key" ON "users"("wechat_openid");

CREATE TABLE "tenants" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "settings" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "family_data" (
  "id" SERIAL NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "person_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "g_rank" INTEGER NOT NULL,
  "rank_index" INTEGER NOT NULL,
  "g_father_id" TEXT,
  "g_mother_id" TEXT,
  "sex" TEXT DEFAULT 'MAN',
  "adoption" TEXT DEFAULT 'none',
  "official_position" TEXT,
  "summary" TEXT,
  "birth_date" TEXT,
  "death_date" TEXT,
  "spouse" TEXT,
  "location" TEXT,
  "formal_name" TEXT,
  "id_card" TEXT,
  "face_img" TEXT DEFAULT '',
  "photos" TEXT,
  "household_info" TEXT,
  "home_page" TEXT,
  "childrens" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "family_data_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "family_data_tenant_id_person_id_key"
  ON "family_data"("tenant_id", "person_id");

ALTER TABLE "family_data"
  ADD CONSTRAINT "family_data_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "family_config" (
  "id" SERIAL NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "config_key" TEXT NOT NULL,
  "config_value" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "family_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "family_config_tenant_id_config_key_key"
  ON "family_config"("tenant_id", "config_key");

ALTER TABLE "family_config"
  ADD CONSTRAINT "family_config_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "data_versions" (
  "id" SERIAL NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "data_snapshot" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "data_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "data_versions_tenant_id_version_number_key"
  ON "data_versions"("tenant_id", "version_number");

ALTER TABLE "data_versions"
  ADD CONSTRAINT "data_versions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "verification_codes" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_codes_email_idx" ON "verification_codes"("email");

-- Give legacy accounts a private family space before they enter the
-- membership-authorized API path. Existing active memberships are preserved.
-- The deterministic IDs make this migration safe to retry and keep it
-- aligned with the login-time compatibility fallback.

INSERT INTO "tenants" (
  "id",
  "name",
  "description",
  "created_at",
  "updated_at",
  "settings",
  "status"
)
SELECT
  'user_' || "users"."id",
  "users"."username" || '的家谱',
  '我的私密数字家谱',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  '{"publicAccess":false,"livingPersonPrivacy":true,"nameProtection":true}',
  'active'
FROM "users"
WHERE NOT EXISTS (
  SELECT 1
  FROM "tenant_memberships"
  WHERE "tenant_memberships"."user_id" = "users"."id"
    AND "tenant_memberships"."status" = 'ACTIVE'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "tenant_memberships" (
  "id",
  "tenant_id",
  "user_id",
  "role",
  "status",
  "created_at",
  "updated_at"
)
SELECT
  'membership_user_' || "users"."id",
  'user_' || "users"."id",
  "users"."id",
  'OWNER',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users"
WHERE NOT EXISTS (
  SELECT 1
  FROM "tenant_memberships"
  WHERE "tenant_memberships"."user_id" = "users"."id"
    AND "tenant_memberships"."status" = 'ACTIVE'
)
  AND EXISTS (
    SELECT 1
    FROM "tenants"
    WHERE "tenants"."id" = 'user_' || "users"."id"
  )
ON CONFLICT ("tenant_id", "user_id") DO UPDATE
SET
  "role" = 'OWNER',
  "status" = 'ACTIVE',
  "updated_at" = CURRENT_TIMESTAMP;

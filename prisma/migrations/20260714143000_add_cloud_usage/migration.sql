CREATE TABLE "cloud_usage" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "provider" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "estimated_cost" DOUBLE PRECISION,
  "period_start" TIMESTAMP(3) NOT NULL,
  "metadata" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cloud_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cloud_usage_provider_metric_period_start_idx" ON "cloud_usage"("provider", "metric", "period_start");
CREATE INDEX "cloud_usage_tenant_id_period_start_idx" ON "cloud_usage"("tenant_id", "period_start");

ALTER TABLE "cloud_usage" ADD CONSTRAINT "cloud_usage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

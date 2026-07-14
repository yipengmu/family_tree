const DAY_MS = 24 * 60 * 60 * 1000;

export function usagePeriodStart(date = new Date()) {
  const value = new Date(date);
  return new Date(Math.floor(value.getTime() / DAY_MS) * DAY_MS);
}

/**
 * Usage accounting is deliberately best-effort: a metrics write must never
 * make an upload, OCR request, or AI result fail after the user data is safe.
 */
export async function recordCloudUsage(
  prisma,
  {
    tenantId = null,
    provider,
    metric,
    quantity = 1,
    unit,
    estimatedCost = null,
    metadata = null,
    at = new Date(),
  },
) {
  if (!prisma?.cloudUsage || !provider || !metric || !unit) return null;
  try {
    return await prisma.cloudUsage.create({
      data: {
        tenant_id: tenantId || null,
        provider: String(provider).toUpperCase(),
        metric: String(metric),
        quantity: Number(quantity) || 0,
        unit: String(unit),
        estimated_cost: estimatedCost == null ? null : Number(estimatedCost),
        period_start: usagePeriodStart(at),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("记录云服务用量失败:", error.message);
    return null;
  }
}

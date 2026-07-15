const safeTenantSegment = (tenantId) =>
  String(tenantId || "").replace(/[^a-zA-Z0-9_-]/g, "_");

const asHttpsUrl = (value) => {
  const text = String(value || "").trim();
  return /^https:\/\//i.test(text) ? text : null;
};

export function parseFamilyTreeImageSources(body, tenantId) {
  const rawSources = Array.isArray(body?.images)
    ? body.images
    : Array.isArray(body?.imageUrls)
      ? body.imageUrls
      : [];

  if (!rawSources.length || rawSources.length > 10) {
    throw new Error("请上传 1 至 10 张家谱图片");
  }

  const importPrefix = `tenants/${safeTenantSegment(tenantId)}/imports/`;
  return rawSources.map((source) => {
    if (typeof source === "string") {
      const imageUrl = asHttpsUrl(source);
      if (!imageUrl) throw new Error("家谱图片地址无效");
      return { imageUrl, objectKey: null };
    }

    const objectKey = String(source?.objectKey || "").trim();
    if (objectKey) {
      if (!objectKey.startsWith(importPrefix) || objectKey.includes("..")) {
        throw new Error("家谱图片不属于当前家谱空间");
      }
      return { imageUrl: null, objectKey };
    }

    const imageUrl = asHttpsUrl(source?.url || source?.imageUrl);
    if (!imageUrl) throw new Error("家谱图片地址无效");
    return { imageUrl, objectKey: null };
  });
}

const asPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function normalizeFamilyTreePeople(candidates, offset = 0) {
  const list = Array.isArray(candidates) ? candidates : [];
  const idMap = new Map(
    list.map((item, index) => [String(item?.id ?? index + 1), offset + index + 1]),
  );

  const relationId = (value) => {
    if (value === null || value === undefined || value === "" || value === 0)
      return 0;
    return idMap.get(String(value)) || 0;
  };

  return list.map((item, index) => ({
    id: offset + index + 1,
    name: String(item?.name || "").trim(),
    g_rank: asPositiveNumber(item?.g_rank, 1),
    rank_index: asPositiveNumber(item?.rank_index, index + 1),
    g_father_id: relationId(item?.g_father_id),
    g_mother_id: relationId(item?.g_mother_id),
    sex:
      item?.sex === "WOMAN" || item?.sex === "女" || item?.sex === "FEMALE"
        ? "WOMAN"
        : "MAN",
    adoption: item?.adoption || "none",
    official_position: String(item?.official_position || "").trim(),
    summary: String(item?.summary || "").trim(),
    birth_date: item?.birth_date || null,
    spouse: item?.spouse || null,
    location: item?.location || null,
    formal_name: item?.formal_name || null,
  }));
}

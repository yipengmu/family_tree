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
    list.map((item, index) => [
      String(item?.id ?? index + 1),
      offset + index + 1,
    ]),
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

const parentIds = (person) =>
  [person.g_father_id, person.g_mother_id].filter(
    (id) => id !== null && id !== undefined && id !== "" && id !== 0,
  );

// Model output remains a draft, but an initialization preview must be one
// connected, acyclic, top-down tree instead of several silently merged trees.
export function validateFamilyTreeDraft(candidates) {
  const rawPeople = Array.isArray(candidates) ? candidates : [];
  const rawIds = rawPeople.map((person, index) =>
    String(person?.id ?? index + 1),
  );
  if (new Set(rawIds).size !== rawIds.length)
    throw new Error("模型返回了重复的人物编号，无法确认关系");
  const people = normalizeFamilyTreePeople(candidates);
  if (!people.length || people.some((person) => !person.name))
    throw new Error("存在没有姓名的人物候选，请重新拍摄更清晰的照片");

  const byId = new Map(people.map((person) => [person.id, person]));
  const undirected = new Map(people.map((person) => [person.id, new Set()]));
  const children = new Map(people.map((person) => [person.id, []]));
  for (const person of people) {
    for (const parentId of parentIds(person)) {
      if (!byId.has(parentId))
        throw new Error("模型返回了不存在的父母关系，无法生成预览");
      if (parentId === person.id) throw new Error("模型返回了人物与自身的关系");
      undirected.get(person.id).add(parentId);
      undirected.get(parentId).add(person.id);
      children.get(parentId).push(person.id);
    }
  }

  const visited = new Set();
  const queue = [people[0].id];
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    undirected.get(id).forEach((next) => queue.push(next));
  }
  if (visited.size !== people.length)
    throw new Error(
      "照片中的人物无法确认属于同一棵连续家谱，请补充连接页或分开导入",
    );

  const indegree = new Map(people.map((person) => [person.id, 0]));
  people.forEach((person) => {
    parentIds(person).forEach(() =>
      indegree.set(person.id, indegree.get(person.id) + 1),
    );
  });
  const roots = people.filter((person) => indegree.get(person.id) === 0);
  if (roots.length !== 1)
    throw new Error("无法确认唯一的最上层祖先，不能生成一棵自顶向下的家谱预览");

  const ordered = [];
  const generation = new Map([[roots[0].id, 1]]);
  const pending = [...roots];
  while (pending.length) {
    const person = pending.shift();
    ordered.push(person);
    children.get(person.id).forEach((childId) => {
      const remaining = indegree.get(childId) - 1;
      indegree.set(childId, remaining);
      generation.set(
        childId,
        Math.max(
          generation.get(childId) || 1,
          (generation.get(person.id) || 1) + 1,
        ),
      );
      if (remaining === 0) pending.push(byId.get(childId));
    });
  }
  if (ordered.length !== people.length)
    throw new Error("家谱关系出现循环，无法生成预览");

  const rankIndexes = new Map();
  return ordered.map((person) => {
    const gRank = generation.get(person.id);
    const rankIndex = (rankIndexes.get(gRank) || 0) + 1;
    rankIndexes.set(gRank, rankIndex);
    return { ...person, g_rank: gRank, rank_index: rankIndex };
  });
}

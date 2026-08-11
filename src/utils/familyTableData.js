import { normalizePersonLifeStatus } from "./personLifeStatus.js";

const getPersonIdentity = (person, fallback) => {
  const identity = person.person_id ?? person.id;
  return identity === undefined || identity === null || identity === ""
    ? `new_${fallback}`
    : String(identity);
};

/**
 * 将家谱数据同步到桌面表格时，保留数据库人物的稳定身份。
 * 表格排序只影响显示顺序，不能重写 id，否则新增祖先排到第一行时会
 * 与已有 person_id 冲突，并把父子关系指向错误的人物。
 */
export const mergeAndDeduplicateFamilyData = (tableData = [], newData = []) => {
  if (!Array.isArray(newData) || newData.length === 0) return [];

  const currentMaxId = tableData.length > 0
    ? Math.max(...tableData.map((item) => parseInt(item.id, 10) || 0))
    : 0;

  const processedNewData = newData.map((item, index) => normalizePersonLifeStatus({
    key: item.key || `person_${getPersonIdentity(item, currentMaxId + index + 1)}`,
    id: item.id || (currentMaxId + index + 1),
    name: item.name ?? "",
    g_rank: item.g_rank || 1,
    rank_index: item.rank_index || (index + 1),
    sex: item.sex || "MAN",
    adoption: item.adoption || "none",
    g_father_id: item.g_father_id || 0,
    official_position: item.official_position || "",
    summary: item.summary || "",
    birth_date: item.birth_date || "",
    spouse: item.spouse || "",
    location: item.location || "",
    ...item,
  }));

  const allData = [...tableData, ...processedNewData];
  const deduplicatedData = [];
  const seenPersons = new Set();

  allData.forEach((person, index) => {
    // 已入库人物按 person_id 去重；尚未入库的草稿按原有业务字段去重。
    const personKey = person.person_id
      ? `person_id:${person.person_id}`
      : `draft:${person.name}_${person.g_rank}_${person.g_father_id}`;

    if (seenPersons.has(personKey)) {
      console.log(`🔄 发现重复人员，已跳过: ${person.name} (世代${person.g_rank})`);
      return;
    }

    seenPersons.add(personKey);
    deduplicatedData.push({
      ...person,
      // key 只用于 React 表格渲染，排序和合并都不能改变人物身份。
      key: person.key || `person_${getPersonIdentity(person, index)}`,
    });
  });

  return deduplicatedData;
};

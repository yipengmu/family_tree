export const PATERNAL_TARGET_GENERATIONS = 4;

const PATERNAL_RELATION_LABELS = ["本人", "父亲", "祖父", "曾祖父"];

const personId = (person = {}) => String(person.person_id ?? person.id ?? "");

const parentId = (person = {}) => {
  const value = person.g_father_id;
  if (value === undefined || value === null || value === "" || value === 0 || value === "0") {
    return null;
  }
  return String(value);
};

const pickPaternalStartingPerson = (familyData = [], preferredPersonId = null) => {
  if (preferredPersonId !== null && preferredPersonId !== undefined) {
    const preferred = familyData.find(
      (person) => personId(person) === String(preferredPersonId),
    );
    if (preferred) return preferred;
  }

  const parentIds = new Set(
    familyData.map(parentId).filter(Boolean),
  );
  const leaves = familyData.filter((person) => !parentIds.has(personId(person)));
  const candidates = leaves.length ? leaves : familyData;

  return [...candidates].sort((left, right) => {
    const generationDelta =
      Number(right.g_rank || 1) - Number(left.g_rank || 1);
    if (generationDelta) return generationDelta;
    const rankDelta =
      Number(left.rank_index || 1) - Number(right.rank_index || 1);
    if (rankDelta) return rankDelta;
    return personId(left).localeCompare(personId(right), "zh-CN", {
      numeric: true,
    });
  })[0];
};

export const buildPaternalChain = (familyData = [], preferredPersonId = null) => {
  if (!Array.isArray(familyData) || !familyData.length) return [];

  const byId = new Map(
    familyData.map((person) => [personId(person), person]),
  );
  const chain = [];
  const visited = new Set();
  let current = pickPaternalStartingPerson(familyData, preferredPersonId);

  while (current && !visited.has(personId(current))) {
    chain.push(current);
    visited.add(personId(current));
    const fatherId = parentId(current);
    current = fatherId ? byId.get(fatherId) : null;
  }

  return chain;
};

export const isPendingPaternalName = (person = {}) =>
  /（姓名待考）$/.test(String(person.name || ""));

export const getPaternalOnboardingState = (
  familyData = [],
  preferredPersonId = null,
) => {
  const chain = buildPaternalChain(familyData, preferredPersonId);
  const completedGenerations = Math.min(
    chain.length,
    PATERNAL_TARGET_GENERATIONS,
  );
  const complete = completedGenerations >= PATERNAL_TARGET_GENERATIONS;
  const nextLabel = complete
    ? null
    : PATERNAL_RELATION_LABELS[completedGenerations];
  const anchorPerson = chain[chain.length - 1] || null;

  return {
    chain,
    anchorPerson,
    complete,
    completedGenerations,
    targetGenerations: PATERNAL_TARGET_GENERATIONS,
    nextLabel,
    nextActionLabel: nextLabel ? `添加${nextLabel}` : "父系四代已连接",
    relationshipDescription:
      nextLabel && anchorPerson
        ? `正在添加「${anchorPerson.name}」的父亲`
        : null,
  };
};

export const getLifeStatusFields = (lifeStatus = "unknown") => {
  if (lifeStatus === "living") {
    return { alive: true, dealth: "alive", death_date: "alive" };
  }
  if (lifeStatus === "deceased") {
    return { alive: false, dealth: "dealth", death_date: "dealth" };
  }
  return { alive: false, dealth: "unknown", death_date: "unknown" };
};

const createNextPersonId = (familyData, now) => {
  const numericIds = familyData
    .map((person) => Number(person.person_id ?? person.id))
    .filter(Number.isInteger);
  return numericIds.length
    ? Math.max(...numericIds) + 1
    : `person_${new Date(now).getTime().toString(36)}`;
};

export const addPaternalAncestor = (
  familyData = [],
  {
    name = "",
    nameUnknown = false,
    lifeStatus = "unknown",
    now = new Date().toISOString(),
    nextId,
    preferredPersonId = null,
  } = {},
) => {
  const state = getPaternalOnboardingState(familyData, preferredPersonId);
  if (!state.anchorPerson || !state.nextLabel) {
    throw new Error("当前家谱已完成父系四代，或还没有可连接的人物");
  }

  const cleanName = String(name || "").trim();
  if (!cleanName && !nameUnknown) {
    throw new Error("请填写姓名，或选择姓名待考");
  }

  const newId = nextId ?? createNextPersonId(familyData, now);
  const anchorId = personId(state.anchorPerson);
  const displayName = nameUnknown
    ? `${state.nextLabel}（姓名待考）`
    : cleanName;
  const shiftedFamilyData = familyData.map((person) => ({
    ...person,
    g_rank: Number(person.g_rank || 1) + 1,
    ...(personId(person) === anchorId ? { g_father_id: newId } : {}),
    updated_at: now,
  }));
  const ancestor = {
    id: newId,
    name: displayName,
    g_rank: 1,
    rank_index: 1,
    g_father_id: 0,
    g_mother_id: null,
    sex: "MAN",
    adoption: "none",
    official_position: "",
    summary: "",
    birth_date: "",
    spouse: "",
    location: "",
    formal_name: "",
    id_card: "",
    face_img: "",
    photos: "",
    household_info: "",
    home_page: "",
    childrens: "",
    created_at: now,
    updated_at: now,
    ...getLifeStatusFields(lifeStatus),
  };
  const nextFamilyData = [ancestor, ...shiftedFamilyData];

  return {
    familyData: nextFamilyData,
    person: ancestor,
    previousState: state,
    state: getPaternalOnboardingState(
      nextFamilyData,
      preferredPersonId || personId(state.chain[0]),
    ),
  };
};


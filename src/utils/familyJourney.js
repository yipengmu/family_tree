const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_GENERATION_SPAN = 26;

const parseYear = (value) => {
  const match = String(value || "").match(/(?:14|15|16|17|18|19|20)\d{2}/);
  return match ? Number(match[0]) : null;
};

const getMedian = (values = []) => {
  if (!values.length) return null;
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2) return sortedValues[middleIndex];
  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
};

const isLivingPerson = (person) =>
  person.alive === true ||
  [person.dealth, person.death_date].some(
    (value) => String(value || "").toLowerCase() === "alive",
  );

const inferStartYear = (familyData, minGeneration, maxGeneration) => {
  // 出生年份比逝世年份更接近一代人的起点。取多条记录反推结果的中位数，
  // 避免单条脏数据让整条时间轴偏移几十年。
  const datedFounderEstimates = familyData
    .map((person) => {
      const birthYear = parseYear(person.birth_date);
      const generation = Number(person.g_rank);
      if (!birthYear || !Number.isFinite(generation)) return null;
      return birthYear - (generation - minGeneration) * DEFAULT_GENERATION_SPAN;
    })
    .filter(Number.isFinite);

  if (datedFounderEstimates.length) {
    return {
      year: Math.round(getMedian(datedFounderEstimates)),
      basis: "birth-records",
    };
  }

  // 示范谱的末代包含在世人物，但缺少可公开的精确出生年。此时以当代为
  // 末端，按 26 年/代向前反推；21 代即约 520 年，避免最后一代被硬跳到今年。
  const hasLivingLatestGeneration = familyData.some(
    (person) =>
      Number(person.g_rank) === maxGeneration && isLivingPerson(person),
  );
  if (hasLivingLatestGeneration) {
    return {
      year:
        CURRENT_YEAR -
        (maxGeneration - minGeneration) * DEFAULT_GENERATION_SPAN,
      basis: "living-generation",
    };
  }

  const founderText = familyData
    .filter((person) => Number(person.g_rank) === minGeneration)
    .map(
      (person) => `${person.official_position || ""} ${person.summary || ""}`,
    )
    .join(" ");

  if (founderText.includes("明")) return { year: 1500, basis: "founder-era" };
  if (founderText.includes("清")) return { year: 1700, basis: "founder-era" };
  if (founderText.includes("民国")) return { year: 1912, basis: "founder-era" };

  return {
    year:
      CURRENT_YEAR - (maxGeneration - minGeneration) * DEFAULT_GENERATION_SPAN,
    basis: "generation-span",
  };
};

const SUMMARY_GROUPS = [
  {
    key: "officials",
    label: "职官",
    pattern:
      /(主簿|吏目|教谕|文林郎|修职郎|奎文阁典籍|[正从]?[一二三四五六七八九]品|任)/,
  },
  {
    key: "scholars",
    label: "功名",
    pattern:
      /(生员|廪膳生|禀膳生|选贡|岁贡生|贡生|庠生|太学生|附学生|增广生|广生)/,
  },
];

const NOTABLE_ROLES = ["奎文阁典籍", "主簿", "邑庠生", "恩赐耆老"];

export const buildFamilyJourneySummary = (familyData = []) => {
  const groupCounts = SUMMARY_GROUPS.reduce((counts, group) => {
    counts[group.key] = familyData.filter((person) =>
      group.pattern.test(String(person.official_position || "")),
    ).length;
    return counts;
  }, {});
  const notableRole = NOTABLE_ROLES.map((label) => ({
    label,
    count: familyData.filter((person) =>
      String(person.official_position || "").includes(label),
    ).length,
  })).find((role) => role.count > 0);

  return {
    ...groupCounts,
    notableRole: notableRole || null,
  };
};

const getEra = (year) => {
  if (year < 1644)
    return { key: "ming", label: "明代", title: "一人立谱，根脉初生" };
  if (year < 1912)
    return { key: "qing", label: "清代", title: "支系渐繁，名字相连" };
  if (year < 1949)
    return { key: "republic", label: "民国", title: "岁月辗转，家族延展" };
  return { key: "modern", label: "当代", title: "枝叶相承，续写至今" };
};

export const buildJourneyFocusPath = (familyData = [], targetName = "穆宁") => {
  const personMap = new Map(familyData.map((person) => [person.id, person]));
  const namedTargets = familyData
    .filter((person) => person.name === targetName)
    .sort((a, b) => Number(b.g_rank) - Number(a.g_rank));
  let currentPerson =
    namedTargets[0] ||
    [...familyData].sort((a, b) => Number(b.g_rank) - Number(a.g_rank))[0];
  const path = [];
  const visitedIds = new Set();

  while (currentPerson && !visitedIds.has(currentPerson.id)) {
    path.push(currentPerson);
    visitedIds.add(currentPerson.id);
    currentPerson = personMap.get(currentPerson.g_father_id);
  }

  return path.reverse();
};

export const buildFamilyJourney = (familyData = []) => {
  const generations = [
    ...new Set(
      familyData.map((person) => Number(person.g_rank)).filter(Number.isFinite),
    ),
  ].sort((a, b) => a - b);

  if (!generations.length) {
    return {
      steps: [],
      minGeneration: 0,
      maxGeneration: 0,
      generationCount: 0,
      startYear: null,
      endYear: null,
      yearSpan: 0,
      timeBasis: null,
      summary: buildFamilyJourneySummary(familyData),
    };
  }

  const minGeneration = generations[0];
  const maxGeneration = generations[generations.length - 1];
  const startEstimate = inferStartYear(
    familyData,
    minGeneration,
    maxGeneration,
  );
  const startYear = startEstimate.year;
  const endYear = Math.min(
    startYear + (maxGeneration - minGeneration) * DEFAULT_GENERATION_SPAN,
    CURRENT_YEAR,
  );
  const yearSpan = Math.max(0, endYear - startYear);
  const focusPath = buildJourneyFocusPath(familyData);
  const focusPersonByGeneration = new Map(
    focusPath.map((person) => [Number(person.g_rank), person]),
  );

  const steps = generations.map((generation, index) => {
    const rawYear =
      startYear + (generation - minGeneration) * DEFAULT_GENERATION_SPAN;
    const estimatedYear =
      generation === maxGeneration ? endYear : Math.min(rawYear, endYear);
    const era = getEra(estimatedYear);

    return {
      generation,
      focusPersonId: focusPersonByGeneration.get(generation)?.id || null,
      focusPersonName: focusPersonByGeneration.get(generation)?.name || null,
      estimatedYear,
      era,
      visibleCount: familyData.filter(
        (person) => Number(person.g_rank) <= generation,
      ).length,
      progress:
        generations.length === 1
          ? 100
          : Math.round((index / (generations.length - 1)) * 100),
    };
  });

  return {
    steps,
    minGeneration,
    maxGeneration,
    generationCount: generations.length,
    startYear,
    endYear,
    yearSpan,
    timeBasis: startEstimate.basis,
    summary: buildFamilyJourneySummary(familyData),
  };
};

export const getNextJourneyStepIndex = (steps = [], currentIndex = 0) => {
  const lastIndex = steps.length - 1;
  if (lastIndex <= 0 || currentIndex >= lastIndex) return lastIndex;

  // 每次只绘制一代，控制单次进入 React Flow 的节点和连线数量，
  // 让深代播放保持线性的渲染压力，而不是用更少步骤换取瞬时峰值。
  return currentIndex + 1;
};

export const filterFamilyByGeneration = (familyData = [], generation) =>
  familyData.filter((person) => Number(person.g_rank) <= Number(generation));

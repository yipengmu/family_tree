const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_GENERATION_SPAN = 26;

const parseKnownYear = (person) => {
  const fields = [person.birth_date, person.death_date, person.dealth];
  for (const field of fields) {
    const match = String(field || '').match(/(?:14|15|16|17|18|19|20)\d{2}/);
    if (match) return Number(match[0]);
  }
  return null;
};

const inferStartYear = (familyData, minGeneration, maxGeneration) => {
  const knownPerson = familyData.find((person) => parseKnownYear(person));
  if (knownPerson) {
    return (
      parseKnownYear(knownPerson) -
      (Number(knownPerson.g_rank) - minGeneration) * DEFAULT_GENERATION_SPAN
    );
  }

  const founderText = familyData
    .filter((person) => Number(person.g_rank) === minGeneration)
    .map(
      (person) => `${person.official_position || ''} ${person.summary || ''}`,
    )
    .join(' ');

  if (founderText.includes('明')) return 1500;
  if (founderText.includes('清')) return 1700;
  if (founderText.includes('民国')) return 1912;

  return (
    CURRENT_YEAR - (maxGeneration - minGeneration) * DEFAULT_GENERATION_SPAN
  );
};

const getEra = (year) => {
  if (year < 1644)
    return { key: 'ming', label: '明代', title: '一人立谱，根脉初生' };
  if (year < 1912)
    return { key: 'qing', label: '清代', title: '支系渐繁，名字相连' };
  if (year < 1949)
    return { key: 'republic', label: '民国', title: '岁月辗转，家族延展' };
  return { key: 'modern', label: '当代', title: '枝叶相承，续写至今' };
};

export const buildJourneyFocusPath = (
  familyData = [],
  targetName = '穆宁',
) => {
  const personMap = new Map(familyData.map((person) => [person.id, person]));
  const namedTargets = familyData
    .filter((person) => person.name === targetName)
    .sort((a, b) => Number(b.g_rank) - Number(a.g_rank));
  let currentPerson = namedTargets[0]
    || [...familyData].sort((a, b) => Number(b.g_rank) - Number(a.g_rank))[0];
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
    return { steps: [], minGeneration: 0, maxGeneration: 0, startYear: null };
  }

  const minGeneration = generations[0];
  const maxGeneration = generations[generations.length - 1];
  const startYear = inferStartYear(familyData, minGeneration, maxGeneration);
  const focusPath = buildJourneyFocusPath(familyData);
  const focusPersonByGeneration = new Map(
    focusPath.map((person) => [Number(person.g_rank), person]),
  );

  const steps = generations.map((generation, index) => {
    const rawYear =
      startYear + (generation - minGeneration) * DEFAULT_GENERATION_SPAN;
    const estimatedYear =
      generation === maxGeneration
        ? CURRENT_YEAR
        : Math.min(rawYear, CURRENT_YEAR);
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

  return { steps, minGeneration, maxGeneration, startYear };
};

export const filterFamilyByGeneration = (familyData = [], generation) =>
  familyData.filter((person) => Number(person.g_rank) <= Number(generation));

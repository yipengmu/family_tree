import {
  buildFamilyJourney,
  buildFamilyJourneySummary,
  buildJourneyFocusPath,
  filterFamilyByGeneration,
  getNextJourneyStepIndex,
} from "./familyJourney.js";

describe("familyJourney", () => {
  const family = [
    { id: 1, name: "始祖", g_rank: 1, official_position: "明·生员" },
    { id: 2, name: "二世", g_rank: 2, g_father_id: 1 },
    { id: 3, name: "三世", g_rank: 3, g_father_id: 2 },
    { id: 4, name: "三世次支", g_rank: 3, g_father_id: 2 },
  ];

  test("builds progressive generation steps and infers a Ming starting point", () => {
    const journey = buildFamilyJourney(family);

    expect(journey.startYear).toBe(1500);
    expect(journey.steps.map((step) => step.generation)).toEqual([1, 2, 3]);
    expect(journey.steps.map((step) => step.visibleCount)).toEqual([1, 2, 4]);
    expect(journey.steps[0].era.label).toBe("明代");
    expect(journey.steps[2].progress).toBe(100);
    expect(journey.endYear).toBe(1552);
    expect(journey.yearSpan).toBe(52);
  });

  test("anchors a living latest generation to the current year without a final jump", () => {
    const currentYear = new Date().getFullYear();
    const longFamily = Array.from({ length: 21 }, (_, index) => ({
      id: index + 1,
      name: `第${index + 1}代`,
      g_rank: index + 1,
      g_father_id: index || 0,
      official_position: index === 0 ? "明·生员" : "",
      dealth: index === 20 ? "alive" : null,
    }));
    const journey = buildFamilyJourney(longFamily);

    expect(journey.startYear).toBe(currentYear - 520);
    expect(journey.endYear).toBe(currentYear);
    expect(journey.yearSpan).toBe(520);
    expect(journey.timeBasis).toBe("living-generation");
    expect(journey.steps[journey.steps.length - 1].estimatedYear).toBe(
      currentYear,
    );
    expect(
      journey.steps[journey.steps.length - 1].estimatedYear -
        journey.steps[journey.steps.length - 2].estimatedYear,
    ).toBe(26);
  });

  test("uses the median of birth-year anchors and ignores death-year outliers", () => {
    const journey = buildFamilyJourney([
      { id: 1, name: "一世", g_rank: 1, birth_date: "约1502年" },
      {
        id: 2,
        name: "二世",
        g_rank: 2,
        g_father_id: 1,
        birth_date: "1528",
        death_date: "2020",
      },
      {
        id: 3,
        name: "三世",
        g_rank: 3,
        g_father_id: 2,
        birth_date: "1554年",
      },
    ]);

    expect(journey.startYear).toBe(1502);
    expect(journey.endYear).toBe(1554);
    expect(journey.timeBasis).toBe("birth-records");
  });

  test("summarizes recorded offices and scholarly titles without inventing facts", () => {
    const summary = buildFamilyJourneySummary([
      { id: 1, official_position: "正七品·奎文阁典籍" },
      { id: 2, official_position: "正七品·奎文阁典籍" },
      { id: 3, official_position: "明·选贡任宁津主簿" },
      { id: 4, official_position: "邑庠生" },
      { id: 5, official_position: "" },
    ]);

    expect(summary.officials).toBe(3);
    expect(summary.scholars).toBe(2);
    expect(summary.notableRole).toEqual({
      label: "奎文阁典籍",
      count: 2,
    });
  });

  test("keeps only people up to the active generation", () => {
    expect(
      filterFamilyByGeneration(family, 2).map((person) => person.id),
    ).toEqual([1, 2]);
  });

  test("builds a stable founder-to-target camera path", () => {
    const cameraFamily = [
      { id: 1, name: "穆茂", g_rank: 1 },
      { id: 2, name: "旁支", g_rank: 2, g_father_id: 1 },
      { id: 3, name: "主线二世", g_rank: 2, g_father_id: 1 },
      { id: 4, name: "穆宁", g_rank: 3, g_father_id: 3 },
    ];

    expect(
      buildJourneyFocusPath(cameraFamily).map((person) => person.id),
    ).toEqual([1, 3, 4]);
    expect(
      buildFamilyJourney(cameraFamily).steps.map((step) => step.focusPersonId),
    ).toEqual([1, 3, 4]);
  });

  test("advances every two generations after generation 10", () => {
    const steps = Array.from({ length: 14 }, (_, index) => ({
      generation: index + 1,
    }));

    expect(getNextJourneyStepIndex(steps, 8)).toBe(9);
    expect(getNextJourneyStepIndex(steps, 9)).toBe(11);
    expect(getNextJourneyStepIndex(steps, 11)).toBe(13);
  });

  test("always keeps the final generation in late playback", () => {
    const steps = Array.from({ length: 13 }, (_, index) => ({
      generation: index + 1,
    }));

    expect(getNextJourneyStepIndex(steps, 11)).toBe(12);
    expect(getNextJourneyStepIndex(steps, 12)).toBe(12);
  });
});

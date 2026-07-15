import {
  addPaternalAncestor,
  buildPaternalChain,
  getLifeStatusFields,
  getPaternalOnboardingState,
  isPendingPaternalName,
} from "./paternalOnboarding.js";

const twoGenerationFamily = [
  {
    id: 1,
    name: "父亲",
    g_rank: 1,
    rank_index: 1,
    g_father_id: 0,
  },
  {
    id: 2,
    name: "本人",
    g_rank: 2,
    rank_index: 1,
    g_father_id: 1,
  },
];

describe("paternal onboarding", () => {
  test("finds the current paternal chain and the next guided relation", () => {
    expect(buildPaternalChain(twoGenerationFamily).map((person) => person.name)).toEqual([
      "本人",
      "父亲",
    ]);
    expect(getPaternalOnboardingState(twoGenerationFamily)).toMatchObject({
      completedGenerations: 2,
      targetGenerations: 4,
      nextLabel: "祖父",
      nextActionLabel: "添加祖父",
      relationshipDescription: "正在添加「父亲」的父亲",
    });
  });

  test("adds an ancestor, connects the former root and shifts every existing generation", () => {
    const result = addPaternalAncestor(twoGenerationFamily, {
      name: "祖父姓名",
      lifeStatus: "deceased",
      nextId: 3,
      now: "2026-07-15T00:00:00.000Z",
    });

    expect(result.familyData).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 3,
          name: "祖父姓名",
          g_rank: 1,
          g_father_id: 0,
          death_date: "dealth",
        }),
        expect.objectContaining({
          id: 1,
          g_rank: 2,
          g_father_id: 3,
        }),
        expect.objectContaining({ id: 2, g_rank: 3, g_father_id: 1 }),
      ]),
    );
    expect(result.state).toMatchObject({
      completedGenerations: 3,
      nextLabel: "曾祖父",
    });
  });

  test("creates a relation-first pending-name node without guessing life status", () => {
    const result = addPaternalAncestor(twoGenerationFamily, {
      nameUnknown: true,
      nextId: 3,
    });

    expect(result.person).toMatchObject({
      name: "祖父（姓名待考）",
      alive: false,
      dealth: "unknown",
      death_date: "unknown",
    });
    expect(isPendingPaternalName(result.person)).toBe(true);
  });

  test("requires either a real name or an explicit pending-name choice", () => {
    expect(() => addPaternalAncestor(twoGenerationFamily)).toThrow(
      "请填写姓名，或选择姓名待考",
    );
  });

  test("marks four connected generations as complete", () => {
    const third = addPaternalAncestor(twoGenerationFamily, {
      name: "祖父",
      nextId: 3,
    });
    const fourth = addPaternalAncestor(third.familyData, {
      name: "曾祖父",
      nextId: 4,
    });

    expect(fourth.state).toMatchObject({
      complete: true,
      completedGenerations: 4,
      nextLabel: null,
    });
    expect(fourth.state.chain.map((person) => person.name)).toEqual([
      "本人",
      "父亲",
      "祖父",
      "曾祖父",
    ]);
  });

  test("uses an explicit unknown life status sentinel", () => {
    expect(getLifeStatusFields()).toEqual({
      alive: false,
      dealth: "unknown",
      death_date: "unknown",
    });
  });
});


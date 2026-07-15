import { buildFirstFamily, countFirstFamilyMembers } from "./firstFamily.js";

describe("first family onboarding", () => {
  test("builds three generations with both parent lines", () => {
    const people = buildFirstFamily(
      {
        selfName: "林晓",
        selfSex: "WOMAN",
        fatherName: "林山",
        motherName: "周静",
        paternalGrandfatherName: "林河",
        paternalGrandmotherName: "陈兰",
        maternalGrandfatherName: "周远",
        maternalGrandmotherName: "王梅",
      },
      "2026-07-14T00:00:00.000Z",
    );

    expect(people).toHaveLength(7);
    const byName = Object.fromEntries(
      people.map((person) => [person.name, person]),
    );
    expect(byName["林晓"]).toMatchObject({
      g_rank: 3,
      g_father_id: byName["林山"].id,
      g_mother_id: byName["周静"].id,
      sex: "WOMAN",
      alive: true,
    });
    expect(byName["林山"]).toMatchObject({
      g_rank: 2,
      g_father_id: byName["林河"].id,
      g_mother_id: byName["陈兰"].id,
      death_date: "unknown",
    });
    expect(byName["周静"]).toMatchObject({
      g_rank: 2,
      g_father_id: byName["周远"].id,
      g_mother_id: byName["王梅"].id,
    });
  });

  test("keeps a one-person start valid when relatives are unknown", () => {
    const people = buildFirstFamily({ selfName: "陈一", selfSex: "MAN" });

    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({
      name: "陈一",
      g_rank: 1,
      g_father_id: 0,
      g_mother_id: null,
    });
  });

  test("creates a first family with one known parent", () => {
    const people = buildFirstFamily({
      selfName: "陈一",
      selfSex: "MAN",
      fatherName: "陈父",
    });

    expect(people).toHaveLength(2);
    expect(people.map((person) => person.name)).toEqual(["陈父", "陈一"]);
    expect(people[1]).toMatchObject({
      g_rank: 2,
      g_father_id: people[0].id,
      g_mother_id: null,
    });
  });

  test("counts only names that will become people", () => {
    expect(
      countFirstFamilyMembers({
        selfName: "陈一",
        fatherName: "陈父",
        motherName: "  ",
        maternalGrandfatherName: "不应计入",
      }),
    ).toBe(2);
  });
});

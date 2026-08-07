import { getPersonFamilyContext } from "./personProfile.js";

describe("person profile family context", () => {
  const family = [
    { id: 1, name: "林山", sex: "MAN", g_rank: 1, g_father_id: 0 },
    { id: 2, name: "林河", sex: "MAN", g_rank: 2, g_father_id: 1 },
    { id: 3, name: "林月", sex: "WOMAN", g_rank: 2, g_father_id: 1 },
  ];

  test("describes a parent through named family members instead of raw generation data", () => {
    expect(getPersonFamilyContext(family[0], family)).toMatchObject({
      headline: "林河等 2 位家人的父亲",
      hiddenRelationCount: 0,
    });
  });

  test("keeps navigable parent and child relations", () => {
    const context = getPersonFamilyContext(family[1], family);
    expect(context.headline).toBe("林山的儿子");
    expect(context.relations).toEqual([
      expect.objectContaining({ label: "父亲", person: family[0] }),
    ]);
  });
});

import { mergeAndDeduplicateFamilyData } from "./familyTableData.js";

describe("family table identity preservation", () => {
  test("does not renumber an existing person when a new ancestor sorts first", () => {
    const existingPerson = {
      id: 1,
      person_id: "1",
      name: "穆毅鹏",
      g_rank: 2,
      rank_index: 1,
      g_father_id: 0,
    };
    const newAncestor = {
      id: 2,
      name: "穆荣震",
      g_rank: 1,
      rank_index: 1,
      g_father_id: 0,
    };

    const result = mergeAndDeduplicateFamilyData(
      [existingPerson],
      [newAncestor, existingPerson],
    ).sort((left, right) => left.g_rank - right.g_rank);

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 2, name: "穆荣震" }),
      expect.objectContaining({ id: 1, person_id: "1", name: "穆毅鹏" }),
    ]));
    expect(new Set(result.map((person) => String(person.person_id ?? person.id))).size).toBe(2);
  });

  test("keeps a father reference attached to the new ancestor's stable id", () => {
    const existingPerson = {
      id: 1,
      person_id: "1",
      name: "穆毅鹏",
      g_rank: 2,
      rank_index: 1,
      g_father_id: 0,
    };
    const newAncestor = {
      id: 2,
      name: "穆荣震",
      g_rank: 1,
      rank_index: 1,
      g_father_id: 0,
    };
    const childWithFather = { ...existingPerson, g_father_id: 2 };

    const result = mergeAndDeduplicateFamilyData(
      [],
      [newAncestor, childWithFather],
    );
    const child = result.find((person) => person.person_id === "1");

    expect(child).toMatchObject({ id: 1, g_father_id: 2 });
  });
});

import {
  buildFamilyPosterModel,
  buildPersonPosterModel,
  getPosterPersonName,
  isShareProtectedPerson,
} from "./sharePoster.js";

describe("share poster privacy model", () => {
  test("protects living and status-unknown names by default", () => {
    const living = { name: "穆小满", alive: true };
    const unknown = { name: "穆待考", alive: null, death_date: null };
    const deceased = { name: "穆长山", alive: false };

    expect(isShareProtectedPerson(living)).toBe(true);
    expect(isShareProtectedPerson(unknown)).toBe(true);
    expect(isShareProtectedPerson(deceased)).toBe(false);
    expect(getPosterPersonName(living)).toBe("穆氏家人");
    expect(getPosterPersonName(unknown)).toBe("穆氏家人");
    expect(getPosterPersonName(deceased)).toBe("穆长山");
  });

  test("builds a compact multi-generation family signature", () => {
    const model = buildFamilyPosterModel({
      familyName: "穆家家谱",
      familyData: [
        { id: 1, name: "穆一", g_rank: 1, alive: false },
        { id: 2, name: "穆二", g_rank: 2, alive: true },
        { id: 3, name: "穆三", g_rank: 2, alive: null },
      ],
    });

    expect(model.familyName).toBe("穆家家谱");
    expect(model.memberCount).toBe(3);
    expect(model.generationCount).toBe(2);
    expect(model.groups[1].people.map((person) => person.name)).toEqual([
      "穆氏家人",
      "穆氏家人",
    ]);
  });

  test("never includes private or draft stories in a person poster", () => {
    const model = buildPersonPosterModel({
      person: { id: 2, name: "穆二", alive: true, location: "北京" },
      includeLifeFacts: false,
      includeStories: true,
      events: [
        { id: 1, title: "公开往事", narrative: "家人共同记得的事情" },
        {
          id: 2,
          title: "私人往事",
          narrative: "不应进入分享图",
          visibility: "PRIVATE",
        },
        {
          id: 3,
          title: "草稿",
          narrative: "尚未确认",
          status: "DRAFT",
        },
      ],
    });

    expect(model.lifeFacts).toEqual([]);
    expect(model.events).toHaveLength(1);
    expect(model.events[0].title).toBe("公开往事");
    expect(model.sensitive).toBe(true);
  });
});

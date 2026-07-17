import { buildDirectLifeEvent } from "./lifeStory.js";

describe("buildDirectLifeEvent", () => {
  it("builds a publishable event from a short mobile entry", () => {
    expect(
      buildDirectLifeEvent({
        personName: "穆爷爷",
        narrative: "年轻时在老家教过小学。后来也常教家里的孩子认字。",
        timeText: "约 1960 年代",
        location: "山东老家",
        eventType: "education",
        tags: ["教书", "识字"],
        visibility: "PRIVATE",
      }),
    ).toEqual(
      expect.objectContaining({
        title: "年轻时在老家教过小学",
        narrative: "年轻时在老家教过小学。后来也常教家里的孩子认字。",
        timeText: "约 1960 年代",
        location: "山东老家",
        eventType: "EDUCATION",
        tags: [
          { label: "教书", type: "TOPIC", source: "USER" },
          { label: "识字", type: "TOPIC", source: "USER" },
        ],
        visibility: "PRIVATE",
      }),
    );
  });

  it("does not create a fact from empty input", () => {
    expect(() => buildDirectLifeEvent({ narrative: "   " })).toThrow(
      "请先写下一段经历",
    );
  });

  it("preserves AI tag types while keeping manual tags in the same system", () => {
    const event = buildDirectLifeEvent({
      narrative: "大概在八十年代去了洛阳工作。",
      tags: [{ label: "1980年代", type: "TIME", source: "AI" }, "外出工作"],
    });

    expect(event.tags).toEqual([
      { label: "1980年代", type: "TIME", source: "AI" },
      { label: "外出工作", type: "TOPIC", source: "USER" },
    ]);
  });
});

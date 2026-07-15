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
        visibility: "PRIVATE",
      }),
    ).toEqual(
      expect.objectContaining({
        title: "年轻时在老家教过小学",
        narrative: "年轻时在老家教过小学。后来也常教家里的孩子认字。",
        timeText: "约 1960 年代",
        location: "山东老家",
        eventType: "EDUCATION",
        visibility: "PRIVATE",
      }),
    );
  });

  it("does not create a fact from empty input", () => {
    expect(() => buildDirectLifeEvent({ narrative: "   " })).toThrow(
      "请先写下一段经历",
    );
  });
});

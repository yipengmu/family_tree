import fs from "fs";
import path from "path";

describe("family journey completion copy", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "FamilyJourneyPlayer.js"),
    "utf8",
  );

  test("states the estimated time span on the final page", () => {
    expect(source).toContain("跨越约 ${yearSpan} 年");
    expect(source).toContain("年份为代际推演估算");
  });

  test("labels historical role counts as records from the genealogy", () => {
    expect(source).toContain("谱载职官");
    expect(source).toContain("功名记载");
  });
});

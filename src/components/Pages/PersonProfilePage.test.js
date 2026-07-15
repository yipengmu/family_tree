import fs from "fs";
import path from "path";

describe("person life archive flow", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "PersonProfilePage.js"),
    "utf8",
  );
  const stylesheet = fs.readFileSync(
    path.join(__dirname, "PersonProfilePage.css"),
    "utf8",
  );

  it("keeps direct publishing independent from optional AI extraction", () => {
    expect(source).toContain("publishDirectStory");
    expect(source).toContain("保存为一条生平纪事");
    expect(source).toContain("用 AI 整理成多条草稿");
    expect(source).not.toContain("storyService.createMemory =");
  });

  it("keeps the mobile archive vertically scrollable", () => {
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.person-profile-page\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/s,
    );
  });
});

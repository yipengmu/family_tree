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

  it("keeps the capture form focused on direct publishing", () => {
    expect(source).toContain("publishDirectStory");
    expect(source).toContain("保存为一条生平纪事");
    expect(source).not.toContain("用 AI 整理成多条草稿");
    expect(source).not.toContain("标记为重要经历");
    expect(source).not.toContain("storyService.createMemory =");
  });

  it("uses compact selectable tags for event types and recording", () => {
    expect(source).toContain('className="story-type-tags"');
    expect(source).toContain('role="radiogroup"');
    expect(stylesheet).toMatch(
      /\.story-recorder\s*\{[^}]*min-height:\s*56px;[^}]*justify-content:\s*space-between;/s,
    );
  });

  it("keeps the mobile archive vertically scrollable", () => {
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.person-profile-page\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/s,
    );
  });

  it("starts the capture form directly without introductory prompts", () => {
    expect(source).not.toContain("story-intro");
    expect(source).not.toContain("story-prompts");
    expect(source).not.toContain("小时候最鲜明的记忆");
  });
});

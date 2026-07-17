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

  it("keeps a traditional form and adds voice as a prominent secondary entry", () => {
    expect(source).toContain('className="story-type-tags"');
    expect(source).toContain('role="radiogroup"');
    expect(source).toContain('className="story-voice-entry"');
    expect(source).toContain("长按语音录入");
    expect(source).toContain('mode="tags"');
    expect(stylesheet).toContain(".story-voice-entry");
  });

  it("shows a four-part full-screen voice guide and auto-fills the form", () => {
    expect(source).toContain("voiceGuideSteps");
    expect(source).toContain('className="voice-guide-modal"');
    expect(source).toContain("正在记录{person.name}的故事");
    expect(source).toContain("applyVoiceDraft");
    expect(source).toContain("谁");
    expect(source).toContain("何时何地");
    expect(source).toContain("发生了什么");
    expect(source).toContain("后来怎样");
  });

  it("keeps the mobile archive vertically scrollable", () => {
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.person-profile-page\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/s,
    );
  });

  it("uses the immersive mobile shell so the profile fills the content area", () => {
    expect(source).toMatch(
      /activeMenuItem="person"[\s\S]*?familyData=\{familyData\}[\s\S]*?immersiveMobile/,
    );
  });

  it("starts the capture form directly without introductory prompts", () => {
    expect(source).not.toContain("story-intro");
    expect(source).not.toContain("story-prompts");
    expect(source).not.toContain("小时候最鲜明的记忆");
  });
});
